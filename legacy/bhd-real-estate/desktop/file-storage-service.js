/**
 * تخزين مرفقات العقود على القرص + تسجيل file_entries في SQLite
 * Folder: {dataDir}/buildings/{building}/units/{unit}/contracts/{agreement}/attachments/{category}/
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const dataPath = require('./data-path');

const VALID_CATEGORIES = new Set([
    'deposit',
    'cheques',
    'vat-cheques',
    'mandatory',
    'other',
    'addressbook'
]);

function sanitizePathSegment(raw) {
    const s = String(raw == null ? '' : raw).trim();
    if (!s) return '_';
    return s
        .replace(/[<>:"|?*\x00-\x1f]/g, '_')
        .replace(/[/\\]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^\.+/, '')
        .slice(0, 120) || '_';
}

function normalizeCategory(category) {
    const c = String(category || 'other').trim().toLowerCase();
    return VALID_CATEGORIES.has(c) ? c : 'other';
}

function contractAttachmentsDir(dataDir, building, unit, agreementNo, category) {
    const b = sanitizePathSegment(building);
    const u = sanitizePathSegment(unit);
    const ag = sanitizePathSegment(agreementNo) || '_draft';
    const cat = normalizeCategory(category);
    return path.join(
        dataPath.buildingsDirFor(dataDir),
        b,
        'units',
        u,
        'contracts',
        ag,
        'attachments',
        cat
    );
}

function relativeFromDataDir(dataDir, absolutePath) {
    const rel = path.relative(dataDir, absolutePath);
    return rel.split(path.sep).join('/');
}

function newFileId() {
    return `fe_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

function safeFileName(originalName) {
    const base = path.basename(String(originalName || 'file'));
    const ext = path.extname(base);
    const stem = sanitizePathSegment(path.basename(base, ext)) || 'file';
    return `${stem}${ext}`.slice(0, 180);
}

function uniqueDestPath(dir, fileName) {
    const safe = safeFileName(fileName);
    let dest = path.join(dir, safe);
    if (!fs.existsSync(dest)) return dest;
    const ext = path.extname(safe);
    const stem = path.basename(safe, ext);
    dest = path.join(dir, `${stem}_${Date.now()}${ext}`);
    return dest;
}

function decodePayloadToBuffer(payload) {
    if (!payload) return Buffer.alloc(0);
    if (Buffer.isBuffer(payload)) return payload;
    if (payload instanceof Uint8Array) return Buffer.from(payload);
    const dataUrl = String(payload.dataUrl || payload.base64 || '');
    if (dataUrl.startsWith('data:')) {
        const m = /^data:[^;]*;base64,(.+)$/i.exec(dataUrl);
        if (m) return Buffer.from(m[1], 'base64');
    }
    if (typeof payload === 'string') {
        if (payload.startsWith('data:')) {
            const m = /^data:[^;]*;base64,(.+)$/i.exec(payload);
            if (m) return Buffer.from(m[1], 'base64');
        }
        return Buffer.from(payload, 'base64');
    }
    return Buffer.alloc(0);
}

function registerFileEntry(db, meta) {
    if (!db) throw new Error('Database not open');
    const id = meta.id || newFileId();
    const stmt = db.prepare(`
        INSERT INTO file_entries (id, building, unit, tenant, doc_type, file_name, file_path, source, notes, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET
            building = excluded.building,
            unit = excluded.unit,
            tenant = excluded.tenant,
            doc_type = excluded.doc_type,
            file_name = excluded.file_name,
            file_path = excluded.file_path,
            source = excluded.source,
            notes = excluded.notes,
            updated_at = datetime('now')
    `);
    stmt.run(
        id,
        toStr(meta.building),
        toStr(meta.unit),
        toStr(meta.tenant),
        toStr(meta.doc_type || meta.docType),
        toStr(meta.file_name || meta.fileName),
        toStr(meta.file_path || meta.relativePath),
        toStr(meta.source || 'contract'),
        toStr(meta.notes)
    );
    return id;
}

function getFileEntry(db, fileId) {
    if (!db || !fileId) return null;
    return db.prepare('SELECT * FROM file_entries WHERE id = ?').get(String(fileId)) || null;
}

function deleteFileEntry(db, fileId) {
    if (!db || !fileId) return 0;
    return db.prepare('DELETE FROM file_entries WHERE id = ?').run(String(fileId)).changes || 0;
}

function countFileEntries(db) {
    if (!db) return 0;
    const row = db.prepare('SELECT COUNT(*) AS n FROM file_entries').get();
    return row ? row.n : 0;
}

function listFileEntries(db, filter = {}) {
    if (!db) return [];
    let sql = 'SELECT * FROM file_entries WHERE 1=1';
    const params = [];
    if (filter.building) {
        sql += ' AND building = ?';
        params.push(toStr(filter.building));
    }
    if (filter.unit) {
        sql += ' AND unit = ?';
        params.push(toStr(filter.unit));
    }
    if (filter.docType) {
        sql += ' AND doc_type LIKE ?';
        params.push(`%${toStr(filter.docType)}%`);
    }
    if (filter.tenant) {
        sql += ' AND tenant = ?';
        params.push(toStr(filter.tenant));
    }
    sql += ' ORDER BY updated_at DESC';
    return db.prepare(sql).all(...params);
}

function toStr(v) {
    return v == null ? '' : String(v);
}

function saveAttachment(opts) {
    const dataDir = opts.dataDir;
    if (!dataDir) throw new Error('dataDir required');
    const building = opts.building || opts.buildingNo || '';
    const unit = opts.unit || opts.flatNo || '';
    const agreementNo = opts.agreementNo || opts.agreement || '_draft';
    const category = normalizeCategory(opts.category);
    const buffer = decodePayloadToBuffer(opts.buffer != null ? opts.buffer : opts);
    if (!buffer.length) throw new Error('Empty file payload');

    const dir = contractAttachmentsDir(dataDir, building, unit, agreementNo, category);
    fs.mkdirSync(dir, { recursive: true });
    const dest = uniqueDestPath(dir, opts.fileName || opts.name || 'attachment');
    fs.writeFileSync(dest, buffer);

    const relativePath = relativeFromDataDir(dataDir, dest);
    const fileId = opts.fileId || newFileId();
    const meta = {
        id: fileId,
        building: toStr(building),
        unit: toStr(unit),
        tenant: toStr(opts.tenant || opts.tenantName),
        doc_type: toStr(opts.docType || category),
        file_name: path.basename(dest),
        file_path: relativePath,
        source: toStr(opts.source || 'contract'),
        notes: toStr(opts.notes)
    };
    if (opts.db) registerFileEntry(opts.db, meta);

    return {
        ok: true,
        fileId,
        relativePath,
        absolutePath: dest,
        name: path.basename(dest),
        type: toStr(opts.type || opts.mimeType),
        size: buffer.length,
        storedOnDisk: true
    };
}

function readAttachmentAsDataUrl(dataDir, relativePath) {
    if (!dataDir || !relativePath) return '';
    const rel = String(relativePath).replace(/\\/g, '/');
    const abs = path.resolve(dataDir, rel);
    const root = path.resolve(dataDir);
    if (!abs.startsWith(root)) throw new Error('Invalid path');
    if (!fs.existsSync(abs)) return '';
    const buf = fs.readFileSync(abs);
    const ext = path.extname(abs).toLowerCase();
    const mime =
        ext === '.pdf'
            ? 'application/pdf'
            : ext === '.png'
              ? 'image/png'
              : ext === '.jpg' || ext === '.jpeg'
                ? 'image/jpeg'
                : ext === '.webp'
                  ? 'image/webp'
                  : 'application/octet-stream';
    return `data:${mime};base64,${buf.toString('base64')}`;
}

function deleteAttachment(dataDir, relativePath, db, fileId) {
    if (!dataDir || !relativePath) return { ok: false };
    const rel = String(relativePath).replace(/\\/g, '/');
    const abs = path.resolve(dataDir, rel);
    const root = path.resolve(dataDir);
    if (!abs.startsWith(root)) throw new Error('Invalid path');
    if (fs.existsSync(abs)) {
        try {
            fs.unlinkSync(abs);
        } catch (_e) {}
    }
    if (db && fileId) deleteFileEntry(db, fileId);
    return { ok: true };
}

function getStorageInfo(dataDir, db) {
    let fileCount = 0;
    const buildingsDir = dataPath.buildingsDirFor(dataDir);
    function walk(dir) {
        if (!fs.existsSync(dir)) return;
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const p = path.join(dir, ent.name);
            if (ent.isDirectory()) walk(p);
            else fileCount += 1;
        }
    }
    walk(buildingsDir);
    return {
        dataDir,
        buildingsDir,
        dbFileCount: countFileEntries(db),
        diskFileCount: fileCount
    };
}

module.exports = {
    sanitizePathSegment,
    normalizeCategory,
    contractAttachmentsDir,
    saveAttachment,
    readAttachmentAsDataUrl,
    deleteAttachment,
    registerFileEntry,
    getFileEntry,
    deleteFileEntry,
    countFileEntries,
    getStorageInfo,
    listFileEntries,
    decodePayloadToBuffer,
    newFileId
};
