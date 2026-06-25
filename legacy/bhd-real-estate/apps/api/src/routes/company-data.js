import { Router } from 'express';
import express from 'express';
import { z } from 'zod';
import { withCompanyContext } from '../lib/prisma.js';
import { requireAuth, requireCompany } from '../middleware/auth.js';
import { requireActiveCompany } from '../lib/company-limits.js';

export const companyDataRouter = Router();

const ALLOWED_KEY = /^bhd_[a-z0-9_]+$/;
const BLOCKED_KEYS = new Set(['bhd_auth_session', 'bhd_cloud_session']);

function isAllowedKey(key) {
  return ALLOWED_KEY.test(key) && !BLOCKED_KEYS.has(key);
}

companyDataRouter.use(requireAuth, requireCompany, requireActiveCompany);

companyDataRouter.get('/', async (req, res, next) => {
  try {
    const keysParam = toStr(req.query.keys);
    const prefix = toStr(req.query.prefix) || 'bhd_';
    const keyList = keysParam
      ? keysParam.split(',').map((k) => k.trim()).filter(isAllowedKey)
      : null;

    const rows = await withCompanyContext(req.auth.companyId, (tx) =>
      tx.companyDataEntry.findMany({
        where: keyList?.length
          ? { key: { in: keyList } }
          : { key: { startsWith: prefix } },
        select: { key: true, value: true, updatedAt: true },
      })
    );

    const out = {};
    rows.forEach((r) => {
      out[r.key] = r.value;
    });
    res.json({ ok: true, data: out });
  } catch (e) {
    next(e);
  }
});

companyDataRouter.get('/:key', async (req, res, next) => {
  try {
    const key = req.params.key;
    if (!isAllowedKey(key)) return res.status(400).json({ ok: false, error: 'invalid_key' });
    const row = await withCompanyContext(req.auth.companyId, (tx) =>
      tx.companyDataEntry.findUnique({ where: { companyId_key: { companyId: req.auth.companyId, key } } })
    );
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    res.type('application/json').send(row.value);
  } catch (e) {
    next(e);
  }
});

companyDataRouter.put('/:key', async (req, res, next) => {
  try {
    const key = req.params.key;
    if (!isAllowedKey(key)) return res.status(400).json({ ok: false, error: 'invalid_key' });
    const value = stringifyValue(req.body);
    await withCompanyContext(req.auth.companyId, (tx) =>
      tx.companyDataEntry.upsert({
        where: { companyId_key: { companyId: req.auth.companyId, key } },
        create: { companyId: req.auth.companyId, key, value },
        update: { value },
      })
    );
    res.json({ ok: true, key });
  } catch (e) {
    next(e);
  }
});

/** bulk — نفس أسلوب kv_store (قيم نصية JSON) */
companyDataRouter.post(
  '/bulk',
  express.json({ limit: '50mb' }),
  async (req, res, next) => {
    try {
      const obj = req.body;
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
        return res.status(400).json({ ok: false, error: 'expected_object' });
      }
      const entries = Object.entries(obj).filter(([k]) => isAllowedKey(k));
      await withCompanyContext(req.auth.companyId, async (tx) => {
        for (const [key, val] of entries) {
          const value = stringifyValue(val);
          await tx.companyDataEntry.upsert({
            where: { companyId_key: { companyId: req.auth.companyId, key } },
            create: { companyId: req.auth.companyId, key, value },
            update: { value },
          });
        }
      });
      res.json({ ok: true, count: entries.length });
    } catch (e) {
      next(e);
    }
  }
);

function stringifyValue(body) {
  if (body === undefined || body === null) return 'null';
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

function toStr(v) {
  return v == null ? '' : String(v);
}
