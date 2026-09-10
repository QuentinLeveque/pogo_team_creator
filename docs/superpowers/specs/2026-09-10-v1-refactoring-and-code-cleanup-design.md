# Design Specification: V1 Refactoring, Codebase Cleanup & Documentation

Date: 2026-09-10  
Status: Approved by user  
Topic: Final V1 Refactoring and Cleanup

---

## 1. Context & Motivation

The application has reached complete feature parity for its initial release (V1):
- Multi-CSV import, merge, duplicate detection, individual/batch deletion with modal confirmation.
- PokeGenie cross-referencing with PvPoke rankings across all 4 leagues (Super, Hyper, Master, Petite).
- Resource cost calculation (Stardust, Candy, XL Candy).
- Attack comparisons with Elite move badges and French localization.
- Dedicated Obscur badges and strict Shadow vs Normal specimen isolation.
- Sub-second performance, session caching, and background pre-charging for instant league switching.

To finalize a clean, maintainable, and publishable V1, the codebase requires:
1. Removal of legacy files (the `old/` directory containing unused Python scripts and old JSON files).
2. Moving test fixtures to a permanent, git-tracked `tests/fixtures/` directory so fresh repository clones run tests without missing files.
3. Consolidating Pinia state so that `pokemonStore` is the single source of truth for list filtering/sorting/viewing.
4. Removing dead code and optimizing lingering linear lookups.
5. Writing a comprehensive `README.md` for users and developers.

---

## 2. Detailed Technical Design

### Component 1: Test Fixtures & Legacy Directory Clean-up
- **Fixtures Directory**:
  - Path: `tests/fixtures/`
  - Move `old/poke_genie_export.csv` to `tests/fixtures/poke_genie_export.csv`.
  - Move `old/poke_genie_export_2.csv` to `tests/fixtures/poke_genie_export_2.csv`.
- **Test Suite Updates**:
  - In `tests/integration.test.js`, update the file paths to `tests/fixtures/poke_genie_export.csv` and `tests/fixtures/poke_genie_export_2.csv`.
- **Git & Legacy Removal**:
  - Delete `old/` entirely (`rm -rf old`).
  - Remove `old` from `.gitignore`.
  - Git track `tests/fixtures/`.

### Component 2: Pinia Store Consolidation
- **`src/stores/appStore.js`**:
  - Remove `searchQuery: ''` and `sortOption: 'score'` from state.
  - Remove `activeView: 'my-pokemon'` from state.
  - Remove `setView(view)` action from `appStore`.
  - Keep core application shell state:
    - `activeLeague`
    - `importHistory`
    - `unmatchedForms`, `unmatchedPokemonNames`, `unmatchedFormDetails`
    - `customForms`
    - `isImporterOpen`, `isFormEditorOpen`
    - `toastMessage`
- **`src/stores/pokemonStore.js`**:
  - Retain `activeView: 'my-pokemon'`, `searchQuery: ''`, `sortOption: 'score'`, `excludeXl: false`.
  - Add action:
    ```javascript
    setView(view) {
      this.activeView = view;
      if (typeof window !== 'undefined' && window.electronAPI?.saveSettings) {
        window.electronAPI.saveSettings({ lastView: view });
      }
    }
    ```
- **`src/components/ViewToggle.vue`**:
  - Remove `useAppStore` import.
  - Use `pokemonStore.activeView` and `pokemonStore.setView(view)`.
- **`src/App.vue`**:
  - On mount, when loading settings:
    ```javascript
    if (settings.lastView) {
      pokemonStore.activeView = settings.lastView;
    }
    ```

### Component 3: Dead Code & Optimization
- **`src/components/PokemonRow.vue`**:
  - Remove unused computed property `primaryTypeColor`.
- **`src/services/nameTranslator.js`**:
  - Export `getEnglishBase(rawNom)`:
    ```javascript
    export function getEnglishBase(rawNom) {
      if (!rawNom) return '';
      const clean = rawNom.trim().toLowerCase();
      const idx = frNameToIndex.get(clean);
      if (idx !== undefined && enNames[idx]) {
        return enNames[idx].replace(/ /g, '_').replace(/-/g, '_').replace(/\. /g, '_').replace(/\./g, '_').toLowerCase();
      }
      return clean.replace(/[^a-z0-9]/g, '_');
    }
    ```
- **`src/composables/usePokemonMatcher.js`**:
  - Remove unused static JSON imports: `import frNames from '../data/fr.json';` and `import enNames from '../data/en.json';`.
  - Import `getEnglishBase` from `../services/nameTranslator.js`.
  - Replace lines 148-151 with `const enBase = getEnglishBase(rawNom);`.

### Component 4: V1 Documentation (`README.md`)
- Create a complete, modern GitHub markdown documentation file:
  - Project Title & Overview.
  - Feature Highlights (with emojis and clear structure).
  - Screenshots / UI Walkthrough description.
  - Architecture (Electron IPC, Vite, Vue 3, Pinia, Local Cache-First).
  - Prerequisites & Installation (`npm install`).
  - Available Scripts (`electron:dev`, `build`, `test`, `preview`).
  - Data Privacy (100% local, no telemetry, offline-capable).

---

## 3. Verification & Validation Plan
1. **Automated Unit & Integration Tests**:
   - Run `npm test` to verify all 15 test suites and 82+ tests pass with the new fixture paths.
2. **Build Verification**:
   - Run `npm run build` to confirm zero errors or packaging warnings.
3. **Runtime Verification**:
   - Relaunch the dev application to verify UI and store behavior are completely intact.
