# Spécification de Conception : Itération 5 - Gestion CSV, Séparation Obscurs, Refonte des Attaques & Matchups Visuels

Date : 2026-09-10  
Statut : Proposition validée  
Branche cible : `main`

---

## 1. Objectifs & Vue d'ensemble

Cette cinquième itération apporte des améliorations majeures d'ergonomie, de cohérence des données compétitives et de complétude :

1. **Gestion avancée des CSV** :
   - Possibilité de supprimer un fichier CSV spécifique depuis l'historique des imports avec reconstitution automatique et sans perte de la collection depuis les fichiers restants.
   - Bouton « Tout effacer » pour réinitialiser complètement la collection et purger les archives.
2. **Refonte des Attaques dans la carte dépliée** :
   - Comparaison claire en 2 colonnes : **Recommandées (PvPoke)** vs **Actuelles de mon Pokémon**.
   - Affichage des badges `⭐ Élite` sur les attaques recommandées ET sur les attaques actuelles du Pokémon lorsqu'il s'agit d'attaques d'élite.
   - Suppression définitive des badges obsolètes « CT requise », « CT d'élite requise » et « ✓ Connue ».
3. **Correction de la cohérence des Pokémon Obscurs (ex: Feunard / Goupix)** :
   - Affichage d'un badge violet distinctif **Obscur** sur la ligne du méta dès que l'espèce classée est obscure (ex: `ninetales_shadow`), indépendamment de sa possession.
   - Cloisonnement strict dans le matching et l'arbre d'évolution : un méta Obscur ne peut être associé qu'à des spécimens Obscurs (un Goupix normal ou purifié ne peut jamais être rattaché à Feunard Obscur).
4. **Matchups Clés visuels** :
   - Remplacement des listes textuelles brutes de victoires et contres par des cartes/puces interactives présentant le sprite miniature du Pokémon adverse (`PokemonSprite`) et son nom français.
5. **Filtre Bonbons XL universel** :
   - Le bouton unique « 🔷 Sans bonbons XL » filtre désormais à la fois les spécimens possédés nécessitant des XL et les Pokémon du méta nécessitant d'être propulsés au-delà du niveau 40 pour atteindre le plafond de la ligue.
6. **Dictionnaire exhaustif des Attaques** :
   - Traduction française officielle des 350 attaques répertoriées dans le Game Master de Pokémon GO.

---

## 2. Architecture Technique & Modifications Détaillées

### 2.1. Backend CSV (`electron/services/csvManager.js` & IPC)

#### Nouvelles fonctions
```javascript
// Supprime tous les fichiers CSV archivés et réinitialise la collection
function removeAllCsvs() {
  const history = getImportHistory();
  for (const entry of history) {
    const filePath = path.join(originalsDir, entry.storedFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  fs.writeFileSync(masterPath, JSON.stringify([], null, 2), 'utf-8');
  fs.writeFileSync(historyPath, JSON.stringify([], null, 2), 'utf-8');
  return { success: true, totalCount: 0, history: [] };
}

// Supprime un CSV particulier et reconstruit master.json à partir des CSV restants
function removeCsvFile(historyId) {
  const history = getImportHistory();
  const index = history.findIndex(h => h.id === historyId);
  if (index === -1) {
    throw new Error(`Entrée d'historique non trouvée : ${historyId}`);
  }

  const target = history[index];
  const targetPath = path.join(originalsDir, target.storedFilename);
  if (fs.existsSync(targetPath)) {
    fs.unlinkSync(targetPath);
  }

  history.splice(index, 1);
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');

  // Reconstitution de master.json depuis les fichiers restants
  const newMaster = [];
  const existingKeys = new Set();

  for (const entry of history) {
    const filePath = path.join(originalsDir, entry.storedFilename);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = parsePokeGenieCsv(content);
      if (parsed.valid) {
        for (const item of parsed.data) {
          const key = getUniqueKey(item);
          if (!existingKeys.has(key)) {
            newMaster.push(item);
            existingKeys.add(key);
          }
        }
      }
    }
  }

  fs.writeFileSync(masterPath, JSON.stringify(newMaster, null, 2), 'utf-8');
  return { success: true, totalCount: newMaster.length, history };
}
```

#### Canaux IPC associés (`electron/main.js` & `electron/preload.js`)
- `ipcMain.handle('csv:removeAll', () => removeAllCsvs());`
- `ipcMain.handle('csv:removeFile', (e, historyId) => removeCsvFile(historyId));`
- Expositions dans `preload.js` :
  - `removeAllCsvs: () => ipcRenderer.invoke('csv:removeAll')`
  - `removeCsvFile: (historyId) => ipcRenderer.invoke('csv:removeFile', historyId)`

---

### 2.2. Détection du Méta XL (`electron/services/pvpokeCache.js`)

Pour déterminer si une espèce méta nécessite des bonbons XL, nous calculons son CP théorique max au niveau 40 ($\text{IV} = 15/15/15, \text{CPM}_{40} = 0.7903001$) :
$$\text{CP}_{40} = \left\lfloor \frac{(\text{baseAtk} + 15) \times \sqrt{\text{baseDef} + 15} \times \sqrt{\text{baseHp} + 15} \times (0.7903001)^2}{10} \right\rfloor$$

- Pour la Ligue 1500 : `requiresXl = cp40 < 1500` (ex: Azumarill $\approx 1500$, Méditikka/Charmina, Bastiodon, Ténéfix, etc.).
- Pour la Ligue 2500 : `requiresXl = cp40 < 2500` (ex: Flambusard, Mygavolt, Noctali, Vaututrice, etc.).
- Pour la Ligue 10000 (Master) : Aucun Pokémon n'est plafonné par 10000, le filtre ne s'applique pas au niveau du méta ou s'applique si niveau > 40.
- `pvpokeCache.js` exporte `speciesStatsMap: { [speciesId]: { maxCp40 } }` dans `getGamemasterPokemonMetadata()`.

---

### 2.3. Logique de Matching & Obscurs (`src/composables/usePokemonMatcher.js`)

#### 1. Séparation stricte des Pokémon Obscurs
```javascript
// Lors du rassemblement des candidats par speciesId :
// speciesId se termine par _shadow <==> candidat.isShadow === true
const isTargetShadow = speciesId.endsWith('_shadow');
if (isTargetShadow !== Boolean(candidate.isShadow)) {
  continue; // Élimine les non-obscurs pour une cible obscure, et vice versa
}
```

#### 2. Ligne d'évolution pour espèce Obscure (`buildEvolutionLine`)
- Si `speciesId.endsWith('_shadow')` :
  - Chaque `stageId` parent de la chaîne reçoit le suffixe `_shadow` pour la recherche de spécimens possédés :
    `const stageLookupId = isTargetShadow && !stageId.endsWith('_shadow') ? `${stageId}_shadow` : stageId;`
  - La recherche de spécimen possédé interroge `ownedByCurrentSpecies.get(stageLookupId)`.
  - Le libellé du nom affiche `frenchName + " (Obscur)"`.
  - Le maillon porte `isShadow: true` pour activer le badge et le contour violet.

#### 3. Extraction des attaques possédées et statut Élite
Pour chaque spécimen possédé :
```javascript
const eliteMoves = (eliteMovesMap && eliteMovesMap[speciesId]) || [];

function checkElite(moveNameFr) {
  if (!moveNameFr) return false;
  // Retrouve le moveId ou compare avec les attaques d'élite connues
  return eliteMoves.some(mId => {
    const fr = translateMove(mId);
    return fr && fr.toLowerCase() === moveNameFr.toLowerCase();
  });
}

const mineMoves = owned ? {
  fast: { nameFr: owned.fastMove, isElite: checkElite(owned.fastMove) },
  charged1: { nameFr: owned.chargedMove1, isElite: checkElite(owned.chargedMove1) },
  charged2: { nameFr: owned.chargedMove2 || 'Non débloquée', isElite: checkElite(owned.chargedMove2) }
} : null;
```

#### 4. Enrichissement des Matchups et Contres avec `dexNumber`
Dans `matchPokemon` :
```javascript
matchups: (ranking.matchups || []).map(m => {
  const oppInfo = speciesIdToFrench(m.opponent, customForms);
  const cleanOppId = m.opponent.replace(/_shadow$/, '');
  const dexNumber = (metadata?.speciesDexMap && (metadata.speciesDexMap[m.opponent] || metadata.speciesDexMap[cleanOppId])) || 0;
  return {
    opponent: m.opponent,
    opponentNameFr: oppInfo.frenchName || m.opponent,
    dexNumber,
    rating: m.rating
  };
})
```

---

### 2.4. Interface Utilisateur

#### 1. `CsvImporter.vue`
- En-tête de la liste d'historique :
  - Bouton rouge sobre « Tout effacer » avec icône 🗑️.
  - Confirmation par boîte de dialogue modale élégante.
- Lignes d'historique :
  - Colonne « Actions » avec bouton corbeille 🗑️ par fichier.
  - Confirmation par fichier : *"Supprimer {nom} et recalculer la collection ?"*.
  - Toast de succès et rafraîchissement réactif du store.

#### 2. `PokemonRow.vue`
- **Ligne Principale** :
  - Affiche `<span v-if="item.meta.isShadow" class="shadow-badge">Obscur</span>` à côté du nom méta.
- **Section Attaques Dépliée** :
  - Grille 2 colonnes responsive :
    - Colonne gauche : **Recommandées (PvPoke)**
      - ⚡ `fast.nameFr` + `<span v-if="fast.isElite" class="elite-pill">⭐ Élite</span>`
      - 💥 `charged[0].nameFr` + `<span v-if="isElite" class="elite-pill">⭐ Élite</span>`
      - 💥 `charged[1].nameFr` + `<span v-if="isElite" class="elite-pill">⭐ Élite</span>`
    - Colonne droite : **Actuelles de mon Pokémon**
      - Si `item.mine` présent :
        - ⚡ `mineMoves.fast.nameFr` + `<span v-if="isElite" class="elite-pill">⭐ Élite</span>`
        - 💥 `mineMoves.charged1.nameFr` + `<span v-if="isElite" class="elite-pill">⭐ Élite</span>`
        - 💥 `mineMoves.charged2.nameFr` + `<span v-if="isElite" class="elite-pill">⭐ Élite</span>`
      - Si non possédé : badge sobre gris *"Aucun spécimen possédé"*.
- **Section Matchups Clés Dépliée** :
  - Deux sous-sections : **Victoires clés** et **Contres clés**.
  - Chaque élément est une puce moderne :
    - Sprite miniature du Pokémon adverse (`<PokemonSprite :dex-number="m.dexNumber" />`).
    - Nom français du Pokémon.
    - Badging de couleur douce (vert pastel pour victoires, rouge pastel pour contres).

#### 3. `SearchBar.vue` & `pokemonStore.js`
- Filtre universel dans `pokemonStore.displayedPokemon` :
  ```javascript
  if (state.excludeXl) {
    list = list.filter(item => {
      const mineRequiresXl = item.mine ? item.mine.requiresXl : false;
      const metaRequiresXl = item.meta.requiresXl || false;
      return !mineRequiresXl && !metaRequiresXl;
    });
  }
  ```

---

### 2.5. Dictionnaire des Attaques (`src/data/moves.json`)
- Expansion exhaustive de `moves.json` avec l'ensemble des 350 attaques traduites en français Pokémon officiel (ex: `COUNTER` ➔ `Riposte`, `SHADOW_BALL` ➔ `Ball'Ombre`, `FRENZY_PLANT` ➔ `Végé-Attaque`, `HYDRO_CANNON` ➔ `Hydroblast`, `BLAST_BURN` ➔ `Rafale Feu`, `METEOR_MASH` ➔ `Poing Météore`, etc.).

---

## 3. Plan de Vérification & Tests

### Tests Automatisés (`vitest`)
1. **`tests/csvManager.test.js`** :
   - Test de `removeAllCsvs()` (vérifie la purge des fichiers et de l'historique).
   - Test de `removeCsvFile()` (vérifie la suppression d'un fichier et le recalcul correct des Pokémon issus des fichiers restants).
2. **`tests/usePokemonMatcher.test.js`** :
   - Test de matching strict des Pokémon Obscurs (Feunard Obscur ne match aucun Goupix normal, mais match un Goupix Obscur).
   - Test de l'arbre d'évolution pour cible obscure (`vulpix_shadow` ➔ `ninetales_shadow`).
   - Test de la détection des attaques d'élite sur le spécimen possédé.
   - Test de l'attribution des `dexNumber` pour les matchups clés.
3. **`tests/pokemonStore.test.js`** :
   - Test du filtre universel `excludeXl` excluant à la fois les spécimens possédés XL et les espèces méta XL.
4. **`tests/components/PokemonRow.test.js`** & **`tests/components/CsvImporter.test.js`** :
   - Validation du rendu des deux colonnes d'attaques, des puces de matchups avec sprites, et des boutons de suppression CSV.

### Vérification Manuelle
- Build de production complet (`npm run build`).
- Vérification interactive dans l'application Electron (`npm run electron:dev`).
