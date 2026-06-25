const fs = require('fs');
const path = require('path');

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

/**
 * نسخ ملف قاعدة البيانات إلى مجلد (مثلاً مجلد Dropbox المتزامن).
 * @returns {{ ok: boolean, dest?: string, error?: string }}
 */
function runBackup(dbPath, backupDir) {
  try {
    if (!backupDir || !fs.existsSync(dbPath)) {
      return { ok: false, error: 'missing_path' };
    }
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const base = path.basename(dbPath, '.db');
    const dest = path.join(backupDir, `${base}_${timestamp()}.db`);
    fs.copyFileSync(dbPath, dest);
    pruneOldBackups(backupDir, base, 48);
    return { ok: true, dest };
  } catch (e) {
    return { ok: false, error: String(e.message || e) };
  }
}

function pruneOldBackups(backupDir, baseName, keepLast) {
  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith(`${baseName}_`) && f.endsWith('.db'))
    .map((f) => ({
      name: f,
      time: fs.statSync(path.join(backupDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);
  for (let i = keepLast; i < files.length; i++) {
    try {
      fs.unlinkSync(path.join(backupDir, files[i].name));
    } catch (_) {
      /* ignore */
    }
  }
}

module.exports = { runBackup, timestamp };
