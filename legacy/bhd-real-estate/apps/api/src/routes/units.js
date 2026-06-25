import { Router } from 'express';
import { z } from 'zod';
import { withCompanyContext, prisma } from '../lib/prisma.js';
import { requireAuth, requireCompany, requirePermission } from '../middleware/auth.js';
import { parsePagination, paginationMeta } from '../lib/pagination.js';
import { writeAudit } from '../services/audit.js';
import { assertCompanyWithinLimits, requireActiveCompany } from '../lib/company-limits.js';
import { assertFound } from '../lib/errors.js';

export const unitsRouter = Router();

unitsRouter.use(requireAuth, requireCompany, requireActiveCompany);

/** أرقام مجمّعة للوحة التحكم — استعلام SQL سريع */
unitsRouter.get('/summary', async (req, res, next) => {
  try {
    const companyId = req.auth.companyId;
    const result = await withCompanyContext(companyId, async (tx) => {
      const rows = await tx.$queryRaw`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'Rented')::int AS rented,
          COUNT(*) FILTER (WHERE status = 'Vacant')::int AS vacant,
          COUNT(*) FILTER (WHERE status = 'Reserved')::int AS reserved
        FROM units
        WHERE company_id = ${companyId}::uuid
      `;
      const buildingCount = await tx.building.count();
      return { row: rows[0] || { total: 0, rented: 0, vacant: 0, reserved: 0 }, buildingCount };
    });
    res.json({
      ok: true,
      buildings: result.buildingCount,
      units: result.row,
    });
  } catch (e) {
    next(e);
  }
});

unitsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const buildingId = req.query.buildingId ? z.string().uuid().parse(req.query.buildingId) : null;
    const search = (req.query.search || '').toString().trim();

    const result = await withCompanyContext(req.auth.companyId, async (tx) => {
      const where = {
        companyId: req.auth.companyId,
        ...(buildingId ? { buildingId } : {}),
        ...(search
          ? {
              OR: [
                { unitNo: { contains: search, mode: 'insensitive' } },
                { floor: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        tx.unit.findMany({
          where,
          orderBy: [{ buildingId: 'asc' }, { unitNo: 'asc' }],
          skip,
          take: limit,
          include: { building: { select: { id: true, name: true } } },
        }),
        tx.unit.count({ where }),
      ]);
      return { items, total };
    });

    res.json({
      ok: true,
      ...paginationMeta(result.total, page, limit),
      items: result.items,
    });
  } catch (e) {
    next(e);
  }
});

unitsRouter.post('/', requirePermission('manage_properties', '*'), async (req, res, next) => {
  try {
    const body = z
      .object({
        buildingId: z.string().uuid(),
        unitNo: z.string().min(1).max(80),
        floor: z.string().optional(),
        unitType: z.string().optional(),
        status: z.string().optional(),
        managedMeta: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    const companyId = req.auth.companyId;
    await assertCompanyWithinLimits(companyId, { addUnits: 1 });

    const unit = await withCompanyContext(companyId, async (tx) => {
      const building = await tx.building.findFirst({
        where: { id: body.buildingId, companyId },
      });
      assertFound(building, 'Building not found');

      return tx.unit.create({
        data: {
          companyId,
          buildingId: body.buildingId,
          unitNo: body.unitNo.trim(),
          floor: body.floor || null,
          unitType: body.unitType || null,
          status: body.status || 'Vacant',
          managedMeta: body.managedMeta || {},
        },
      });
    });

    await writeAudit({
      companyId,
      userId: req.auth.userId,
      action: 'unit.create',
      entityType: 'unit',
      entityId: unit.id,
    });

    res.status(201).json({ ok: true, unit });
  } catch (e) {
    next(e);
  }
});

unitsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const unit = await withCompanyContext(req.auth.companyId, (tx) =>
      tx.unit.findFirst({
        where: { id, companyId: req.auth.companyId },
        include: { building: true },
      })
    );
    assertFound(unit, 'Unit not found');
    res.json({ ok: true, unit });
  } catch (e) {
    next(e);
  }
});

unitsRouter.patch('/:id', requirePermission('manage_properties', '*'), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = z
      .object({
        unitNo: z.string().min(1).max(80).optional(),
        floor: z.string().optional().nullable(),
        unitType: z.string().optional().nullable(),
        status: z.string().optional(),
        managedMeta: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    const unit = await withCompanyContext(req.auth.companyId, async (tx) => {
      const existing = await tx.unit.findFirst({ where: { id, companyId: req.auth.companyId } });
      assertFound(existing);
      return tx.unit.update({
        where: { id },
        data: {
          unitNo: body.unitNo?.trim(),
          floor: body.floor === undefined ? undefined : body.floor,
          unitType: body.unitType === undefined ? undefined : body.unitType,
          status: body.status,
          managedMeta: body.managedMeta,
        },
      });
    });

    await writeAudit({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: 'unit.update',
      entityType: 'unit',
      entityId: unit.id,
    });

    res.json({ ok: true, unit });
  } catch (e) {
    next(e);
  }
});
