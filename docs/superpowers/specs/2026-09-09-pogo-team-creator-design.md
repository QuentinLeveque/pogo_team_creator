# PoGo Team Creator — Design Spec

A French-language Electron desktop application that cross-references the user's Pokémon GO collection (via PokeGenie CSV exports) with PvPoke PvP rankings, showing which of their Pokémon are viable in each competitive league.

## Stack

- **Runtime**: Electron (main process for I/O, renderer for UI)
- **Frontend**: Vue 3 (Composition API) + Vite
- **State Management**: Pinia
- **Storage**: JSON files in Electron `userData` directory (no database)
- **Data Sources**: PokeGenie CSV (user's collection) + PvPoke rankings JSON (meta data)
- **Language**: French UI throughout

## Future Consideration

A team builder feature is planned for a future iteration. The architecture should support this extension (composables, matchup data already available), but it is out of scope for this spec.

---

## Architecture

### Process Separation

```
Electron Main Process              Electron Renderer (Vue 3)
┌──────────────────────┐           ┌──────────────────────────┐
│  csvManager.js       │◄──IPC───►│  Pinia stores            │
│  pvpokeCache.js      │           │  Vue components          │
│  nameTranslator.js   │           │  Composables             │
│  fileExporter.js     │           └──────────────────────────┘
└──────────────────────┘
       ▲
       │ fs / https
       ▼
  userData/  +  pvpoke.com
```

- **Main process**: all file I/O (CSV read/write, JSON cache), HTTP fetches to PvPoke, name translation logic
- **Renderer process**: Vue 3 UI only, receives processed data via IPC through a secure `contextBridge` (preload.js)
- **No direct `fs` or `http` access from renderer** — all goes through IPC

### Directory Structure

```
pogo_team_creator/
├── electron/                    # Electron main process
│   ├── main.js                  # Window creation, app lifecycle, IPC registration
│   ├── preload.js               # contextBridge API exposed to renderer
│   └── services/
│       ├── csvManager.js        # Import, merge, delete, export CSV
│       ├── pvpokeCache.js       # Fetch & cache PvPoke ranking data
│       ├── nameTranslator.js    # FR↔EN name translation, speciesId generation
│       └── settingsManager.js   # Read/write app settings
├── src/                         # Vue 3 renderer (Vite)
│   ├── App.vue                  # Root layout: sidebar + main content
│   ├── main.js                  # Vue app entry
│   ├── stores/
│   │   ├── pokemonStore.js      # Matched Pokémon data, filtering, sorting
│   │   └── appStore.js          # Settings, active league, active view, CSV list
│   ├── composables/
│   │   ├── useLeagueFilter.js   # League switching logic
│   │   └── usePokemonMatcher.js # Cross-reference PokeGenie ↔ PvPoke
│   ├── components/
│   │   ├── AppSidebar.vue       # League selector + CSV library + import/export
│   │   ├── ViewToggle.vue       # "Mes Pokémon" / "Méta complète" tabs
│   │   ├── SearchBar.vue        # Text search + sort dropdown
│   │   ├── PokemonList.vue      # Scrollable list of PokemonRow components
│   │   ├── PokemonRow.vue       # Single row: collapsed and expanded states
│   │   ├── CsvImporter.vue      # Modal: file picker + drag-and-drop
│   │   ├── FormMappingEditor.vue # Panel: map unrecognized French forms to PvPoke suffixes
│   │   └── ConfirmDialog.vue    # Reusable confirmation modal
│   ├── assets/
│   │   └── type-colors.js       # Pokémon type → color mapping
│   └── data/
│       ├── fr.json              # French Pokémon names (indexed by dex #)
│       ├── en.json              # English Pokémon names (indexed by dex #)
│       └── forms.json           # French form → English form suffix mapping
├── package.json
├── vite.config.js
└── electron-builder.json        # Build/packaging config
```

---

## Data Sources & Caching

### PvPoke Rankings

**Source URLs** (based on existing code + verified endpoints):

| League | URL |
|--------|-----|
| Super (1500) | `https://pvpoke.com/data/rankings/all/overall/rankings-1500.json` |
| Hyper (2500) | `https://pvpoke.com/data/rankings/all/overall/rankings-2500.json` |
| Master (10000) | `https://pvpoke.com/data/rankings/all/overall/rankings-10000.json` |
| Petite (500) | `https://pvpoke.com/data/rankings/little/overall/rankings-500.json` |
| Game Master | `https://pvpoke.com/data/gamemaster.min.json` |

**Cache structure** in `userData/cache/`:

```
cache/
├── rankings-1500.json
├── rankings-2500.json
├── rankings-10000.json
├── rankings-500.json
├── gamemaster.json
└── cache-meta.json         # { "rankings-1500": "2026-09-09T12:00:00Z", ... }
```

**Refresh strategy**:
- On app launch: check `cache-meta.json` timestamps
- If any file is >24 hours old → fetch fresh copy **in the background**
- App uses stale cache immediately (no loading delay)
- If fetch fails (offline) → use cache silently, show toast: *"Données PvPoke en cache (mise à jour: JJ/MM/AAAA)"*
- First launch (no cache) → blocking loading screen: *"Téléchargement des données PvPoke..."*

### PvPoke Ranking JSON Schema (per entry)

```json
{
  "speciesId": "tinkaton",
  "speciesName": "Tinkaton",
  "score": 93,
  "moveset": ["FAIRY_WIND", "GIGATON_HAMMER", "BULLDOZE"],
  "matchups": [
    { "opponent": "thievul", "rating": 751 },
    ...
  ],
  "counters": [
    { "opponent": "jellicent", "rating": 326 },
    ...
  ],
  "moves": {
    "fastMoves": [{ "moveId": "FAIRY_WIND", "uses": 141792 }],
    "chargedMoves": [{ "moveId": "GIGATON_HAMMER", "uses": 49862 }]
  }
}
```

---

## CSV Management

### Master CSV Concept

The app maintains a single **master collection** that grows over time:

```
userData/
└── csv-library/
    ├── master.json             # The merged master collection (parsed, not raw CSV)
    ├── import-history.json     # List of all imported files with metadata
    └── originals/              # Original CSV files preserved as-is
        ├── export_2025-04-24.csv
        └── export_2024-12-01.csv
```

### Import Flow

1. User clicks "+ Importer" or drags a CSV file
2. App validates it's a PokeGenie export (checks for expected columns: `Index`, `Nom`, `Forme`, `Rang % (G)`, etc.)
3. App parses the CSV into structured objects
4. For each Pokémon in the new CSV:
   - Generate a **unique key**: `Nom + Forme + Atq IV + Déf IV + Rés IV + Date Attrapée`
   - Check if this key exists in the master collection
   - If **NOT found** → add to master
   - If **found** → skip (keep existing entry unchanged)
5. Save updated master
6. Add entry to `import-history.json`
7. Store original CSV in `originals/`

### Import History Schema

```json
[
  {
    "id": "a1b2c3d4",
    "originalFilename": "poke_genie_export.csv",
    "storedFilename": "export_2025-04-24.csv",
    "importedAt": "2025-04-24T15:59:00Z",
    "pokemonCountInFile": 673,
    "newPokemonAdded": 673
  },
  {
    "id": "e5f6g7h8",
    "originalFilename": "poke_genie_export_2.csv",
    "storedFilename": "export_2024-12-01.csv",
    "importedAt": "2024-12-01T10:30:00Z",
    "pokemonCountInFile": 580,
    "newPokemonAdded": 12
  }
]
```

### Pokémon Removal

- Available in the **expanded card view** via a "Retirer de ma collection" button
- Triggers a **confirmation dialog**: *"Êtes-vous sûr de vouloir retirer [Nom] de votre collection ?"* with "Annuler" / "Confirmer" buttons
- Removes from master collection only (original CSV files are never modified)

### CSV Export

- "Exporter CSV fusionné" button in sidebar
- Exports the current master collection as a standard PokeGenie-format CSV
- Opens a native file save dialog

---

## Name Translation & Matching

### Translation Pipeline

To match a PokeGenie row to a PvPoke ranking entry:

```
PokeGenie CSV                    PvPoke speciesId
─────────────                    ─────────────────
Nom (G) = "Dracaufeu"      →    fr.json index lookup
Forme (G) = "Normale"           → en.json same index → "Charizard"
Obscur/Purifié = 0              → lowercase + replace spaces/dashes → "charizard"
                                 → append form suffix (forms.json) → (nothing for "Normale")
                                 → append "_shadow" if shadow → (no)
                                 → Result: "charizard"
```

### Translation Data Files

**`fr.json`** and **`en.json`**: parallel arrays indexed by (Pokédex number - 1):
```json
// fr.json[0] = "bulbizarre"  →  en.json[0] = "Bulbasaur"
// fr.json[5] = "dracaufeu"   →  en.json[5] = "Charizard"
```

**`forms.json`**: French form name → English suffix (manually maintained, stored in `userData`):
```json
{
  "Galar": "galarian",
  "Alola": "alolan",
  "Hisui": "hisuian",
  "Totémique": "therian",
  "Méga": "mega",
  "Méga X": "mega_x",
  "Normale": null
}
```

A `null` or missing form means no suffix is appended.

> [!IMPORTANT]
> `forms.json` is manually maintained — it may be incomplete when new Pokémon forms are released. The app handles this gracefully with unmatched form detection (see below).

### Unmatched Form Detection & Mapping Editor

Since `forms.json` is manually curated from the user's own collection, it may not cover every possible form. The app handles this:

**Detection**: During the matching algorithm, if a French form name from the CSV is not found in `forms.json` (and is not empty/null), it is flagged as "unmatched."

**UI Warning**: A warning badge appears in the sidebar: *"⚠ 3 formes non reconnues"*. Clicking it opens a **form mapping editor panel**:

```
┌─────────────────────────────────────────────────────┐
│  Formes non reconnues                               │
│                                                     │
│  Les formes suivantes n'ont pas de correspondance   │
│  avec PvPoke. Entrez le suffixe anglais utilisé     │
│  par PvPoke (ex: "galarian", "origin", "mega").     │
│                                                     │
│  "Céleste"      →  [sky___________]                 │
│  "Terrestre"    →  [land__________]                 │
│  "Inconnue"     →  [______________]                 │
│                                                     │
│  [Sauvegarder]                                      │
└─────────────────────────────────────────────────────┘
```

- User types the English suffix (can check PvPoke's rankings to find it)
- On save, the mapping is added to `forms.json` in `userData` and the Pokémon list is re-matched immediately
- Unmatched Pokémon are still shown in the list with a subtle ⚠ icon, so the user knows some data is missing

**Storage**: `forms.json` is stored in `userData/` (not bundled in the app), so user-added mappings persist across app updates. The app ships with the initial set from the `old/form..json` file.

### speciesId Construction

```javascript
function toSpeciesId(frenchName, form, isShadow) {
  const frIndex = frNames.indexOf(frenchName.toLowerCase());
  let id = enNames[frIndex].replace(/ /g, '_').replace(/-/g, '_').toLowerCase();

  if (form && forms[form]) {
    id += `_${forms[form]}`;
  } else if (form && form !== "Normale" && !forms.hasOwnProperty(form)) {
    // Flag as unmatched form — cannot generate correct speciesId
    return { id, unmatched: true, unmatchedForm: form };
  }

  if (isShadow) {
    id += '_shadow';
  }

  return { id, unmatched: false };
}
```

---

## Matching Algorithm

For each league:

```
1. Load PvPoke rankings for this league → Map<speciesId, rankingEntry>
2. Load master collection
3. For each Pokémon in master that has ranking data for this league:
   a. Read: Nom (G/U/L/M), Forme (G/U/L/M), Obscur/Purifié
   b. Convert to speciesId via translation pipeline
   c. Lookup speciesId in PvPoke rankings map
   d. If found → create a MatchedPokemon entry
4. Deduplicate: if multiple specimens match the same speciesId,
   keep only the one with the highest Rang % for this league
5. Build final list:
   - "Mes Pokémon" view: only MatchedPokemon entries (owned + ranked)
   - "Méta complète" view: all PvPoke rankings, with mine attached where matched
```

### League-specific column mapping

| League | Nom col | Forme col | Rang % col | Dust col | Candy col |
|--------|---------|-----------|------------|----------|-----------|
| Super (1500) | Nom (G) | Forme (G) | Rang % (G) | Coût Poussières (G) | Coût Bonbon (G) |
| Hyper (2500) | Nom (U) | Forme (U) | Rang % (U) | Coût Poussières (U) | Coût Bonbon (U) |
| Master (10000) | Nom | Forme | IV Moyen (>85) | — | — |
| Petite (500) | Nom (L) | Forme (L) | Rang % (L) | Coût Poussières (L) | Coût Bonbon (L) |

> [!NOTE]
> Master League uses a different criterion: instead of `Rang %`, it checks `IV Moyen > 85` since Master League wants the highest stats (no CP cap). The existing script's logic for this is preserved.

---

## Internal Data Model

### MatchedPokemon (display-ready)

```javascript
{
  // From PvPoke rankings (the meta Pokémon)
  meta: {
    speciesId: "charizard",
    nameFr: "Dracaufeu",
    score: 88,
    rank: 12,                    // Position in the rankings list
    types: ["Feu", "Vol"],
    recommendedMoveset: {
      fast: "WING_ATTACK",       // PvPoke move ID
      charged: ["BLAST_BURN", "DRAGON_CLAW"]
    },
    // Move IDs are translated to French display names at render time
    // using a static move translation map built from gamemaster.json
    matchups: [                  // Top 5 wins
      { opponent: "tinkaton", opponentNameFr: "Tinkaton", rating: 650 }
    ],
    counters: [                  // Top 5 losses
      { opponent: "quagsire_shadow", opponentNameFr: "Quagsire (Obscur)", rating: 350 }
    ]
  },

  // From PokeGenie (user's specimen) — null if not owned
  mine: {
    name: "Salamèche",           // What the user actually has
    form: "",
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
    needsEvolution: true         // true when mine.name ≠ meta.nameFr
  }
}
```

---

## UI Design

### Theme: Light

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#FAFBFC` | Page background |
| Card background | `#FFFFFF` | Row background |
| Card border | `#E2E8F0` | 1px solid border |
| Text primary | `#1A202C` | Main text |
| Text secondary | `#718096` | Subtext, labels |
| Shadow accent | `#7C3AED` | Purple left-border for shadow Pokémon |
| Lucky accent | `#F59E0B` | Gold sparkle icon |

League highlight colors in sidebar:
- Super: `#3B82F6` (blue)
- Hyper: `#EAB308` (yellow)
- Master: `#8B5CF6` (purple)
- Petite: `#22C55E` (green)

Score bar colors: mapped to the Pokémon's **primary type** using standard Pokémon type colors.

### Layout: Sidebar + Main Content

**Sidebar** (fixed, left, ~250px):
- League selector (radio buttons with colored indicators)
- Divider
- CSV library (list of imported files with dates, showing `newPokemonAdded` count)
- "+ Importer" button
- "📥 Exporter CSV fusionné" button

**Main content**:
- View toggle tabs: "Mes Pokémon" | "Méta complète"
- Search bar + sort dropdown
- Scrollable list of PokemonRow components

### PokemonRow Component

**Collapsed state** (default):
```
┌──────────────────────────────────────────────────────┐
│ #1  ████████████████████████████░░ 93   Tinkaton     │
│     Fée · Acier     ✅ Possédé · IV: 98.6% · Rang #4│
└──────────────────────────────────────────────────────┘
```

- Rank number on the left
- Score bar (width proportional to score, colored by primary type)
- Score number
- French Pokémon name
- Type badges
- Ownership status: ✅ with IV info, or ❌ "Non possédé"
- Shadow Pokémon: purple left border accent
- Click anywhere to expand

**Expanded state** (on click, slides open with animation):
```
┌──────────────────────────────────────────────────────┐
│ #6  █████████████████████████░░░░ 91   Quagsire (Obs)│
│     Eau · Sol       ✅ Possédé · IV: 96.1%           │
│┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄│
│  MON POKÉMON                                         │
│  Axoloto · PC 456 · Niv. 14 · Chanceux: Non         │
│  Coût évolution: 45 000 pouss. / 120 bonbons        │
│                                                      │
│  MOVES RECOMMANDÉS                                   │
│  ⚡ Pistolet à O  │  💥 Aqua-Queue                   │
│                    │  💥 Lame de Roc                   │
│                                                      │
│  MATCHUPS CLÉS                                       │
│  ✅ Melmetal · Tinkaton · Empoleon                    │
│  ❌ Sabelette · Jellicent                             │
│                                                      │
│  [Retirer de ma collection]                          │
└──────────────────────────────────────────────────────┘
```

- "Retirer de ma collection" button at the bottom
- Clicking it opens a ConfirmDialog

### Sorting Options

- Par score (défaut) — PvPoke score descending
- Par rang IV — user's IV rank % descending
- Par nom — alphabetical French name
- Par coût — dust cost ascending (cheapest first)

### Search

- Filters by French Pokémon name (both the meta name and the user's specimen name)
- Case-insensitive, accent-insensitive

---

## App Settings

Stored in `userData/settings.json`:

```json
{
  "lastActiveLeague": "1500",
  "lastView": "my-pokemon",
  "cacheRefreshIntervalHours": 24,
  "windowBounds": { "x": 100, "y": 100, "width": 1200, "height": 800 }
}
```

Restored on app launch to give the user their exact previous state.

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid CSV format | Modal error: *"Ce fichier ne semble pas être un export PokeGenie valide. Colonnes manquantes: [list]"* |
| CSV encoding issue | Try UTF-8 first, fallback to latin-1 |
| PvPoke fetch fails | Toast notification, use cached data |
| PvPoke URL returns unexpected format | Log error, use cached data, toast warning |
| Name translation fails (Pokémon not in fr.json) | Skip that Pokémon, log warning. Show count of unmatched at bottom of list |
| Duplicate CSV import (same content hash) | Warn user: *"Ce fichier a déjà été importé"*, allow re-import if desired |
| First launch without internet | Error screen: *"Connexion internet requise pour le premier lancement"* with retry button |

---

## Verification Plan

### Automated Tests
- Unit tests for `nameTranslator.js`: verify FR→EN→speciesId for regular, shadow, form, and edge-case Pokémon
- Unit tests for `csvManager.js`: import, merge deduplication, deletion, export
- Unit tests for `usePokemonMatcher.js`: matching algorithm with mock data
- Run via `npm test`

### Manual Verification
- Import the existing `poke_genie_export.csv` and verify Pokémon are correctly parsed
- Verify cross-referencing with live PvPoke data produces sensible matches
- Test all 4 league views
- Test CSV import → merge → export round-trip
- Test offline behavior (disconnect internet after first launch)
- Verify French names display correctly throughout
