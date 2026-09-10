# Implémentation : PoGo Team Creator — Itération 3

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'application 100% autonome et hors-ligne pour les visuels grâce aux sprites pixel embarqués dans `public/sprites/`, afficher les sprites de tous les Pokémon de la méte (même non possédés), indiquer la chaîne d'évolution inversée vers le Pokémon sauvage de base, afficher les noms des Pokémon dans la modale des formes non reconnues, et épurer les cartes (suppression de la pastille « Possédé » et de la barre grise de score).

**Architecture:**
- Tous les sprites pixel (dex 1 à 1025) sont embarqués directement dans `public/sprites/` et servis localement par Vite/Electron via le chemin relatif `/sprites/${dexNumber}.png`.
- Le backend Electron (`pvpokeCache.js`) extrait depuis `gamemaster.json` la table des numéros Pokédex (`speciesDexMap`) et les liens de parenté (`familyMap`), transmis au renderer via IPC.
- Le composable `usePokemonMatcher.js` associe à chaque Pokémon de la méta son vrai numéro Pokédex (qu'il soit possédé ou non) et génère la chaîne d'évolution inversée en français (ex: `Florizarre ⇽ Herbizarre ⇽ Bulbizarre`). Il extrait également les noms uniques des Pokémon ayant déclenché l'alerte de forme non reconnue.
- Les composants Vue (`PokemonRow.vue`, `PokemonSprite.vue`, `FormMappingEditor.vue`) intègrent l'affichage épuré sans barre grise ni tag « Possédé », avec le chemin d'évolution inverse et la liste explicite des Pokémon concernés dans la modale.

**Tech Stack:** Vue 3 (Composition API), Pinia, Electron, Vite, Vitest, CSS Vanilla (palette claire `#FAFBFC`).

**Spec:** [2026-09-10-iteration-3-offline-sprites-and-evolution-paths-design.md](file:///home/quentin/Documents/script/pogo_team_creator/docs/superpowers/specs/2026-09-10-iteration-3-offline-sprites-and-evolution-paths-design.md)

## Global Constraints

- Fonctionnement 100% hors-ligne pour les sprites : aucun appel externe vers GitHub/PokeAPI au runtime.
- Thème d'interface strictement clair (`#FAFBFC`, texte `#1A202C`, bordures `#E2E8F0`).
- Format exact de la chaîne d'évolution inversée : `[Cible] ⇽ [Intermédiaire] ⇽ [Base]` (séparateur ` ⇽ `).
- Préservation de la couverture complète des tests Vitest (49 tests actuels + nouveaux tests).

---

### Task 1: Embarquement des 1 025 Sprites Pixel en Local (`public/sprites/`) & Mise à Jour de `PokemonSprite.vue`

**Files:**
- Create: `public/sprites/` (contenant les sprites `1.png` à `1025.png`)
- Create: `scripts/downloadSprites.js`
- Modify: `src/components/PokemonSprite.vue`
- Modify: `tests/components/PokemonSprite.test.js`

**Interfaces:**
- Consumes: `dexNumber` (ex: 6, 25, 260)
- Produces: `spriteUrl = computed(() => '/sprites/' + num + '.png')`

- [x] **Step 1: Mettre à jour le test unitaire pour `PokemonSprite.vue` afin de vérifier l'utilisation de l'asset local**

Dans `tests/components/PokemonSprite.test.js` :

```javascript
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PokemonSprite from '../../src/components/PokemonSprite.vue';

describe('PokemonSprite.vue', () => {
  it('renders image with local sprite URL from public folder', () => {
    const wrapper = mount(PokemonSprite, {
      props: { dexNumber: 6, alt: 'Dracaufeu' }
    });

    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('/sprites/6.png');
    expect(img.attributes('alt')).toBe('Dracaufeu');
  });

  it('renders fallback SVG when image encounters an error or dexNumber is 0', () => {
    const wrapper = mount(PokemonSprite, {
      props: { dexNumber: 0 }
    });

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('.sprite-fallback').exists()).toBe(true);
  });
});
```

- [x] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/components/PokemonSprite.test.js`  
Résultat attendu : FAIL car `PokemonSprite.vue` pointe encore vers l'URL externe GitHub.

- [x] **Step 3: Créer le script de téléchargement des sprites et peupler `public/sprites/`**

Créer `scripts/downloadSprites.js` pour télécharger les 1 025 sprites en parallèle par lots et les enregistrer dans `public/sprites/` :

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../public/sprites');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function downloadSprite(dex) {
  const dest = path.join(outDir, `${dex}.png`);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return;

  const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) return;
    const arrayBuffer = await res.arrayBuffer();
    fs.writeFileSync(dest, Buffer.from(arrayBuffer));
  } catch (e) {
    console.error(`Failed to download dex ${dex}:`, e.message);
  }
}

async function main() {
  console.log('Downloading sprites for dex 1 to 1025...');
  const batchSize = 50;
  for (let i = 1; i <= 1025; i += batchSize) {
    const batch = [];
    for (let j = i; j < i + batchSize && j <= 1025; j++) {
      batch.push(downloadSprite(j));
    }
    await Promise.all(batch);
  }
  console.log('Finished downloading sprites.');
}

main();
```

Exécuter : `node scripts/downloadSprites.js`

- [x] **Step 4: Mettre à jour `PokemonSprite.vue` pour utiliser `/sprites/${num}.png`**

Dans `src/components/PokemonSprite.vue` :
```javascript
const spriteUrl = computed(() => {
  const num = parseInt(props.dexNumber, 10);
  if (!num || isNaN(num) || num <= 0) return '';
  return `/sprites/${num}.png`;
});
```

- [x] **Step 5: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/components/PokemonSprite.test.js`  
Résultat attendu : PASS.

- [x] **Step 6: Commiter les changements**

```bash
git add public/sprites scripts/downloadSprites.js src/components/PokemonSprite.vue tests/components/PokemonSprite.test.js
git commit -m "feat(sprites): bundle all 1025 pixel sprites locally for 100% offline usage"
```

---

### Task 2: Extraction de la Table Pokédex (`speciesDexMap`) et des Familles d'Évolution depuis `gamemaster.json`

**Files:**
- Modify: `electron/services/pvpokeCache.js`
- Modify: `electron/main.js`
- Modify: `electron/preload.js`
- Modify: `tests/pvpokeCache.test.js`

**Interfaces:**
- Consumes: `gamemaster.json`
- Produces:
  - `pvpokeCache.getGamemasterPokemonMetadata()` retourne `{ speciesDexMap: Record<string, number>, familyMap: Record<string, { id: string, parent?: string }> }`
  - IPC handler: `pvpoke:getPokemonMetadata`
  - Preload: `window.electronAPI.getPokemonMetadata()`

- [x] **Step 1: Écrire le test unitaire pour l'extraction des métadonnées Pokémon (dex & family) dans `tests/pvpokeCache.test.js`**

Dans `tests/pvpokeCache.test.js`, ajouter :

```javascript
it('extracts speciesDexMap and familyMap from gamemaster correctly', async () => {
  const fakeGameMaster = {
    pokemon: [
      { speciesId: 'venusaur', dex: 3, family: { id: 'FAMILY_BULBASAUR', parent: 'ivysaur' } },
      { speciesId: 'ivysaur', dex: 2, family: { id: 'FAMILY_BULBASAUR', parent: 'bulbasaur' } },
      { speciesId: 'bulbasaur', dex: 1, family: { id: 'FAMILY_BULBASAUR' } },
      { speciesId: 'skarmory', dex: 227, family: { id: 'FAMILY_SKARMORY' } }
    ]
  };
  const gmFile = path.join(tmpDir, 'cache', 'gamemaster.json');
  fs.writeFileSync(gmFile, JSON.stringify(fakeGameMaster), 'utf-8');

  const { speciesDexMap, familyMap } = await getGamemasterPokemonMetadata();
  expect(speciesDexMap.venusaur).toBe(3);
  expect(speciesDexMap.bulbasaur).toBe(1);
  expect(speciesDexMap.skarmory).toBe(227);

  expect(familyMap.venusaur.parent).toBe('ivysaur');
  expect(familyMap.bulbasaur.parent).toBeUndefined();
  expect(familyMap.skarmory.parent).toBeUndefined();
});
```

- [x] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/pvpokeCache.test.js`  
Résultat attendu : FAIL car `getGamemasterPokemonMetadata` n'existe pas encore.

- [x] **Step 3: Implémenter `getGamemasterPokemonMetadata` dans `electron/services/pvpokeCache.js`**

Ajouter dans `electron/services/pvpokeCache.js` :
```javascript
let gamemasterMetadataCache = null;

async function getGamemasterPokemonMetadata(forceRefresh = false) {
  if (gamemasterMetadataCache && !forceRefresh) {
    return gamemasterMetadataCache;
  }
  const gm = await getGameMaster(forceRefresh);
  const speciesDexMap = {};
  const familyMap = {};

  if (gm && Array.isArray(gm.pokemon)) {
    for (const p of gm.pokemon) {
      if (p.speciesId) {
        if (p.dex) {
          speciesDexMap[p.speciesId] = p.dex;
        }
        if (p.family) {
          familyMap[p.speciesId] = p.family;
        }
      }
    }
  }

  gamemasterMetadataCache = { speciesDexMap, familyMap };
  return gamemasterMetadataCache;
}
```
Exposer `getGamemasterPokemonMetadata` dans `module.exports`, brancher l'IPC dans `electron/main.js` et le pont dans `electron/preload.js`.

- [x] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/pvpokeCache.test.js`  
Résultat attendu : PASS.

- [x] **Step 5: Commiter les changements**

```bash
git add electron/services/pvpokeCache.js electron/main.js electron/preload.js tests/pvpokeCache.test.js
git commit -m "feat(pvpoke): extract speciesDexMap and familyMap from gamemaster"
```

---

### Task 3: Attribution des Numéros Pokédex Globaux, Chaîne d'Évolution Inversée & Noms des Pokémon Non Reconnus dans `usePokemonMatcher.js`

**Files:**
- Modify: `src/composables/usePokemonMatcher.js`
- Modify: `tests/usePokemonMatcher.test.js`

**Interfaces:**
- Consumes: `matchPokemon(masterList, rankings, league, customForms, eliteMovesMap, metadata)`
  - `metadata = { speciesDexMap: Record<string, number>, familyMap: Record<string, { id: string, parent?: string }> }`
- Produces:
  - `meta.dexNumber` toujours défini pour chaque élément de ranking (même si `mine` est `null`)
  - `meta.reverseEvolutionPath` : chaîne française inversée (ex: `'Florizarre ⇽ Herbizarre ⇽ Bulbizarre'`) ou `null` si forme de base
  - `unmatchedPokemonNames: string[]` contenant les noms uniques français des Pokémon qui ont une forme non reconnue

- [x] **Step 1: Écrire les tests unitaires pour la chaîne d'évolution inversée, les dexNumbers globaux et `unmatchedPokemonNames`**

Dans `tests/usePokemonMatcher.test.js`, ajouter :

```javascript
it('computes reverseEvolutionPath for unowned evolved pokemon and assigns dexNumber', () => {
  const masterList = []; // Utilisateur ne possède rien
  const rankings = [
    {
      speciesId: 'venusaur',
      speciesName: 'Venusaur',
      moveset: ['VINE_WHIP', 'FRENZY_PLANT']
    },
    {
      speciesId: 'skarmory',
      speciesName: 'Skarmory',
      moveset: ['STEEL_WING', 'BRAVE_BIRD']
    }
  ];

  const speciesDexMap = { venusaur: 3, ivysaur: 2, bulbasaur: 1, skarmory: 227 };
  const familyMap = {
    venusaur: { id: 'FAMILY_BULBASAUR', parent: 'ivysaur' },
    ivysaur: { id: 'FAMILY_BULBASAUR', parent: 'bulbasaur' },
    bulbasaur: { id: 'FAMILY_BULBASAUR' },
    skarmory: { id: 'FAMILY_SKARMORY' }
  };

  const { matched } = matchPokemon(masterList, rankings, '1500', {}, {}, { speciesDexMap, familyMap });

  const venusaur = matched.find(m => m.meta.speciesId === 'venusaur');
  expect(venusaur.meta.dexNumber).toBe(3);
  expect(venusaur.meta.reverseEvolutionPath).toBe('Florizarre ⇽ Herbizarre ⇽ Bulbizarre');

  const skarmory = matched.find(m => m.meta.speciesId === 'skarmory');
  expect(skarmory.meta.dexNumber).toBe(227);
  expect(skarmory.meta.reverseEvolutionPath).toBeNull(); // Forme de base
});

it('returns unique unmatchedPokemonNames when specimens have unknown forms', () => {
  const masterList = [
    { Nom: 'Deoxys', Forme: 'FormeInconnue1', 'Atq IV': '10', 'Déf IV': '10', 'Rés IV': '10', 'Date Attrapée': '2025-01-01', PC: '1000' },
    { Nom: 'Deoxys', Forme: 'FormeInconnue2', 'Atq IV': '12', 'Déf IV': '12', 'Rés IV': '12', 'Date Attrapée': '2025-01-02', PC: '1100' },
    { Nom: 'Kyurem', Forme: 'FormeInconnue3', 'Atq IV': '15', 'Déf IV': '15', 'Rés IV': '15', 'Date Attrapée': '2025-01-03', PC: '2000' }
  ];

  const { unmatchedForms, unmatchedPokemonNames } = matchPokemon(masterList, [], '1500');
  expect(unmatchedForms.length).toBe(3);
  expect(unmatchedPokemonNames).toEqual(['Deoxys', 'Kyurem']);
});
```

- [x] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/usePokemonMatcher.test.js`  
Résultat attendu : FAIL en raison de l'absence de `reverseEvolutionPath` et `unmatchedPokemonNames`.

- [x] **Step 3: Implémenter la logique dans `src/composables/usePokemonMatcher.js`**

1. Ajouter une fonction helper `buildReverseEvolutionPath(speciesId, familyMap, customForms)` :
   - Parcourt les `parent` successifs dans `familyMap`.
   - Si aucun parent, retourne `null`.
   - Construit la liste : `[speciesId, parent1, parent2, ...]`.
   - Mappe chaque ID en nom français avec `speciesIdToFrench(id, customForms).frenchName`.
   - Joint avec ` ⇽ ` (ex: `Florizarre ⇽ Herbizarre ⇽ Bulbizarre`).
2. Collecter les noms de Pokémon :
   `const unmatchedPokemonSet = new Set();`
   Quand une forme n'est pas reconnue : `unmatchedPokemonSet.add(row['Nom']);`
3. Dans `rankings.map(...)` :
   - `dexNumber = ranking.dex || (metadata?.speciesDexMap && metadata.speciesDexMap[speciesId]) || (owned ? owned.dexNumber : 0);`
   - `reverseEvolutionPath = buildReverseEvolutionPath(speciesId, metadata?.familyMap, customForms);`
4. Retourner `{ matched, unmatchedForms: Array.from(unmatchedFormsSet), unmatchedPokemonNames: Array.from(unmatchedPokemonSet) }`.

- [x] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/usePokemonMatcher.test.js`  
Résultat attendu : PASS.

- [x] **Step 5: Commiter les changements**

```bash
git add src/composables/usePokemonMatcher.js tests/usePokemonMatcher.test.js
git commit -m "feat(matcher): add reverse evolution paths, global dex numbers and unmatchedPokemonNames"
```

---

### Task 4: Affichage des Noms de Pokémon Concernés dans la Modale des Formes Non Reconnues

**Files:**
- Modify: `src/stores/appStore.js`
- Modify: `src/stores/pokemonStore.js`
- Modify: `src/components/FormMappingEditor.vue`
- Modify: `tests/components/FormMappingEditor.test.js`

**Interfaces:**
- Consumes: `appStore.unmatchedPokemonNames`
- Produces: encadré visuel dans la modale affichant : `Pokémon concernés : Deoxys, Necrozma`

- [x] **Step 1: Écrire le test unitaire pour `FormMappingEditor.vue`**

Dans `tests/components/FormMappingEditor.test.js`, ajouter :

```javascript
it('displays the list of affected Pokemon names in the modal', () => {
  const appStore = useAppStore();
  appStore.isFormEditorOpen = true;
  appStore.unmatchedForms = ['Forme Bizarre'];
  appStore.unmatchedPokemonNames = ['Deoxys', 'Necrozma'];

  const wrapper = mount(FormMappingEditor);
  const pokemonBox = wrapper.find('.affected-pokemon-box');
  expect(pokemonBox.exists()).toBe(true);
  expect(pokemonBox.text()).toContain('Deoxys, Necrozma');
});
```

- [x] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/components/FormMappingEditor.test.js`  
Résultat attendu : FAIL car `.affected-pokemon-box` n'existe pas encore.

- [x] **Step 3: Mettre à jour `appStore.js`, `pokemonStore.js` et `FormMappingEditor.vue`**

1. Dans `src/stores/appStore.js` :
   - Ajouter `unmatchedPokemonNames: []` dans le state.
2. Dans `src/stores/pokemonStore.js` :
   - Dans `loadData()`, récupérer `pokemonMetadata = await window.electronAPI.getPokemonMetadata()`.
   - Passer `pokemonMetadata` à `matchPokemon(...)`.
   - Mettre à jour `appStore.unmatchedPokemonNames = unmatchedPokemonNames || []`.
3. Dans `src/components/FormMappingEditor.vue` :
   - Ajouter le bloc d'affichage des noms concernés juste sous le paragraphe descriptif :
     ```html
     <div v-if="appStore.unmatchedPokemonNames.length > 0" class="affected-pokemon-box">
       <strong>Pokémon concernés :</strong> {{ appStore.unmatchedPokemonNames.join(', ') }}
     </div>
     ```
   - Styliser `.affected-pokemon-box` avec un fond beige doux (`#FEF3C7`), bordure dorée (`#F59E0B`) et texte `#92400E`.

- [x] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/components/FormMappingEditor.test.js`  
Résultat attendu : PASS.

- [x] **Step 5: Commiter les changements**

```bash
git add src/stores/appStore.js src/stores/pokemonStore.js src/components/FormMappingEditor.vue tests/components/FormMappingEditor.test.js
git commit -m "feat(ui): display affected pokemon names in FormMappingEditor modal"
```

---

### Task 5: Épuration de la Carte Pokémon (`PokemonRow.vue`) : Suppression du Tag « Possédé », de la Barre Grise & Affichage de la Chaîne d'Évolution Inverse

**Files:**
- Modify: `src/components/PokemonRow.vue`
- Modify: `tests/components/PokemonRow.test.js`

**Interfaces:**
- Consumes: `item.meta.reverseEvolutionPath`, `item.mine`
- Produces:
  - Suppression de `<span class="owned-tag">✅ Possédé</span>`
  - Suppression de `score-bar-bg` (la barre grise de progression)
  - Rendu de la chaîne d'évolution inverse pour un Pokémon non possédé : `<div class="reverse-evo-path">🌱 Florizarre ⇽ Herbizarre ⇽ Bulbizarre</div>`

- [x] **Step 1: Mettre à jour les tests unitaires dans `tests/components/PokemonRow.test.js`**

Dans `tests/components/PokemonRow.test.js` :
- Vérifier que `wrapper.text()` ne contient plus `'✅ Possédé'`.
- Vérifier que `wrapper.find('.score-bar-bg').exists()` est `false`.
- Tester un Pokémon non possédé avec `reverseEvolutionPath: 'Florizarre ⇽ Herbizarre ⇽ Bulbizarre'` et vérifier qu'il s'affiche dans `.reverse-evo-path`.

- [x] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/components/PokemonRow.test.js`  
Résultat attendu : FAIL car l'ancien tag et la barre sont encore présents, et le chemin d'évolution n'est pas encore affiché.

- [x] **Step 3: Mettre à jour `src/components/PokemonRow.vue`**

1. Supprimer le bloc `.score-bar-bg` dans `.score-container`, conserver uniquement `<div class="score-badge">Score {{ item.meta.score }}</div>` (ou `<span class="score-num">{{ item.meta.score }}</span>`).
2. Supprimer `<span class="owned-tag">✅ Possédé</span>` dans `.ownership-top`.
3. Dans `.name-info`, ajouter sous `.types-line` :
   ```html
   <div v-if="!item.mine && item.meta.reverseEvolutionPath" class="reverse-evo-path">
     🌱 {{ item.meta.reverseEvolutionPath }}
   </div>
   ```
4. Styliser `.reverse-evo-path` avec un style discret et élégant (texte `#2B6CB0`, fond pastel `#F0FDF4`, bordure fine `#BBF7D0`, taille de police `0.75rem`).

- [x] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/components/PokemonRow.test.js`  
Résultat attendu : PASS.

- [x] **Step 5: Commiter les changements**

```bash
git add src/components/PokemonRow.vue tests/components/PokemonRow.test.js
git commit -m "feat(ui): streamline PokemonRow by removing owned tag, removing grey score bar, and adding reverse evolution path"
```

---

### Task 6: Validation Globale, Tests d'Intégration & Build

**Files:**
- Modify: `tests/integration.test.js`
- Test: ensemble des suites de test (`npm test`)
- Build: validation du bundle Vite (`npm run build`)

- [x] **Step 1: Mettre à jour le test d'intégration pour valider la chaîne d'évolution et les sprites locaux**

Dans `tests/integration.test.js`, vérifier que sur le jeu réel, les Pokémon de la méta reçoivent bien leurs `dexNumber` et `reverseEvolutionPath`.

- [x] **Step 2: Exécuter l'ensemble de la suite de tests**

Exécuter : `npm test`  
Résultat attendu : Tous les tests passent à 100%.

- [x] **Step 3: Tester le build de production**

Exécuter : `npm run build`  
Résultat attendu : Build réussi avec tous les sprites packagés dans `dist/sprites/`.

- [x] **Step 4: Commiter et finaliser**

```bash
git add tests/integration.test.js
git commit -m "test: update integration tests for iteration 3 improvements"
```
