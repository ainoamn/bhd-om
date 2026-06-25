require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const { openDatabase } = require('./db');
const { runBackup } = require('./backup');

const PORT = parseInt(process.env.PORT || '3789', 10);
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.join(__dirname, '..');
const dbPath = process.env.DATABASE_PATH || path.join(ROOT, 'data', 'rental.db');
const backupDir = process.env.DROPBOX_BACKUP_DIR || '';
const backupIntervalMin = parseInt(process.env.BACKUP_INTERVAL_MINUTES || '30', 10);

const db = openDatabase();

const app = express();
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}
app.use(cors({ origin: true }));
app.use(express.json({ limit: '20mb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});

app.get('/api/health', (req, res) => {
  const cloudUrl = (process.env.CLOUD_API_URL || '').replace(/\/$/, '');
  res.json({
    ok: true,
    service: 'bhd-rent-contracts',
    db: path.resolve(dbPath),
    backupDir: backupDir ? path.resolve(backupDir) : null,
    cloudLinked: !!cloudUrl,
  });
});

app.get('/api/kv', (req, res) => {
  try {
    const prefix = req.query.prefix ? String(req.query.prefix) : '';
    const rows = db.prepare('SELECT key, value FROM kv_store ORDER BY key').all();
    const out = {};
    for (const row of rows) {
      if (prefix && !row.key.startsWith(prefix)) continue;
      out[row.key] = row.value;
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.get('/api/kv/:key', (req, res) => {
  try {
    const row = db.prepare('SELECT value FROM kv_store WHERE key = ?').get(req.params.key);
    if (!row) return res.status(404).json({ ok: false, error: 'not_found' });
    res.type('application/json').send(row.value);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

function stringifyValue(body) {
  if (body === undefined || body === null) return 'null';
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
}

app.put('/api/kv/:key', (req, res) => {
  try {
    const key = req.params.key;
    const value = stringifyValue(req.body);
    const stmt = db.prepare(`
      INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);
    stmt.run(key, value);
    res.json({ ok: true, key });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.post('/api/kv/wipe-all-except', (req, res) => {
  try {
    const keep = new Set(Array.isArray(req.body?.keepKeys) ? req.body.keepKeys : ['bhd_users_registry', 'bhd_auth_session', 'bhd_theme_mode']);
    const rows = db.prepare("SELECT key FROM kv_store WHERE key LIKE 'bhd_%'").all();
    const del = db.prepare('DELETE FROM kv_store WHERE key = ?');
    let count = 0;
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const row of rows) {
        if (keep.has(row.key)) continue;
        count += del.run(row.key).changes;
      }
      db.exec('COMMIT');
    } catch (inner) {
      try {
        db.exec('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
      throw inner;
    }
    res.json({ ok: true, deleted: count });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.post('/api/kv/clear-keys', (req, res) => {
  try {
    const keys = Array.isArray(req.body?.keys) ? req.body.keys : [];
    const del = db.prepare('DELETE FROM kv_store WHERE key = ?');
    let count = 0;
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const key of keys) {
        if (typeof key !== 'string' || !key.startsWith('bhd_')) continue;
        count += del.run(key).changes;
      }
      db.exec('COMMIT');
    } catch (inner) {
      try {
        db.exec('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
      throw inner;
    }
    res.json({ ok: true, deleted: count });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.post('/api/kv/bulk', (req, res) => {
  try {
    const obj = req.body;
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return res.status(400).json({ ok: false, error: 'expected_object' });
    }
    const upsert = db.prepare(`
      INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `);
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const [key, val] of Object.entries(obj)) {
        upsert.run(key, stringifyValue(val));
      }
      db.exec('COMMIT');
    } catch (inner) {
      try {
        db.exec('ROLLBACK');
      } catch (_) {
        /* ignore */
      }
      throw inner;
    }
    res.json({ ok: true, count: Object.keys(obj).length });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.post('/api/backup', (req, res) => {
  if (!backupDir) {
    return res.status(400).json({ ok: false, error: 'DROPBOX_BACKUP_DIR not set' });
  }
  const result = runBackup(dbPath, backupDir);
  if (!result.ok) return res.status(500).json({ ok: false, error: result.error || 'backup_failed' });
  res.json({ ok: true, dest: result.dest });
});

/** Proxy to cloud API — same-origin for الواجهة (ترقية شفافة) */
const cloudApiUrl = (process.env.CLOUD_API_URL || '').replace(/\/$/, '');
if (cloudApiUrl) {
  app.use('/api/v1', async (req, res) => {
    try {
      const target = `${cloudApiUrl}/api/v1${req.url}`;
      const headers = { ...req.headers };
      delete headers.host;
      delete headers.connection;
      const init = { method: req.method, headers };
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body !== undefined) {
        init.body = JSON.stringify(req.body);
        init.headers['content-type'] = 'application/json';
      }
      const upstream = await fetch(target, init);
      res.status(upstream.status);
      upstream.headers.forEach((value, key) => {
        const k = key.toLowerCase();
        if (k === 'transfer-encoding' || k === 'connection') return;
        res.setHeader(key, value);
      });
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.send(buf);
    } catch (e) {
      res.status(502).json({ ok: false, error: 'cloud_proxy_failed', message: String(e.message || e) });
    }
  });
}

const htmlFile = path.join(ROOT, 'bhd-real-estate.html');
app.get('/', (req, res) => {
  if (fs.existsSync(htmlFile)) {
    res.sendFile(htmlFile);
  } else {
    res.type('text/plain').send('bhd-real-estate.html غير موجود في مجلد المشروع.');
  }
});

app.use(express.static(ROOT));

app.listen(PORT, HOST, () => {
  const bind = HOST === '0.0.0.0' ? 'all interfaces' : HOST;
  console.log(`BHD Real Estate: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}/ (${bind})`);
  console.log(`Database: ${path.resolve(dbPath)}`);
  if (backupDir) {
    console.log(`Backup folder: ${path.resolve(backupDir)} (every ${backupIntervalMin} min)`);
  } else {
    console.log('Backup: set DROPBOX_BACKUP_DIR in server/.env to enable automatic copies.');
  }
});

if (backupDir && backupIntervalMin > 0) {
  setInterval(() => {
    const r = runBackup(dbPath, backupDir);
    if (r.ok) console.log('[backup]', r.dest);
    else console.warn('[backup failed]', r.error);
  }, backupIntervalMin * 60 * 1000);

  setTimeout(() => {
    const r = runBackup(dbPath, backupDir);
    if (r.ok) console.log('[backup startup]', r.dest);
  }, 3000);
}
