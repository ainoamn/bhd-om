const path = require('path');
const fs = require('fs');

function isPackaged() {
    try {
        const { app } = require('electron');
        return app.isPackaged;
    } catch {
        return !process.defaultApp && !String(process.argv0 || '').includes('node.exe');
    }
}

function getDevProjectRoot() {
    if (process.env.BHD_PROJECT_ROOT && fs.existsSync(process.env.BHD_PROJECT_ROOT)) {
        return path.resolve(process.env.BHD_PROJECT_ROOT);
    }
    return path.resolve(__dirname, '..');
}

function getWritableRoot() {
    if (!isPackaged()) return getDevProjectRoot();
    const { app } = require('electron');
    return app.getPath('userData');
}

function getResourcesPath() {
    if (!isPackaged()) return getDevProjectRoot();
    return process.resourcesPath;
}

function getAppIconPath() {
    const candidates = [
        path.join(__dirname, 'app-icon.png'),
        path.join(getResourcesPath(), 'app-icon.png'),
        path.join(getDevProjectRoot(), 'BHD_Logo_04.png')
    ];
    for (const p of candidates) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

function resolveProjectPath(relativeOrAbsolute) {
    if (!relativeOrAbsolute) return null;
    if (path.isAbsolute(relativeOrAbsolute)) return relativeOrAbsolute;
    return path.resolve(getDevProjectRoot(), relativeOrAbsolute);
}

module.exports = {
    isPackaged,
    getDevProjectRoot,
    getWritableRoot,
    getResourcesPath,
    getAppIconPath,
    resolveProjectPath
};
