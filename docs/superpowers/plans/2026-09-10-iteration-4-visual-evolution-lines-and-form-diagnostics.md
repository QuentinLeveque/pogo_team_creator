# Implémentation : PoGo Team Creator — Itération 4
## Lignée d'Évolution Visuelle Dépliée & Diagnostic Détaillé des Formes Non Reconnues

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Afficher la lignée d'évolution complète avec sprites pixel et noms français dans la carte dépliée pour tous les Pokémon (possédés et non possédés), mettre en valeur les spécimens possédés en stock, et enrichir la modale des formes non reconnues d'un tableau diagnostique détaillé avec action rapide pour ignorer les formes cosmétiques.

**Architecture:**
- `nameTranslator.js` gère le suffixe vide `""` pour mapper explicitement une mention de forme PokéGenie vers la forme standard de base sans suffixe.
- `usePokemonMatcher.js` génère pour chaque Pokémon classé sa `evolutionLine` chronologique (`[Base ➔ Intermédiaire ➔ Cible]`), détecte la présence de spécimens possédés pour chaque stade, et agrège les `unmatchedFormDetails` (nom français, sprite, forme brute, identifiant PvPoke avec underscore).
- `PokemonRow.vue` intègre dans la vue dépliée le composant horizontal de lignée d'évolution avec sprites, noms, flèches `➔`, badges `En stock` et halo `Cible Ligue`.
- `FormMappingEditor.vue` affiche le tableau diagnostique interactif avec bouton direct `⚡ Forme standard (sans suffixe)`.

**Tech Stack:** Vue 3 (Composition API), Pinia, Electron, Vite, Vitest, CSS Vanilla (palette claire `#FAFBFC`).

**Spec:** [2026-09-10-iteration-4-visual-evolution-lines-and-form-diagnostics-design.md](file:///home/quentin/Documents/script/pogo_team_creator/docs/superpowers/specs/2026-09-10-iteration-4-visual-evolution-lines-and-form-diagnostics-design.md)

## Global Constraints

- Fonctionnement 100% hors-ligne pour tous les visuels (sprites pixel locaux `/sprites/${dex}.png`).
- Thème d'interface strictement clair (`#FAFBFC`, texte `#1A202C`, bordures `#E2E8F0`).
- Sens chronologique naturel dans la carte dépliée : `[Base] ➔ [Intermédiaire] ➔ [Cible finale]`.
- Conservation de la chaîne textuelle inverse concise `🌱 Florizarre ⇽ Herbizarre ⇽ Bulbizarre` sur la carte non dépliée.
- Préservation de la couverture complète des tests Vitest (55 tests actuels + nouveaux tests).

---

### Task 1: Prise en Compte du Suffixe Vide (`""`) dans `nameTranslator.js`

**Files:**
- Modify: `electron/services/nameTranslator.js`
- Modify: `tests/nameTranslator.test.js`

**Interfaces:**
- Consumes: `toSpeciesId(frenchName, form, isShadow, customForms)`
- Produces: quand `customForms[form] === ""` (forme standard ignorée) :
  - `id`: identifiant de l'espèce de base sans suffixe (ex. `'pikachu'`)
  - `unmatched`: `false`
  - `unmatchedForm`: `null`

- [ ] **Step 1: Écrire le test unitaire pour le suffixe vide dans `tests/nameTranslator.test.js`**

Dans `tests/nameTranslator.test.js`, ajouter :

```javascript
it('treats an empty string customForm as an explicit standard base form mapping', () => {
  const result = toSpeciesId('Pikachu', "Costume d'Halloween", false, {
    "Costume d'Halloween": ''
  });

  expect(result.unmatched).toBe(false);
  expect(result.unmatchedForm).toBeNull();
  expect(result.id).toBe('pikachu');
});
```

- [ ] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/nameTranslator.test.js`  
Résultat attendu : FAIL car actuellement `combinedForms[trimmedForm] !== undefined` concatène `_${suffix}` si `suffix` existe, mais si `suffix === ''`, il faut s'assurer qu'aucun suffixe n'est ajouté et que `unmatched` reste `false`.

- [ ] **Step 3: Mettre à jour `toSpeciesId` dans `electron/services/nameTranslator.js`**

Dans `electron/services/nameTranslator.js` :
```javascript
  if (form && form.trim() !== '' && form.trim() !== 'Normale') {
    const trimmedForm = form.trim();
    if (combinedForms[trimmedForm] !== undefined) {
      const suffix = combinedForms[trimmedForm];
      if (suffix && suffix.trim() !== '') {
        id += `_${suffix.trim().toLowerCase()}`;
      }
      // Si suffix === '', c'est explicitement la forme standard de base -> aucun suffixe ajouté, unmatched = false
    } else {
      unmatched = true;
      unmatchedForm = trimmedForm;
    }
  }
```

- [ ] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/nameTranslator.test.js`  
Résultat attendu : PASS.

- [ ] **Step 5: Commiter les changements**

```bash
git add electron/services/nameTranslator.js tests/nameTranslator.test.js
git commit -m "feat(translator): support empty suffix mapping to treat custom forms as standard base form"
```

---

### Task 2: Construction de la Lignée d'Évolution Chronologique (`evolutionLine`) dans `usePokemonMatcher.js`

**Files:**
- Modify: `src/composables/usePokemonMatcher.js`
- Modify: `tests/usePokemonMatcher.test.js`

**Interfaces:**
- Consumes: `speciesId`, `familyMap`, `speciesDexMap`, `customForms`, `masterList`, `ownedCandidatesBySpecies`, `league`
- Produces: `meta.evolutionLine: EvolutionStage[]` où chaque élément possède :
  - `speciesId: string`
  - `dexNumber: number`
  - `nameFr: string`
  - `isTarget: boolean`
  - `isOwned: boolean`
  - `ownedCandidate?: { name, ivRankPercent, ivRankNumber, ivAverage, isCurrent }`

- [ ] **Step 1: Écrire le test unitaire pour `evolutionLine` dans `tests/usePokemonMatcher.test.js`**

Dans `tests/usePokemonMatcher.test.js`, ajouter :

```javascript
it('builds chronological evolutionLine with sprites, names and ownership details for both owned and unowned stages', () => {
  // L'utilisateur possède un Bulbizarre rang 99.5%
  const masterList = [
    {
      Nom: 'Bulbizarre', Forme: '', 'Nom (G)': 'Florizarre', 'Forme (G)': 'Normale',
      'Atq IV': '0', 'Déf IV': '14', 'Rés IV': '15',
      'Rang % (G)': '99.5%', 'Rang # (G)': '12', 'Coût Poussières (G)': '125000', 'Coût Bonbon (G)': '124',
      'Niveau Min': '10.0', 'Date Attrapée': '2025-02-01', PC: '500'
    }
  ];

  const rankings = [
    {
      speciesId: 'venusaur',
      speciesName: 'Venusaur',
      score: 91,
      moveset: ['VINE_WHIP', 'FRENZY_PLANT']
    }
  ];

  const speciesDexMap = { venusaur: 3, ivysaur: 2, bulbasaur: 1 };
  const familyMap = {
    venusaur: { id: 'FAMILY_BULBASAUR', parent: 'ivysaur' },
    ivysaur: { id: 'FAMILY_BULBASAUR', parent: 'bulbasaur' },
    bulbasaur: { id: 'FAMILY_BULBASAUR' }
  };

  const { matched } = matchPokemon(masterList, rankings, '1500', {}, {}, { speciesDexMap, familyMap });
  const venusaur = matched[0];

  expect(venusaur.meta.evolutionLine).toBeDefined();
  expect(venusaur.meta.evolutionLine.length).toBe(3);

  // Ordre chronologique naturel : Bulbizarre ➔ Herbizarre ➔ Florizarre
  const [stage1, stage2, stage3] = venusaur.meta.evolutionLine;

  expect(stage1.speciesId).toBe('bulbasaur');
  expect(stage1.nameFr).toBe('Bulbizarre');
  expect(stage1.dexNumber).toBe(1);
  expect(stage1.isTarget).toBe(false);
  expect(stage1.isOwned).toBe(true);
  expect(stage1.ownedCandidate.ivRankPercent).toBe(99.5);

  expect(stage2.speciesId).toBe('ivysaur');
  expect(stage2.nameFr).toBe('Herbizarre');
  expect(stage2.dexNumber).toBe(2);
  expect(stage2.isTarget).toBe(false);
  expect(stage2.isOwned).toBe(false);

  expect(stage3.speciesId).toBe('venusaur');
  expect(stage3.nameFr).toBe('Florizarre');
  expect(stage3.dexNumber).toBe(3);
  expect(stage3.isTarget).toBe(true);
});
```

- [ ] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/usePokemonMatcher.test.js`  
Résultat attendu : FAIL car `evolutionLine` n'existe pas encore sur `meta`.

- [ ] **Step 3: Implémenter `buildEvolutionLine` dans `src/composables/usePokemonMatcher.js`**

1. Créer la fonction `buildEvolutionLine(speciesId, familyMap, speciesDexMap, customForms, ownedCandidatesBySpecies, masterList, league)` :
   - Remonte la chaîne des parents : `curr = speciesId`, tant que `parent` existe, empiler `curr`.
   - Inverser le tableau pour aller de la base vers la cible : `allIds = [base, ..., intermediate, target]`.
   - Pour chaque `id` de la chaîne :
     - Résoudre `dexNumber`: `speciesDexMap[id] || speciesDexMap[id.replace(/_shadow$/, '')] || 0`.
     - Résoudre `nameFr`: `speciesIdToFrench(id, customForms).frenchName`.
     - Déterminer `isTarget`: `id === speciesId`.
     - Déterminer `isOwned`: vérifier si `ownedCandidatesBySpecies.has(id)` ou rechercher dans `masterList` les spécimens dont `row['Nom'] === nameFr`.
     - Construire `ownedCandidate` avec les stats de rang (`ivRankPercent`, `ivRankNumber`, `ivAverage`).
2. Attacher `evolutionLine` dans l'objet `meta` retourné dans `rankings.map(...)`.

- [ ] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/usePokemonMatcher.test.js`  
Résultat attendu : PASS.

- [ ] **Step 5: Commiter les changements**

```bash
git add src/composables/usePokemonMatcher.js tests/usePokemonMatcher.test.js
git commit -m "feat(matcher): construct chronological evolutionLine with sprites and ownership details"
```

---

### Task 3: Diagnostic Détaillé des Formes (`unmatchedFormDetails`) dans `usePokemonMatcher.js` & Stores

**Files:**
- Modify: `src/composables/usePokemonMatcher.js`
- Modify: `src/stores/appStore.js`
- Modify: `src/stores/pokemonStore.js`
- Modify: `tests/usePokemonMatcher.test.js`

**Interfaces:**
- Produces:
  - `unmatchedFormDetails: Array<{ rawForm: string, pokemonNameFr: string, dexNumber: number, generatedId: string, count: number }>`
  - `appStore.unmatchedFormDetails`

- [ ] **Step 1: Écrire le test unitaire pour `unmatchedFormDetails` dans `tests/usePokemonMatcher.test.js`**

Dans `tests/usePokemonMatcher.test.js`, ajouter :

```javascript
it('collects detailed unmatchedFormDetails with pokemon name, dexNumber and generatedId with underscores', () => {
  const masterList = [
    { Nom: 'Pikachu', Forme: 'Costume Fête', Pokemon: '25', PC: '300' },
    { Nom: 'Pikachu', Forme: 'Costume Fête', Pokemon: '25', PC: '400' },
    { Nom: 'Kyurem', Forme: 'Forme Bizarre', Pokemon: '646', PC: '2000' }
  ];

  const speciesDexMap = { pikachu: 25, kyurem: 646 };
  const { unmatchedFormDetails } = matchPokemon(masterList, [], '1500', {}, {}, { speciesDexMap });

  expect(unmatchedFormDetails).toBeDefined();
  expect(unmatchedFormDetails.length).toBe(2);

  const pikachuDetail = unmatchedFormDetails.find(d => d.pokemonNameFr === 'Pikachu');
  expect(pikachuDetail).toBeDefined();
  expect(pikachuDetail.rawForm).toBe('Costume Fête');
  expect(pikachuDetail.dexNumber).toBe(25);
  expect(pikachuDetail.generatedId).toBe('pikachu_costume_fete');
  expect(pikachuDetail.count).toBe(2);

  const kyuremDetail = unmatchedFormDetails.find(d => d.pokemonNameFr === 'Kyurem');
  expect(kyuremDetail).toBeDefined();
  expect(kyuremDetail.rawForm).toBe('Forme Bizarre');
  expect(kyuremDetail.dexNumber).toBe(646);
  expect(kyuremDetail.generatedId).toBe('kyurem_forme_bizarre');
  expect(kyuremDetail.count).toBe(1);
});
```

- [ ] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/usePokemonMatcher.test.js`  
Résultat attendu : FAIL car `unmatchedFormDetails` n'est pas encore retourné.

- [ ] **Step 3: Implémenter la collecte des détails dans `usePokemonMatcher.js` et brancher dans `appStore` / `pokemonStore`**

1. Dans `src/composables/usePokemonMatcher.js` :
   - Maintenir une Map `unmatchedDetailsMap = new Map();` indexée par `${rawNom}_${fVal}`.
   - Calculer l'identifiant avec underscore :
     ```javascript
     const baseFrIndex = frNames.findIndex(n => n.toLowerCase() === rawNom.trim().toLowerCase());
     const enBase = baseFrIndex !== -1 ? enNames[baseFrIndex].toLowerCase().replace(/[^a-z0-9]/g, '_') : rawNom.toLowerCase();
     const formSuffix = fVal.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
     const generatedId = `${enBase}_${formSuffix}`;
     ```
   - Remplir ou incrémenter le compteur :
     ```javascript
     const key = `${rawNom}__${fVal}`;
     if (!unmatchedDetailsMap.has(key)) {
       const dexNumber = parseInt(row['Pokemon'], 10) || (metadata?.speciesDexMap && metadata.speciesDexMap[enBase]) || 0;
       unmatchedDetailsMap.set(key, {
         rawForm: fVal,
         pokemonNameFr: rawNom,
         dexNumber,
         generatedId,
         count: 1
       });
     } else {
       unmatchedDetailsMap.get(key).count++;
     }
     ```
   - Retourner `unmatchedFormDetails: Array.from(unmatchedDetailsMap.values())`.
2. Dans `src/stores/appStore.js` :
   - Ajouter `unmatchedFormDetails: []` dans le state.
3. Dans `src/stores/pokemonStore.js` :
   - Attribuer `appStore.unmatchedFormDetails = unmatchedFormDetails || [];` dans `loadData()`.

- [ ] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/usePokemonMatcher.test.js`  
Résultat attendu : PASS.

- [ ] **Step 5: Commiter les changements**

```bash
git add src/composables/usePokemonMatcher.js src/stores/appStore.js src/stores/pokemonStore.js tests/usePokemonMatcher.test.js
git commit -m "feat(diagnostics): collect detailed unmatchedFormDetails with sprite, name, and generated underscore ID"
```

---

### Task 4: Tableau Diagnostique Interactif dans `FormMappingEditor.vue`

**Files:**
- Modify: `src/components/FormMappingEditor.vue`
- Modify: `tests/components/FormMappingEditor.test.js`

**Interfaces:**
- Consumes: `appStore.unmatchedFormDetails`, `appStore.customForms`
- Produces:
  - Tableau HTML avec colonnes Pokémon, Forme, ID généré, Action/Suffixe
  - Bouton `⚡ Forme standard (sans suffixe)` qui renseigne `inputMappings[form] = ""`
  - Sauvegarde via `window.electronAPI.saveForms`

- [ ] **Step 1: Écrire le test unitaire pour le tableau diagnostique dans `tests/components/FormMappingEditor.test.js`**

Dans `tests/components/FormMappingEditor.test.js`, ajouter :

```javascript
it('renders diagnostic table with pokemon info and allows setting empty standard form suffix', async () => {
  const appStore = useAppStore();
  appStore.isFormEditorOpen = true;
  appStore.unmatchedForms = ['Costume Fête'];
  appStore.unmatchedFormDetails = [
    {
      pokemonNameFr: 'Pikachu',
      rawForm: 'Costume Fête',
      dexNumber: 25,
      generatedId: 'pikachu_costume_fete',
      count: 3
    }
  ];

  window.electronAPI = {
    saveForms: vi.fn().mockResolvedValue({})
  };

  const wrapper = mount(FormMappingEditor);

  // Vérifier la présence du tableau diagnostique
  expect(wrapper.find('.diagnostic-table').exists()).toBe(true);
  expect(wrapper.text()).toContain('Pikachu');
  expect(wrapper.text()).toContain('Costume Fête');
  expect(wrapper.text()).toContain('pikachu_costume_fete');
  expect(wrapper.text()).toContain('3 ex.');

  // Clic sur le bouton action rapide "Forme standard"
  const standardBtn = wrapper.find('.standard-form-btn');
  expect(standardBtn.exists()).toBe(true);
  await standardBtn.trigger('click');

  // Sauvegarder
  await wrapper.find('.save-btn').trigger('click');
  expect(window.electronAPI.saveForms).toHaveBeenCalledWith({
    'Costume Fête': ''
  });
});
```

- [ ] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/components/FormMappingEditor.test.js`  
Résultat attendu : FAIL car `.diagnostic-table` et `.standard-form-btn` n'existent pas encore.

- [ ] **Step 3: Implémenter le tableau diagnostique dans `src/components/FormMappingEditor.vue`**

1. Remplacer la liste simple par le tableau structuré `.diagnostic-table` :
   - En-tête : `Pokémon`, `Forme CSV`, `ID PvPoke calculé`, `Suffixe PvPoke`.
   - Corps : boucler sur `appStore.unmatchedFormDetails` (ou fallback sur `appStore.unmatchedForms` si vide).
   - Pour chaque ligne :
     - Cellule Pokémon : composant `<PokemonSprite :dex-number="detail.dexNumber" />` + nom français + badge count `(3 ex.)`.
     - Cellule Forme : badge neutre avec `detail.rawForm`.
     - Cellule ID généré : `<code>{{ detail.generatedId }}</code>`.
     - Cellule Action : bouton `standard-form-btn` avec libellé `⚡ Forme standard` + champ texte `inputMappings[detail.rawForm]`.
2. Fonction `setStandardForm(formName)` :
   `inputMappings[formName] = '';`
3. Dans `save()` :
   Permettre l'enregistrement de `patch[form] = ""` pour les formes explicitement sans suffixe.
4. Styliser le tableau avec bordures fines, typographie soignée et alignements propres.

- [ ] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/components/FormMappingEditor.test.js`  
Résultat attendu : PASS.

- [ ] **Step 5: Commiter les changements**

```bash
git add src/components/FormMappingEditor.vue tests/components/FormMappingEditor.test.js
git commit -m "feat(ui): add diagnostic table with quick standard form action in FormMappingEditor"
```

---

### Task 5: Lignée d'Évolution Visuelle Dépliée dans `PokemonRow.vue`

**Files:**
- Modify: `src/components/PokemonRow.vue`
- Modify: `tests/components/PokemonRow.test.js`

**Interfaces:**
- Consumes: `item.meta.evolutionLine`
- Produces:
  - Section `.evolution-chain-section` visible uniquement quand `isExpanded === true` et `evolutionLine.length > 1`.
  - Piste horizontale défilable avec chaque stade d'évolution : `<PokemonSprite>`, nom français, badge de statut (`🎯 Cible Ligue`, `✅ En stock`, `❌ Non possédé`), et séparateurs `➔`.

- [ ] **Step 1: Écrire le test unitaire pour la lignée d'évolution dépliée dans `tests/components/PokemonRow.test.js`**

Dans `tests/components/PokemonRow.test.js`, ajouter :

```javascript
it('displays visual evolution line with sprites, names and arrows when expanded', async () => {
  const itemWithEvolutionLine = {
    meta: {
      speciesId: 'venusaur',
      dexNumber: 3,
      nameFr: 'Florizarre',
      score: 91,
      rank: 8,
      types: ['Plante', 'Poison'],
      evolutionLine: [
        {
          speciesId: 'bulbasaur',
          dexNumber: 1,
          nameFr: 'Bulbizarre',
          isTarget: false,
          isOwned: true,
          ownedCandidate: { name: 'Bulbizarre', ivRankPercent: 99.2, ivRankNumber: 15 }
        },
        {
          speciesId: 'ivysaur',
          dexNumber: 2,
          nameFr: 'Herbizarre',
          isTarget: false,
          isOwned: false
        },
        {
          speciesId: 'venusaur',
          dexNumber: 3,
          nameFr: 'Florizarre',
          isTarget: true,
          isOwned: true
        }
      ],
      recommendedMoveset: { fast: {}, charged: [] },
      matchups: [],
      counters: []
    },
    mine: {
      dexNumber: 3,
      name: 'Florizarre',
      ivRankPercent: 88.0,
      uniqueKey: 'k1'
    }
  };

  const wrapper = mount(PokemonRow, {
    props: { item: itemWithEvolutionLine }
  });

  // Quand la carte est fermée : pas de lignée visuelle dépliée
  expect(wrapper.find('.evolution-chain-section').exists()).toBe(false);

  // Déplier la carte
  await wrapper.find('.row-header').trigger('click');
  expect(wrapper.find('.evolution-chain-section').exists()).toBe(true);

  // Vérifier la présence des 3 stades avec noms et sprites
  const stageCards = wrapper.findAll('.stage-card');
  expect(stageCards.length).toBe(3);

  expect(stageCards[0].text()).toContain('Bulbizarre');
  expect(stageCards[0].text()).toContain('En stock');
  expect(stageCards[0].text()).toContain('99.2%');

  expect(stageCards[1].text()).toContain('Herbizarre');
  expect(stageCards[1].text()).toContain('Non possédé');

  expect(stageCards[2].text()).toContain('Florizarre');
  expect(stageCards[2].text()).toContain('Cible Ligue');

  // Vérifier la présence des flèches
  const arrows = wrapper.findAll('.stage-arrow');
  expect(arrows.length).toBe(2);
});
```

- [ ] **Step 2: Exécuter le test pour vérifier son échec**

Exécuter : `npx vitest run tests/components/PokemonRow.test.js`  
Résultat attendu : FAIL car `.evolution-chain-section` n'existe pas encore.

- [ ] **Step 3: Implémenter la section de lignée d'évolution dans `src/components/PokemonRow.vue`**

1. Dans `src/components/PokemonRow.vue`, dans `.expanded-details`, insérer la section `.evolution-chain-section` :
   ```html
   <div
     v-if="item.meta.evolutionLine && item.meta.evolutionLine.length > 1"
     class="evolution-chain-section"
   >
     <h4>Lignée d'évolution</h4>
     <div class="evolution-stages-track">
       <template v-for="(stage, idx) in item.meta.evolutionLine" :key="stage.speciesId">
         <div :class="['stage-card', { 'is-target': stage.isTarget, 'is-owned': stage.isOwned }]">
           <PokemonSprite :dex-number="stage.dexNumber" :alt="stage.nameFr" class="stage-sprite" />
           <div class="stage-info">
             <span class="stage-name">{{ stage.nameFr }}</span>
             <span v-if="stage.isTarget" class="badge-target">🎯 Cible Ligue #{{ item.meta.rank }}</span>
             <span v-else-if="stage.isOwned && stage.ownedCandidate" class="badge-owned">
               ✅ En stock ({{ stage.ownedCandidate.ivRankPercent ? `Rang ${stage.ownedCandidate.ivRankPercent.toFixed(1)}%` : `IV ${stage.ownedCandidate.ivAverage?.toFixed(1)}%` }})
             </span>
             <span v-else class="badge-missing">❌ Non possédé</span>
           </div>
         </div>
         <span v-if="idx < item.meta.evolutionLine.length - 1" class="stage-arrow">➔</span>
       </template>
     </div>
   </div>
   ```
2. Styliser `.evolution-chain-section`, `.evolution-stages-track`, `.stage-card`, `.stage-arrow`, et les badges.

- [ ] **Step 4: Exécuter le test pour vérifier son succès**

Exécuter : `npx vitest run tests/components/PokemonRow.test.js`  
Résultat attendu : PASS.

- [ ] **Step 5: Commiter les changements**

```bash
git add src/components/PokemonRow.vue tests/components/PokemonRow.test.js
git commit -m "feat(ui): add visual evolution line with sprites, names and badges in expanded PokemonRow"
```

---

### Task 6: Validation Globale, Tests d'Intégration & Build

**Files:**
- Modify: `tests/integration.test.js`
- Test: ensemble des suites de test (`npm test`)
- Build: validation du bundle Vite (`npm run build`)

- [ ] **Step 1: Mettre à jour `tests/integration.test.js` pour valider `evolutionLine` et `unmatchedFormDetails`**

Dans `tests/integration.test.js`, ajouter la validation de `evolutionLine` sur les données de jeu réel.

- [ ] **Step 2: Exécuter l'ensemble de la suite de tests**

Exécuter : `npm test`  
Résultat attendu : 100% de réussite sur toutes les suites (59+ tests).

- [ ] **Step 3: Tester le build de production**

Exécuter : `npm run build`  
Résultat attendu : Build sans erreur.

- [ ] **Step 4: Commiter et finaliser**

```bash
git add tests/integration.test.js
git commit -m "test: update integration tests for iteration 4 evolution line and diagnostics"
```
