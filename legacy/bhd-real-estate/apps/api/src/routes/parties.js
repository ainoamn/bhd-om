import { Router } from 'express';
import { z } from 'zod';
import { withCompanyContext } from '../lib/prisma.js';
import { requireAuth, requireCompany, requirePermission } from '../middleware/auth.js';
import { parsePagination, paginationMeta } from '../lib/pagination.js';
import { writeAudit } from '../services/audit.js';
import { assertFound } from '../lib/errors.js';
import { requireActiveCompany } from '../lib/company-limits.js';

export const partiesRouter = Router();

partiesRouter.use(requireAuth, requireCompany, requireActiveCompany);

partiesRouter.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const partyType = req.query.partyType ? String(req.query.partyType) : null;
    const search = (req.query.search || '').toString().trim();

    const result = await withCompanyContext(req.auth.companyId, async (tx) => {
      const where = {
        ...(partyType ? { partyType } : {}),
      };
      const [items, total] = await Promise.all([
        tx.party.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        tx.party.count({ where }),
      ]);
      let filtered = items;
      if (search) {
        const q = search.toLowerCase();
        filtered = items.filter((p) => JSON.stringify(p.data || {}).toLowerCase().includes(q));
      }
      return { items: filtered, total: search ? filtered.length : total };
    });

    res.json({ ok: true, ...paginationMeta(result.total, page, limit), items: result.items });
  } catch (e) {
    next(e);
  }
});

/** مزامنة دفتر العناوين — entries[] كما في bhd_address_book */
partiesRouter.post('/sync-address-book', requirePermission('manage_contracts', '*'), async (req, res, next) => {
  try {
    const entries = z.array(z.record(z.unknown())).parse(req.body.entries || []);
    const companyId = req.auth.companyId;

    await withCompanyContext(companyId, async (tx) => {
      await tx.party.deleteMany({ where: { companyId, partyType: 'address_book' } });
      for (const entry of entries) {
        const partyType =
          toStr(entry.type).toLowerCase() === 'owner'
            ? 'owner'
            : toStr(entry.type).toLowerCase() === 'company'
              ? 'company'
              : 'tenant';
        await tx.party.create({
          data: {
            companyId,
            partyType: `address_book_${partyType}`,
            data: entry,
          },
        });
      }
    });

    await writeAudit({
      companyId,
      userId: req.auth.userId,
      action: 'parties.sync_address_book',
      entityType: 'party',
      meta: { count: entries.length },
    });

    res.json({ ok: true, count: entries.length });
  } catch (e) {
    next(e);
  }
});

partiesRouter.get('/address-book', async (req, res, next) => {
  try {
    const rows = await withCompanyContext(req.auth.companyId, (tx) =>
      tx.party.findMany({
        where: { partyType: { startsWith: 'address_book_' } },
        orderBy: { updatedAt: 'asc' },
      })
    );
    res.json({
      ok: true,
      entries: rows.map((r) => ({ ...r.data, _cloudPartyId: r.id })),
    });
  } catch (e) {
    next(e);
  }
});

function toStr(v) {
  return v == null ? '' : String(v);
}
