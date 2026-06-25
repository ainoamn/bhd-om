import { Router } from 'express';
import { z } from 'zod';
import { prisma, withCompanyContext } from '../lib/prisma.js';
import { requireAuth, requireCompany, requirePermission } from '../middleware/auth.js';
import { requireActiveCompany, getCompanyUsage, assertCompanyWithinLimits } from '../lib/company-limits.js';
import { hashPassword } from '../lib/auth.js';
import { writeAudit } from '../services/audit.js';
import { ApiError } from '../lib/errors.js';

export const companiesRouter = Router();

companiesRouter.use(requireAuth);

companiesRouter.get('/current', requireCompany, requireActiveCompany, async (req, res, next) => {
  try {
    const company = req.company;
    const usage = await getCompanyUsage(company.id);
    res.json({
      ok: true,
      company: {
        id: company.id,
        slug: company.slug,
        nameAr: company.nameAr,
        nameEn: company.nameEn,
        planCode: company.planCode,
        maxUsers: company.maxUsers,
        maxUnits: company.maxUnits,
        status: company.status,
        trialEndsAt: company.trialEndsAt,
      },
      usage,
    });
  } catch (e) {
    next(e);
  }
});

companiesRouter.get('/members', requireCompany, requireActiveCompany, requirePermission('manage_users', '*'), async (req, res, next) => {
  try {
    const rows = await withCompanyContext(req.auth.companyId, (tx) =>
      tx.companyUser.findMany({
        where: { companyId: req.auth.companyId },
        include: { user: { select: { id: true, email: true, displayName: true, locale: true } } },
      })
    );
    res.json({
      ok: true,
      members: rows.map((r) => ({
        userId: r.userId,
        email: r.user.email,
        displayName: r.user.displayName,
        role: r.role,
        permissions: r.permissions,
        isActive: r.isActive,
      })),
    });
  } catch (e) {
    next(e);
  }
});

/** إضافة مستخدم للشركة — للمدير فقط */
companiesRouter.post('/members', requireCompany, requireActiveCompany, requirePermission('manage_users', '*'), async (req, res, next) => {
  try {
    await assertCompanyWithinLimits(req.auth.companyId, { addUsers: 1 });

    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(8),
        displayName: z.string().min(2).max(120).optional(),
        role: z.enum(['admin', 'staff', 'accountant', 'portal']).default('staff'),
        permissions: z.array(z.string()).default([]),
      })
      .parse(req.body);

    const email = body.email.toLowerCase().trim();
    const companyId = req.auth.companyId;

    const member = await prisma.$transaction(async (tx) => {
      let user = await tx.user.findUnique({ where: { email } });
      if (!user) {
        user = await tx.user.create({
          data: {
            email,
            passwordHash: await hashPassword(body.password),
            displayName: body.displayName || email,
            locale: 'ar',
          },
        });
      }

      const existing = await tx.companyUser.findUnique({
        where: { companyId_userId: { companyId, userId: user.id } },
      });
      if (existing?.isActive) {
        throw new ApiError(409, 'member_exists', 'User is already a member of this company');
      }

      const perms = body.role === 'admin' ? ['*'] : body.permissions;

      if (existing) {
        return tx.companyUser.update({
          where: { companyId_userId: { companyId, userId: user.id } },
          data: { role: body.role, permissions: perms, isActive: true },
        });
      }

      return tx.companyUser.create({
        data: {
          companyId,
          userId: user.id,
          role: body.role,
          permissions: perms,
          isActive: true,
        },
      });
    });

    await writeAudit({
      companyId,
      userId: req.auth.userId,
      action: 'company.member_add',
      entityType: 'company_user',
      meta: { email, role: body.role },
    });

    res.status(201).json({ ok: true, member: { userId: member.userId, role: member.role } });
  } catch (e) {
    next(e);
  }
});

companiesRouter.patch('/members/:userId', requireCompany, requireActiveCompany, requirePermission('manage_users', '*'), async (req, res, next) => {
  try {
    const userId = z.string().uuid().parse(req.params.userId);
    const body = z
      .object({
        role: z.enum(['admin', 'staff', 'accountant', 'portal']).optional(),
        permissions: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      })
      .parse(req.body);

    const updated = await withCompanyContext(req.auth.companyId, (tx) =>
      tx.companyUser.update({
        where: { companyId_userId: { companyId: req.auth.companyId, userId } },
        data: {
          ...(body.role !== undefined ? { role: body.role } : {}),
          ...(body.permissions !== undefined ? { permissions: body.permissions } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
      })
    );

    res.json({ ok: true, member: updated });
  } catch (e) {
    next(e);
  }
});
