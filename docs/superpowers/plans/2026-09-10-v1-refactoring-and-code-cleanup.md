# V1 Refactoring & Codebase Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up all legacy files, relocate test fixtures to tracked paths, unify Pinia store state, eliminate dead code/linear lookups, and add comprehensive V1 documentation.

**Architecture:** 
- Test fixtures moved from untracked `.gitignore` location to `tests/fixtures/` and tracked in git.
- Pinia state consolidated: `pokemonStore` is the single source of truth for filtering/sorting/viewing.
- Legacy `old/` folder purged. Dead code removed from `PokemonRow.vue`. O(1) lookup added to `nameTranslator.js`.
- Professional V1 `README.md` created.

**Tech Stack:** Vue 3, Pinia, Vite, Electron, Vitest.

**Spec:** [`docs/superpowers/specs/2026-09-10-v1-refactoring-and-code-cleanup-design.md`](file:///home/quentin/Documents/script/pogo_team_creator/docs/superpowers/specs/2026-09-10-v1-refactoring-and-code-cleanup-design.md)

## Global Constraints
- Preserve all existing functionality and ensure 100% test pass rate across all suites.
- No regression in startup time or instant 0ms league switching.
- Clean git status and no residual legacy files.

---

### Task 1: Relocate Test CSV Fixtures to `tests/fixtures/` and Remove `old/`

**Files:**
- Create: `tests/fixtures/poke_genie_export.csv`, `tests/fixtures/poke_genie_export_2.csv`
- Modify: `tests/integration.test.js:8-9`
- Modify: `.gitignore:4`
- Delete: `old/` directory

**Interfaces:**
- Consumes: Existing CSV files in `old/`
- Produces: Git-tracked fixture files in `tests/fixtures/`

- [x] **Step 1: Create `tests/fixtures` and copy CSV files**
```bash
mkdir -p tests/fixtures
cp old/poke_genie_export.csv tests/fixtures/poke_genie_export.csv
cp old/poke_genie_export_2.csv tests/fixtures/poke_genie_export_2.csv
```

- [x] **Step 2: Update `tests/integration.test.js` to point to `tests/fixtures/`**
In `tests/integration.test.js`:
```javascript
  const csvPath = path.resolve(__dirname, './fixtures/poke_genie_export.csv');
  const csvPath2 = path.resolve(__dirname, './fixtures/poke_genie_export_2.csv');
```

- [x] **Step 3: Run integration tests to verify fixtures pass**
Run: `npm test tests/integration.test.js`
Expected: PASS (all 6 tests pass)

- [x] **Step 4: Remove `old/` directory and remove `old` from `.gitignore`**
Remove `old` line from `.gitignore`.
Remove `old/` directory:
```bash
rm -rf old
```

- [x] **Step 5: Run full test suite to ensure nothing else relied on `old/`**
Run: `npm test`
Expected: PASS (all test suites pass)

- [x] **Step 6: Commit changes**
```bash
git add tests/fixtures/ tests/integration.test.js .gitignore
git commit -m "refactor(tests): move CSV test fixtures to tests/fixtures and remove legacy old folder"
```

---

### Task 2: Consolidate Pinia Store State into `pokemonStore.js` & Clean `appStore.js`

**Files:**
- Modify: `src/stores/appStore.js`
- Modify: `src/stores/pokemonStore.js`
- Modify: `src/components/ViewToggle.vue`
- Modify: `src/App.vue`
- Test: `tests/pokemonStore.test.js`

**Interfaces:**
- Consumes: Electron `saveSettings` API
- Produces: `pokemonStore.setView(view)` action, single source of truth for list view

- [x] **Step 1: Write test for `pokemonStore.setView`**
In `tests/pokemonStore.test.js`:
```javascript
  it('updates activeView and saves setting via setView action', () => {
    const store = usePokemonStore();
    window.electronAPI = {
      saveSettings: vi.fn()
    };
    store.setView('meta');
    expect(store.activeView).toBe('meta');
    expect(window.electronAPI.saveSettings).toHaveBeenCalledWith({ lastView: 'meta' });
  });
```

- [x] **Step 2: Run test to verify it fails**
Run: `npm test tests/pokemonStore.test.js`
Expected: FAIL (`store.setView is not a function`)

- [x] **Step 3: Implement `setView` in `src/stores/pokemonStore.js` and clean `src/stores/appStore.js`**
In `src/stores/pokemonStore.js`, add to `actions`:
```javascript
    setView(view) {
      this.activeView = view;
      if (typeof window !== 'undefined' && window.electronAPI?.saveSettings) {
        window.electronAPI.saveSettings({ lastView: view });
      }
    },
```

In `src/stores/appStore.js`:
Remove `activeView: 'my-pokemon'`, `searchQuery: ''`, and `sortOption: 'score'` from state.
Remove `setView(view)` from actions.

- [x] **Step 4: Update `src/components/ViewToggle.vue` and `src/App.vue`**
In `src/components/ViewToggle.vue`:
Remove `useAppStore` import and `appStore` declaration.
Update `setView`:
```javascript
function setView(view) {
  pokemonStore.setView(view);
}
```

In `src/App.vue`:
In `onMounted`, update settings load:
```javascript
    if (settings.lastView) {
      pokemonStore.activeView = settings.lastView;
    }
```

- [x] **Step 5: Run tests to verify all pass**
Run: `npm test`
Expected: PASS (all 83 tests pass)

- [x] **Step 6: Commit changes**
```bash
git add src/stores/appStore.js src/stores/pokemonStore.js src/components/ViewToggle.vue src/App.vue tests/pokemonStore.test.js
git commit -m "refactor(store): consolidate view/filtering state exclusively into pokemonStore"
```

---

### Task 3: Eliminate Dead Code & Optimize Unmatched Form Name Lookups

**Files:**
- Modify: `src/services/nameTranslator.js`
- Modify: `src/composables/usePokemonMatcher.js`
- Modify: `src/components/PokemonRow.vue`
- Test: `tests/nameTranslator.test.js`

**Interfaces:**
- Consumes: Precomputed `frNameToIndex` in `nameTranslator.js`
- Produces: `getEnglishBase(rawNom)` helper with O(1) performance

- [x] **Step 1: Write unit test for `getEnglishBase`**
In `tests/nameTranslator.test.js`:
```javascript
  it('resolves English base name in O(1) from French name using getEnglishBase', () => {
    expect(getEnglishBase('Dracaufeu')).toBe('charizard');
    expect(getEnglishBase('M. Mime')).toBe('mr_mime');
    expect(getEnglishBase('UnknownXYZ')).toBe('unknownxyz');
  });
```

- [x] **Step 2: Run test to verify it fails**
Run: `npm test tests/nameTranslator.test.js`
Expected: FAIL (`getEnglishBase is not defined`)

- [x] **Step 3: Implement `getEnglishBase` in `src/services/nameTranslator.js`**
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

- [x] **Step 4: Update `src/composables/usePokemonMatcher.js`**
Remove:
```javascript
import frNames from '../data/fr.json';
import enNames from '../data/en.json';
```
Import:
```javascript
import { toSpeciesId, speciesIdToFrench, getEnglishBase } from '../services/nameTranslator.js';
```
Replace lines 148-151 in `usePokemonMatcher.js`:
```javascript
          const enBase = getEnglishBase(rawNom);
```

- [x] **Step 5: Remove dead code in `src/components/PokemonRow.vue`**
Remove lines 267-270 in `src/components/PokemonRow.vue`:
```javascript
const primaryTypeColor = computed(() => {
  const t = props.item.meta.types?.[0];
  return TYPE_COLORS[t] || '#718096';
});
```

- [x] **Step 6: Run test suite to verify everything passes**
Run: `npm test`
Expected: PASS (all test suites pass)

- [x] **Step 7: Commit changes**
```bash
git add src/services/nameTranslator.js src/composables/usePokemonMatcher.js src/components/PokemonRow.vue tests/nameTranslator.test.js
git commit -m "perf(matcher): replace linear scan with O(1) getEnglishBase and remove dead code"
```

---

### Task 4: Write Official V1 `README.md` and Validate Production Build

**Files:**
- Modify: `README.md`

- [x] **Step 1: Write comprehensive `README.md`**
Document:
- Project title & description
- Key features (Multi-CSV merge, PvPoke matching, Resource costs, Move analysis, Obscur badges, Offline-first)
- Getting Started (`npm install`, `npm run electron:dev`)
- Available scripts (`npm test`, `npm run build`, `npm run preview`)
- Architecture overview
- Data Privacy statement

- [x] **Step 2: Run production build verification**
Run: `npm run build`
Expected: PASS with clean bundle

- [x] **Step 3: Run full test suite verification**
Run: `npm test`
Expected: PASS (all 83+ tests pass)

- [x] **Step 4: Commit changes**
```bash
git add README.md
git commit -m "docs: add comprehensive V1 documentation in README"
```
