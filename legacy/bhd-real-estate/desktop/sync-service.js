const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { dbPathFor, ensureDataDir, DB_FILE } = require('./data-path');

function getOrCreateDeviceId(dataDir) {
    const marker = path.join(dataDir, '.bhd-device-id');
    if (fs.existsSync(marker)) return fs.readFileSync(marker, 'utf8').trim();
    const id = crypto.randomBytes(4).toString('hex').toUpperCase();
    ensureDataDir(dataDir);
    fs.writeFileSync(marker, id, 'utf8');
    fs.writeFileSync(
        path.join(dataDir, `device_${id}.json`),
        JSON.stringify(
            {
                device_id: id,
                device_name: os.hostname(),
                app: 'BHD Real Estate',
                updated: new Date().toISOString()
            },
            null,
            2
        ),
        'utf8'
    );
    return id;
}

function formatBackupName() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `rental_${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}.db`;
}

/** نسخ rental.db إلى Backups/. مجلد buildings/ يُنسخ مع مجلد البيانات عبر OneDrive أو نسخ المجلد يدوياً. */
function sessionBackup(dataDir, dbPath) {
    if (!fs.existsSync(dbPath)) return null;
    const backups = path.join(ensureDataDir(dataDir), 'Backups');
    const dest = path.join(backups, formatBackupName());
    fs.copyFileSync(dbPath, dest);
    return dest;
}

function dailyBackupIfNeeded(dataDir, dbPath, config) {
    if (!fs.existsSync(dbPath)) return { skipped: true, reason: 'no-db' };
    const today = new Date().toISOString().slice(0, 10);
    if (config.lastBackupDate === today) return { skipped: true, reason: 'already-today' };
    const dest = sessionBackup(dataDir, dbPath);
    return { skipped: false, path: dest, date: today };
}

function exportJsonToFolder(exportsDir, jsonText, suggestedName) {
    if (!fs.existsSync(exportsDir)) fs.mkdirSync(exportsDir, { recursive: true });
    const name = suggestedName || `bhd-export-${Date.now()}.json`;
    const dest = path.join(exportsDir, name);
    fs.writeFileSync(dest, jsonText, 'utf8');
    return dest;
}

module.exports = {
    getOrCreateDeviceId,
    sessionBackup,
    dailyBackupIfNeeded,
    exportJsonToFolder,
    DB_FILE
};
