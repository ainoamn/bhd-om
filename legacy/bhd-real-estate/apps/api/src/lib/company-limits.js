import { prisma, withCompanyContext } from './prisma.js';
import { ApiError } from './errors.js';

export async function getCompanyUsage(companyId) {
  return withCompanyContext(companyId, async (tx) => {
    const [users, units] = await Promise.all([
      tx.companyUser.count({ where: { companyId, isActive: true } }),
      tx.unit.count({ where: { companyId } }),
    ]);
    return { users, units };
  });
}

export async function assertCompanyWithinLimits(companyId, { addUsers = 0, addUnits = 0 } = {}) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new ApiError(404, 'company_not_found', 'Company not found');
  if (company.status === 'suspended') {
    throw new ApiError(403, 'company_suspended', 'Company subscription is suspended');
  }
  const usage = await getCompanyUsage(companyId);
  if (usage.users + addUsers > company.maxUsers) {
    throw new ApiError(403, 'user_limit', 'Company user limit reached');
  }
  if (usage.units + addUnits > company.maxUnits) {
    throw new ApiError(403, 'unit_limit', 'Company unit limit reached');
  }
  return { company, usage };
}

export async function requireActiveCompany(req, _res, next) {
  try {
    if (!req.auth?.companyId) return next(new ApiError(403, 'company_required', 'Company context required'));
    const company = await prisma.company.findUnique({ where: { id: req.auth.companyId } });
    if (!company) return next(new ApiError(404, 'company_not_found', 'Company not found'));
    if (company.status !== 'active' && company.status !== 'trial') {
      return next(new ApiError(403, 'company_inactive', 'Company is not active'));
    }
    if (company.status === 'trial' && company.trialEndsAt && company.trialEndsAt < new Date()) {
      return next(new ApiError(403, 'trial_expired', 'Company trial has expired'));
    }
    req.company = company;
    next();
  } catch (e) {
    next(e);
  }
}
