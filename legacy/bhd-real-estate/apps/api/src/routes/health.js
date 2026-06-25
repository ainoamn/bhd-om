import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, service: 'bhd-real-estate-api', db: 'up' });
  } catch (e) {
    res.status(503).json({ ok: false, service: 'bhd-real-estate-api', db: 'down', error: String(e.message) });
  }
});
