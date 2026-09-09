const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // CSV
  getMasterPokemon: () => ipcRenderer.invoke('csv:getMaster'),
  importCsv: (content, filename) => ipcRenderer.invoke('csv:import', content, filename),
  removePokemon: (key) => ipcRenderer.invoke('csv:remove', key),
  exportMergedCsv: () => ipcRenderer.invoke('csv:export'),
  getImportHistory: () => ipcRenderer.invoke('csv:getHistory'),

  // PvPoke
  getRankings: (league, forceRefresh) => ipcRenderer.invoke('pvpoke:getRankings', league, forceRefresh),

  // Settings & Forms
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  getForms: () => ipcRenderer.invoke('forms:get'),
  saveForms: (mapping) => ipcRenderer.invoke('forms:save', mapping),

  // Native Dialogs
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save', options)
});
