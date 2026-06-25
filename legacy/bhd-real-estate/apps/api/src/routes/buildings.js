import { Router } from 'express';
import { z } from 'zod';
import { withCompanyContext } from '../lib/prisma.js';
import { requireAuth, requireCompany, requirePermission } from '../middleware/auth.js';
import { parsePagination, paginationMeta } from '../lib/pagination.js';
import { requireActiveCompany } from '../lib/company-limits.js';
import { assertFound } from '../lib/errors.js';
import { writeAudit } from '../services/audit.js';

export const buildingsRouter = Router();

buildingsRouter.use(requireAuth, requireCompany, requireActiveCompany);

buildingsRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const search = (req.query.search || '').toString().trim();

    const result = await withCompanyContext(req.auth.companyId, async (tx) => {
      const where = search
        ? { name: { contains: search, mode: 'insensitive' } }
        : {};
      const [items, total] = await Promise.all([
        tx.building.findMany({
          where,
          orderBy: { name: 'asc' },
          skip,
          take: limit,
          include: { _count: { select: { units: true } } },
        }),
        tx.building.count({ where }),
      ]);
      return { items, total };
    });

    res.json({
      ok: true,
      ...paginationMeta(result.total, page, limit),
      items: result.items.map((b) => ({
        id: b.id,
        name: b.name,
        status: b.status,
        profile: b.profile,
        unitCount: b._count.units,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

buildingsRouter.post('/', requirePermission('manage_properties', '*'), async (req, res, next) => {
  try {
    const body = z
      .object({
        name: z.string().min(1).max(200),
        status: z.string().optional(),
        profile: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    const building = await withCompanyContext(req.auth.companyId, (tx) =>
      tx.building.create({
        data: {
          companyId: req.auth.companyId,
          name: body.name.trim(),
          status: body.status || null,
          profile: body.profile || {},
        },
      })
    );

    await writeAudit({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: 'building.create',
      entityType: 'building',
      entityId: building.id,
    });

    res.status(201).json({ ok: true, building });
  } catch (e) {
    next(e);
  }
});

buildingsRouter.get('/:id', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const building = await withCompanyContext(req.auth.companyId, (tx) =>
      tx.building.findFirst({
        where: { id, companyId: req.auth.companyId },
        include: { _count: { select: { units: true } } },
      })
    );
    assertFound(building, 'Building not found');
    res.json({
      ok: true,
      building: {
        ...building,
        unitCount: building._count.units,
        _count: undefined,
      },
    });
  } catch (e) {
    next(e);
  }
});

buildingsRouter.patch('/:id', requirePermission('manage_properties', '*'), async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const body = z
      .object({
        name: z.string().min(1).max(200).optional(),
        status: z.string().optional().nullable(),
        profile: z.record(z.unknown()).optional(),
      })
      .parse(req.body);

    const building = await withCompanyContext(req.auth.companyId, async (tx) => {
      const existing = await tx.building.findFirst({ where: { id, companyId: req.auth.companyId } });
      assertFound(existing);
      return tx.building.update({
        where: { id },
        data: {
          name: body.name?.trim() ?? undefined,
          status: body.status === undefined ? undefined : body.status,
          profile: body.profile ?? undefined,
        },
      });
    });

    await writeAudit({
      companyId: req.auth.companyId,
      userId: req.auth.userId,
      action: 'building.update',
      entityType: 'building',
      entityId: building.id,
    });

    res.json({ ok: true, building });
  } catch (e) {
    next(e);
  }
});
