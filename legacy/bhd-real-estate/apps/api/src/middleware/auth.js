import { verifyAccessToken } from '../lib/auth.js';
import { ApiError } from '../lib/errors.js';

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return next(new ApiError(401, 'unauthorized', 'Authorization required'));

  const payload = verifyAccessToken(token);
  req.auth = {
    userId: payload.sub,
    email: payload.email,
    companyId: payload.companyId || null,
    role: payload.role || null,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
  };
  next();
}

export function requireCompany(req, _res, next) {
  if (!req.auth?.companyId) {
    return next(new ApiError(403, 'company_required', 'Select a company context first'));
  }
  next();
}

export function requirePermission(...keys) {
  return (req, _res, next) => {
    if (req.auth?.role === 'admin') return next();
    const perms = new Set(req.auth?.permissions || []);
    if (keys.some((k) => perms.has(k) || perms.has('*'))) return next();
    return next(new ApiError(403, 'forbidden', 'Insufficient permissions'));
  };
}
