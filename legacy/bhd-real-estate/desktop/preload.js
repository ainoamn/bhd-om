const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bhdDesktop', {
    isDesktop: true,
    getDataDir: () => ipcRenderer.invoke('bhd:getDataDir'),
    getDbPath: () => ipcRenderer.invoke('bhd:getDbPath'),
    syncGetStatus: () => ipcRenderer.invoke('bhd:syncGetStatus'),
    startupMigrate: (snapshot) => ipcRenderer.invoke('bhd:startupMigrate', snapshot),
    kvGetBulk: () => ipcRenderer.invoke('bhd:kvGetBulk'),
    kvPutBulk: (payload) => ipcRenderer.invoke('bhd:kvPutBulk', payload),
    kvClearKeys: (keys) => ipcRenderer.invoke('bhd:kvClearKeys', keys),
    kvWipeAllExcept: (keepKeys) => ipcRenderer.invoke('bhd:kvWipeAllExcept', keepKeys),
    exportJsonDialog: (jsonText, defaultName) => ipcRenderer.invoke('bhd:exportJsonDialog', jsonText, defaultName),
    exportJsonToDataFolder: (jsonText, defaultName) => ipcRenderer.invoke('bhd:exportJsonToDataFolder', jsonText, defaultName),
    importJsonDialog: () => ipcRenderer.invoke('bhd:importJsonDialog'),
    pickDataFolder: () => ipcRenderer.invoke('bhd:pickDataFolder'),
    syncOpenDataFolder: () => ipcRenderer.invoke('bhd:syncOpenDataFolder'),
    syncOpenExportsFolder: () => ipcRenderer.invoke('bhd:syncOpenExportsFolder'),
    syncBackupNow: () => ipcRenderer.invoke('bhd:syncBackupNow'),
    syncReloadFromDisk: () => ipcRenderer.invoke('bhd:syncReloadFromDisk'),
    fileSaveAttachment: (payload) => ipcRenderer.invoke('bhd:fileSaveAttachment', payload),
    fileReadAsDataUrl: (relativePath) => ipcRenderer.invoke('bhd:fileReadAsDataUrl', relativePath),
    fileDelete: (payload) => ipcRenderer.invoke('bhd:fileDelete', payload),
    fileGetStorageInfo: () => ipcRenderer.invoke('bhd:fileGetStorageInfo'),
    fileListEntries: (filter) => ipcRenderer.invoke('bhd:fileListEntries', filter),
    fileGetEntry: (fileId) => ipcRenderer.invoke('bhd:fileGetEntry', fileId),
    allocPrintWindowToken: () => ipcRenderer.invoke('bhd:allocPrintWindowToken'),
    printChildByToken: (token) => ipcRenderer.invoke('bhd:printChildByToken', token)
});
