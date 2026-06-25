import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  authenticateUser,
  issueTokenPair,
  listUserCompanies,
  getMembership,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';
import { ApiError } from '../lib/errors.js';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

authRouter.post('/login', async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);
    const user = await authenticateUser(body.email, body.password);
    const companies = await listUserCompanies(user.id);

    if (companies.length === 1) {
      const c = companies[0];
      const tokens = await issueTokenPair({
        user,
        companyId: c.id,
        role: c.role,
        permissions: c.permissions,
      });
      return res.json({
        ok: true,
        user: { id: user.id, email: user.email, displayName: user.displayName },
        company: { id: c.id, slug: c.slug, nameAr: c.nameAr, nameEn: c.nameEn },
        role: c.role,
        permissions: c.permissions,
        ...tokens,
      });
    }

    const tokens = await issueTokenPair({ user, companyId: null, role: null, permissions: [] });
    res.json({
      ok: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
      companies,
      needsCompanySelection: true,
      ...tokens,
    });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/select-company', requireAuth, async (req, res, next) => {
  try {
    const companyId = z.string().uuid().parse(req.body.companyId);
    const membership = await getMembership(req.auth.userId, companyId);
    if (!membership || !membership.isActive) {
      throw new ApiError(403, 'company_forbidden', 'Not a member of this company');
    }
    const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
    const tokens = await issueTokenPair({
      user,
      companyId,
      role: membership.role,
      permissions: membership.permissions,
    });
    res.json({
      ok: true,
      company: {
        id: membership.company.id,
        slug: membership.company.slug,
        nameAr: membership.company.nameAr,
        nameEn: membership.company.nameEn,
      },
      role: membership.role,
      permissions: membership.permissions,
      ...tokens,
    });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = z.string().min(10).parse(req.body.refreshToken);
    const tokens = await rotateRefreshToken(refreshToken);
    res.json({ ok: true, ...tokens });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
    const companies = await listUserCompanies(req.auth.userId);
    res.json({
      ok: true,
      user: { id: user.id, email: user.email, displayName: user.displayName, locale: user.locale },
      companyId: req.auth.companyId,
      role: req.auth.role,
      permissions: req.auth.permissions,
      companies,
    });
  } catch (e) {
    next(e);
  }
});
