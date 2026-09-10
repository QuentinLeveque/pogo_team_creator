# Plan d'Implémentation : Itération 5 - Gestion CSV, Séparation Obscurs, Refonte des Attaques & Matchups Visuels

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre la suppression individuelle et totale des CSV avec recalcul automatique, séparer strictement les spécimens et évolutions Obscurs (Feunard/Goupix), refondre la présentation des attaques (côte-à-côte avec badges Élite et suppression des badges CT), afficher visuellement les matchups clés avec sprites, filtrer universellement les Pokémon XL et enrichir les traductions françaises des 350 attaques.

**Architecture:** Extension du service backend `csvManager.js` avec reconstitution depuis les archives CSV ; calcul du statut XL pour le méta dans `pvpokeCache.js` via les statistiques Gamemaster ; matching strict et arbre d'évolution obscur dans `usePokemonMatcher.js` ; refonte visuelle des composants Vue `CsvImporter.vue` et `PokemonRow.vue`.

**Tech Stack:** Vue 3, Pinia, Electron, Node.js (fs, path, crypto), Vitest, CSS Vanilla.

**Spec:** `docs/superpowers/specs/2026-09-10-iteration-5-csv-cleanup-shadow-fix-moves-overhaul-and-matchups-design.md`

## Global Constraints
- Maintenir une couverture de tests à 100% sur les fonctionnalités critiques (63+ tests passants).
- Aucun placeholder ("TODO", "TBD", etc.) dans le code.
- Compatibilité descendante : si aucune archive n'est disponible, gestion gracieuse des erreurs.
- Ne pas régresser sur le support hors-ligne des sprites locaux SVG.

---

### Task 1: Enrichissement exhaustif du dictionnaire des attaques (`src/data/moves.json` & `src/data/moves.js`)

**Files:**
- Modify: `src/data/moves.json`
- Modify: `src/data/moves.js`
- Test: `tests/pvpokeCache.test.js`

**Interfaces:**
- Produces: `translateMove(moveId)` retournant le nom français officiel pour les 350 attaques du Game Master.

- [ ] **Step 1: Write test for complete move translations in `tests/pvpokeCache.test.js`**

Ajouter dans `tests/pvpokeCache.test.js` :
```javascript
  it('translates common and special moves from Game Master correctly into French', () => {
    expect(translateMove('AERIAL_ACE')).toBe('Aéropique');
    expect(translateMove('AURA_SPHERE')).toBe('Aurasphère');
    expect(translateMove('WEATHER_BALL_FIRE')).toBe("Ball'Météo (Feu)");
    expect(translateMove('SACRED_SWORD')).toBe('Lame Sainte');
    expect(translateMove('ACID_SPRAY')).toBe('Bombe Acide');
    expect(translateMove('HYDRO_CANNON')).toBe('Hydroblast');
    expect(translateMove('FRENZY_PLANT')).toBe('Végé-Attaque');
    expect(translateMove('BLAST_BURN')).toBe('Rafale Feu');
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pvpokeCache.test.js`  
Expected: FAIL avec `AERIAL_ACE` ou `AURA_SPHERE` non traduits.

- [ ] **Step 3: Enrich `src/data/moves.json` with all 350 translations**

Mettre à jour `src/data/moves.json` avec la table complète des traductions françaises officielles pour Pokémon GO.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pvpokeCache.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/moves.json src/data/moves.js tests/pvpokeCache.test.js
git commit -m "feat(moves): complete French translations for all 350 Pokémon GO moves"
```

---

### Task 2: Suppression des CSV & Recalcul de la Collection (`electron/services/csvManager.js`)

**Files:**
- Modify: `electron/services/csvManager.js`
- Modify: `electron/main.js`
- Modify: `electron/preload.js`
- Test: `tests/csvManager.test.js`

**Interfaces:**
- Produces:
  - `removeAllCsvs()` ➔ `{ success: true, totalCount: 0, history: [] }`
  - `removeCsvFile(historyId)` ➔ `{ success: true, totalCount: number, history: Array }`
- IPC:
  - `csv:removeAll`
  - `csv:removeFile`

- [ ] **Step 1: Write failing tests in `tests/csvManager.test.js`**

Ajouter dans `tests/csvManager.test.js` :
```javascript
  it('removes a specific CSV file and recalculates master from remaining files', () => {
    const csv1 = `Index,Nom,Forme,Pokemon,Sexe,PC,PV,Atq IV,Déf IV,Rés IV,IV Moyen,Niveau Min,Niveau Max,Attaque Rapide,Attaque Chargée,Attaque Chargée 2,Date Analyse,Date Attrapée,Poids,Taille,Chanceux,Obscur/Purifié,Favori,Poussières,Rang % (G),Rang # (G),Prod Stat (G),Coût Poussières (G),Coût Bonbon (G),Nom (G),Forme (G),Obs/Pur (G),Rang % (U),Rang # (U),Prod Stat (U),Coût Poussières (U),Coût Bonbon (U),Nom (U),Forme (U),Obs/Pur (U),Rang % (L),Rang # (L),Prod Stat (L),Coût Poussières (L),Coût Bonbon (L),Nom (L),Forme (L),Obs/Pur (L),Marqué pour Utilisation en PvP
1,Lixy,,403,♂,680,99,12,15,13,88.9,28.0,28.0,,,,"2025-04-24 15:59",18/12/2021,7.37kg,0.45m,1,0,0,4500,80.85%,785,95.55%,111000,223,Luxio,,0,,,,,,,,,,,,,,`;
    const csv2 = `Index,Nom,Forme,Pokemon,Sexe,PC,PV,Atq IV,Déf IV,Rés IV,IV Moyen,Niveau Min,Niveau Max,Attaque Rapide,Attaque Chargée,Attaque Chargée 2,Date Analyse,Date Attrapée,Poids,Taille,Chanceux,Obscur/Purifié,Favori,Poussières,Rang % (G),Rang # (G),Prod Stat (G),Coût Poussières (G),Coût Bonbon (G),Nom (G),Forme (G),Obs/Pur (G),Rang % (U),Rang # (U),Prod Stat (U),Coût Poussières (U),Coût Bonbon (U),Nom (U),Forme (U),Obs/Pur (U),Rang % (L),Rang # (L),Prod Stat (L),Coût Poussières (L),Coût Bonbon (L),Nom (L),Forme (L),Obs/Pur (L),Marqué pour Utilisation en PvP
2,Dracaufeu,,6,♂,1480,120,1,15,14,66.7,19.5,19.5,,,,"2025-04-24 16:00",10/05/2022,90.5kg,1.7m,0,0,0,2500,98.2%,15,99.1%,0,0,Dracaufeu,,0,,,,,,,,,,,,,,,`;

    const res1 = importAndMerge(csv1, 'file1.csv');
    const res2 = importAndMerge(csv2, 'file2.csv');
    expect(getMasterPokemon().length).toBe(2);

    const removeRes = removeCsvFile(res1.historyEntry.id);
    expect(removeRes.success).toBe(true);
    expect(removeRes.totalCount).toBe(1);
    expect(getMasterPokemon().length).toBe(1);
    expect(getMasterPokemon()[0].Nom).toBe('Dracaufeu');
  });

  it('removes all CSVs and completely purges master and history', () => {
    const csv = `Index,Nom,Forme,Pokemon,Sexe,PC,PV,Atq IV,Déf IV,Rés IV,IV Moyen,Niveau Min,Niveau Max,Attaque Rapide,Attaque Chargée,Attaque Chargée 2,Date Analyse,Date Attrapée,Poids,Taille,Chanceux,Obscur/Purifié,Favori,Poussières,Rang % (G),Rang # (G),Prod Stat (G),Coût Poussières (G),Coût Bonbon (G),Nom (G),Forme (G),Obs/Pur (G),Rang % (U),Rang # (U),Prod Stat (U),Coût Poussières (U),Coût Bonbon (U),Nom (U),Forme (U),Obs/Pur (U),Rang % (L),Rang # (L),Prod Stat (L),Coût Poussières (L),Coût Bonbon (L),Nom (L),Forme (L),Obs/Pur (L),Marqué pour Utilisation en PvP
1,Lixy,,403,♂,680,99,12,15,13,88.9,28.0,28.0,,,,"2025-04-24 15:59",18/12/2021,7.37kg,0.45m,1,0,0,4500,80.85%,785,95.55%,111000,223,Luxio,,0,,,,,,,,,,,,,,`;
    importAndMerge(csv, 'file.csv');
    expect(getMasterPokemon().length).toBe(1);

    const clearRes = removeAllCsvs();
    expect(clearRes.success).toBe(true);
    expect(clearRes.totalCount).toBe(0);
    expect(getMasterPokemon().length).toBe(0);
    expect(getImportHistory().length).toBe(0);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/csvManager.test.js`  
Expected: FAIL avec `removeCsvFile is not a function` et `removeAllCsvs is not a function`.

- [ ] **Step 3: Implement `removeAllCsvs` and `removeCsvFile` in `electron/services/csvManager.js`**

Ajouter et exporter les fonctions `removeAllCsvs` et `removeCsvFile` dans `electron/services/csvManager.js`, puis enregistrer les IPC dans `electron/main.js` et `electron/preload.js`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/csvManager.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/services/csvManager.js electron/main.js electron/preload.js tests/csvManager.test.js
git commit -m "feat(csv): add removeAllCsvs and removeCsvFile with auto-recalculation"
```

---

### Task 3: Détection du Statut XL pour le Méta (`electron/services/pvpokeCache.js`)

**Files:**
- Modify: `electron/services/pvpokeCache.js`
- Test: `tests/pvpokeCache.test.js`

**Interfaces:**
- Produces: `speciesStatsMap: { [speciesId]: { maxCp40: number } }` dans `getGamemasterPokemonMetadata()`.

- [ ] **Step 1: Write failing test in `tests/pvpokeCache.test.js`**

```javascript
  it('calculates max CP at level 40 for gamemaster species', async () => {
    const meta = await getGamemasterPokemonMetadata();
    expect(meta.speciesStatsMap).toBeDefined();
    // Medicham max CP at level 40 is ~1431 (< 1500 -> XL)
    if (meta.speciesStatsMap['medicham']) {
      expect(meta.speciesStatsMap['medicham'].maxCp40).toBeLessThan(1500);
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pvpokeCache.test.js`  
Expected: FAIL avec `speciesStatsMap is undefined`.

- [ ] **Step 3: Implement CP40 calculation in `getGamemasterPokemonMetadata`**

Calculer le CP max au niveau 40 pour chaque entrée Pokémon du Game Master ayant `baseStats`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pvpokeCache.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add electron/services/pvpokeCache.js tests/pvpokeCache.test.js
git commit -m "feat(pvpoke): compute level 40 max CP in gamemaster metadata for XL detection"
```

---

### Task 4: Séparation Obscurs, Arbre d'Évolution & Attaques Possédées (`src/composables/usePokemonMatcher.js`)

**Files:**
- Modify: `src/composables/usePokemonMatcher.js`
- Test: `tests/usePokemonMatcher.test.js`

**Interfaces:**
- Produces:
  - `item.meta.isShadow`: boolean
  - `item.meta.requiresXl`: boolean
  - `item.mine.mineMoves`: `{ fast, charged1, charged2 }`
  - `m.dexNumber` dans `matchups` et `counters`
  - Chaîne `buildEvolutionLine` strictement obscure si la cible est obscure.

- [ ] **Step 1: Write failing tests in `tests/usePokemonMatcher.test.js`**

Ajouter des tests vérifiant :
1. Un Pokémon méta obscur (`ninetales_shadow`) n'est jamais associé à un Goupix normal (`isShadow: false`).
2. Pour un classement obscur, `buildEvolutionLine` retourne des étapes obscures (`vulpix_shadow` ➔ `ninetales_shadow`) et n'affiche possédé que les spécimens obscurs.
3. Détection des attaques d'élite sur le spécimen possédé.
4. Présence de `dexNumber` pour les puces de matchups/contres.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/usePokemonMatcher.test.js`  
Expected: FAIL.

- [ ] **Step 3: Implement strict shadow isolation and move metadata in `usePokemonMatcher.js`**

- Mettre à jour `candidatesBySpecies` pour exiger `candidate.isShadow === isTargetShadow`.
- Mettre à jour `buildEvolutionLine` pour ajouter le suffixe `_shadow` aux étapes et nommer `Goupix (Obscur)`.
- Extraire `mineMoves` avec statut `isElite` sur chaque attaque possédée.
- Ajouter `dexNumber` aux objets `matchups` et `counters`.
- Ajouter `meta.requiresXl` basé sur `metadata.speciesStatsMap` et le cap de la ligue.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/usePokemonMatcher.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/composables/usePokemonMatcher.js tests/usePokemonMatcher.test.js
git commit -m "feat(matcher): strict shadow matching, shadow evolution chain, and mineMoves extraction"
```

---

### Task 5: Filtre Universel Bonbons XL (`src/stores/pokemonStore.js` & `src/components/SearchBar.vue`)

**Files:**
- Modify: `src/stores/pokemonStore.js`
- Modify: `src/components/SearchBar.vue`
- Test: `tests/pokemonStore.test.js`

**Interfaces:**
- `pokemonStore.excludeXl`: boolean, filtrant à la fois `item.mine?.requiresXl` et `item.meta.requiresXl`.

- [ ] **Step 1: Write failing test in `tests/pokemonStore.test.js`**

Vérifier que `displayedPokemon` exclut les Pokémon du méta nécessitant des bonbons XL même s'ils ne sont pas possédés.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/pokemonStore.test.js`  
Expected: FAIL.

- [ ] **Step 3: Update `displayedPokemon` getter in `src/stores/pokemonStore.js`**

```javascript
      if (state.excludeXl) {
        list = list.filter(item => {
          const mineRequiresXl = item.mine ? item.mine.requiresXl : false;
          const metaRequiresXl = item.meta.requiresXl || false;
          return !mineRequiresXl && !metaRequiresXl;
        });
      }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/pokemonStore.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/pokemonStore.js src/components/SearchBar.vue tests/pokemonStore.test.js
git commit -m "feat(filter): universal XL filter covering owned specimens and meta species"
```

---

### Task 6: Interface Utilisateur : Historique CSV (`CsvImporter.vue`) & Cartes Dépliées (`PokemonRow.vue`)

**Files:**
- Modify: `src/components/CsvImporter.vue`
- Modify: `src/components/PokemonRow.vue`
- Test: `tests/components/CsvImporter.test.js`
- Test: `tests/components/PokemonRow.test.js`

**Interfaces:**
- `CsvImporter.vue` : bouton « Tout effacer » avec dialogue modal + boutons 🗑️ par ligne d'historique.
- `PokemonRow.vue` :
  - Badge Obscur sur `item.meta.isShadow`.
  - Comparatif 2 colonnes d'attaques : Recommandées vs Actuelles de mon Pokémon avec badges `⭐ Élite`.
  - Puces de matchups/contres avec sprites (`PokemonSprite`) et noms français.
  - Suppression complète des badges CT.

- [ ] **Step 1: Write component tests for `CsvImporter.vue` and `PokemonRow.vue`**

Ajouter les cas de test vérifiant la présence du bouton de suppression CSV et le rendu des deux colonnes d'attaques sans badge CT.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/components/PokemonRow.test.js tests/components/CsvImporter.test.js`  
Expected: FAIL.

- [ ] **Step 3: Implement UI in `CsvImporter.vue` and `PokemonRow.vue`**

- Mettre à jour `CsvImporter.vue` avec le modal de confirmation, l'appel IPC `removeAllCsvs` et `removeCsvFile`, et la réactivité du store.
- Mettre à jour `PokemonRow.vue` avec la mise en page 2 colonnes d'attaques, les puces visuelles de matchups et le badge Obscur méta.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/components/PokemonRow.test.js tests/components/CsvImporter.test.js`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/CsvImporter.vue src/components/PokemonRow.vue tests/components/CsvImporter.test.js tests/components/PokemonRow.test.js
git commit -m "feat(ui): add CSV deletion controls, 2-column moves comparison, and visual matchup chips"
```

---

### Task 7: Intégration Complète, Vérification Globale & Relance de l'Application

**Files:**
- All modified files

- [ ] **Step 1: Run complete test suite**

Run: `npm test`  
Expected: All 14+ test suites pass with 65+ passing tests.

- [ ] **Step 2: Run production build**

Run: `npm run build`  
Expected: Build succeeds with 0 errors.

- [ ] **Step 3: Relaunch Electron application**

Relancer l'application en mode développement (`npm run electron:dev`).

- [ ] **Step 4: Commit and update walkthrough**

```bash
git add -A
git commit -m "chore: complete iteration 5 integration and verification"
```
