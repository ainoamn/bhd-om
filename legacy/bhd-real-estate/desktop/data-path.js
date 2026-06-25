const fs = require('fs');
const path = require('path');
const os = require('os');
const projectPath = require('./project-path');

const DB_FILE = 'rental.db';

function defaultDataDir() {
    if (projectPath.isPackaged()) return null;
    return path.join(projectPath.getDevProjectRoot(), 'data', 'BHD-Real-Estate');
}

function dropboxCandidates() {
    const home = os.homedir();
    return [
        path.join(home, 'BHD International Dropbox', 'ABDULHAMID ALRAWAHI', 'BHD-Real-Estate'),
        path.join(home, 'Dropbox', 'ABDULHAMID ALRAWAHI', 'BHD-Real-Estate'),
        path.join(home, 'BHD International Dropbox', 'ABDULHAMID ALRAWAHI', 'RentContractsBackup'),
        path.join(home, 'Dropbox', 'ABDULHAMID ALRAWAHI', 'RentContractsBackup')
    ].filter((r) => fs.existsSync(path.dirname(r)) || fs.existsSync(r));
}

function dropboxDataDir() {
    for (const base of dropboxCandidates()) {
        const parent = path.dirname(base);
        if (fs.existsSync(parent)) return base;
    }
    return null;
}

function resolveDataDir(config) {
    if (!config) return defaultDataDir();
    if (config.dataDir && path.isAbsolute(config.dataDir) && fs.existsSync(path.dirname(config.dataDir))) {
        return config.dataDir;
    }
    if (config.dataDir && !projectPath.isPackaged()) {
        return projectPath.resolveProjectPath(config.dataDir);
    }
    if (config.dataDirConfigured && config.dataDir) {
        return path.isAbsolute(config.dataDir) ? config.dataDir : null;
    }
    const drop = dropboxDataDir();
    if (drop) return drop;
    return defaultDataDir();
}

function ensureDataDir(dataDir) {
    if (!dataDir) throw new Error('مجلد البيانات غير محدد / Data folder not set');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    ['Backups', 'exports', 'uploads', 'buildings'].forEach((sub) => {
        const p = path.join(dataDir, sub);
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });
    return dataDir;
}

function buildingsDirFor(dataDir) {
    return path.join(ensureDataDir(dataDir), 'buildings');
}

function dbPathFor(dataDir) {
    return path.join(ensureDataDir(dataDir), DB_FILE);
}

function exportsDirFor(dataDir) {
    return path.join(ensureDataDir(dataDir), 'exports');
}

module.exports = {
    DB_FILE,
    defaultDataDir,
    dropboxDataDir,
    dropboxCandidates,
    resolveDataDir,
    ensureDataDir,
    dbPathFor,
    exportsDirFor,
    buildingsDirFor
};
