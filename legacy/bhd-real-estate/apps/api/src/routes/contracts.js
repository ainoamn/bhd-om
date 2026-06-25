import { Router } from 'express';
import { z } from 'zod';
import { withCompanyContext } from '../lib/prisma.js';
import { requireAuth, requireCompany, requirePermission } from '../middleware/auth.js';
import { parsePagination, paginationMeta } from '../lib/pagination.js';
import { writeAudit } from '../services/audit.js';
import { requireActiveCompany } from '../lib/company-limits.js';
import { assertFound } from '../lib/errors.js';

export const contractsRouter = Router();

contractsRouter.use(requireAuth, requireCompany, requireActiveCompany);

const contractBodySchema = z.object({
  unitId: z.string().uuid(),
  tenantId: z.string().uuid().optional().nullable(),
  agreementNo: z.string().max(120).optional().nullable(),
  status: z.string().min(1).max(80),
  payload: z.record(z.unknown()).optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  monthlyRent: z.union([z.number(), z.string()]).optional().nullable(),
  isCurrent: z.boolean().optional(),
});

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function parseDecimal(v) {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapContract(row) {
  return {
    id: row.id,
    unitId: row.unitId,
    tenantId: row.tenantId,
    agreementNo: row.agreementNo,
    status: row.status,
    payload: row.payload,
    startDate: row.startDate,
    endDate: row.endDate,
    monthlyRent: row.monthlyRent != null ? Number(row.monthlyRent) : null,
    isCurrent: row.isCurrent,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    unit: row.unit || undefined,
    tenant: row.tenant || undefined,
  };
}

contractsRouter.get('/summary', async (req, res, next) => {
  try {
    const companyId = req.auth.companyId;
    const result = await withCompanyContext(companyId, async (tx) => {
      const rows = await tx.$queryRaw`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE is_current = true)::int AS current,
          COUNT(*) FILTER (WHERE status ILIKE '%active%' OR status ILIKE '%rented%')::int AS active
        FROM contracts
        WHERE company_id = ${companyId}::uuid
      `;
      return rows[0] || { total: 0, current: 0, active: 0 };
    });
    res.json({ ok: true, contracts: result });
  } catch (e) {
    next(e);
  }
});

contractsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const unitId = req.query.unitId ? z.string().uuid().parse(req.query.unitId) : null;
    const status = req.query.status ? String(req.query.status) : null;
    const currentOnly = req.query.current === '1' || req.query.current === 'true';
    const search = (req.query.search || '').toString().trim();

    const result = await withCompanyContext(req.auth.companyId, async (tx) => {
      const where = {
        companyId: req.auth.companyId,
        ...(unitId ? { unitId } : {}),
        ...(status ? { status } : {}),
        ...(currentOnly ? { isCurrent: true } : {}),
        ...(search
          ? {
              OR: [
                { agreementNo: { contains: search, mode: 'insensitive' } },
                { status: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        tx.contract.findMany({
          where,
          orderBy: [{ updatedAt: 'desc' }],
          skip,
          take: limit,
          include: {
            unit: { select: { id: true, unitNo: true, building: { select: { id: true, name: true } } } },
            tenant: { select: { id: true, partyType: true, data: true } },
          },
        }),
        tx.contract.count({ where }),
      ]);
      return { items, total };
    });

    res.json({
      ok: true,
      ...paginationMeta(result.total, page, limit),
      items: result.items.map(mapContract),
    });
  } catch (e) {
    next(e);
  }
});

contractsRouter.post('/', requirePermission('manage_contracts', '*'), async (req, res, next) => {
  try {
    const body = contractBodySchema.parse(req.body);
    const companyId = req.auth.companyId;

    const contract = await withCompanyContext(companyId, async (tx) => {
      const unit = await tx.unit.findFirst({ where: { id: body.unitId, companyId } });
      assertFound(unit, 'Unit not found');

      if (body.isCurrent !== false) {
        await tx.contract.updateMany({
          where: { companyId, unitId: body.unitId, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.contract.create({
        data: {
          companyId,
          unitId: body.unitId,
          tenantId: body.tenantId || null,
          agreementNo: body.agreementNo || null,
          status: body.status,
          payload: body.payload || {},
          startDate: parseDate(body.startDate),
          endDate: parseDate(body.endDate),
          monthlyRent: parseDecimal(body.monthlyRent),
          isCurrent: body.isCurrent !== false,
        },
        include: {
          unit: { select: { id: true, unitNo: true, building: { select: { id: true, name: true } } } },
        },
      });
    });

    await writeAudit({
      companyId,
      userId: req.auth.userId,
      action: 'contract.create',
      entityType: 'contract',
      entityId: contract.id,
    });

    res.status(201).json({ ok: true, contract: mapContract(contract) });
  } catch (e) {
    next(e);
  }
});

contractsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const contract = await withCompanyContext(req.auth.companyId, (tx) =>
      tx.contract.findFirst({
        where: { id, companyId: req.auth.companyId },
        include: {
          unit: { select: { id: true, unitNo: true, building: { select: { id: true, name: true } } } },
          tenant: { select: { id: true, partyType: true, data: true } },
        },
      })
    );
    assertFound(contract, 'Contract not found');
    res.json({ ok: true, contract: mapContract(contract) });
  } catch (e) {
    next(e);
  }
});

contractsRouter.patch('/:id', requirePermission('manage_contracts', '*'), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = contractBodySchema.partial().parse(req.body);
    const companyId = req.auth.companyId;

    const contract = await withCompanyContext(companyId, async (tx) => {
      const existing = await tx.contract.findFirst({ where: { id, companyId } });
      assertFound(existing, 'Contract not found');

      if (body.isCurrent === true) {
        await tx.contract.updateMany({
          where: { companyId, unitId: existing.unitId, isCurrent: true, NOT: { id } },
          data: { isCurrent: false },
        });
      }

      return tx.contract.update({
        where: { id },
        data: {
          ...(body.unitId !== undefined ? { unitId: body.unitId } : {}),
          ...(body.tenantId !== undefined ? { tenantId: body.tenantId } : {}),
          ...(body.agreementNo !== undefined ? { agreementNo: body.agreementNo } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.payload !== undefined ? { payload: body.payload } : {}),
          ...(body.startDate !== undefined ? { startDate: parseDate(body.startDate) } : {}),
          ...(body.endDate !== undefined ? { endDate: parseDate(body.endDate) } : {}),
          ...(body.monthlyRent !== undefined ? { monthlyRent: parseDecimal(body.monthlyRent) } : {}),
          ...(body.isCurrent !== undefined ? { isCurrent: body.isCurrent } : {}),
        },
        include: {
          unit: { select: { id: true, unitNo: true, building: { select: { id: true, name: true } } } },
        },
      });
    });

    await writeAudit({
      companyId,
      userId: req.auth.userId,
      action: 'contract.update',
      entityType: 'contract',
      entityId: contract.id,
    });

    res.json({ ok: true, contract: mapContract(contract) });
  } catch (e) {
    next(e);
  }
});

contractsRouter.delete('/:id', requirePermission('manage_contracts', '*'), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const companyId = req.auth.companyId;

    await withCompanyContext(companyId, async (tx) => {
      const existing = await tx.contract.findFirst({ where: { id, companyId } });
      assertFound(existing, 'Contract not found');
      await tx.contract.delete({ where: { id } });
    });

    await writeAudit({
      companyId,
      userId: req.auth.userId,
      action: 'contract.delete',
      entityType: 'contract',
      entityId: id,
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
