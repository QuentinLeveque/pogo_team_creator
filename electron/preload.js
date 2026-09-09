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
  getEliteMoves: () => ipcRenderer.invoke('pvpoke:getEliteMoves'),
  refreshPvpoke: (leagues) => ipcRenderer.invoke('pvpoke:refresh', leagues),

  // Settings & Forms
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:save', patch),
  getForms: () => ipcRenderer.invoke('forms:get'),
  saveForms: (mapping) => ipcRenderer.invoke('forms:save', mapping),

  // Native Dialogs & File Writing
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:save', options),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content)
});
