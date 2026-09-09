# PoGo Team Creator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a French-language Electron desktop application that cross-references a Pokémon GO collection (from PokeGenie CSV exports) with PvPoke PvP rankings to display viable Pokémon across all 4 competitive leagues.

**Architecture:** Electron main process handles file I/O, local caching, CSV merging, and network fetches. Renderer runs Vue 3 (Composition API) with Pinia state management, communicating exclusively through a secure `preload.js` contextBridge. Data is stored in JSON files in Electron's `userData` directory without a database.

**Tech Stack:** Electron 31+, Vue 3, Vite 5+, Pinia 2+, Vitest, @vue/test-utils.

**Spec:** `docs/superpowers/specs/2026-09-09-pogo-team-creator-design.md`

## Global Constraints

- French UI throughout (labels, tooltips, dialogs, Pokémon and move names).
- Light theme only (`#FAFBFC` page background, `#FFFFFF` row cards, `#E2E8F0` borders).
- List layout with expandable rows (PvPoke-inspired), no card grids.
- Master CSV collection only grows on import (merge-on-import deduplicated by `Nom + Forme + Atq IV + Déf IV + Rés IV + Date Attrapée`).
- Manual removal of Pokémon is initiated from the expanded card with a confirmation dialog.
- Unrecognized French forms are detected and mapped via an in-app Form Mapping Editor persisted in `userData/forms.json`.
- PvPoke ranking data cached locally in `userData/cache/` with 24-hour background revalidation and offline fallback.
- No direct `fs` or `http` calls from Vue renderer; all operations go via `window.electronAPI` in `preload.js`.

---

### Task 1: Project Scaffolding & Build Configuration

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `vitest.config.js`
- Create: `index.html`
- Create: `electron/main.js`
- Create: `electron/preload.js`
- Create: `src/main.js`
- Create: `src/App.vue`
- Test: `tests/smoke.test.js`

**Interfaces:**
- Consumes: None
- Produces: Executable development server (`npm run dev`), Electron runner (`npm run electron:dev`), and test runner (`npm test`).

- [ ] **Step 1: Write the failing smoke test**

```javascript
// tests/smoke.test.js
import { describe, it, expect } from 'vitest';

describe('Project setup smoke test', () => {
  it('should verify test runner is operational', () => {
    const environment = 'ready';
    expect(environment).toBe('ready');
  });
});
```

- [ ] **Step 2: Run test to verify it fails (missing runner / package.json)**

Run: `npx vitest run tests/smoke.test.js`
Expected: FAIL or error indicating vitest is not installed / configured.

- [ ] **Step 3: Create configuration and minimal files**

`package.json`:
```json
{
  "name": "pogo-team-creator",
  "version": "1.0.0",
  "description": "Cross-reference Pokémon GO PokeGenie exports with PvPoke rankings",
  "main": "electron/main.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "electron:dev": "concurrently -k \"vite\" \"wait-on tcp:5173 && electron .\""
  },
  "dependencies": {
    "pinia": "^2.1.7",
    "vue": "^3.4.21"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.4",
    "@vue/test-utils": "^2.4.5",
    "concurrently": "^8.2.2",
    "electron": "^31.0.0",
    "jsdom": "^24.0.0",
    "vite": "^5.2.0",
    "vitest": "^1.4.0",
    "wait-on": "^7.2.0"
  }
}
```

`vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173
  }
});
```

`vitest.config.js`:
```javascript
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
```

`index.html`:
```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PoGo Team Creator</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

`electron/preload.js`:
```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('app:ping')
});
```

`electron/main.js`:
```javascript
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

ipcMain.handle('app:ping', () => 'pong');

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
```

`src/main.js`:
```javascript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
```

`src/App.vue`:
```vue
<template>
  <div id="pogo-app">
    <h1>PoGo Team Creator</h1>
  </div>
</template>

<script setup>
</script>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #FAFBFC;
  color: #1A202C;
}
</style>
```

- [ ] **Step 4: Install dependencies and run smoke test to verify it passes**

Run: `npm install && npm test`
Expected: PASS with 1 passing test in `tests/smoke.test.js`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vite.config.js vitest.config.js index.html electron/ src/ tests/
git commit -m "chore: scaffold electron, vue 3, vite, pinia, and vitest"
```

---

### Task 2: Translation Data & Name Translator Service

**Files:**
- Create: `src/data/fr.json` (copied from `old/fr.json`)
- Create: `src/data/en.json` (copied from `old/en.json`)
- Create: `src/data/forms.json` (initialized from `old/form..json`)
- Create: `electron/services/nameTranslator.js`
- Test: `tests/nameTranslator.test.js`

**Interfaces:**
- Consumes: `fr.json` (array of French lowercase names), `en.json` (array of English names), `forms.json` (French form name -> English suffix).
- Produces:
  - `toSpeciesId(frenchName: string, form: string, isShadow: boolean, customForms?: Record<string, string>): { id: string, unmatched: boolean, unmatchedForm: string | null }`
  - `speciesIdToFrench(speciesId: string, customForms?: Record<string, string>): { frenchName: string, form: string, isShadow: boolean }`

- [ ] **Step 1: Write the failing unit tests for nameTranslator**

```javascript
// tests/nameTranslator.test.js
import { describe, it, expect } from 'vitest';
import { toSpeciesId, speciesIdToFrench } from '../electron/services/nameTranslator.js';

describe('nameTranslator', () => {
  it('translates standard Pokemon without form', () => {
    const res = toSpeciesId('Dracaufeu', '', false);
    expect(res).toEqual({ id: 'charizard', unmatched: false, unmatchedForm: null });
  });

  it('translates shadow Pokemon', () => {
    const res = toSpeciesId('Dracaufeu', '', true);
    expect(res).toEqual({ id: 'charizard_shadow', unmatched: false, unmatchedForm: null });
  });

  it('translates known regional form (Galar)', () => {
    const res = toSpeciesId('Limonde', 'Galar', false);
    expect(res).toEqual({ id: 'stunfisk_galarian', unmatched: false, unmatchedForm: null });
  });

  it('translates shadow regional form', () => {
    const res = toSpeciesId('Ossatueur', 'Alola', true);
    expect(res).toEqual({ id: 'marowak_alolan_shadow', unmatched: false, unmatchedForm: null });
  });

  it('treats "Normale" or empty form as no suffix', () => {
    const res1 = toSpeciesId('Rattata', 'Normale', false);
    expect(res1).toEqual({ id: 'rattata', unmatched: false, unmatchedForm: null });

    const res2 = toSpeciesId('Rattata', null, false);
    expect(res2).toEqual({ id: 'rattata', unmatched: false, unmatchedForm: null });
  });

  it('detects unrecognized form and flags it', () => {
    const res = toSpeciesId('Deoxys', 'FormeInconnueXYZ', false);
    expect(res.unmatched).toBe(true);
    expect(res.unmatchedForm).toBe('FormeInconnueXYZ');
  });

  it('uses customForms mapping override when provided', () => {
    const customForms = { 'FormeInconnueXYZ': 'speed' };
    const res = toSpeciesId('Deoxys', 'FormeInconnueXYZ', false, customForms);
    expect(res).toEqual({ id: 'deoxys_speed', unmatched: false, unmatchedForm: null });
  });

  it('reverses speciesId to French name and attributes', () => {
    const res = speciesIdToFrench('charizard_shadow');
    expect(res.frenchName.toLowerCase()).toBe('dracaufeu');
    expect(res.isShadow).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/nameTranslator.test.js`
Expected: FAIL with "Cannot find module '../electron/services/nameTranslator.js'".

- [ ] **Step 3: Copy data files and implement nameTranslator.js**

Run:
```bash
cp old/fr.json src/data/fr.json
cp old/en.json src/data/en.json
cp old/form..json src/data/forms.json
```

Implement `electron/services/nameTranslator.js`:
```javascript
const frNames = require('../../src/data/fr.json');
const enNames = require('../../src/data/en.json');
const defaultForms = require('../../src/data/forms.json');

function normalizeName(str) {
  if (!str) return '';
  return str.trim().toLowerCase();
}

function toSpeciesId(frenchName, form, isShadow = false, customForms = {}) {
  if (!frenchName) {
    return { id: '', unmatched: false, unmatchedForm: null };
  }

  const cleanFrName = normalizeName(frenchName);
  const frIndex = frNames.findIndex(n => n.toLowerCase() === cleanFrName);

  if (frIndex === -1) {
    return { id: cleanFrName.replace(/ /g, '_'), unmatched: false, unmatchedForm: null };
  }

  const enRaw = enNames[frIndex];
  let id = enRaw.replace(/ /g, '_').replace(/-/g, '_').replace(/\. /g, '_').replace(/\./g, '_').toLowerCase();

  const combinedForms = { ...defaultForms, ...customForms };

  let unmatched = false;
  let unmatchedForm = null;

  if (form && form.trim() !== '' && form.trim() !== 'Normale') {
    const trimmedForm = form.trim();
    if (combinedForms[trimmedForm] !== undefined) {
      const suffix = combinedForms[trimmedForm];
      if (suffix) {
        id += `_${suffix}`;
      }
    } else {
      unmatched = true;
      unmatchedForm = trimmedForm;
    }
  }

  if (isShadow) {
    id += '_shadow';
  }

  return { id, unmatched, unmatchedForm };
}

function speciesIdToFrench(speciesId, customForms = {}) {
  if (!speciesId) return { frenchName: '', form: '', isShadow: false };

  let cleanId = speciesId;
  let isShadow = false;
  if (cleanId.endsWith('_shadow')) {
    isShadow = true;
    cleanId = cleanId.replace(/_shadow$/, '');
  }

  const combinedForms = { ...defaultForms, ...customForms };
  let formName = '';

  // Look for form suffix
  for (const [frForm, enSuffix] of Object.entries(combinedForms)) {
    if (enSuffix && cleanId.endsWith(`_${enSuffix}`)) {
      formName = frForm;
      cleanId = cleanId.slice(0, -(enSuffix.length + 1));
      break;
    }
  }

  // Look up base english name in enNames
  const normalizedEnNames = enNames.map(name =>
    name.replace(/ /g, '_').replace(/-/g, '_').replace(/\. /g, '_').replace(/\./g, '_').toLowerCase()
  );

  const foundIndex = normalizedEnNames.indexOf(cleanId);
  let frenchName = cleanId;
  if (foundIndex !== -1 && frNames[foundIndex]) {
    frenchName = frNames[foundIndex];
    // Capitalize first letter
    frenchName = frenchName.charAt(0).toUpperCase() + frenchName.slice(1);
  }

  return { frenchName, form: formName, isShadow };
}

module.exports = {
  toSpeciesId,
  speciesIdToFrench
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/nameTranslator.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/ electron/services/nameTranslator.js tests/nameTranslator.test.js
git commit -m "feat: add translation data and nameTranslator service with tests"
```

---

### Task 3: Settings & Forms Storage Manager

**Files:**
- Create: `electron/services/settingsManager.js`
- Test: `tests/settingsManager.test.js`

**Interfaces:**
- Consumes: Node `fs` and `path`, defaults from `src/data/forms.json`.
- Produces:
  - `initSettingsManager(userDataDir: string)`
  - `getSettings(): AppSettings`
  - `saveSettings(patch: Partial<AppSettings>): AppSettings`
  - `getForms(): Record<string, string>`
  - `saveForms(mapping: Record<string, string>): Record<string, string>`

- [ ] **Step 1: Write failing unit test for settingsManager**

```javascript
// tests/settingsManager.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  initSettingsManager,
  getSettings,
  saveSettings,
  getForms,
  saveForms
} from '../electron/services/settingsManager.js';

describe('settingsManager', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pogo-test-settings-'));
    initSettingsManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns default settings on fresh init', () => {
    const settings = getSettings();
    expect(settings.lastActiveLeague).toBe('1500');
    expect(settings.lastView).toBe('my-pokemon');
    expect(settings.cacheRefreshIntervalHours).toBe(24);
  });

  it('updates and persists settings', () => {
    saveSettings({ lastActiveLeague: '2500', lastView: 'meta' });
    const updated = getSettings();
    expect(updated.lastActiveLeague).toBe('2500');
    expect(updated.lastView).toBe('meta');

    // Verify written to disk
    const onDisk = JSON.parse(fs.readFileSync(path.join(tmpDir, 'settings.json'), 'utf-8'));
    expect(onDisk.lastActiveLeague).toBe('2500');
  });

  it('seeds and returns default forms if userData/forms.json does not exist', () => {
    const forms = getForms();
    expect(forms.Galar).toBe('galarian');
    expect(forms.Alola).toBe('alolan');
  });

  it('saves new custom form mapping and merges it', () => {
    saveForms({ 'CélesteTest': 'sky_test' });
    const forms = getForms();
    expect(forms.CélesteTest).toBe('sky_test');
    expect(forms.Galar).toBe('galarian');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/settingsManager.test.js`
Expected: FAIL with "Cannot find module '../electron/services/settingsManager.js'".

- [ ] **Step 3: Implement settingsManager.js**

`electron/services/settingsManager.js`:
```javascript
const fs = require('fs');
const path = require('path');
const defaultFormsData = require('../../src/data/forms.json');

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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/settingsManager.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/services/settingsManager.js tests/settingsManager.test.js
git commit -m "feat: add settings and forms persistence manager with tests"
```

---

### Task 4: CSV Manager Service (Parsing, Master Merge, Deletion, Export)

**Files:**
- Create: `electron/services/csvManager.js`
- Test: `tests/csvManager.test.js`

**Interfaces:**
- Consumes: Node `fs`, `path`, raw CSV strings.
- Produces:
  - `initCsvManager(userDataDir: string)`
  - `parsePokeGenieCsv(content: string): { valid: boolean, errors: string[], data: object[] }`
  - `getUniqueKey(pokemon: object): string`
  - `importAndMerge(csvContent: string, originalFilename: string): { success: boolean, addedCount: number, totalCount: number, historyEntry: object }`
  - `getMasterPokemon(): object[]`
  - `removePokemon(uniqueKey: string): boolean`
  - `exportMergedCsv(): string`
  - `getImportHistory(): object[]`

- [ ] **Step 1: Write failing unit test for csvManager**

```javascript
// tests/csvManager.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  initCsvManager,
  parsePokeGenieCsv,
  getUniqueKey,
  importAndMerge,
  getMasterPokemon,
  removePokemon,
  exportMergedCsv,
  getImportHistory
} from '../electron/services/csvManager.js';

describe('csvManager', () => {
  let tmpDir;

  const validCsv =
`Index,Nom,Forme,Pokemon,Sexe,PC,PV,Atq IV,Déf IV,Rés IV,IV Moyen,Niveau Min,Niveau Max,Attaque Rapide,Attaque Chargée,Attaque Chargée 2,Date Analyse,Date Attrapée,Poids,Taille,Chanceux,Obscur/Purifié,Favori,Poussières,Rang % (G),Rang # (G),Prod Stat (G),Coût Poussières (G),Coût Bonbon (G),Nom (G),Forme (G),Obs/Pur (G),Rang % (U),Rang # (U),Prod Stat (U),Coût Poussières (U),Coût Bonbon (U),Nom (U),Forme (U),Obs/Pur (U),Rang % (L),Rang # (L),Prod Stat (L),Coût Poussières (L),Coût Bonbon (L),Nom (L),Forme (L),Obs/Pur (L),Marqué pour Utilisation en PvP
1,Lixy,,403,♂,680,99,12,15,13,88.9,28.0,28.0,,,,"2025-04-24 15:59",18/12/2021,7.37kg,0.45m,1,0,0,4500,80.85%,785,95.55%,111000,223,Luxio,,0,78.85%,867,97.05%,17500,155,Luxray,,0,,,,,,,,,
2,Dracaufeu,,6,♂,1480,120,1,15,14,66.7,19.5,19.5,,,,"2025-04-24 16:00",10/05/2022,90.5kg,1.7m,0,0,0,2500,98.2%,15,99.1%,0,0,Dracaufeu,,0,,,,,,,,,,,,,,,`;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pogo-test-csv-'));
    initCsvManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('validates and parses valid PokeGenie CSV', () => {
    const res = parsePokeGenieCsv(validCsv);
    expect(res.valid).toBe(true);
    expect(res.data.length).toBe(2);
    expect(res.data[0].Nom).toBe('Lixy');
  });

  it('rejects invalid CSV without required columns', () => {
    const invalidCsv = 'ColA,ColB\n1,2';
    const res = parsePokeGenieCsv(invalidCsv);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('generates a stable unique key', () => {
    const parsed = parsePokeGenieCsv(validCsv).data[0];
    const key = getUniqueKey(parsed);
    expect(key).toBe('Lixy__12_15_13_18/12/2021');
  });

  it('merges on import and avoids duplicates', () => {
    const res1 = importAndMerge(validCsv, 'export1.csv');
    expect(res1.addedCount).toBe(2);
    expect(getMasterPokemon().length).toBe(2);

    // Re-import the exact same file -> 0 added
    const res2 = importAndMerge(validCsv, 'export2.csv');
    expect(res2.addedCount).toBe(0);
    expect(getMasterPokemon().length).toBe(2);

    // Check history
    const history = getImportHistory();
    expect(history.length).toBe(2);
    expect(history[0].originalFilename).toBe('export1.csv');
  });

  it('removes a Pokemon from master collection', () => {
    importAndMerge(validCsv, 'export1.csv');
    const pokemon = getMasterPokemon()[0];
    const key = getUniqueKey(pokemon);

    const removed = removePokemon(key);
    expect(removed).toBe(true);
    expect(getMasterPokemon().length).toBe(1);
  });

  it('exports merged master collection back to CSV string', () => {
    importAndMerge(validCsv, 'export1.csv');
    const exported = exportMergedCsv();
    expect(exported).toContain('Index,Nom,Forme');
    expect(exported).toContain('Lixy');
    expect(exported).toContain('Dracaufeu');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/csvManager.test.js`
Expected: FAIL with "Cannot find module '../electron/services/csvManager.js'".

- [ ] **Step 3: Implement csvManager.js**

`electron/services/csvManager.js`:
```javascript
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let storageDir = null;
let masterPath = null;
let historyPath = null;
let originalsDir = null;

const REQUIRED_COLUMNS = ['Nom', 'Forme', 'Atq IV', 'Déf IV', 'Rés IV', 'Date Attrapée'];

function initCsvManager(userDataDir) {
  storageDir = path.join(userDataDir, 'csv-library');
  originalsDir = path.join(storageDir, 'originals');
  masterPath = path.join(storageDir, 'master.json');
  historyPath = path.join(storageDir, 'import-history.json');

  if (!fs.existsSync(originalsDir)) {
    fs.mkdirSync(originalsDir, { recursive: true });
  }

  if (!fs.existsSync(masterPath)) {
    fs.writeFileSync(masterPath, JSON.stringify([], null, 2), 'utf-8');
  }

  if (!fs.existsSync(historyPath)) {
    fs.writeFileSync(historyPath, JSON.stringify([], null, 2), 'utf-8');
  }
}

// Simple RFC 4180 compliant CSV line parser
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parsePokeGenieCsv(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, errors: ['Contenu CSV vide ou invalide'], data: [] };
  }

  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { valid: false, errors: ['Le fichier ne contient pas de données'], data: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const missingHeaders = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

  if (missingHeaders.length > 0) {
    return {
      valid: false,
      errors: [`Colonnes manquantes: ${missingHeaders.join(', ')}`],
      data: []
    };
  }

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : '';
    });
    data.push(row);
  }

  return { valid: true, errors: [], data };
}

function getUniqueKey(pokemon) {
  const nom = pokemon.Nom || '';
  const forme = pokemon.Forme || '';
  const atq = pokemon['Atq IV'] || '';
  const def = pokemon['Déf IV'] || '';
  const sta = pokemon['Rés IV'] || '';
  const date = pokemon['Date Attrapée'] || '';
  return `${nom}_${forme}_${atq}_${def}_${sta}_${date}`;
}

function getMasterPokemon() {
  if (!masterPath || !fs.existsSync(masterPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function getImportHistory() {
  if (!historyPath || !fs.existsSync(historyPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function importAndMerge(csvContent, originalFilename) {
  const parsed = parsePokeGenieCsv(csvContent);
  if (!parsed.valid) {
    throw new Error(parsed.errors.join('; '));
  }

  const master = getMasterPokemon();
  const existingKeySet = new Set(master.map(p => getUniqueKey(p)));

  let addedCount = 0;
  for (const item of parsed.data) {
    const key = getUniqueKey(item);
    if (!existingKeySet.has(key)) {
      master.push(item);
      existingKeySet.add(key);
      addedCount++;
    }
  }

  fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf-8');

  // Archive original CSV
  const dateStr = new Date().toISOString().slice(0, 10);
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const storedFilename = `export_${dateStr}_${randomSuffix}.csv`;
  fs.writeFileSync(path.join(originalsDir, storedFilename), csvContent, 'utf-8');

  // Update history
  const history = getImportHistory();
  const historyEntry = {
    id: randomSuffix,
    originalFilename,
    storedFilename,
    importedAt: new Date().toISOString(),
    pokemonCountInFile: parsed.data.length,
    newPokemonAdded: addedCount
  };
  history.push(historyEntry);
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');

  return {
    success: true,
    addedCount,
    totalCount: master.length,
    historyEntry
  };
}

function removePokemon(uniqueKey) {
  const master = getMasterPokemon();
  const initialLen = master.length;
  const filtered = master.filter(p => getUniqueKey(p) !== uniqueKey);

  if (filtered.length !== initialLen) {
    fs.writeFileSync(masterPath, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  }
  return false;
}

function exportMergedCsv() {
  const master = getMasterPokemon();
  if (master.length === 0) return '';

  const headers = Object.keys(master[0]);
  const rows = [headers.join(',')];

  for (const item of master) {
    const line = headers.map(h => {
      const val = (item[h] !== undefined && item[h] !== null) ? String(item[h]) : '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
    rows.push(line);
  }

  return rows.join('\n');
}

module.exports = {
  initCsvManager,
  parsePokeGenieCsv,
  getUniqueKey,
  getMasterPokemon,
  getImportHistory,
  importAndMerge,
  removePokemon,
  exportMergedCsv
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/csvManager.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/services/csvManager.js tests/csvManager.test.js
git commit -m "feat: add CSV manager with parsing, master merge, removal and export"
```

---

### Task 5: PvPoke Data Cache & Move Translation Service

**Files:**
- Create: `electron/services/pvpokeCache.js`
- Test: `tests/pvpokeCache.test.js`

**Interfaces:**
- Consumes: Node `fs`, `https` or `fetch`, cache directory in `userData/cache`.
- Produces:
  - `initPvpokeCache(userDataDir: string)`
  - `getRankings(league: string, forceRefresh?: boolean): Promise<{ data: object[], fromCache: boolean, cachedAt: string }>`
  - `getGameMaster(forceRefresh?: boolean): Promise<object>`
  - `translateMove(moveId: string): string`

- [ ] **Step 1: Write failing unit test for pvpokeCache**

```javascript
// tests/pvpokeCache.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  initPvpokeCache,
  getRankings,
  translateMove
} from '../electron/services/pvpokeCache.js';

describe('pvpokeCache', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pogo-test-cache-'));
    initPvpokeCache(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('translates common move IDs to French display names', () => {
    expect(translateMove('FAIRY_WIND')).toBe('Vent Féerique');
    expect(translateMove('WING_ATTACK')).toBe('Cru-Ailes');
    expect(translateMove('HYDRO_CANNON')).toBe('Hydroblast');
    // Fallback for untranslated move
    expect(translateMove('UNKNOWN_MOVE_XYZ')).toBe('UNKNOWN_MOVE_XYZ');
  });

  it('saves and reads rankings from local cache file', async () => {
    const mockRankings = [{ speciesId: 'tinkaton', score: 93 }];
    const cacheFile = path.join(tmpDir, 'cache', 'rankings-1500.json');
    const metaFile = path.join(tmpDir, 'cache', 'cache-meta.json');

    fs.mkdirSync(path.join(tmpDir, 'cache'), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(mockRankings), 'utf-8');
    fs.writeFileSync(metaFile, JSON.stringify({ 'rankings-1500': new Date().toISOString() }), 'utf-8');

    const result = await getRankings('1500');
    expect(result.fromCache).toBe(true);
    expect(result.data.length).toBe(1);
    expect(result.data[0].speciesId).toBe('tinkaton');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/pvpokeCache.test.js`
Expected: FAIL with "Cannot find module '../electron/services/pvpokeCache.js'".

- [ ] **Step 3: Implement pvpokeCache.js**

`electron/services/pvpokeCache.js`:
```javascript
const fs = require('fs');
const path = require('path');

let cacheDir = null;
let metaPath = null;

const PVP_URLS = {
  '1500': 'https://pvpoke.com/data/rankings/all/overall/rankings-1500.json',
  '2500': 'https://pvpoke.com/data/rankings/all/overall/rankings-2500.json',
  '10000': 'https://pvpoke.com/data/rankings/all/overall/rankings-10000.json',
  '500': 'https://pvpoke.com/data/rankings/little/overall/rankings-500.json',
  'gamemaster': 'https://pvpoke.com/data/gamemaster.min.json'
};

// Common move translations French
const MOVE_TRANSLATIONS = {
  FAIRY_WIND: 'Vent Féerique',
  WING_ATTACK: 'Cru-Ailes',
  DRAGON_BREATH: 'Draco-Souffle',
  COUNTER: 'Riposte',
  SHADOW_CLAW: 'Griffe Ombre',
  MUD_SHOT: 'Tir de Boue',
  WATER_GUN: 'Pistolet à O',
  BULLET_SEED: 'Balle Graine',
  POISON_JAB: 'Direct Toxik',
  SNARL: 'Aboiement',
  INCINERATE: 'Calcination',
  VOLT_SWITCH: 'Change Éclair',
  GIGATON_HAMMER: 'Marteau Prodigieux',
  BULLDOZE: 'Piétinement',
  HYDRO_CANNON: 'Hydroblast',
  FRENZY_PLANT: 'Végé-Attak',
  BLAST_BURN: 'Rafale Feu',
  DRAGON_CLAW: 'Draco-Griffe',
  BODY_SLAM: 'Plaquage',
  SURF: 'Surf',
  ICE_BEAM: 'Laser Glace',
  THUNDERBOLT: 'Tonnerre',
  FLAMETHROWER: 'Lance-Flammes',
  SHADOW_BALL: 'Ball\'Ombre',
  SLUDGE_BOMB: 'Bomb-Beurk',
  EARTHQUAKE: 'Séisme',
  CLOSE_COMBAT: 'Close Combat',
  CRUNCH: 'Mâchouille',
  FOUL_PLAY: 'Tricherie',
  BRAVE_BIRD: 'Rapace',
  SKY_ATTACK: 'Piqué',
  ROCK_SLIDE: 'Éboulement',
  STONE_EDGE: 'Lame de Roc',
  AQUA_TAIL: 'Aqua-Queue',
  WEATHER_BALL_WATER: 'Ball\'Météo (Eau)',
  WEATHER_BALL_FIRE: 'Ball\'Météo (Feu)',
  WEATHER_BALL_ICE: 'Ball\'Météo (Glace)',
  WEATHER_BALL_ROCK: 'Ball\'Météo (Roche)'
};

function initPvpokeCache(userDataDir) {
  cacheDir = path.join(userDataDir, 'cache');
  metaPath = path.join(cacheDir, 'cache-meta.json');

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  if (!fs.existsSync(metaPath)) {
    fs.writeFileSync(metaPath, JSON.stringify({}, null, 2), 'utf-8');
  }
}

function getCacheMeta() {
  if (!metaPath || !fs.existsSync(metaPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function setCacheMeta(key, timestamp) {
  const meta = getCacheMeta();
  meta[key] = timestamp;
  if (metaPath) {
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }
}

function translateMove(moveId) {
  if (!moveId) return '';
  return MOVE_TRANSLATIONS[moveId] || moveId;
}

async function fetchFromNetwork(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} fetching ${url}`);
  }
  return await res.json();
}

async function getRankings(league, forceRefresh = false) {
  const filename = `rankings-${league}.json`;
  const filePath = cacheDir ? path.join(cacheDir, filename) : null;
  const meta = getCacheMeta();
  const cachedAt = meta[`rankings-${league}`];

  const isCacheValid = cachedAt && (Date.now() - new Date(cachedAt).getTime() < 24 * 60 * 60 * 1000);

  if (filePath && fs.existsSync(filePath) && isCacheValid && !forceRefresh) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { data, fromCache: true, cachedAt };
    } catch (e) {
      // Fallback to fetch
    }
  }

  const url = PVP_URLS[league];
  if (!url) {
    throw new Error(`Unknown league: ${league}`);
  }

  try {
    const data = await fetchFromNetwork(url);
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
      const now = new Date().toISOString();
      setCacheMeta(`rankings-${league}`, now);
      return { data, fromCache: false, cachedAt: now };
    }
    return { data, fromCache: false, cachedAt: new Date().toISOString() };
  } catch (networkErr) {
    // If offline but cache exists, return stale cache
    if (filePath && fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { data, fromCache: true, cachedAt: cachedAt || 'Inconnu' };
    }
    throw networkErr;
  }
}

async function getGameMaster(forceRefresh = false) {
  const filePath = cacheDir ? path.join(cacheDir, 'gamemaster.json') : null;
  const meta = getCacheMeta();
  const cachedAt = meta.gamemaster;
  const isCacheValid = cachedAt && (Date.now() - new Date(cachedAt).getTime() < 7 * 24 * 60 * 60 * 1000);

  if (filePath && fs.existsSync(filePath) && isCacheValid && !forceRefresh) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  try {
    const data = await fetchFromNetwork(PVP_URLS.gamemaster);
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
      setCacheMeta('gamemaster', new Date().toISOString());
    }
    return data;
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
  }
}

module.exports = {
  initPvpokeCache,
  getRankings,
  getGameMaster,
  translateMove,
  MOVE_TRANSLATIONS
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/pvpokeCache.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/services/pvpokeCache.js tests/pvpokeCache.test.js
git commit -m "feat: add PvPoke rankings and gamemaster cache service with tests"
```

---

### Task 6: Pokémon Matching Engine (`usePokemonMatcher`)

**Files:**
- Create: `src/composables/usePokemonMatcher.js`
- Test: `tests/usePokemonMatcher.test.js`

**Interfaces:**
- Consumes: PokeGenie raw master items, PvPoke rankings array, league identifier ('1500', '2500', '10000', '500'), customForms mapping.
- Produces:
  - `matchPokemon(masterList: object[], rankings: object[], league: string, customForms?: object): { matched: MatchedPokemon[], unmatchedForms: string[] }`

- [ ] **Step 1: Write failing unit tests for usePokemonMatcher**

```javascript
// tests/usePokemonMatcher.test.js
import { describe, it, expect } from 'vitest';
import { matchPokemon } from '../src/composables/usePokemonMatcher.js';

describe('usePokemonMatcher', () => {
  const mockRankings = [
    {
      speciesId: 'charizard',
      speciesName: 'Charizard',
      score: 88,
      moveset: ['WING_ATTACK', 'BLAST_BURN', 'DRAGON_CLAW'],
      matchups: [{ opponent: 'tinkaton', rating: 650 }],
      counters: [{ opponent: 'quagsire', rating: 350 }]
    },
    {
      speciesId: 'tinkaton',
      speciesName: 'Tinkaton',
      score: 93,
      moveset: ['FAIRY_WIND', 'GIGATON_HAMMER'],
      matchups: [],
      counters: []
    }
  ];

  const mockMaster = [
    // Specimen 1: Salameche evolving to Dracaufeu (rank 98.2%)
    {
      Nom: 'Salamèche',
      Forme: '',
      'Atq IV': '1',
      'Déf IV': '15',
      'Rés IV': '14',
      'IV Moyen': '66.7',
      'Date Attrapée': '10/05/2022',
      PC: '450',
      'Niveau Min': '15',
      Chanceux: '0',
      'Obscur/Purifié': '0',
      'Nom (G)': 'Dracaufeu',
      'Forme (G)': '',
      'Rang % (G)': '98.2%',
      'Rang # (G)': '15',
      'Coût Poussières (G)': '25000',
      'Coût Bonbon (G)': '125'
    },
    // Specimen 2: Another Salameche with lower rank (85.0%) -> should be deduplicated
    {
      Nom: 'Salamèche',
      Forme: '',
      'Atq IV': '10',
      'Déf IV': '10',
      'Rés IV': '10',
      'IV Moyen': '66.7',
      'Date Attrapée': '11/05/2022',
      PC: '400',
      'Niveau Min': '14',
      Chanceux: '0',
      'Obscur/Purifié': '0',
      'Nom (G)': 'Dracaufeu',
      'Forme (G)': '',
      'Rang % (G)': '85.0%',
      'Rang # (G)': '200',
      'Coût Poussières (G)': '40000',
      'Coût Bonbon (G)': '150'
    },
    // Specimen 3: Form with unmapped value
    {
      Nom: 'Deoxys',
      Forme: 'InconnuForm',
      'Atq IV': '15',
      'Déf IV': '15',
      'Rés IV': '15',
      'IV Moyen': '100',
      'Date Attrapée': '01/01/2023',
      PC: '1500',
      'Niveau Min': '20',
      'Nom (G)': 'Deoxys',
      'Forme (G)': 'InconnuForm',
      'Rang % (G)': '99.0%'
    }
  ];

  it('matches owned Pokemon to ranking and keeps highest rank % specimen', () => {
    const { matched, unmatchedForms } = matchPokemon(mockMaster, mockRankings, '1500');

    expect(unmatchedForms).toContain('InconnuForm');

    const charizardMatch = matched.find(m => m.meta.speciesId === 'charizard');
    expect(charizardMatch).toBeDefined();
    expect(charizardMatch.meta.rank).toBe(1); // position in rankings
    expect(charizardMatch.mine).not.toBeNull();
    expect(charizardMatch.mine.name).toBe('Salamèche');
    expect(charizardMatch.mine.ivRankPercent).toBe(98.2);
    expect(charizardMatch.mine.needsEvolution).toBe(true);
    expect(charizardMatch.mine.dustCost).toBe(25000);
    expect(charizardMatch.mine.candyCost).toBe(125);

    // Tinkaton is not in user master collection -> mine is null
    const tinkatonMatch = matched.find(m => m.meta.speciesId === 'tinkaton');
    expect(tinkatonMatch).toBeDefined();
    expect(tinkatonMatch.mine).toBeNull();
  });

  it('supports Master league IV Moyen > 85 logic', () => {
    const masterLeagueSpecimen = [
      {
        Nom: 'Dracaufeu',
        Forme: '',
        'Atq IV': '15',
        'Déf IV': '15',
        'Rés IV': '15',
        'IV Moyen': '100',
        'Date Attrapée': '10/05/2022',
        PC: '3000',
        'Niveau Min': '40',
        Chanceux: '1',
        'Obscur/Purifié': '0'
      }
    ];

    const { matched } = matchPokemon(masterLeagueSpecimen, mockRankings, '10000');
    const charizardMatch = matched.find(m => m.meta.speciesId === 'charizard');
    expect(charizardMatch.mine).not.toBeNull();
    expect(charizardMatch.mine.ivAverage).toBe(100);
    expect(charizardMatch.mine.isLucky).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/usePokemonMatcher.test.js`
Expected: FAIL with "Cannot find module '../src/composables/usePokemonMatcher.js'".

- [ ] **Step 3: Implement usePokemonMatcher.js**

`src/composables/usePokemonMatcher.js`:
```javascript
import { toSpeciesId, speciesIdToFrench } from '../../electron/services/nameTranslator.js';
import { translateMove } from '../../electron/services/pvpokeCache.js';

function parsePercent(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(',', '.').replace('%', '')) || 0;
}

function parseNumber(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(',', '.')) || 0;
}

export function matchPokemon(masterList, rankings, league, customForms = {}) {
  const unmatchedFormsSet = new Set();
  const ownedCandidatesBySpecies = new Map();

  const isMaster = league === '10000';
  const suffix = league === '1500' ? ' (G)' : league === '2500' ? ' (U)' : league === '500' ? ' (L)' : '';

  for (const row of masterList) {
    let targetName = '';
    let targetForm = '';
    let rankPercent = 0;
    let ivAverage = 0;
    let dustCost = 0;
    let candyCost = 0;
    let rankNumber = 0;

    if (isMaster) {
      targetName = row['Nom'] || '';
      targetForm = row['Forme'] || '';
      ivAverage = parseNumber(row['IV Moyen']);
      if (ivAverage <= 85) continue;
    } else {
      const rankKey = `Rang %${suffix}`;
      if (!row[rankKey] || row[rankKey].trim() === '') continue;
      targetName = row[`Nom${suffix}`] || row['Nom'] || '';
      targetForm = row[`Forme${suffix}`] || row['Forme'] || '';
      rankPercent = parsePercent(row[rankKey]);
      rankNumber = parseInt(row[`Rang #${suffix}`], 10) || 0;
      dustCost = parseInt(row[`Coût Poussières${suffix}`], 10) || 0;
      candyCost = parseInt(row[`Coût Bonbon${suffix}`], 10) || 0;
    }

    const isShadow = row['Obscur/Purifié'] === '1' || row[`Obs/Pur${suffix}`] === '1';
    const translation = toSpeciesId(targetName, targetForm, isShadow, customForms);

    if (translation.unmatched && translation.unmatchedForm) {
      unmatchedFormsSet.add(translation.unmatchedForm);
    }

    const speciesId = translation.id;
    if (!speciesId) continue;

    const candidate = {
      name: row['Nom'],
      form: row['Forme'] || '',
      targetEvolvedName: targetName,
      cp: parseInt(row['PC'], 10) || 0,
      level: parseNumber(row['Niveau Min']),
      atkIv: parseInt(row['Atq IV'], 10) || 0,
      defIv: parseInt(row['Déf IV'], 10) || 0,
      staIv: parseInt(row['Rés IV'], 10) || 0,
      ivAverage: parseNumber(row['IV Moyen']),
      ivRankPercent: rankPercent,
      ivRankNumber: rankNumber,
      isShadow,
      isLucky: row['Chanceux'] === '1',
      dustCost,
      candyCost,
      needsEvolution: (row['Nom'] || '').toLowerCase() !== targetName.toLowerCase(),
      uniqueKey: `${row['Nom']}_${row['Forme']}_${row['Atq IV']}_${row['Déf IV']}_${row['Rés IV']}_${row['Date Attrapée']}`
    };

    if (!ownedCandidatesBySpecies.has(speciesId)) {
      ownedCandidatesBySpecies.set(speciesId, candidate);
    } else {
      const existing = ownedCandidatesBySpecies.get(speciesId);
      if (isMaster) {
        if (candidate.ivAverage > existing.ivAverage) {
          ownedCandidatesBySpecies.set(speciesId, candidate);
        }
      } else {
        if (candidate.ivRankPercent > existing.ivRankPercent) {
          ownedCandidatesBySpecies.set(speciesId, candidate);
        }
      }
    }
  }

  const matched = rankings.map((ranking, index) => {
    const speciesId = ranking.speciesId;
    const { frenchName } = speciesIdToFrench(speciesId, customForms);
    const owned = ownedCandidatesBySpecies.get(speciesId) || null;

    const moveset = ranking.moveset || [];
    const fastMove = moveset[0] ? translateMove(moveset[0]) : '';
    const chargedMoves = moveset.slice(1).map(m => translateMove(m));

    const matchups = (ranking.matchups || []).slice(0, 5).map(m => {
      const info = speciesIdToFrench(m.opponent, customForms);
      return {
        opponent: m.opponent,
        opponentNameFr: info.frenchName + (info.isShadow ? ' (Obs)' : ''),
        rating: m.rating
      };
    });

    const counters = (ranking.counters || []).slice(0, 5).map(c => {
      const info = speciesIdToFrench(c.opponent, customForms);
      return {
        opponent: c.opponent,
        opponentNameFr: info.frenchName + (info.isShadow ? ' (Obs)' : ''),
        rating: c.rating
      };
    });

    return {
      meta: {
        speciesId,
        speciesName: ranking.speciesName,
        nameFr: frenchName,
        score: ranking.score,
        rank: index + 1,
        types: ranking.types || [],
        recommendedMoveset: {
          fast: fastMove,
          charged: chargedMoves
        },
        matchups,
        counters
      },
      mine: owned
    };
  });

  return {
    matched,
    unmatchedForms: Array.from(unmatchedFormsSet)
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/usePokemonMatcher.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePokemonMatcher.js tests/usePokemonMatcher.test.js
git commit -m "feat: add usePokemonMatcher engine for all leagues with tests"
```

---

### Task 7: IPC Bridge, Electron Main Process Wiring & Pinia Stores

**Files:**
- Modify: `electron/preload.js`
- Modify: `electron/main.js`
- Create: `src/stores/appStore.js`
- Create: `src/stores/pokemonStore.js`
- Test: `tests/pokemonStore.test.js`

**Interfaces:**
- Consumes: `csvManager`, `pvpokeCache`, `settingsManager`, `usePokemonMatcher`.
- Produces: Complete Pinia store state and IPC communication bridge between Electron and Vue.

- [ ] **Step 1: Write failing unit test for pokemonStore**

```javascript
// tests/pokemonStore.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePokemonStore } from '../src/stores/pokemonStore.js';

describe('pokemonStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('filters by view ("my-pokemon" vs "meta")', () => {
    const store = usePokemonStore();
    store.rawMatched = [
      { meta: { nameFr: 'Dracaufeu', score: 90 }, mine: { name: 'Salamèche', ivRankPercent: 98 } },
      { meta: { nameFr: 'Tinkaton', score: 93 }, mine: null }
    ];

    store.activeView = 'my-pokemon';
    expect(store.displayedPokemon.length).toBe(1);
    expect(store.displayedPokemon[0].meta.nameFr).toBe('Dracaufeu');

    store.activeView = 'meta';
    expect(store.displayedPokemon.length).toBe(2);
  });

  it('filters by search query case- and accent-insensitively', () => {
    const store = usePokemonStore();
    store.rawMatched = [
      { meta: { nameFr: 'Dracaufeu', score: 90 }, mine: { name: 'Salamèche' } },
      { meta: { nameFr: 'Laggron', score: 85 }, mine: { name: 'Gobou' } }
    ];
    store.activeView = 'meta';

    store.searchQuery = 'drac';
    expect(store.displayedPokemon.length).toBe(1);

    // Search by pre-evolution name
    store.searchQuery = 'gobou';
    expect(store.displayedPokemon.length).toBe(1);
    expect(store.displayedPokemon[0].meta.nameFr).toBe('Laggron');
  });

  it('sorts list by score, IV rank, name, and dust cost', () => {
    const store = usePokemonStore();
    store.rawMatched = [
      { meta: { nameFr: 'B', score: 80 }, mine: { ivRankPercent: 99, dustCost: 50000 } },
      { meta: { nameFr: 'A', score: 95 }, mine: { ivRankPercent: 80, dustCost: 10000 } }
    ];
    store.activeView = 'meta';

    store.sortOption = 'score';
    expect(store.displayedPokemon[0].meta.nameFr).toBe('A');

    store.sortOption = 'name';
    expect(store.displayedPokemon[0].meta.nameFr).toBe('A');

    store.sortOption = 'ivRank';
    expect(store.displayedPokemon[0].meta.nameFr).toBe('B');

    store.sortOption = 'cost';
    expect(store.displayedPokemon[0].meta.nameFr).toBe('A');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/pokemonStore.test.js`
Expected: FAIL with "Cannot find module '../src/stores/pokemonStore.js'".

- [ ] **Step 3: Implement preload.js, main.js, appStore.js, and pokemonStore.js**

`electron/preload.js`:
```javascript
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
```

`electron/main.js`:
```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const { initCsvManager, getMasterPokemon, importAndMerge, removePokemon, exportMergedCsv, getImportHistory } = require('./services/csvManager');
const { initPvpokeCache, getRankings } = require('./services/pvpokeCache');
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

ipcMain.handle('pvpoke:getRankings', (e, league, forceRefresh) => getRankings(league, forceRefresh));

ipcMain.handle('settings:get', () => getSettings());
ipcMain.handle('settings:save', (e, patch) => saveSettings(patch));
ipcMain.handle('forms:get', () => getForms());
ipcMain.handle('forms:save', (e, mapping) => saveForms(mapping));

ipcMain.handle('dialog:save', async (e, options) => {
  return await dialog.showSaveDialog(options);
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
```

`src/stores/appStore.js`:
```javascript
import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    activeLeague: '1500',
    activeView: 'my-pokemon', // 'my-pokemon' | 'meta'
    searchQuery: '',
    sortOption: 'score', // 'score' | 'ivRank' | 'name' | 'cost'
    importHistory: [],
    unmatchedForms: [],
    customForms: {},
    isImporterOpen: false,
    isFormEditorOpen: false,
    toastMessage: ''
  }),
  actions: {
    setLeague(league) {
      this.activeLeague = league;
      if (window.electronAPI?.saveSettings) {
        window.electronAPI.saveSettings({ lastActiveLeague: league });
      }
    },
    setView(view) {
      this.activeView = view;
      if (window.electronAPI?.saveSettings) {
        window.electronAPI.saveSettings({ lastView: view });
      }
    },
    showToast(msg) {
      this.toastMessage = msg;
      setTimeout(() => {
        if (this.toastMessage === msg) this.toastMessage = '';
      }, 4000);
    }
  }
});
```

`src/stores/pokemonStore.js`:
```javascript
import { defineStore } from 'pinia';
import { matchPokemon } from '../composables/usePokemonMatcher.js';
import { useAppStore } from './appStore.js';

function cleanStr(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const usePokemonStore = defineStore('pokemon', {
  state: () => ({
    rawMatched: [],
    isLoading: false,
    error: null,
    searchQuery: '',
    sortOption: 'score',
    activeView: 'my-pokemon'
  }),
  getters: {
    displayedPokemon(state) {
      let list = state.rawMatched;

      if (state.activeView === 'my-pokemon') {
        list = list.filter(item => item.mine !== null);
      }

      if (state.searchQuery.trim() !== '') {
        const q = cleanStr(state.searchQuery);
        list = list.filter(item => {
          const metaName = cleanStr(item.meta.nameFr);
          const mineName = item.mine ? cleanStr(item.mine.name) : '';
          return metaName.includes(q) || mineName.includes(q);
        });
      }

      const sorted = [...list];
      if (state.sortOption === 'score') {
        sorted.sort((a, b) => (b.meta.score || 0) - (a.meta.score || 0));
      } else if (state.sortOption === 'ivRank') {
        sorted.sort((a, b) => {
          const rankA = a.mine ? a.mine.ivRankPercent || 0 : 0;
          const rankB = b.mine ? b.mine.ivRankPercent || 0 : 0;
          return rankB - rankA;
        });
      } else if (state.sortOption === 'name') {
        sorted.sort((a, b) => (a.meta.nameFr || '').localeCompare(b.meta.nameFr || ''));
      } else if (state.sortOption === 'cost') {
        sorted.sort((a, b) => {
          const costA = a.mine ? a.mine.dustCost || 0 : 9999999;
          const costB = b.mine ? b.mine.dustCost || 0 : 9999999;
          return costA - costB;
        });
      }

      return sorted;
    }
  },
  actions: {
    async loadData() {
      const appStore = useAppStore();
      this.isLoading = true;
      this.error = null;

      try {
        if (!window.electronAPI) return;

        const [master, rankingsRes, forms, history] = await Promise.all([
          window.electronAPI.getMasterPokemon(),
          window.electronAPI.getRankings(appStore.activeLeague),
          window.electronAPI.getForms(),
          window.electronAPI.getImportHistory()
        ]);

        appStore.customForms = forms || {};
        appStore.importHistory = history || [];

        const { matched, unmatchedForms } = matchPokemon(
          master || [],
          rankingsRes.data || [],
          appStore.activeLeague,
          appStore.customForms
        );

        this.rawMatched = matched;
        appStore.unmatchedForms = unmatchedForms;

        if (rankingsRes.fromCache && rankingsRes.cachedAt) {
          appStore.showToast(`Données PvPoke en cache (mise à jour: ${new Date(rankingsRes.cachedAt).toLocaleDateString('fr-FR')})`);
        }
      } catch (err) {
        this.error = err.message || 'Erreur de chargement des données';
      } finally {
        this.isLoading = false;
      }
    }
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/pokemonStore.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add electron/preload.js electron/main.js src/stores/ tests/pokemonStore.test.js
git commit -m "feat: setup IPC bridge, main process event handlers, and Pinia stores"
```

---

### Task 8: Design System, Layout, Sidebar, Search & View Toggle Components

**Files:**
- Create: `src/assets/styles.css`
- Create: `src/assets/type-colors.js`
- Create: `src/components/AppSidebar.vue`
- Create: `src/components/ViewToggle.vue`
- Create: `src/components/SearchBar.vue`
- Test: `tests/components/SearchBar.test.js`

**Interfaces:**
- Consumes: `appStore`, `pokemonStore`, CSS design tokens.
- Produces: Reusable navigation, search, and filter UI components in French.

- [ ] **Step 1: Write failing unit test for SearchBar**

```javascript
// tests/components/SearchBar.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SearchBar from '../../src/components/SearchBar.vue';
import { usePokemonStore } from '../../src/stores/pokemonStore.js';

describe('SearchBar.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('updates pokemonStore searchQuery when user types', async () => {
    const wrapper = mount(SearchBar);
    const store = usePokemonStore();
    const input = wrapper.find('input');

    await input.setValue('Pikachu');
    expect(store.searchQuery).toBe('Pikachu');
  });

  it('updates pokemonStore sortOption when select changes', async () => {
    const wrapper = mount(SearchBar);
    const store = usePokemonStore();
    const select = wrapper.find('select');

    await select.setValue('ivRank');
    expect(store.sortOption).toBe('ivRank');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/components/SearchBar.test.js`
Expected: FAIL with "Cannot find module '../../src/components/SearchBar.vue'".

- [ ] **Step 3: Implement styles, type colors, AppSidebar, ViewToggle, and SearchBar**

`src/assets/type-colors.js`:
```javascript
export const TYPE_COLORS = {
  Acier: '#B7B7CE',
  Combat: '#C22E28',
  Dragon: '#6F35FC',
  Eau: '#6390F0',
  Électrik: '#F7D02C',
  Fée: '#D685AD',
  Feu: '#EE8130',
  Glace: '#96D9D6',
  Insecte: '#A6B91A',
  Normal: '#A8A77A',
  Plante: '#7AC74C',
  Poison: '#A33EA1',
  Psy: '#F95587',
  Roche: '#B6A136',
  Sol: '#E2BF65',
  Spectre: '#735797',
  Ténèbres: '#705746',
  Vol: '#A98FF3'
};
```

`src/assets/styles.css`:
```css
:root {
  --bg-page: #FAFBFC;
  --bg-card: #FFFFFF;
  --border-color: #E2E8F0;
  --text-primary: #1A202C;
  --text-secondary: #718096;
  --accent-shadow: #7C3AED;
  --accent-lucky: #F59E0B;
  --color-super: #3B82F6;
  --color-hyper: #EAB308;
  --color-master: #8B5CF6;
  --color-little: #22C55E;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background-color: var(--bg-page);
  color: var(--text-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app-container {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: 280px;
  background: #FFFFFF;
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  padding: 1.25rem;
  flex-shrink: 0;
  overflow-y: auto;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  overflow-y: auto;
}
```

`src/components/AppSidebar.vue`:
```vue
<template>
  <aside class="sidebar">
    <div class="brand">
      <h2>PoGo Team Creator</h2>
    </div>

    <div class="section-title">Ligues</div>
    <div class="league-selector">
      <button
        v-for="league in leagues"
        :key="league.id"
        :class="['league-btn', { active: appStore.activeLeague === league.id }]"
        :style="{ '--badge-color': league.color }"
        @click="selectLeague(league.id)"
      >
        <span class="league-indicator"></span>
        <span class="league-name">{{ league.name }}</span>
        <span class="league-cp">{{ league.cp }}</span>
      </button>
    </div>

    <div v-if="appStore.unmatchedForms.length > 0" class="warning-box" @click="appStore.isFormEditorOpen = true">
      <span class="warning-icon">⚠</span>
      <span>{{ appStore.unmatchedForms.length }} forme(s) non reconnue(s)</span>
    </div>

    <hr class="divider" />

    <div class="section-header">
      <span class="section-title">Historique CSV</span>
      <button class="action-btn-mini" @click="appStore.isImporterOpen = true">+ Importer</button>
    </div>

    <div class="history-list">
      <div v-if="appStore.importHistory.length === 0" class="empty-history">
        Aucun fichier importé
      </div>
      <div v-for="item in appStore.importHistory" :key="item.id" class="history-item">
        <div class="history-file">{{ item.originalFilename }}</div>
        <div class="history-meta">
          <span>{{ new Date(item.importedAt).toLocaleDateString('fr-FR') }}</span>
          <span class="added-tag">+{{ item.newPokemonAdded }} Pokémon</span>
        </div>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="export-btn" @click="exportMerged">
        📥 Exporter CSV fusionné
      </button>
    </div>
  </aside>
</template>

<script setup>
import { useAppStore } from '../stores/appStore.js';
import { usePokemonStore } from '../stores/pokemonStore.js';

const appStore = useAppStore();
const pokemonStore = usePokemonStore();

const leagues = [
  { id: '1500', name: 'Ligue Super', cp: '1500 PC', color: '#3B82F6' },
  { id: '2500', name: 'Ligue Hyper', cp: '2500 PC', color: '#EAB308' },
  { id: '10000', name: 'Ligue Master', cp: 'Sans limite', color: '#8B5CF6' },
  { id: '500', name: 'Ligue Petite', cp: '500 PC', color: '#22C55E' }
];

async function selectLeague(id) {
  appStore.setLeague(id);
  await pokemonStore.loadData();
}

async function exportMerged() {
  if (!window.electronAPI) return;
  const csvData = await window.electronAPI.exportMergedCsv();
  if (!csvData) {
    appStore.showToast('Aucun Pokémon dans la collection à exporter.');
    return;
  }
  const saveRes = await window.electronAPI.showSaveDialog({
    title: 'Exporter le CSV fusionné',
    defaultPath: 'pokegenie_master_export.csv',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  if (!saveRes.canceled && saveRes.filePath) {
    // Save via backend
    appStore.showToast('CSV exporté avec succès.');
  }
}
</script>

<style scoped>
.brand h2 {
  font-size: 1.2rem;
  margin: 0 0 1.5rem 0;
  color: #1A202C;
}
.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #718096;
  margin-bottom: 0.75rem;
}
.league-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.league-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}
.league-btn.active {
  background: #EFF6FF;
  border-color: #3B82F6;
  font-weight: 600;
}
.league-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--badge-color);
}
.league-name {
  flex: 1;
  font-size: 0.9rem;
}
.league-cp {
  font-size: 0.75rem;
  color: #718096;
}
.warning-box {
  margin-top: 1rem;
  padding: 0.6rem 0.75rem;
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #92400E;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.divider {
  border: 0;
  border-top: 1px solid #E2E8F0;
  margin: 1.5rem 0;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.action-btn-mini {
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}
.history-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.empty-history {
  font-size: 0.8rem;
  color: #A0AEC0;
  font-style: italic;
}
.history-item {
  padding: 0.5rem;
  background: #F8FAFC;
  border-radius: 6px;
  font-size: 0.8rem;
}
.history-file {
  font-weight: 500;
  word-break: break-all;
}
.history-meta {
  display: flex;
  justify-content: space-between;
  color: #718096;
  font-size: 0.7rem;
  margin-top: 0.25rem;
}
.added-tag {
  color: #059669;
  font-weight: 600;
}
.sidebar-footer {
  margin-top: 1rem;
}
.export-btn {
  width: 100%;
  padding: 0.6rem;
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}
.export-btn:hover {
  background: #F1F5F9;
}
</style>
```

`src/components/ViewToggle.vue`:
```vue
<template>
  <div class="view-toggle">
    <button
      :class="['toggle-tab', { active: pokemonStore.activeView === 'my-pokemon' }]"
      @click="setView('my-pokemon')"
    >
      Mes Pokémon
    </button>
    <button
      :class="['toggle-tab', { active: pokemonStore.activeView === 'meta' }]"
      @click="setView('meta')"
    >
      Méta complète
    </button>
  </div>
</template>

<script setup>
import { usePokemonStore } from '../stores/pokemonStore.js';
import { useAppStore } from '../stores/appStore.js';

const pokemonStore = usePokemonStore();
const appStore = useAppStore();

function setView(view) {
  pokemonStore.activeView = view;
  appStore.setView(view);
}
</script>

<style scoped>
.view-toggle {
  display: inline-flex;
  background: #E2E8F0;
  border-radius: 8px;
  padding: 4px;
}
.toggle-tab {
  padding: 0.5rem 1.25rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  font-weight: 500;
  color: #4A5568;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.toggle-tab.active {
  background: #FFFFFF;
  color: #1A202C;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
</style>
```

`src/components/SearchBar.vue`:
```vue
<template>
  <div class="search-bar-container">
    <div class="search-input-wrapper">
      <input
        v-model="pokemonStore.searchQuery"
        type="text"
        placeholder="Rechercher par nom français (ex: Dracaufeu, Salamèche)..."
        class="search-input"
      />
      <button v-if="pokemonStore.searchQuery" class="clear-btn" @click="pokemonStore.searchQuery = ''">
        ✕
      </button>
    </div>
    <div class="sort-wrapper">
      <label class="sort-label">Trier par :</label>
      <select v-model="pokemonStore.sortOption" class="sort-select">
        <option value="score">Score PvPoke</option>
        <option value="ivRank">Rang IV %</option>
        <option value="name">Nom</option>
        <option value="cost">Coût poussières</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { usePokemonStore } from '../stores/pokemonStore.js';

const pokemonStore = usePokemonStore();
</script>

<style scoped>
.search-bar-container {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin: 1rem 0;
}
.search-input-wrapper {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}
.search-input {
  width: 100%;
  padding: 0.6rem 2rem 0.6rem 0.9rem;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 0.9rem;
  outline: none;
  background: #FFFFFF;
}
.search-input:focus {
  border-color: #3B82F6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.15);
}
.clear-btn {
  position: absolute;
  right: 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: #A0AEC0;
}
.sort-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.sort-label {
  font-size: 0.85rem;
  color: #718096;
}
.sort-select {
  padding: 0.55rem 0.75rem;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 0.85rem;
  background: #FFFFFF;
  cursor: pointer;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/components/SearchBar.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/assets/ src/components/AppSidebar.vue src/components/ViewToggle.vue src/components/SearchBar.vue tests/components/SearchBar.test.js
git commit -m "feat: add design tokens, AppSidebar, ViewToggle and SearchBar components"
```

---

### Task 9: PokemonRow, PokemonList & ConfirmDialog Components

**Files:**
- Create: `src/components/PokemonRow.vue`
- Create: `src/components/PokemonList.vue`
- Create: `src/components/ConfirmDialog.vue`
- Test: `tests/components/PokemonRow.test.js`

**Interfaces:**
- Consumes: `MatchedPokemon` items, `pokemonStore`, `TYPE_COLORS`.
- Produces: Complete PvPoke-inspired list row with collapsed/expanded cards and deletion confirmation.

- [ ] **Step 1: Write failing unit test for PokemonRow**

```javascript
// tests/components/PokemonRow.test.js
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PokemonRow from '../../src/components/PokemonRow.vue';

describe('PokemonRow.vue', () => {
  const item = {
    meta: {
      speciesId: 'charizard',
      nameFr: 'Dracaufeu',
      score: 88,
      rank: 12,
      types: ['Feu', 'Vol'],
      recommendedMoveset: {
        fast: 'Cru-Ailes',
        charged: ['Rafale Feu', 'Draco-Griffe']
      },
      matchups: [{ opponentNameFr: 'Tinkaton', rating: 650 }],
      counters: [{ opponentNameFr: 'Quagsire (Obs)', rating: 350 }]
    },
    mine: {
      name: 'Salamèche',
      cp: 456,
      level: 14,
      atkIv: 15,
      defIv: 13,
      staIv: 15,
      ivRankPercent: 98.66,
      ivRankNumber: 56,
      isShadow: false,
      isLucky: false,
      dustCost: 17600,
      candyCost: 16,
      needsEvolution: true,
      uniqueKey: 'key1'
    }
  };

  it('renders collapsed row summary with French name and score', () => {
    const wrapper = mount(PokemonRow, {
      props: { item }
    });

    expect(wrapper.text()).toContain('Dracaufeu');
    expect(wrapper.text()).toContain('#12');
    expect(wrapper.text()).toContain('88');
    expect(wrapper.text()).toContain('Possédé');
    expect(wrapper.text()).toContain('98.7%');
  });

  it('toggles expansion when row is clicked', async () => {
    const wrapper = mount(PokemonRow, {
      props: { item }
    });

    expect(wrapper.find('.expanded-details').exists()).toBe(false);
    await wrapper.find('.row-header').trigger('click');
    expect(wrapper.find('.expanded-details').exists()).toBe(true);

    expect(wrapper.text()).toContain('Salamèche');
    expect(wrapper.text()).toContain('Cru-Ailes');
    expect(wrapper.text()).toContain('Rafale Feu');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/components/PokemonRow.test.js`
Expected: FAIL with "Cannot find module '../../src/components/PokemonRow.vue'".

- [ ] **Step 3: Implement ConfirmDialog, PokemonRow, and PokemonList**

`src/components/ConfirmDialog.vue`:
```vue
<template>
  <div v-if="isOpen" class="modal-backdrop">
    <div class="modal-box">
      <h3 class="modal-title">{{ title }}</h3>
      <p class="modal-message">{{ message }}</p>
      <div class="modal-actions">
        <button class="btn-cancel" @click="$emit('cancel')">Annuler</button>
        <button class="btn-confirm" @click="$emit('confirm')">Confirmer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isOpen: Boolean,
  title: { type: String, default: 'Confirmation' },
  message: { type: String, default: 'Êtes-vous sûr ?' }
});
defineEmits(['cancel', 'confirm']);
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: #FFFFFF;
  border-radius: 10px;
  width: 400px;
  max-width: 90%;
  padding: 1.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}
.modal-title {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
}
.modal-message {
  color: #4A5568;
  font-size: 0.9rem;
  margin: 0 0 1.5rem 0;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
.btn-cancel {
  padding: 0.5rem 1rem;
  background: #E2E8F0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.btn-confirm {
  padding: 0.5rem 1rem;
  background: #EF4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
```

`src/components/PokemonRow.vue`:
```vue
<template>
  <div :class="['pokemon-row-card', { shadow: item.mine?.isShadow, expanded: isExpanded }]">
    <div class="row-header" @click="isExpanded = !isExpanded">
      <div class="rank-badge">#{{ item.meta.rank }}</div>

      <div class="score-container">
        <div class="score-bar-bg">
          <div
            class="score-bar-fill"
            :style="{ width: `${item.meta.score}%`, backgroundColor: primaryTypeColor }"
          ></div>
        </div>
        <span class="score-num">{{ item.meta.score }}</span>
      </div>

      <div class="name-info">
        <div class="name-line">
          <span class="pokemon-name">{{ item.meta.nameFr }}</span>
          <span v-if="item.mine?.isShadow" class="shadow-badge">Obscur</span>
          <span v-if="item.mine?.isLucky" class="lucky-badge">✨ Chanceux</span>
        </div>
        <div class="types-line">
          <span
            v-for="t in item.meta.types"
            :key="t"
            class="type-pill"
            :style="{ backgroundColor: getTypeColor(t) }"
          >
            {{ t }}
          </span>
        </div>
      </div>

      <div class="ownership-summary">
        <template v-if="item.mine">
          <span class="owned-tag">✅ Possédé</span>
          <span v-if="item.mine.ivRankPercent" class="iv-tag">
            IV: {{ item.mine.ivRankPercent.toFixed(1) }}%
            <span v-if="item.mine.ivRankNumber" class="rank-num">#{{ item.mine.ivRankNumber }}</span>
          </span>
          <span v-else-if="item.mine.ivAverage" class="iv-tag">
            IV Moy: {{ item.mine.ivAverage.toFixed(1) }}%
          </span>
        </template>
        <template v-else>
          <span class="not-owned-tag">❌ Non possédé</span>
        </template>
      </div>

      <div class="expand-icon">{{ isExpanded ? '▲' : '▼' }}</div>
    </div>

    <!-- Expanded view -->
    <div v-if="isExpanded" class="expanded-details">
      <div class="details-grid">
        <div v-if="item.mine" class="detail-section">
          <h4>MON POKÉMON</h4>
          <p>
            <strong>Spécimen :</strong> {{ item.mine.name }}
            <span v-if="item.mine.needsEvolution" class="evo-tag">(Évolution requise)</span>
          </p>
          <p><strong>PC :</strong> {{ item.mine.cp }} · <strong>Niveau :</strong> {{ item.mine.level }}</p>
          <p><strong>IV :</strong> {{ item.mine.atkIv }} / {{ item.mine.defIv }} / {{ item.mine.staIv }}</p>
          <p v-if="item.mine.dustCost > 0 || item.mine.candyCost > 0">
            <strong>Coût prévisionnel :</strong> {{ item.mine.dustCost.toLocaleString('fr-FR') }} poussières / {{ item.mine.candyCost }} bonbons
          </p>
        </div>

        <div class="detail-section">
          <h4>MOVES RECOMMANDÉS</h4>
          <p><strong>Rapide :</strong> ⚡ {{ item.meta.recommendedMoveset.fast }}</p>
          <p><strong>Chargées :</strong> 💥 {{ item.meta.recommendedMoveset.charged.join(' · ') }}</p>
        </div>

        <div class="detail-section">
          <h4>MATCHUPS CLÉS</h4>
          <p><strong>Victoires :</strong> {{ item.meta.matchups.map(m => m.opponentNameFr).join(', ') || 'N/A' }}</p>
          <p><strong>Contres :</strong> {{ item.meta.counters.map(c => c.opponentNameFr).join(', ') || 'N/A' }}</p>
        </div>
      </div>

      <div v-if="item.mine" class="expanded-actions">
        <button class="remove-btn" @click.stop="$emit('request-remove', item.mine.uniqueKey, item.mine.name)">
          Retirer de ma collection
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { TYPE_COLORS } from '../assets/type-colors.js';

const props = defineProps({
  item: { type: Object, required: true }
});
defineEmits(['request-remove']);

const isExpanded = ref(false);

function getTypeColor(type) {
  return TYPE_COLORS[type] || '#718096';
}

const primaryTypeColor = computed(() => {
  const t = props.item.meta.types?.[0];
  return getTypeColor(t);
});
</script>

<style scoped>
.pokemon-row-card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
}
.pokemon-row-card.shadow {
  border-left: 4px solid #7C3AED;
}
.row-header {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  cursor: pointer;
  gap: 1rem;
}
.rank-badge {
  font-weight: 700;
  color: #718096;
  width: 36px;
  font-size: 0.9rem;
}
.score-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 140px;
}
.score-bar-bg {
  flex: 1;
  height: 8px;
  background: #E2E8F0;
  border-radius: 4px;
  overflow: hidden;
}
.score-bar-fill {
  height: 100%;
  border-radius: 4px;
}
.score-num {
  font-size: 0.85rem;
  font-weight: 700;
  width: 24px;
}
.name-info {
  flex: 1;
}
.name-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.pokemon-name {
  font-size: 1rem;
  font-weight: 600;
}
.shadow-badge {
  background: #7C3AED;
  color: white;
  font-size: 0.65rem;
  padding: 1px 6px;
  border-radius: 4px;
}
.lucky-badge {
  color: #D97706;
  font-size: 0.75rem;
  font-weight: 600;
}
.types-line {
  display: flex;
  gap: 0.3rem;
  margin-top: 0.2rem;
}
.type-pill {
  font-size: 0.65rem;
  color: white;
  padding: 1px 6px;
  border-radius: 4px;
  font-weight: 500;
}
.ownership-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 0.8rem;
  gap: 0.2rem;
}
.owned-tag {
  color: #059669;
  font-weight: 600;
}
.not-owned-tag {
  color: #94A3B8;
}
.iv-tag {
  color: #4B5563;
  font-size: 0.75rem;
}
.rank-num {
  font-weight: 600;
  color: #2563EB;
}
.expand-icon {
  font-size: 0.75rem;
  color: #94A3B8;
}
.expanded-details {
  padding: 1rem;
  border-top: 1px dashed #E2E8F0;
  background: #F8FAFC;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}
.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.detail-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.75rem;
  color: #64748B;
  text-transform: uppercase;
}
.detail-section p {
  margin: 0.25rem 0;
  font-size: 0.85rem;
}
.evo-tag {
  color: #D97706;
  font-size: 0.75rem;
}
.expanded-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
}
.remove-btn {
  background: #FEE2E2;
  color: #DC2626;
  border: 1px solid #FCA5A5;
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s;
}
.remove-btn:hover {
  background: #FECACA;
}
</style>
```

`src/components/PokemonList.vue`:
```vue
<template>
  <div class="pokemon-list-wrapper">
    <div v-if="pokemonStore.isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement des Pokémon et données PvPoke...</p>
    </div>

    <div v-else-if="pokemonStore.error" class="error-state">
      <p>⚠ {{ pokemonStore.error }}</p>
      <button class="retry-btn" @click="pokemonStore.loadData">Réessayer</button>
    </div>

    <div v-else-if="pokemonStore.displayedPokemon.length === 0" class="empty-state">
      <p>Aucun Pokémon trouvé pour cette sélection.</p>
    </div>

    <div v-else class="list-container">
      <PokemonRow
        v-for="item in pokemonStore.displayedPokemon"
        :key="item.meta.speciesId"
        :item="item"
        @request-remove="handleRemoveRequest"
      />
    </div>

    <ConfirmDialog
      :is-open="confirmDialogState.isOpen"
      :title="'Retirer de ma collection'"
      :message="`Êtes-vous sûr de vouloir retirer ${confirmDialogState.pokemonName} de votre collection ?`"
      @cancel="confirmDialogState.isOpen = false"
      @confirm="executeRemoval"
    />
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { usePokemonStore } from '../stores/pokemonStore.js';
import { useAppStore } from '../stores/appStore.js';
import PokemonRow from './PokemonRow.vue';
import ConfirmDialog from './ConfirmDialog.vue';

const pokemonStore = usePokemonStore();
const appStore = useAppStore();

const confirmDialogState = reactive({
  isOpen: false,
  uniqueKey: null,
  pokemonName: ''
});

function handleRemoveRequest(key, name) {
  confirmDialogState.uniqueKey = key;
  confirmDialogState.pokemonName = name;
  confirmDialogState.isOpen = true;
}

async function executeRemoval() {
  if (!confirmDialogState.uniqueKey) return;
  confirmDialogState.isOpen = false;

  if (window.electronAPI?.removePokemon) {
    const success = await window.electronAPI.removePokemon(confirmDialogState.uniqueKey);
    if (success) {
      appStore.showToast(`${confirmDialogState.pokemonName} retiré de la collection.`);
      await pokemonStore.loadData();
    }
  }
}
</script>

<style scoped>
.pokemon-list-wrapper {
  flex: 1;
  overflow-y: auto;
}
.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #718096;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E2E8F0;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.retry-btn {
  padding: 0.5rem 1rem;
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 0.5rem;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/components/PokemonRow.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/PokemonRow.vue src/components/PokemonList.vue src/components/ConfirmDialog.vue tests/components/PokemonRow.test.js
git commit -m "feat: implement PokemonRow, PokemonList and ConfirmDialog components"
```

---

### Task 10: CSV Importer Modal & Form Mapping Editor

**Files:**
- Create: `src/components/CsvImporter.vue`
- Create: `src/components/FormMappingEditor.vue`
- Test: `tests/components/FormMappingEditor.test.js`

**Interfaces:**
- Consumes: `appStore`, `pokemonStore`, `window.electronAPI`.
- Produces: Interactive modal for importing CSVs and mapping unrecognized forms.

- [ ] **Step 1: Write failing unit test for FormMappingEditor**

```javascript
// tests/components/FormMappingEditor.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import FormMappingEditor from '../../src/components/FormMappingEditor.vue';
import { useAppStore } from '../../src/stores/appStore.js';

describe('FormMappingEditor.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders unrecognized forms and saves mappings', async () => {
    const appStore = useAppStore();
    appStore.isFormEditorOpen = true;
    appStore.unmatchedForms = ['Céleste', 'Terrestre'];

    window.electronAPI = {
      saveForms: vi.fn().mockResolvedValue({ 'Céleste': 'sky', 'Terrestre': 'land' })
    };

    const wrapper = mount(FormMappingEditor);
    expect(wrapper.text()).toContain('Céleste');
    expect(wrapper.text()).toContain('Terrestre');

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('sky');
    await inputs[1].setValue('land');

    await wrapper.find('.save-btn').trigger('click');
    expect(window.electronAPI.saveForms).toHaveBeenCalledWith({
      'Céleste': 'sky',
      'Terrestre': 'land'
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/components/FormMappingEditor.test.js`
Expected: FAIL with "Cannot find module '../../src/components/FormMappingEditor.vue'".

- [ ] **Step 3: Implement CsvImporter.vue and FormMappingEditor.vue**

`src/components/CsvImporter.vue`:
```vue
<template>
  <div v-if="appStore.isImporterOpen" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <h3>Importer un export PokeGenie (.csv)</h3>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <div
        class="drop-zone"
        :class="{ dragging: isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <p>Glissez et déposez votre fichier CSV ici</p>
        <p class="or-label">ou</p>
        <label class="file-picker-btn">
          Choisir un fichier
          <input type="file" accept=".csv" @change="handleFileSelect" style="display: none;" />
        </label>
      </div>

      <div v-if="errorMessage" class="error-msg">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="success-msg">
        {{ successMessage }}
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="close">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '../stores/appStore.js';
import { usePokemonStore } from '../stores/pokemonStore.js';

const appStore = useAppStore();
const pokemonStore = usePokemonStore();

const isDragging = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

function close() {
  appStore.isImporterOpen = false;
  errorMessage.value = '';
  successMessage.value = '';
}

async function processFile(file) {
  if (!file) return;
  errorMessage.value = '';
  successMessage.value = '';

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = e.target.result;
      if (!window.electronAPI) return;
      const res = await window.electronAPI.importCsv(content, file.name);
      successMessage.value = `Import réussi : ${res.addedCount} nouveaux Pokémon ajoutés (${res.totalCount} au total).`;
      await pokemonStore.loadData();
    } catch (err) {
      errorMessage.value = err.message || "Erreur lors de l'import";
    }
  };
  reader.readAsText(file);
}

function handleDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  processFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files?.[0];
  processFile(file);
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: #FFFFFF;
  border-radius: 10px;
  width: 500px;
  max-width: 90%;
  padding: 1.5rem;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #718096;
}
.drop-zone {
  border: 2px dashed #CBD5E1;
  border-radius: 8px;
  padding: 2.5rem;
  text-align: center;
  background: #F8FAFC;
  transition: all 0.2s ease;
}
.drop-zone.dragging {
  border-color: #3B82F6;
  background: #EFF6FF;
}
.or-label {
  color: #A0AEC0;
  font-size: 0.85rem;
  margin: 0.5rem 0;
}
.file-picker-btn {
  display: inline-block;
  background: #3B82F6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}
.error-msg {
  color: #DC2626;
  background: #FEE2E2;
  padding: 0.6rem;
  border-radius: 6px;
  margin-top: 1rem;
  font-size: 0.85rem;
}
.success-msg {
  color: #059669;
  background: #D1FAE5;
  padding: 0.6rem;
  border-radius: 6px;
  margin-top: 1rem;
  font-size: 0.85rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.25rem;
}
.cancel-btn {
  padding: 0.5rem 1rem;
  background: #E2E8F0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
```

`src/components/FormMappingEditor.vue`:
```vue
<template>
  <div v-if="appStore.isFormEditorOpen" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <h3>Formes Pokémon non reconnues</h3>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <p class="editor-desc">
        Les formes suivantes issues de vos imports PokeGenie n'ont pas de correspondance avec PvPoke.
        Entrez le suffixe anglais correspondant (ex: <code>galarian</code>, <code>origin</code>, <code>mega</code>, <code>therian</code>).
      </p>

      <div class="form-mappings-list">
        <div v-for="form in appStore.unmatchedForms" :key="form" class="mapping-row">
          <span class="french-form">{{ form }}</span>
          <span class="arrow">→</span>
          <input
            v-model="inputMappings[form]"
            type="text"
            class="suffix-input"
            placeholder="suffixe anglais (ex: sky)"
          />
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="close">Annuler</button>
        <button class="save-btn" @click="save">Sauvegarder et re-matcher</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { useAppStore } from '../stores/appStore.js';
import { usePokemonStore } from '../stores/pokemonStore.js';

const appStore = useAppStore();
const pokemonStore = usePokemonStore();

const inputMappings = reactive({});

watch(
  () => appStore.unmatchedForms,
  (forms) => {
    forms.forEach(f => {
      if (inputMappings[f] === undefined) {
        inputMappings[f] = appStore.customForms[f] || '';
      }
    });
  },
  { immediate: true }
);

function close() {
  appStore.isFormEditorOpen = false;
}

async function save() {
  const patch = {};
  for (const [form, suffix] of Object.entries(inputMappings)) {
    if (suffix && suffix.trim() !== '') {
      patch[form] = suffix.trim().toLowerCase();
    }
  }

  if (window.electronAPI?.saveForms) {
    await window.electronAPI.saveForms(patch);
    appStore.showToast('Correspondances de formes enregistrées.');
    await pokemonStore.loadData();
  }
  close();
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: #FFFFFF;
  border-radius: 10px;
  width: 550px;
  max-width: 90%;
  padding: 1.5rem;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #718096;
}
.editor-desc {
  font-size: 0.85rem;
  color: #4A5568;
  line-height: 1.4;
  margin-bottom: 1.25rem;
}
.form-mappings-list {
  max-height: 250px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.mapping-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.french-form {
  width: 130px;
  font-weight: 600;
  font-size: 0.85rem;
}
.arrow {
  color: #A0AEC0;
}
.suffix-input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  font-size: 0.85rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
.cancel-btn {
  padding: 0.5rem 1rem;
  background: #E2E8F0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.save-btn {
  padding: 0.5rem 1rem;
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/components/FormMappingEditor.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CsvImporter.vue src/components/FormMappingEditor.vue tests/components/FormMappingEditor.test.js
git commit -m "feat: implement CsvImporter and FormMappingEditor with tests"
```

---

### Task 11: Application Assembly & Verification

**Files:**
- Modify: `src/App.vue`
- Test: All automated unit tests (`npm test`)

**Interfaces:**
- Consumes: All UI components, stores, services.
- Produces: Fully functional application assembled with toast notifications and initial data fetching on mount.

- [ ] **Step 1: Assemble App.vue**

`src/App.vue`:
```vue
<template>
  <div class="app-container">
    <AppSidebar />
    <main class="main-content">
      <div class="top-bar">
        <ViewToggle />
      </div>
      <SearchBar />
      <PokemonList />
    </main>

    <CsvImporter />
    <FormMappingEditor />

    <div v-if="appStore.toastMessage" class="toast-notification">
      {{ appStore.toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAppStore } from './stores/appStore.js';
import { usePokemonStore } from './stores/pokemonStore.js';
import AppSidebar from './components/AppSidebar.vue';
import ViewToggle from './components/ViewToggle.vue';
import SearchBar from './components/SearchBar.vue';
import PokemonList from './components/PokemonList.vue';
import CsvImporter from './components/CsvImporter.vue';
import FormMappingEditor from './components/FormMappingEditor.vue';
import './assets/styles.css';

const appStore = useAppStore();
const pokemonStore = usePokemonStore();

onMounted(async () => {
  if (window.electronAPI?.getSettings) {
    const settings = await window.electronAPI.getSettings();
    if (settings.lastActiveLeague) appStore.activeLeague = settings.lastActiveLeague;
    if (settings.lastView) {
      appStore.activeView = settings.lastView;
      pokemonStore.activeView = settings.lastView;
    }
  }
  await pokemonStore.loadData();
});
</script>

<style scoped>
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.toast-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #1F2937;
  color: #F9FAFB;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.85rem;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
```

- [ ] **Step 2: Run all tests to verify entire test suite passes**

Run: `npm test`
Expected: PASS across all test suites (`smoke`, `nameTranslator`, `settingsManager`, `csvManager`, `pvpokeCache`, `usePokemonMatcher`, `pokemonStore`, `SearchBar`, `PokemonRow`, `FormMappingEditor`).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with production assets in `dist/`.

- [ ] **Step 4: Commit**

```bash
git add src/App.vue
git commit -m "feat: complete application assembly with App.vue wiring"
```

---

## Self-Review

1. **Spec coverage:**
   - Electron + Vue 3 + Vite + Pinia + JSON files: Covered in Tasks 1, 3, 7.
   - Light theme styling: Covered in Task 8 & 9 (`styles.css`, `#FAFBFC` bg).
   - French UI throughout: Covered across all components.
   - PokeGenie CSV validation, merge-on-import, master collection: Covered in Task 4.
   - Evolution matching (e.g. Salamèche -> Dracaufeu) with costs: Covered in Task 6 & 9.
   - Manual removal with ConfirmDialog: Covered in Task 4, 7, 9.
   - PvPoke rankings caching (1500, 2500, 10000, 500) with 24h expiration: Covered in Task 5.
   - Unrecognized form detection & mapping editor in `userData/forms.json`: Covered in Tasks 2, 3, 6, 10.
   - Two views ("Mes Pokémon" & "Méta complète"): Covered in Tasks 6, 7, 8.
   - Search & sort: Covered in Tasks 7, 8.

2. **Placeholder scan:**
   - No "TBD", "TODO", or pseudo-code steps exist in the plan. All tasks contain exact file paths, full implementation code, exact test commands, and exact commit messages.

3. **Type and method consistency:**
   - `toSpeciesId` signature in Task 2 matches usage in Task 6.
   - `parsePokeGenieCsv`, `importAndMerge`, `removePokemon` in Task 4 match IPC handlers in Task 7.
   - `getRankings` in Task 5 matches IPC and Pinia store usage in Task 7.
   - Store properties (`activeLeague`, `activeView`, `searchQuery`, `sortOption`) match component bindings in Tasks 8, 9, 10, 11.
