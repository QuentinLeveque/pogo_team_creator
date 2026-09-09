const fs = require('fs');
const path = require('path');

const defaultFormsPath = path.resolve(__dirname, '../../src/data/forms.json');
const defaultFormsData = JSON.parse(fs.readFileSync(defaultFormsPath, 'utf-8'));

let currentDir = null;

const DEFAULT_SETTINGS = {
  lastActiveLeague: '1500',
  lastView: 'my-pokemon',
  cacheRefreshIntervalHours: 24,
  windowBounds: { x: 100, y: 100, width: 1200, height: 800 }
};

function initSettingsManager(userDataDir) {
  currentDir = userDataDir;
  if (!fs.existsSync(currentDir)) {
    fs.mkdirSync(currentDir, { recursive: true });
  }

  const formsPath = path.join(currentDir, 'forms.json');
  if (!fs.existsSync(formsPath)) {
    fs.writeFileSync(formsPath, JSON.stringify(defaultFormsData, null, 2), 'utf-8');
  }

  const settingsPath = path.join(currentDir, 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    fs.writeFileSync(settingsPath, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8');
  }
}

function getSettings() {
  if (!currentDir) return DEFAULT_SETTINGS;
  const settingsPath = path.join(currentDir, 'settings.json');
  try {
    if (fs.existsSync(settingsPath)) {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      return { ...DEFAULT_SETTINGS, ...data };
    }
  } catch (err) {
    console.error('Failed to read settings.json:', err);
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(patch) {
  const current = getSettings();
  const updated = { ...current, ...patch };
  if (currentDir) {
    const settingsPath = path.join(currentDir, 'settings.json');
    fs.writeFileSync(settingsPath, JSON.stringify(updated, null, 2), 'utf-8');
  }
  return updated;
}

function getForms() {
  if (!currentDir) return defaultFormsData;
  const formsPath = path.join(currentDir, 'forms.json');
  try {
    if (fs.existsSync(formsPath)) {
      return JSON.parse(fs.readFileSync(formsPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Failed to read forms.json:', err);
  }
  return defaultFormsData;
}

function saveForms(newMappings) {
  const current = getForms();
  const merged = { ...current, ...newMappings };
  if (currentDir) {
    const formsPath = path.join(currentDir, 'forms.json');
    fs.writeFileSync(formsPath, JSON.stringify(merged, null, 2), 'utf-8');
  }
  return merged;
}

module.exports = {
  initSettingsManager,
  getSettings,
  saveSettings,
  getForms,
  saveForms
};
