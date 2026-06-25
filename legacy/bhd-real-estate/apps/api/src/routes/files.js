import { Router } from 'express';
import { z } from 'zod';
import { withCompanyContext } from '../lib/prisma.js';
import { requireAuth, requireCompany } from '../middleware/auth.js';
import { assertFound } from '../lib/errors.js';
import {
  saveFileFromDataUrl,
  readFileByStorageKey,
  deleteFileByStorageKey,
} from '../services/file-storage.js';
import { writeAudit } from '../services/audit.js';
import { requireActiveCompany } from '../lib/company-limits.js';

export const filesRouter = Router();

filesRouter.use(requireAuth, requireCompany, requireActiveCompany);

const uploadSchema = z.object({
  dataUrl: z.string().min(10),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().optional(),
  building: z.string().optional(),
  unit: z.string().optional(),
  agreementNo: z.string().optional(),
  tenant: z.string().optional(),
  docType: z.string().optional(),
  category: z.string().optional(),
});

filesRouter.post('/upload', async (req, res, next) => {
  try {
    const body = uploadSchema.parse(req.body);
    const companyId = req.auth.companyId;
    const saved = await saveFileFromDataUrl(companyId, body, body.dataUrl);

    const row = await withCompanyContext(companyId, (tx) =>
      tx.fileObject.create({
        data: {
          companyId,
          storageKey: saved.storageKey,
          fileName: saved.fileName,
          mimeType: saved.mimeType,
          byteSize: BigInt(saved.byteSize),
          building: body.building || null,
          unit: body.unit || null,
          tenant: body.tenant || null,
          docType: body.docType || null,
          category: body.category || null,
          meta: {
            agreementNo: body.agreementNo || null,
          },
        },
      })
    );

    await writeAudit({
      companyId,
      userId: req.auth.userId,
      action: 'file.upload',
      entityType: 'file',
      entityId: row.id,
    });

    res.status(201).json({
      ok: true,
      fileId: row.id,
      name: row.fileName,
      type: row.mimeType,
      size: Number(row.byteSize),
      storedOnDisk: true,
      relativePath: row.storageKey,
    });
  } catch (e) {
    next(e);
  }
});

filesRouter.get('/:id', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const row = await withCompanyContext(req.auth.companyId, (tx) =>
      tx.fileObject.findFirst({ where: { id, companyId: req.auth.companyId } })
    );
    assertFound(row, 'File not found');
    res.json({
      ok: true,
      file: {
        id: row.id,
        fileName: row.fileName,
        mimeType: row.mimeType,
        byteSize: Number(row.byteSize),
        building: row.building,
        unit: row.unit,
        category: row.category,
        relativePath: row.storageKey,
      },
    });
  } catch (e) {
    next(e);
  }
});

filesRouter.get('/:id/content', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const row = await withCompanyContext(req.auth.companyId, (tx) =>
      tx.fileObject.findFirst({ where: { id, companyId: req.auth.companyId } })
    );
    assertFound(row, 'File not found');
    const buf = await readFileByStorageKey(row.storageKey);
    if (!buf) return res.status(404).json({ ok: false, error: 'file_missing' });
    res.setHeader('content-type', row.mimeType || 'application/octet-stream');
    res.setHeader('content-disposition', `inline; filename="${encodeURIComponent(row.fileName)}"`);
    res.send(buf);
  } catch (e) {
    next(e);
  }
});

filesRouter.delete('/:id', async (req, res, next) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    await withCompanyContext(req.auth.companyId, async (tx) => {
      const row = await tx.fileObject.findFirst({ where: { id, companyId: req.auth.companyId } });
      assertFound(row);
      await deleteFileByStorageKey(row.storageKey);
      await tx.fileObject.delete({ where: { id } });
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});
