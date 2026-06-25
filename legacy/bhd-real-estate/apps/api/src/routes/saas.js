import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { hashPassword, issueTokenPair } from '../lib/auth.js';
import { SUBSCRIPTION_PLANS, getPlan, slugifyCompanySlug } from '../lib/plans.js';
import { config } from '../config.js';
import { ApiError } from '../lib/errors.js';

export const saasRouter = Router();

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

saasRouter.get('/plans', (_req, res) => {
  res.json({
    ok: true,
    plans: Object.values(SUBSCRIPTION_PLANS).map((p) => ({
      code: p.code,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      maxUsers: p.maxUsers,
      maxUnits: p.maxUnits,
      trialDays: p.trialDays || null,
    })),
  });
});

/** تسجيل شركة جديدة + مدير — API فقط (لا واجهة منفصلة) */
saasRouter.post('/register', registerLimiter, async (req, res, next) => {
  try {
    if (config.saasRegistrationSecret) {
      const key = req.headers['x-registration-key'] || req.body?.registrationKey;
      if (key !== config.saasRegistrationSecret) {
        throw new ApiError(403, 'registration_forbidden', 'Invalid registration key');
      }
    }

    const body = z
      .object({
        companyNameAr: z.string().min(2).max(200),
        companyNameEn: z.string().max(200).optional(),
        slug: z.string().min(2).max(48).optional(),
        planCode: z.enum(['trial', 'starter', 'business', 'enterprise']).default('trial'),
        adminEmail: z.string().email(),
        adminPassword: z.string().min(8),
        adminDisplayName: z.string().min(2).max(120).optional(),
      })
      .parse(req.body);

    const plan = getPlan(body.planCode);
    let slug = body.slug ? slugifyCompanySlug(body.slug) : slugifyCompanySlug(body.companyNameEn || body.companyNameAr);
    const existingSlug = await prisma.company.findUnique({ where: { slug } });
    if (existingSlug) slug = `${slug}-${Date.now().toString(36).slice(-4)}`;

    const email = body.adminEmail.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email } });

    const trialEndsAt =
      plan.trialDays != null
        ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000)
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          slug,
          nameAr: body.companyNameAr,
          nameEn: body.companyNameEn || body.companyNameAr,
          planCode: plan.code,
          maxUsers: plan.maxUsers,
          maxUnits: plan.maxUnits,
          status: plan.code === 'trial' ? 'trial' : 'active',
          ...(trialEndsAt ? { trialEndsAt } : {}),
        },
      });

      let user = existingUser;
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            passwordHash: await hashPassword(body.adminPassword),
            displayName: body.adminDisplayName || body.companyNameAr,
            locale: 'ar',
          },
        });
      }

      await tx.companyUser.create({
        data: {
          companyId: company.id,
          userId: user.id,
          role: 'admin',
          permissions: ['*'],
          isActive: true,
        },
      });

      return { company, user };
    });

    const tokens = await issueTokenPair({
      user: result.user,
      companyId: result.company.id,
      role: 'admin',
      permissions: ['*'],
    });

    res.status(201).json({
      ok: true,
      company: {
        id: result.company.id,
        slug: result.company.slug,
        nameAr: result.company.nameAr,
        nameEn: result.company.nameEn,
        planCode: result.company.planCode,
        maxUsers: result.company.maxUsers,
        maxUnits: result.company.maxUnits,
        status: result.company.status,
      },
      user: { id: result.user.id, email: result.user.email },
      ...tokens,
    });
  } catch (e) {
    next(e);
  }
});
