/**
 * ترحيل ملفات file_entries من SQLite المحلي إلى تخزين السحابة.
 *
 *   cd apps/api
 *   set DATABASE_URL=...
 *   node ../../tools/migrate-files-to-cloud.js --db path/to/rental.db --data-dir path/to/BHD-Real-Estate --company-slug bhd-demo
 */
import './load-api-env.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requireFromApi = createRequire(path.join(root, 'apps', 'api', 'package.json'));
const { PrismaClient } = requireFromApi('@prisma/client');
import {
  saveFileFromDataUrl,
  getFileStorageRoot,
} from '../apps/api/src/services/file-storage.js';

const prisma = new PrismaClient();

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { db: '', dataDir: '', companySlug: 'bhd-demo', dryRun: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db') out.db = args[++i];
    else if (args[i] === '--data-dir') out.dataDir = args[++i];
    else if (args[i] === '--company-slug') out.companySlug = args[++i];
    else if (args[i] === '--dry-run') out.dryRun = true;
  }
  return out;
}

async function withCompany(companyId, fn) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`SELECT set_config('app.current_company_id', $1, true)`, companyId);
    return fn(tx);
  });
}

function fileToDataUrl(absPath, mimeHint) {
  const buf = fs.readFileSync(absPath);
  const ext = path.extname(absPath).toLowerCase();
  const mime =
    mimeHint ||
    (ext === '.pdf'
      ? 'application/pdf'
      : ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'application/octet-stream');
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function main() {
  const { db: dbPath, dataDir, companySlug, dryRun } = parseArgs();
  if (!dbPath || !fs.existsSync(dbPath)) {
    console.error('Usage: node tools/migrate-files-to-cloud.js --db rental.db --data-dir DATA_DIR [--company-slug bhd-demo]');
    process.exit(1);
  }

  const company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) {
    console.error(`Company not found: ${companySlug}`);
    process.exit(1);
  }

  const sqlite = new DatabaseSync(path.resolve(dbPath));
  const rows = sqlite.prepare('SELECT * FROM file_entries ORDER BY updated_at').all();
  console.log('file_entries:', rows.length);

  let found = 0;
  let missing = 0;
  for (const row of rows) {
    const rel = String(row.file_path || '').trim();
    let abs = rel;
    if (dataDir && rel && !path.isAbsolute(rel)) {
      abs = path.join(path.resolve(dataDir), rel.split('/').join(path.sep));
    }
    if (abs && fs.existsSync(abs)) found += 1;
    else missing += 1;
  }
  console.log('Files on disk:', found, '| missing path:', missing);

  if (dryRun) {
    console.log('\nDry run — no writes. Remove --dry-run to migrate.');
    return;
  }

  let ok = 0;
  let skip = 0;

  await withCompany(company.id, async (tx) => {
    for (const row of rows) {
      const rel = String(row.file_path || '').trim();
      let abs = rel;
      if (dataDir && rel && !path.isAbsolute(rel)) {
        abs = path.join(path.resolve(dataDir), rel.split('/').join(path.sep));
      }
      if (!abs || !fs.existsSync(abs)) {
        skip += 1;
        continue;
      }
      const dataUrl = fileToDataUrl(abs);
      const saved = await saveFileFromDataUrl(company.id, {
        fileName: row.file_name || path.basename(abs),
        building: row.building,
        unit: row.unit,
        tenant: row.tenant,
        docType: row.doc_type,
        category: 'other',
      }, dataUrl);

      await tx.fileObject.create({
        data: {
          companyId: company.id,
          storageKey: saved.storageKey,
          fileName: saved.fileName,
          mimeType: saved.mimeType,
          byteSize: BigInt(saved.byteSize),
          building: row.building || null,
          unit: row.unit || null,
          tenant: row.tenant || null,
          docType: row.doc_type || null,
          category: 'other',
          meta: { legacyFileId: row.id, legacyPath: rel },
        },
      });
      ok += 1;
    }
  });

  console.log(`Migrated files: ${ok}, skipped: ${skip}`);
  console.log('Storage root:', getFileStorageRoot());
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
