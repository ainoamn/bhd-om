import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from './prisma.js';
import { ApiError } from './errors.js';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessTtl,
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: `${config.jwtRefreshTtlDays}d`,
  });
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwtAccessSecret);
  } catch {
    throw new ApiError(401, 'invalid_token', 'Invalid or expired access token');
  }
}

export async function issueTokenPair({ user, companyId, role, permissions }) {
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    companyId: companyId || null,
    role: role || null,
    permissions: permissions || [],
  });

  const refreshToken = signRefreshToken({
    sub: user.id,
    companyId: companyId || null,
    jti: crypto.randomUUID(),
  });

  const decoded = jwt.decode(refreshToken);
  const expiresAt = new Date((decoded.exp || 0) * 1000);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      companyId: companyId || null,
      tokenHash: hashToken(refreshToken),
      expiresAt,
    },
  });

  return { accessToken, refreshToken, expiresAt };
}

export async function rotateRefreshToken(oldRefreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, config.jwtRefreshSecret);
  } catch {
    throw new ApiError(401, 'invalid_refresh', 'Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findFirst({
    where: {
      tokenHash: hashToken(oldRefreshToken),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: true },
  });

  if (!stored) throw new ApiError(401, 'invalid_refresh', 'Refresh token revoked or unknown');

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const user = stored.user;
  let role = null;
  let permissions = [];

  if (decoded.companyId) {
    const membership = await prisma.companyUser.findUnique({
      where: {
        companyId_userId: {
          companyId: decoded.companyId,
          userId: user.id,
        },
      },
    });
    if (!membership || !membership.isActive) {
      throw new ApiError(403, 'company_forbidden', 'No active membership for company');
    }
    role = membership.role;
    permissions = membership.permissions;
  }

  return issueTokenPair({
    user,
    companyId: decoded.companyId || null,
    role,
    permissions,
  });
}

export async function revokeRefreshToken(refreshToken) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function authenticateUser(email, password) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(401, 'invalid_credentials', 'Invalid email or password');
  }
  return user;
}

export async function listUserCompanies(userId) {
  const rows = await prisma.companyUser.findMany({
    where: { userId, isActive: true },
    include: { company: true },
  });
  return rows.map((r) => ({
    id: r.company.id,
    slug: r.company.slug,
    nameAr: r.company.nameAr,
    nameEn: r.company.nameEn,
    role: r.role,
    permissions: r.permissions,
  }));
}

export async function getMembership(userId, companyId) {
  return prisma.companyUser.findUnique({
    where: { companyId_userId: { companyId, userId } },
    include: { company: true },
  });
}
