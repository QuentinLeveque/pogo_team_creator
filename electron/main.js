const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const { initCsvManager, getMasterPokemon, importAndMerge, removePokemon, exportMergedCsv, getImportHistory, removeAllCsvs, removeCsvFile } = require('./services/csvManager');
const { initPvpokeCache, getRankings, getEliteMovesMap, refreshAll, getGamemasterPokemonMetadata } = require('./services/pvpokeCache');
const { initSettingsManager, getSettings, saveSettings, getForms, saveForms } = require('./services/settingsManager');

function createWindow() {
  const userData = app.getPath('userData');
  initCsvManager(userData);
  initPvpokeCache(userData);
  initSettingsManager(userData);

  const initialSettings = getSettings();
  const bounds = initialSettings.windowBounds || { width: 1200, height: 800 };

  const win = new BrowserWindow({
    ...bounds,
    backgroundColor: '#FAFBFC',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.on('resize', () => {
    saveSettings({ windowBounds: win.getBounds() });
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// IPC Registrations
ipcMain.handle('csv:getMaster', () => getMasterPokemon());
ipcMain.handle('csv:import', (e, content, filename) => importAndMerge(content, filename));
ipcMain.handle('csv:remove', (e, key) => removePokemon(key));
ipcMain.handle('csv:export', () => exportMergedCsv());
ipcMain.handle('csv:getHistory', () => getImportHistory());
ipcMain.handle('csv:removeAll', () => removeAllCsvs());
ipcMain.handle('csv:removeFile', (e, historyId) => removeCsvFile(historyId));

ipcMain.handle('pvpoke:getRankings', (e, league, forceRefresh) => getRankings(league, forceRefresh));
ipcMain.handle('pvpoke:getEliteMoves', () => getEliteMovesMap());
ipcMain.handle('pvpoke:getPokemonMetadata', () => getGamemasterPokemonMetadata());
ipcMain.handle('pvpoke:refresh', (e, leagues) => refreshAll(leagues));

ipcMain.handle('settings:get', () => getSettings());
ipcMain.handle('settings:save', (e, patch) => saveSettings(patch));
ipcMain.handle('forms:get', () => getForms());
ipcMain.handle('forms:save', (e, mapping) => saveForms(mapping));

ipcMain.handle('dialog:save', async (e, options) => {
  return await dialog.showSaveDialog(options);
});

ipcMain.handle('fs:writeFile', async (e, filePath, content) => {
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
