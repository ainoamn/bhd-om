/**
 * SQLite kv_store — نفس مخطط server/migrations
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

let db = null;
let dbPathCached = '';

function runMigrations(database) {
    const migDir = path.join(__dirname, '..', 'server', 'migrations');
    if (!fs.existsSync(migDir)) return;
    database.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            applied_at TEXT DEFAULT (datetime('now'))
        );
    `);
    const applied = new Set(
        database.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version)
    );
    const files = fs
        .readdirSync(migDir)
        .filter((f) => f.endsWith('.sql'))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    for (const file of files) {
        const m = file.match(/^(\d+)_/);
        if (!m) continue;
        const version = parseInt(m[1], 10);
        if (applied.has(version)) continue;
        const sql = fs.readFileSync(path.join(migDir, file), 'utf8');
        database.exec(sql);
        database.prepare('INSERT INTO schema_migrations (version, name) VALUES (?, ?)').run(version, file);
    }
}

function open(dbPath) {
    if (db) {
        if (dbPathCached === dbPath) return db;
        close();
    }
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    dbPathCached = dbPath;
    db = new Database(dbPathCached);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations(db);
    migrateLegacySfgKvKeysToBhd();
    return db;
}

function migrateLegacySfgKvKeysToBhd() {
    if (!db) return 0;
    const rows = db.prepare("SELECT key, value FROM kv_store WHERE key LIKE 'sfg_%'").all();
    if (!rows.length) return 0;
    const upsert = db.prepare(`
        INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);
    const del = db.prepare('DELETE FROM kv_store WHERE key = ?');
    const getExisting = db.prepare('SELECT 1 AS ok FROM kv_store WHERE key = ?');
    let n = 0;
    const run = db.transaction(() => {
        rows.forEach((row) => {
            const oldKey = String(row.key);
            const newKey = 'bhd_' + oldKey.slice(4);
            if (!getExisting.get(newKey)) upsert.run(newKey, row.value);
            del.run(oldKey);
            n += 1;
        });
    });
    run();
    return n;
}

function close() {
    if (db) {
        db.close();
        db = null;
        dbPathCached = '';
    }
}

function getBulk(prefix = 'bhd_') {
    const rows = db.prepare('SELECT key, value FROM kv_store ORDER BY key').all();
    const out = {};
    for (const row of rows) {
        if (prefix && !String(row.key).startsWith(prefix)) continue;
        out[row.key] = row.value;
    }
    return out;
}

function clearKeys(keys) {
    if (!db || !Array.isArray(keys) || !keys.length) return 0;
    const del = db.prepare('DELETE FROM kv_store WHERE key = ?');
    let n = 0;
    const run = db.transaction(() => {
        keys.forEach((key) => {
            const info = del.run(key);
            n += info.changes || 0;
        });
    });
    run();
    return n;
}

/** حذف كل مفاتيح bhd_* ما عدا قائمة الاستثناء / Delete all bhd_* keys except keep list */
function clearAllBhdExcept(keepKeys = []) {
    if (!db) return 0;
    const keep = new Set(keepKeys || []);
    const rows = db.prepare("SELECT key FROM kv_store WHERE key LIKE 'bhd_%'").all();
    const toDelete = rows.map((r) => r.key).filter((k) => !keep.has(k));
    return clearKeys(toDelete);
}

function putBulk(obj) {
    const upsert = db.prepare(`
        INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);
    const run = db.transaction(() => {
        Object.entries(obj || {}).forEach(([key, val]) => {
            if (val === undefined || val === null) return;
            upsert.run(key, typeof val === 'string' ? val : JSON.stringify(val));
        });
    });
    run();
    return Object.keys(obj || {}).length;
}

function startupMigrate(localSnapshot, allowedKeys) {
    const existing = getBulk('');
    const upsert = db.prepare(`
        INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, datetime('now'))
        ON CONFLICT(key) DO NOTHING
    `);
    let inserted = 0;
    const run = db.transaction(() => {
        Object.entries(localSnapshot || {}).forEach(([key, val]) => {
            if (allowedKeys && !allowedKeys.includes(key)) return;
            if (existing[key] !== undefined) return;
            if (val === undefined || val === null) return;
            upsert.run(key, typeof val === 'string' ? val : JSON.stringify(val));
            inserted += 1;
        });
    });
    run();
    return { inserted, dbKeys: Object.keys(getBulk('')).length };
}

function getDb() {
    return db;
}

module.exports = {
    open,
    close,
    getBulk,
    putBulk,
    clearKeys,
    clearAllBhdExcept,
    startupMigrate,
    getDb,
    isOpen: () => !!db
};
