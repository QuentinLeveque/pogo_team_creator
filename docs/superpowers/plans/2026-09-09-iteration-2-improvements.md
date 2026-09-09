# Implémentation : PoGo Team Creator — Itération 2

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Améliorer l'application PoGo Team Creator avec la détection des attaques d'Élite/Legacy et attaques connues, la distinction des totaux vs ajouts CSV, la priorité accordée aux Pokémon déjà évolués face aux pré-évolutions avec avis comparatif, le filtre « Sans bonbons XL », les sprites pixel 2D et le rafraîchissement manuel PvPoke.

**Architecture:** 
- Le backend Electron (`pvpokeCache.js`, `csvManager.js`) gère la persistance locale sans requêtes intempestives, extrait `eliteMoves` du GameMaster PvPoke et expose les méthodes IPC `pvpoke:refresh` et `csv:import`.
- Le composable `usePokemonMatcher.js` compare les spécimens du joueur aux classements PvPoke en appliquant la déduplication intelligente (priorité aux spécimens déjà évolués pour économiser les ressources, tout en signalant les pré-évolutions à meilleur rang), calcule les coûts en poussières/bonbons/XL, et qualifie chaque attaque (`isElite`, `isKnown`).
- L'interface Vue 3 (`PokemonRow.vue`, `SearchBar.vue`, `AppSidebar.vue`) intègre les sprites pixel statiques, les badges de statut d'attaque, les pastilles de ressources, le filtre XL et le bouton de rafraîchissement.

**Tech Stack:** Vue 3 (Composition API), Pinia, Electron, Vite, Vitest, CSS Vanilla (palette lumineuse `#FAFBFC`).

**Spec:** [2026-09-09-iteration-2-improvements-design.md](file:///home/quentin/Documents/script/pogo_team_creator/docs/superpowers/specs/2026-09-09-iteration-2-improvements-design.md)

## Global Constraints

- Thème d'interface strictement clair (fond `#FAFBFC`, texte `#1A202C`, bordures `#E2E8F0`).
- Interface et termes en français intégral (« Ligue Super », « Rang: 98.4% #65 », « Sans bonbons XL », etc.).
- Sprites 2D pixel statiques avec fallback d'erreur propre (`@error`).
- Aucun appel réseau automatique en boucle : récupération des classements au démarrage puis maintien du cache local sauf clic sur rafraîchissement manuel.
- Préservation de la couverture de tests existante (Vitest).

---

### Task 1: Gestion du Cache PvPoke, Rafraîchissement Manuel & Extraction des Attaques d'Élite

**Files:**
- Modify: `electron/services/pvpokeCache.js`
- Modify: `electron/preload.js`
- Modify: `electron/main.js`
- Modify: `tests/pvpokeCache.test.js`

**Interfaces:**
- Consumes: URLs PvPoke (`rankings-[league].json`, `gamemaster.min.json`)
- Produces: 
  - `pvpokeCache.getEliteMovesMap(): Promise<Record<string, string[]>>` (mappe `speciesId` -> `eliteMoves`)
  - `pvpokeCache.refreshAll(): Promise<{ success: boolean, updatedLeagues: string[], timestamp: string }>`
  - IPC handler: `pvpoke:refresh` et `pvpoke:get-elite-moves`
  - Méthodes preload: `window.electronAPI.refreshPvpoke()` et `window.electronAPI.getEliteMoves()`

- [x] **Step 1: Écrire le test unitaire pour l'extraction des eliteMoves et le rafraîchissement manuel**

Dans `tests/pvpokeCache.test.js`, ajouter les tests vérifiant l'extraction des `eliteMoves` depuis le gamemaster et la fonction `refreshAll` :

```javascript
// tests/pvpokeCache.test.js additions
it('extracts eliteMoves map from gamemaster correctly', async () => {
  const fakeGameMaster = {
    pokemon: [
      { speciesId: 'charizard', eliteMoves: ['BLAST_BURN', 'DRAGON_BREATH', 'EMBER', 'WING_ATTACK'] },
      { speciesId: 'venusaur', eliteMoves: ['FRENZY_PLANT'] },
      { speciesId: 'pikachu' } // pas de eliteMoves
    ]
  };
  fs.writeFileSync(path.join(testDir, 'cache', 'gamemaster.json'), JSON.stringify(fakeGameMaster), 'utf-8');
  
  const eliteMap = await pvpokeCache.getEliteMovesMap();
  expect(eliteMap.charizard).toEqual(['BLAST_BURN', 'DRAGON_BREATH', 'EMBER', 'WING_ATTACK']);
  expect(eliteMap.venusaur).toEqual(['FRENZY_PLANT']);
  expect(eliteMap.pikachu).toEqual([]);
});
```

- [x] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/pvpokeCache.test.js`  
Résultat attendu : FAIL car `getEliteMovesMap` n'est pas encore implémenté.

- [x] **Step 3: Implémenter `getEliteMovesMap` et `refreshAll` dans `electron/services/pvpokeCache.js`**

Ajouter la gestion du cache gamemaster, l'extraction de `eliteMoves` et la fonction `refreshAll` dans `electron/services/pvpokeCache.js` :

```javascript
let eliteMovesCache = null;

async function getEliteMovesMap(forceRefresh = false) {
  if (eliteMovesCache && !forceRefresh) {
    return eliteMovesCache;
  }
  const gm = await getGameMaster(forceRefresh);
  const map = {};
  if (gm && Array.isArray(gm.pokemon)) {
    for (const p of gm.pokemon) {
      if (p.speciesId) {
        map[p.speciesId] = Array.isArray(p.eliteMoves) ? p.eliteMoves : [];
      }
    }
  }
  eliteMovesCache = map;
  return map;
}

async function refreshAll(leagues = ['1500', '2500', '10000', '500']) {
  const updatedLeagues = [];
  for (const league of leagues) {
    await getRankings(league, true);
    updatedLeagues.push(league);
  }
  await getGameMaster(true);
  await getEliteMovesMap(true);
  return {
    success: true,
    updatedLeagues,
    timestamp: new Date().toISOString()
  };
}
```

Exposer ces méthodes dans `module.exports`, brancher l'IPC dans `electron/main.js` et les ponts dans `electron/preload.js`.

- [x] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/pvpokeCache.test.js`  
Résultat attendu : PASS.

- [x] **Step 5: Commiter les changements**

```bash
git add electron/services/pvpokeCache.js electron/main.js electron/preload.js tests/pvpokeCache.test.js
git commit -m "feat(pvpoke): add elite moves extraction and manual cache refresh"
```

---

### Task 2: Calcul des Coûts XL & Logique d'Attaques Connues / Élite

**Files:**
- Create: `src/utils/costCalculator.js`
- Create: `tests/costCalculator.test.js`

**Interfaces:**
- Consumes: niveau initial (`Niveau Min`), poussières requises (`Coût Poussières (X)`), bonbons requis (`Coût Bonbon (X)`)
- Produces: 
  - `calculateResourceCosts(initialLevel, dustCost, candyCost, isShadow, isLucky)` : retourne `{ dustCost, candyCost, xlCandyCost, requiresXl }`

- [x] **Step 1: Écrire le test unitaire pour `costCalculator.js`**

Créer `tests/costCalculator.test.js` :

```javascript
import { describe, it, expect } from 'vitest';
import { calculateResourceCosts } from '../src/utils/costCalculator.js';

describe('calculateResourceCosts', () => {
  it('calculates 0 XL candy when dust cost is below level 40 threshold', () => {
    // Level 16 Smogo to ~1500 CP: 45100 dust
    const res = calculateResourceCosts(16.0, 45100, 91, false, false);
    expect(res.requiresXl).toBe(false);
    expect(res.xlCandyCost).toBe(0);
    expect(res.dustCost).toBe(45100);
    expect(res.candyCost).toBe(91);
  });

  it('calculates XL candy when dust cost exceeds level 40 threshold', () => {
    // Level 16 Smogogo to 2500 CP: 492600 dust (needs level 50 = 296 XL)
    const res = calculateResourceCosts(16.0, 492600, 314, false, false);
    expect(res.requiresXl).toBe(true);
    expect(res.xlCandyCost).toBe(296);
    expect(res.dustCost).toBe(492600);
    expect(res.candyCost).toBe(314);
  });
});
```

- [x] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/costCalculator.test.js`  
Résultat attendu : FAIL car `costCalculator.js` n'existe pas encore.

- [x] **Step 3: Implémenter `src/utils/costCalculator.js`**

Créer `src/utils/costCalculator.js` avec la table officielle des paliers de poussières et bonbons XL de Pokémon GO :

```javascript
// Cumulative dust required per half-level from level 1.0 to 50.0
const DUST_TABLE = {
  1.0: 200, 1.5: 200, 2.0: 200, 2.5: 200,
  3.0: 400, 3.5: 400, 4.0: 400, 4.5: 400,
  5.0: 600, 5.5: 600, 6.0: 600, 6.5: 600,
  7.0: 800, 7.5: 800, 8.0: 800, 8.5: 800,
  9.0: 1000, 9.5: 1000, 10.0: 1000, 10.5: 1000,
  11.0: 1300, 11.5: 1300, 12.0: 1300, 12.5: 1300,
  13.0: 1600, 13.5: 1600, 14.0: 1600, 14.5: 1600,
  15.0: 1900, 15.5: 1900, 16.0: 1900, 16.5: 1900,
  17.0: 2200, 17.5: 2200, 18.0: 2200, 18.5: 2200,
  19.0: 2500, 19.5: 2500, 20.0: 2500, 20.5: 2500,
  21.0: 3000, 21.5: 3000, 22.0: 3000, 22.5: 3000,
  23.0: 3500, 23.5: 3500, 24.0: 3500, 24.5: 3500,
  25.0: 4000, 25.5: 4000, 26.0: 4000, 26.5: 4000,
  27.0: 4500, 27.5: 4500, 28.0: 4500, 28.5: 4500,
  29.0: 5000, 29.5: 5000, 30.0: 5000, 30.5: 5000,
  31.0: 6000, 31.5: 6000, 32.0: 6000, 32.5: 6000,
  33.0: 7000, 33.5: 7000, 34.0: 7000, 34.5: 7000,
  35.0: 8000, 35.5: 8000, 36.0: 8000, 36.5: 8000,
  37.0: 9000, 37.5: 9000, 38.0: 9000, 38.5: 9000,
  39.0: 10000, 39.5: 10000
};

// XL candy per half level from 40.5 to 50.0 (20 half levels)
const XL_CANDY_STEPS = [
  { dust: 10000, xl: 10 }, { dust: 10000, xl: 10 }, // 40.5, 41.0
  { dust: 10000, xl: 10 }, { dust: 10000, xl: 10 }, // 41.5, 42.0
  { dust: 11000, xl: 12 }, { dust: 11000, xl: 12 }, // 42.5, 43.0
  { dust: 11000, xl: 12 }, { dust: 11000, xl: 12 }, // 43.5, 44.0
  { dust: 12000, xl: 14 }, { dust: 12000, xl: 14 }, // 44.5, 45.0
  { dust: 13000, xl: 14 }, { dust: 13000, xl: 14 }, // 45.5, 46.0
  { dust: 14000, xl: 16 }, { dust: 14000, xl: 16 }, // 46.5, 47.0
  { dust: 15000, xl: 18 }, { dust: 15000, xl: 18 }, // 47.5, 48.0
  { dust: 16000, xl: 20 }, { dust: 16000, xl: 20 }, // 48.5, 49.0
  { dust: 17000, xl: 20 }, { dust: 17000, xl: 20 }  // 49.5, 50.0
];

export function calculateDustTo40(startLevel) {
  let total = 0;
  let current = Math.max(1.0, startLevel || 1.0);
  while (current < 40.0) {
    total += DUST_TABLE[current] || 0;
    current = Math.round((current + 0.5) * 10) / 10;
  }
  return total;
}

export function calculateResourceCosts(initialLevel, rawDustCost, rawCandyCost, isShadow = false, isLucky = false) {
  const dustCost = Number(rawDustCost) || 0;
  const candyCost = Number(rawCandyCost) || 0;
  
  if (dustCost <= 0) {
    return { dustCost: 0, candyCost, xlCandyCost: 0, requiresXl: false };
  }

  const multiplier = isShadow ? 1.2 : isLucky ? 0.5 : 1.0;
  const dustTo40 = Math.round(calculateDustTo40(initialLevel) * multiplier);

  if (dustCost <= dustTo40) {
    return { dustCost, candyCost, xlCandyCost: 0, requiresXl: false };
  }

  let excessDust = dustCost - dustTo40;
  let xlTotal = 0;

  for (const step of XL_CANDY_STEPS) {
    const stepDust = Math.round(step.dust * multiplier);
    if (excessDust >= stepDust - 100) {
      xlTotal += step.xl;
      excessDust -= stepDust;
    } else {
      break;
    }
  }

  return {
    dustCost,
    candyCost,
    xlCandyCost: xlTotal,
    requiresXl: xlTotal > 0
  };
}
```

- [x] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/costCalculator.test.js`  
Résultat attendu : PASS.

- [x] **Step 5: Commiter les changements**

```bash
git add src/utils/costCalculator.js tests/costCalculator.test.js
git commit -m "feat(resources): add costCalculator for XL candy and stardust requirements"
```

---

### Task 3: Évolution du Moteur de Matching (Priorité Évolué, Avis Non-Évolué, Détection d'Attaques Connues/Élite)

**Files:**
- Modify: `src/composables/usePokemonMatcher.js`
- Modify: `tests/usePokemonMatcher.test.js`

**Interfaces:**
- Consumes: `masterList`, `rankings`, `league`, `customForms`, `eliteMovesMap`
- Produces: 
  - `matchPokemon(...)` renvoie des éléments avec :
    - `mine.isAlreadyEvolved: boolean`
    - `mine.needsEvolution: boolean`
    - `mine.betterUnevolvedCandidate: object | null`
    - `mine.dustCost`, `mine.candyCost`, `mine.xlCandyCost`, `mine.requiresXl`
    - `meta.recommendedMoveset`:
      - `fast`: `{ moveId, nameFr, isElite, isKnown }`
      - `charged`: `Array<{ moveId, nameFr, isElite, isKnown }>`

- [x] **Step 1: Écrire les tests unitaires pour la déduplication évolué vs non-évolué et la qualification des attaques**

Dans `tests/usePokemonMatcher.test.js`, ajouter :

```javascript
it('prioritizes already evolved specimen and attaches better unevolved candidate if present', () => {
  const masterList = [
    // Déjà évolué mais rang moyen
    {
      Nom: 'Florizarre', Forme: '', 'Atq IV': '5', 'Déf IV': '10', 'Rés IV': '12',
      'Rang % (G)': '88.5%', 'Rang # (G)': '450', 'Coût Poussières (G)': '10000', 'Coût Bonbon (G)': '25',
      'Niveau Min': '20.0', 'Attaque Rapide': 'Fouet Lianes', 'Attaque Chargée': 'Végé-Attaque', 'Date Attrapée': '2025-01-01'
    },
    // Non-évolué mais avec un meilleur rang
    {
      Nom: 'Bulbizarre', Forme: '', 'Nom (G)': 'Florizarre', 'Forme (G)': 'Normale',
      'Atq IV': '0', 'Déf IV': '14', 'Rés IV': '15',
      'Rang % (G)': '99.5%', 'Rang # (G)': '12', 'Coût Poussières (G)': '125000', 'Coût Bonbon (G)': '124',
      'Niveau Min': '10.0', 'Attaque Rapide': 'Charge', 'Attaque Chargée': 'Canon Graine', 'Date Attrapée': '2025-02-01'
    }
  ];

  const rankings = [
    {
      speciesId: 'venusaur',
      speciesName: 'Venusaur',
      moveset: ['VINE_WHIP', 'FRENZY_PLANT', 'SLUDGE_BOMB']
    }
  ];

  const eliteMovesMap = {
    venusaur: ['FRENZY_PLANT']
  };

  const { matched } = matchPokemon(masterList, rankings, '1500', {}, eliteMovesMap);
  const v = matched[0];

  expect(v.mine).toBeDefined();
  expect(v.mine.name).toBe('Florizarre');
  expect(v.mine.isAlreadyEvolved).toBe(true);
  expect(v.mine.needsEvolution).toBe(false);
  expect(v.mine.betterUnevolvedCandidate).toBeDefined();
  expect(v.mine.betterUnevolvedCandidate.name).toBe('Bulbizarre');
  expect(v.mine.betterUnevolvedCandidate.ivRankPercent).toBe(99.5);

  // Vérification qualification des attaques
  const moves = v.meta.recommendedMoveset;
  expect(moves.fast.nameFr).toBe('Fouet Lianes');
  expect(moves.fast.isKnown).toBe(true);
  expect(moves.fast.isElite).toBe(false);

  expect(moves.charged[0].nameFr).toBe('Végé-Attaque');
  expect(moves.charged[0].isElite).toBe(true);
  expect(moves.charged[0].isKnown).toBe(true); // possédé sur le Florizarre actuel

  expect(moves.charged[1].nameFr).toBe('Bombe Beurk');
  expect(moves.charged[1].isElite).toBe(false);
  expect(moves.charged[1].isKnown).toBe(false); // non possédé
});
```

- [x] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/usePokemonMatcher.test.js`  
Résultat attendu : FAIL en raison de l'absence des nouveaux champs et de la logique de séparation évolué / non-évolué.

- [x] **Step 3: Implémenter la logique dans `src/composables/usePokemonMatcher.js`**

Mettre à jour `matchPokemon` dans `src/composables/usePokemonMatcher.js` :
- Intégrer `calculateResourceCosts` de `src/utils/costCalculator.js`.
- Grouper les spécimens éligibles par espèce dans une liste au lieu d'écraser immédiatement.
- Pour chaque espèce cible, séparer les candidats en `evolved` (`c.name.toLowerCase() === targetName.toLowerCase()`) et `unevolved`.
- Sélectionner le meilleur `evolved` en priorité. S'il existe et qu'un `unevolved` a un meilleur rang, attacher `betterUnevolvedCandidate`.
- Si aucun `evolved` n'existe, sélectionner le meilleur `unevolved` avec `needsEvolution = true`.
- Qualifier chaque attaque recommandée avec `isElite = (eliteMovesMap[speciesId] || []).includes(moveId)` et `isKnown = specimenMoves.includes(moveNameFr.toLowerCase())`.

- [x] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/usePokemonMatcher.test.js`  
Résultat attendu : PASS.

- [x] **Step 5: Commiter les changements**

```bash
git add src/composables/usePokemonMatcher.js tests/usePokemonMatcher.test.js
git commit -m "feat(matcher): prioritize evolved specimen and qualify moves with elite and known status"
```

---

### Task 4: Filtre « Sans bonbons XL » dans la Barre d'Outils

**Files:**
- Modify: `src/components/SearchBar.vue`
- Modify: `src/components/PokemonList.vue`
- Modify: `tests/components/SearchBar.test.js`

**Interfaces:**
- Consumes: état du filtre `excludeXl`
- Produces: 
  - Événement `@update:exclude-xl` ou synchronisation avec le store
  - Filtrage dans `PokemonList.vue` : exclut les Pokémon avec `mine?.requiresXl === true`

- [x] **Step 1: Écrire le test unitaire pour le toggle XL dans `SearchBar.test.js`**

Dans `tests/components/SearchBar.test.js`, ajouter :

```javascript
it('emits update:excludeXl when clicking the Sans bonbons XL button', async () => {
  const wrapper = mount(SearchBar, {
    props: {
      modelValue: '',
      excludeXl: false
    }
  });

  const xlBtn = wrapper.find('.xl-toggle-btn');
  expect(xlBtn.exists()).toBe(true);
  expect(xlBtn.classes()).not.toContain('active');

  await xlBtn.trigger('click');
  expect(wrapper.emitted('update:excludeXl')).toBeTruthy();
  expect(wrapper.emitted('update:excludeXl')[0]).toEqual([true]);
});
```

- [x] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/components/SearchBar.test.js`  
Résultat attendu : FAIL car `.xl-toggle-btn` n'existe pas encore.

- [x] **Step 3: Implémenter le bouton toggle dans `SearchBar.vue` et le filtre dans `PokemonList.vue`**

1. Dans `src/components/SearchBar.vue` :
   - Ajouter la prop `excludeXl` (booléen) et l'émission `update:excludeXl`.
   - Ajouter le bouton `<button class="xl-toggle-btn" :class="{ active: excludeXl }" @click="$emit('update:excludeXl', !excludeXl)">Sans bonbons XL</button>`.
   - Styliser avec la palette claire existante (bordure discrète, fond bleu pastel quand actif).
2. Dans `src/components/PokemonList.vue` :
   - Lier `v-model:excludeXl="excludeXl"`.
   - Dans le computed `filteredPokemon`, ajouter la condition : `if (excludeXl.value && item.mine && item.mine.requiresXl) return false;`.

- [x] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/components/SearchBar.test.js`  
Résultat attendu : PASS.

- [x] **Step 5: Commiter les changements**

```bash
git add src/components/SearchBar.vue src/components/PokemonList.vue tests/components/SearchBar.test.js
git commit -m "feat(filter): add exclude XL candy toggle in search bar"
```

---

### Task 5: Affichage Historique CSV Précis & Bouton de Rafraîchissement PvPoke

**Files:**
- Modify: `src/components/AppSidebar.vue`
- Modify: `src/stores/appStore.js`
- Modify: `src/stores/pokemonStore.js`
- Modify: `tests/components/AppSidebar.test.js`

**Interfaces:**
- Consumes: `appStore.importHistory`, `pokemonStore.refreshPvpokeRankings()`
- Produces: 
  - Affichage `{{ item.pokemonCountInFile }} au total · +{{ item.newPokemonAdded }} ajoutés`
  - Bouton rafraîchir avec spinner et date de mise à jour

- [x] **Step 1: Écrire le test unitaire pour `AppSidebar.vue`**

Dans `tests/components/AppSidebar.test.js`, ajouter :

```javascript
it('displays formatted CSV history with total and added counts', () => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const appStore = useAppStore();
  appStore.importHistory = [
    {
      id: 'abc',
      originalFilename: 'poke_genie_export_2.csv',
      importedAt: '2026-09-09T18:00:00.000Z',
      pokemonCountInFile: 1852,
      newPokemonAdded: 1176
    }
  ];

  const wrapper = mount(AppSidebar);
  const metaText = wrapper.find('.history-meta').text();
  expect(metaText).toContain('1 852 au total · +1 176 ajoutés');
});
```

- [x] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/components/AppSidebar.test.js`  
Résultat attendu : FAIL car l'affichage utilise encore l'ancien format `+1176 Pokémon`.

- [x] **Step 3: Mettre à jour `AppSidebar.vue` et `pokemonStore.js`**

1. Dans `src/components/AppSidebar.vue` :
   - Mettre à jour le format du badge historique :
     ```html
     <span class="added-tag">
       {{ Number(item.pokemonCountInFile || 0).toLocaleString('fr-FR') }} au total · 
       {{ item.newPokemonAdded > 0 ? `+${Number(item.newPokemonAdded).toLocaleString('fr-FR')} ajoutés` : '0 nouveau' }}
     </span>
     ```
   - Ajouter le bouton de rafraîchissement PvPoke dans la section Ligues avec l'état `isRefreshing` et l'appel à `pokemonStore.refreshPvpoke()`.
2. Dans `src/stores/pokemonStore.js` :
   - Ajouter la méthode `async refreshPvpoke()` qui appelle `window.electronAPI.refreshPvpoke()`, recharge le Gamemaster / Elite moves, et réexécute le matching.

- [x] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/components/AppSidebar.test.js`  
Résultat attendu : PASS.

- [x] **Step 5: Commiter les changements**

```bash
git add src/components/AppSidebar.vue src/stores/pokemonStore.js src/stores/appStore.js tests/components/AppSidebar.test.js
git commit -m "feat(sidebar): enhance CSV history counter and add manual pvpoke refresh button"
```

---

### Task 6: Refonte de la Ligne Pokémon (Sprite Pixel, Badges, Coûts Réduits & Comparatif Déplié)

**Files:**
- Create: `src/components/PokemonSprite.vue`
- Modify: `src/components/PokemonRow.vue`
- Modify: `tests/components/PokemonRow.test.js`

**Interfaces:**
- Consumes: `pokemon` (`MatchedPokemon`) avec sprite dex, form, `betterUnevolvedCandidate`, `dustCost`, `candyCost`, `xlCandyCost`, et attaques qualifiées
- Produces: 
  - Affichage sprite pixel statique
  - Badges de forme, évolution requise et statut des attaques
  - Pastilles de ressources sur la carte réduite
  - Bloc comparatif côte-à-côte en vue dépliée

- [x] **Step 1: Créer le composant `PokemonSprite.vue` et son test unitaire**

Créer `src/components/PokemonSprite.vue` pour charger le sprite pixel statique Showdown / PokeAPI avec fallback propre :

```vue
<template>
  <div class="sprite-container">
    <img
      v-if="!hasError"
      :src="spriteUrl"
      :alt="alt"
      class="pixel-sprite"
      loading="lazy"
      @error="handleError"
    />
    <div v-else class="sprite-fallback">
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#A0AEC0" stroke-width="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a10 10 0 0 1 0 20" />
        <circle cx="12" cy="12" r="3" fill="#CBD5E0" />
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  dexNumber: { type: [Number, String], required: true },
  alt: { type: String, default: 'Pokémon' }
});

const hasError = ref(false);
const spriteUrl = computed(() => {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${props.dexNumber}.png`;
});

function handleError() {
  hasError.value = true;
}
</script>

<style scoped>
.sprite-container {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.pixel-sprite {
  width: 44px;
  height: 44px;
  image-rendering: pixelated;
  object-fit: contain;
}
.sprite-fallback {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
```

- [x] **Step 2: Écrire les tests unitaires pour `PokemonRow.vue`**

Dans `tests/components/PokemonRow.test.js`, ajouter les assertions pour :
- La présence du sprite pixel.
- Le badge de forme (`Alola`, `Galar`...).
- Le badge `Évolution requise`.
- Le libellé `Rang: 98.4% #65` pour la Ligue Super.
- Les badges de ressources (`✨ 25 000`, `🍬 45`, `🔷 80`).
- L'avis `Meilleur non-évolué disponible` et le bloc de comparaison déplié.
- Les badges d'attaques avec icône Élite et statut `Connue` / `CT requise`.

- [x] **Step 3: Mettre à jour `PokemonRow.vue`**

Mettre à jour `src/components/PokemonRow.vue` avec :
- Intégration de `PokemonSprite.vue`.
- Affichage du badge de forme à côté du nom de l'espèce.
- Affichage du badge `Évolution requise` si `pokemon.mine.needsEvolution`.
- Affichage de l'avis `💡 Non-évolué disponible : {{ pokemon.mine.betterUnevolvedCandidate.name }} (Rang {{ pokemon.mine.betterUnevolvedCandidate.ivRankPercent }}%)`.
- Remplacement du label IV par `Rang: {{ pokemon.mine.ivRankPercent }}% #{{ pokemon.mine.ivRankNumber }}` (pour les ligues 500, 1500, 2500) et `IV: {{ pokemon.mine.ivAverage }}%` (pour Master).
- Pastilles de ressources sur la ligne réduite :
  - `<span class="cost-badge dust">✨ {{ pokemon.mine.dustCost.toLocaleString('fr-FR') }}</span>`
  - `<span class="cost-badge candy">🍬 {{ pokemon.mine.candyCost }}</span>`
  - `<span v-if="pokemon.mine.requiresXl" class="cost-badge xl">🔷 {{ pokemon.mine.xlCandyCost }} XL</span>`
- Badges d'attaques stylisés avec statut `isElite` (étoile) et `isKnown` (coche verte).
- En vue dépliée : bloc comparatif côte-à-côte si `betterUnevolvedCandidate` est présent.

- [x] **Step 4: Exécuter les tests de composants**

Exécuter : `npx vitest run tests/components/PokemonRow.test.js`  
Résultat attendu : PASS.

- [x] **Step 5: Commiter les changements**

```bash
git add src/components/PokemonSprite.vue src/components/PokemonRow.vue tests/components/PokemonRow.test.js
git commit -m "feat(ui): add pixel sprite, form/evolution badges, resource costs, and comparison view to PokemonRow"
```

---

### Task 7: Validation Globale, Tests d'Intégration & Build

**Files:**
- Modify: `tests/integration.test.js`
- Test: ensemble des suites de test (`npm test`)
- Build: validation du bundle Vite (`npm run build`)

- [x] **Step 1: Mettre à jour le test d'intégration pour valider le flux complet**

Dans `tests/integration.test.js`, vérifier que le chargement complet des données réelles avec `old/poke_genie_export_2.csv` produit les nouveaux attributs (coûts XL, attaques qualifiées, déduplication évolué vs non-évolué).

- [x] **Step 2: Exécuter l'ensemble de la suite de tests**

Exécuter : `npm test`  
Résultat attendu : Tous les tests passent à 100%.

- [x] **Step 3: Tester le build de production**

Exécuter : `npm run build`  
Résultat attendu : Build réussi sans erreurs de syntaxe, d'import ou de bundling.

- [x] **Step 4: Commiter et finaliser**

```bash
git add tests/integration.test.js
git commit -m "test: update integration tests for iteration 2 improvements"
```
