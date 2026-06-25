const fs = require('fs');
const path = require('path');
const projectPath = require('./project-path');

function configFile() {
    return path.join(projectPath.getWritableRoot(), 'bhd-app-config.json');
}

function defaultConfig() {
    return {
        dataDir: null,
        dataDirConfigured: false,
        lastBackupDate: null,
        cloudApiUrl: process.env.BHD_CLOUD_API_URL || process.env.CLOUD_API_URL || null,
        version: 1
    };
}

function load() {
    const p = configFile();
    if (!fs.existsSync(p)) {
        const cfg = defaultConfig();
        save(cfg);
        return cfg;
    }
    try {
        return { ...defaultConfig(), ...JSON.parse(fs.readFileSync(p, 'utf8')) };
    } catch {
        return defaultConfig();
    }
}

function save(config) {
    const p = configFile();
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(config, null, 2), 'utf8');
}

module.exports = { load, save, configFile, defaultConfig };
