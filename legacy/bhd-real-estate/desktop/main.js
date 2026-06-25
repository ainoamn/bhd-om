const { app, BrowserWindow, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const sqliteKv = require('./sqlite-kv');
const configStore = require('./config-store');
const dataPath = require('./data-path');
const syncService = require('./sync-service');
const fileStorage = require('./file-storage-service');
const projectPath = require('./project-path');
const BHD_KV_KEYS = require('./kv-keys');

let mainWindow = null;
let appConfig = null;
let currentDataDir = null;
let currentDbPath = null;
let dbOpen = false;
let nextPrintToken = 1;
const pendingPrintTokens = [];
const printChildByToken = new Map();
let lastPrintChildWindow = null;

function trackPrintChildWindow(childWindow, token) {
    if (!childWindow || childWindow.isDestroyed()) return;
    lastPrintChildWindow = childWindow;
    if (token) printChildByToken.set(token, childWindow);
    childWindow.on('closed', () => {
        if (token) printChildByToken.delete(token);
        if (lastPrintChildWindow === childWindow) lastPrintChildWindow = null;
    });
}

function installPrintChildWindowTracking(win) {
    if (!win || win.__bhdPrintTrackInstalled) return;
    win.__bhdPrintTrackInstalled = true;
    win.webContents.on('did-create-window', (childWindow) => {
        const token = pendingPrintTokens.shift() || '';
        trackPrintChildWindow(childWindow, token);
    });
}

function logError(tag, err) {
    const msg = err && (err.stack || err.message || String(err));
    console.error(tag, msg);
    try {
        const logDir = projectPath.getWritableRoot();
        fs.mkdirSync(logDir, { recursive: true });
        fs.appendFileSync(path.join(logDir, 'bhd-error.log'), `[${new Date().toISOString()}] ${tag}\n${msg}\n\n`);
    } catch (_) { /* ignore */ }
}

function getHtmlPath() {
    const envHtml = process.env.BHD_HTML_PATH;
    if (envHtml && fs.existsSync(envHtml)) return envHtml;
    const candidates = [
        path.join(projectPath.getDevProjectRoot(), 'bhd-real-estate.html'),
        path.join(__dirname, 'bhd-real-estate.html'),
        path.join(projectPath.getResourcesPath(), 'bhd-real-estate.html')
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return candidates[0];
}

function getWindowIcon() {
    const p = projectPath.getAppIconPath();
    return p ? nativeImage.createFromPath(p) : undefined;
}

function showFatalError(title, message) {
    logError(title, new Error(message));
    dialog.showErrorBox(title, message);
}

function closeDatabase() {
    if (dbOpen) {
        try {
            sqliteKv.close();
        } catch (_) { /* ignore */ }
        dbOpen = false;
    }
    currentDbPath = null;
}

function pickDataFolderDialog() {
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const res = dialog.showOpenDialogSync(win, {
        title: 'مجلد بيانات BHD / BHD data folder (OneDrive recommended)',
        message: 'اختر مجلداً لحفظ قاعدة البيانات والمرفقات / Pick folder for database and attachments',
        properties: ['openDirectory', 'createDirectory']
    });
    if (!res || !res[0]) return null;
    return res[0];
}

function ensureDataDirConfigured() {
    appConfig = appConfig || configStore.load();
    let dataDir = appConfig.dataDirConfigured ? dataPath.resolveDataDir(appConfig) : null;
    if (!dataDir || !appConfig.dataDirConfigured) {
        dialog.showMessageBoxSync({
            type: 'info',
            title: 'BHD Real Estate — إعداد التخزين / Storage setup',
            message: 'اختر مجلد البيانات / Pick your data folder',
            detail:
                'سيتم حفظ قاعدة البيانات (rental.db) وجميع المرفقات داخل هذا المجلد.\n' +
                'يُفضّل وضعه داخل OneDrive للمزامنة بين الأجهزة.\n\n' +
                'Database and all attachments will be stored in this folder.\n' +
                'Place it inside OneDrive for sync across devices.'
        });
        const picked = pickDataFolderDialog();
        if (!picked) {
            throw new Error('يجب اختيار مجلد البيانات للمتابعة / Data folder is required to continue');
        }
        dataDir = picked;
        appConfig.dataDir = dataDir;
        appConfig.dataDirConfigured = true;
        configStore.save(appConfig);
    }
    if (!dataDir) throw new Error('لم يُحدد مجلد البيانات / Data folder not configured');
    return dataDir;
}

function openDatabaseForDataDir(dataDir) {
    dataPath.ensureDataDir(dataDir);
    syncService.getOrCreateDeviceId(dataDir);
    const dbPath = dataPath.dbPathFor(dataDir);
    closeDatabase();
    sqliteKv.open(dbPath);
    dbOpen = true;
    currentDataDir = dataDir;
    currentDbPath = dbPath;
    const backup = syncService.dailyBackupIfNeeded(dataDir, currentDbPath, appConfig || {});
    if (!backup.skipped && backup.date && appConfig) {
        appConfig.lastBackupDate = backup.date;
        configStore.save(appConfig);
    }
    return { dataDir, dbPath };
}

function initAppStorage() {
    appConfig = configStore.load();
    const dataDir = ensureDataDirConfigured();
    return openDatabaseForDataDir(dataDir);
}

function syncStatus() {
    const cloudApiUrl = (
        (appConfig && appConfig.cloudApiUrl) ||
        process.env.BHD_CLOUD_API_URL ||
        process.env.CLOUD_API_URL ||
        ''
    ).replace(/\/$/, '');
    return {
        dbOpen,
        dataDir: currentDataDir,
        dbPath: currentDbPath,
        deviceId: currentDataDir ? syncService.getOrCreateDeviceId(currentDataDir) : null,
        cloudApiUrl: cloudApiUrl || null
    };
}

function createWindow() {
    const htmlPath = getHtmlPath();
    if (!fs.existsSync(htmlPath)) {
        showFatalError('ملف الواجهة مفقود / UI file missing', htmlPath);
        app.quit();
        return;
    }
    const icon = getWindowIcon();
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        icon,
        title: 'BHD Real Estate — نظام إدارة العقارات',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            nativeWindowOpen: true
        }
    });
    mainWindow.once('ready-to-show', () => mainWindow.show());
    mainWindow.loadFile(htmlPath);
    installPrintChildWindowTracking(mainWindow);
    mainWindow.webContents.on('did-fail-load', (_, code, desc) => {
        showFatalError('تعذر تحميل الواجهة', `${desc} (${code})`);
    });
}

app.whenReady().then(() => {
    try {
        initAppStorage();
        createWindow();
    } catch (e) {
        showFatalError('خطأ عند بدء البرنامج', e.message || String(e));
        app.quit();
    }
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            try {
                initAppStorage();
            } catch (_) { /* ignore */ }
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    try {
        if (dbOpen && currentDbPath && currentDataDir) {
            syncService.sessionBackup(currentDataDir, currentDbPath);
        }
    } catch (e) {
        console.warn('session backup', e);
    }
    closeDatabase();
});

process.on('uncaughtException', (e) => showFatalError('خطأ غير متوقع', e.message));
process.on('unhandledRejection', (e) => showFatalError('خطأ غير متوقع', e && e.message ? e.message : String(e)));

ipcMain.handle('bhd:syncGetStatus', () => syncStatus());
ipcMain.handle('bhd:getDataDir', () => currentDataDir);
ipcMain.handle('bhd:getDbPath', () => currentDbPath);

ipcMain.handle('bhd:startupMigrate', (_, snapshot) => {
    if (!dbOpen) initAppStorage();
    return sqliteKv.startupMigrate(snapshot || {}, BHD_KV_KEYS);
});

ipcMain.handle('bhd:kvGetBulk', () => {
    if (!dbOpen) throw new Error('قاعدة البيانات غير مفتوحة');
    return sqliteKv.getBulk('bhd_');
});

ipcMain.handle('bhd:kvClearKeys', (_, keys) => {
    if (!dbOpen) throw new Error('قاعدة البيانات غير مفتوحة');
    const list = Array.isArray(keys) ? keys.filter((k) => typeof k === 'string' && k.startsWith('bhd_')) : [];
    return sqliteKv.clearKeys(list);
});

ipcMain.handle('bhd:kvWipeAllExcept', (_, keepKeys) => {
    if (!dbOpen) throw new Error('قاعدة البيانات غير مفتوحة');
    const keep = Array.isArray(keepKeys) ? keepKeys : BHD_KV_KEYS.filter((k) => k === 'bhd_users_registry' || k === 'bhd_auth_session' || k === 'bhd_theme_mode');
    return sqliteKv.clearAllBhdExcept(keep);
});

ipcMain.handle('bhd:kvPutBulk', (_, payload) => {
    if (!dbOpen) throw new Error('قاعدة البيانات غير مفتوحة');
    const filtered = {};
    Object.entries(payload || {}).forEach(([k, v]) => {
        if (!BHD_KV_KEYS.includes(k)) return;
        if (v !== undefined && v !== null) filtered[k] = v;
    });
    return sqliteKv.putBulk(filtered);
});

ipcMain.handle('bhd:exportJsonDialog', async (_, jsonText, defaultName) => {
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const res = await dialog.showSaveDialog(win, {
        title: 'تصدير JSON — اختر مكان الحفظ / Export JSON',
        defaultPath: defaultName || `bhd-real-estate-${new Date().toISOString().slice(0, 10)}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    if (res.canceled || !res.filePath) return null;
    fs.writeFileSync(res.filePath, jsonText, 'utf8');
    return res.filePath;
});

ipcMain.handle('bhd:exportJsonToDataFolder', (_, jsonText, defaultName) => {
    if (!currentDataDir) throw new Error('مجلد البيانات غير محدد');
    const dir = dataPath.exportsDirFor(currentDataDir);
    const name = defaultName || `bhd-real-estate-${new Date().toISOString().slice(0, 10)}.json`;
    const dest = syncService.exportJsonToFolder(dir, jsonText, name);
    shell.showItemInFolder(dest);
    return dest;
});

ipcMain.handle('bhd:importJsonDialog', async () => {
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
    const res = await dialog.showOpenDialog(win, {
        title: 'استيراد JSON / Import JSON',
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile']
    });
    if (res.canceled || !res.filePaths[0]) return null;
    return fs.readFileSync(res.filePaths[0], 'utf8');
});

ipcMain.handle('bhd:pickDataFolder', async () => {
    const picked = pickDataFolderDialog();
    if (!picked) return null;
    appConfig = configStore.load();
    appConfig.dataDir = picked;
    appConfig.dataDirConfigured = true;
    configStore.save(appConfig);
    openDatabaseForDataDir(picked);
    return picked;
});

ipcMain.handle('bhd:fileSaveAttachment', (_, payload) => {
    if (!currentDataDir) throw new Error('مجلد البيانات غير محدد / Data folder not set');
    if (!dbOpen) throw new Error('قاعدة البيانات غير مفتوحة / Database not open');
    const db = sqliteKv.getDb();
    return fileStorage.saveAttachment({
        ...(payload || {}),
        dataDir: currentDataDir,
        db
    });
});

ipcMain.handle('bhd:fileReadAsDataUrl', (_, relativePath) => {
    if (!currentDataDir) throw new Error('مجلد البيانات غير محدد');
    return fileStorage.readAttachmentAsDataUrl(currentDataDir, relativePath);
});

ipcMain.handle('bhd:allocPrintWindowToken', () => {
    const token = `pw_${Date.now()}_${nextPrintToken++}`;
    pendingPrintTokens.push(token);
    return token;
});

ipcMain.handle('bhd:printChildByToken', (_, token) => {
    const key = token == null ? '' : String(token).trim();
    let w = key ? printChildByToken.get(key) : null;
    if (!w || w.isDestroyed()) w = lastPrintChildWindow;
    if (!w || w.isDestroyed()) return { ok: false, reason: 'no_window' };
    return new Promise((resolve) => {
        w.webContents.print({ printBackground: true, silent: false }, (success, failureReason) => {
            resolve({ ok: !!success, reason: failureReason || '' });
        });
    });
});

ipcMain.handle('bhd:fileDelete', (_, payload) => {
    if (!currentDataDir) throw new Error('مجلد البيانات غير محدد');
    const p = payload || {};
    return fileStorage.deleteAttachment(currentDataDir, p.relativePath, sqliteKv.getDb(), p.fileId);
});

ipcMain.handle('bhd:fileGetStorageInfo', () => {
    if (!currentDataDir) return { dataDir: null, diskFileCount: 0, dbFileCount: 0 };
    return fileStorage.getStorageInfo(currentDataDir, sqliteKv.getDb());
});

ipcMain.handle('bhd:fileListEntries', (_, filter) => {
    if (!dbOpen) return [];
    return fileStorage.listFileEntries(sqliteKv.getDb(), filter || {});
});

ipcMain.handle('bhd:fileGetEntry', (_, fileId) => {
    if (!dbOpen || !fileId) return null;
    const row = fileStorage.getFileEntry(sqliteKv.getDb(), fileId);
    if (!row) return null;
    return {
        fileId: row.id,
        relativePath: row.file_path,
        file_path: row.file_path,
        name: row.file_name,
        docType: row.doc_type,
        building: row.building,
        unit: row.unit
    };
});

ipcMain.handle('bhd:syncOpenDataFolder', () => {
    if (!currentDataDir) return null;
    shell.openPath(currentDataDir);
    return currentDataDir;
});

ipcMain.handle('bhd:syncOpenExportsFolder', () => {
    if (!currentDataDir) return null;
    const dir = dataPath.exportsDirFor(currentDataDir);
    shell.openPath(dir);
    return dir;
});

ipcMain.handle('bhd:syncBackupNow', () => {
    if (!dbOpen || !currentDbPath || !currentDataDir) throw new Error('لا توجد قاعدة مفتوحة');
    return syncService.sessionBackup(currentDataDir, currentDbPath);
});

ipcMain.handle('bhd:syncReloadFromDisk', () => {
    if (!currentDataDir) initAppStorage();
    else openDatabaseForDataDir(currentDataDir);
    return syncStatus();
});
