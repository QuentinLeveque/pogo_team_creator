# Spécification de Conception : PoGo Team Creator — Itération 2

**Date** : 2026-09-09  
**Statut** : Validé par l'utilisateur  
**Auteur** : Quentin Leveque & Antigravity  
**Branche cible** : `feature/iteration-2-improvements` (ou `main`)

---

## 1. Vue d'ensemble & Objectifs

L'objectif de cette seconde itération est de perfectionner l'expérience utilisateur et la pertinence stratégique de l'application desktop **PoGo Team Creator** suite aux premiers retours d'utilisation.

### Améliorations clés :
1. **Historique des imports CSV précis** : Distinguer clairement le nombre total de Pokémon scannés dans un fichier CSV du nombre de nouveaux Pokémon effectivement ajoutés à la collection (`1 852 au total · +1 176 ajoutés`).
2. **Gestion optimisée du cache PvPoke** : Télécharger les classements et données de jeu uniquement au démarrage de l'application (ou lors d'un rafraîchissement manuel par l'utilisateur avec indicateur de progression), éliminant les requêtes réseau superflues.
3. **Identification des Attaques Legacy / d'Élite & Détection des Attaques Connues** :
   - Détecter si une attaque recommandée par PvPoke est une attaque d'Élite / Legacy via `eliteMoves` du GameMaster PvPoke.
   - Comparer les attaques recommandées aux attaques réellement possédées par le spécimen de l'utilisateur (`Attaque Rapide`, `Attaque Chargée`, `Attaque Chargée 2`).
   - Signaler visuellement si l'attaque est déjà connue (`✓ Connue`) ou nécessite une CT normale / CT d'Élite (`CT requise` / `CT Élite requise`).
4. **Vue réduite (carte Pokémon) enrichie** :
   - Sprite pixel 2D statique (style Pokémon Showdown / Gen 5).
   - Badge de forme régionale (Alola, Galar, Hisui, Paldea...) à côté du nom de l'espèce.
   - Badge `Évolution requise` si le spécimen doit être évolué pour atteindre la ligue cible.
   - Correction du libellé de statistique : afficher **`Rang: XX.X% #XX`** pour les ligues avec restriction de PC (Ligue Super, Hyper, Petite) et **`IV: XX.X%`** uniquement pour la Ligue Master.
   - Coûts en ressources immédiatement visibles sur la ligne réduite : Poussières (`✨`), Bonbons (`🍬`), Bonbons XL (`🔷`).
5. **Gestion intelligente de la déduplication : Priorité Spécimen Évolué vs Non-Évolué** :
   - Si l'utilisateur possède déjà le Pokémon sous sa forme évoluée finale (prêt au combat) ainsi qu'un spécimen non-évolué ayant un meilleur potentiel de rang PvP, afficher en priorité le spécimen déjà évolué pour préserver les ressources.
   - Afficher un avis informatif sur la ligne : `💡 Non-évolué disponible : [Nom] (Rang XX.X%)`.
   - En vue dépliée, proposer une comparaison côte-à-côte entre le spécimen actuel et le candidat non-évolué.
6. **Filtre « Sans bonbons XL »** :
   - Ajout d'un bouton à bascule dans la barre de recherche pour exclure les Pokémon nécessitant des bonbons XL.

---

## 2. Spécification Détaillée des Fonctionnalités

### 2.1 Historique des Fichiers CSV
* **Problématique** : L'affichage d'un unique nombre vert `+1 176` était ambigu (total du fichier vs nouveaux ajouts réels).
* **Solution** :
  * Le service de parsing CSV et le store `pokemonStore.js` calculent deux métriques par fichier importé :
    * `totalRows` : nombre total d'entrées Pokémon valides présentes dans le fichier CSV.
    * `addedCount` : nombre de Pokémon uniques ajoutés à la collection depuis cet import spécifique (après déduplication par clé unique).
  * Format d'affichage dans la liste des imports :
    `[Nom du fichier] — 1 852 au total · +1 176 ajoutés`
  * Si aucun nouveau Pokémon n'a été ajouté (fichier identique ou Pokémon déjà présents) :
    `[Nom du fichier] — 1 852 au total · 0 nouveau`

### 2.2 Cache PvPoke & Rafraîchissement Manuel
* **Au démarrage de l'application** :
  * `pvpokeCache.js` charge les fichiers de cache locaux situés dans `userData/pvpoke_cache/`.
  * Si le cache est absent ou vide, un téléchargement automatique est initié en tâche de fond.
  * Si le cache est présent, aucun appel réseau n'est émis au démarrage ni lors de la navigation entre les ligues.
* **Rafraîchissement manuel** :
  * Un bouton d'action avec icône de rafraîchissement est ajouté dans la barre latérale (`AppSidebar.vue`) avec le texte de tooltip « Rafraîchir les classements PvPoke ».
  * Lors du clic, l'IPC `pvpoke:refresh` télécharge les 4 classements (1500, 2500, 10000, 500) ainsi que `gamemaster.min.json`.
  * Un spinner d'animation indique l'avancement du rafraîchissement.
  * La date/heure de dernière mise à jour est mise à jour et affichée.

### 2.3 Extraction des Attaques d'Élite & Attaques Connues
* **Source de vérité des attaques d'élite** :
  * Le fichier `gamemaster.min.json` de PvPoke associe à chaque espèce un tableau `eliteMoves: string[]` (contenant les IDs en majuscules comme `["FRENZY_PLANT", "HYDRO_CANNON", "WING_ATTACK"]`).
  * `pvpokeCache.js` extrait et indexe cette information par espèce (`speciesId -> eliteMoves`).
* **Correspondance des attaques du spécimen** :
  * Le CSV PokeGenie fournit en français : `Attaque Rapide`, `Attaque Chargée`, `Attaque Chargée 2`.
  * Le fichier de traduction `src/data/moves.json` fait le pont entre les IDs PvPoke en anglais et les noms français.
  * Pour chaque attaque recommandée (`fastMove`, `chargedMoves`) :
    * `nameFr` : nom français de l'attaque.
    * `isElite` : `true` si l'attaque figure dans `eliteMoves` de l'espèce.
    * `isKnown` : `true` si le nom français de l'attaque correspond à l'une des attaques scannées du Pokémon.
* **Affichage visuel** :
  * Badge d'attaque :
    * Si connue : contour ou fond vert discret avec `✓` (ex: `✓ Fouet Lianes`).
    * Si inconnue mais attaque normale : badge neutre / orange avec `CT requise`.
    * Si inconnue et attaque d'Élite : badge d'avertissement avec étoile et `⭐ CT Élite requise`.
    * Si déjà connue et attaque d'Élite : badge d'honneur `⭐ Végé-Attaque (Élite) ✓`.

### 2.4 Composant Ligne Pokémon (`PokemonRow.vue`)

#### Vue Réduite (Collapsed)
1. **Sprite Pixel Statique** :
   * URL de base : `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dexNumber}.png` (ou sprite Showdown).
   * Dimensions : 48x48 px, rendu net (`image-rendering: pixelated`).
   * Fallback gracieux en cas d'absence d'image ou hors-ligne.
2. **Nom & Badges d'Espèce** :
   * Nom français de l'espèce.
   * Badge de forme si applicable : `Alola`, `Galar`, `Hisui`, `Paldea`, etc.
   * Badge `Obscur` si `isShadow === true`.
   * Badge `Évolution requise` (fond violet discret avec icône ➜) si le spécimen possédé n'est pas encore au stade final pour cette ligue.
3. **Avis Non-Évolué à Potentiel Supérieur** :
   * Si `betterUnevolvedCandidate` est présent :
     `💡 Meilleur candidat : Salameche (Rang 99.4% #25)`
4. **Indicateur de Statistique Corrigé** :
   * Ligues 500, 1500, 2500 : **`Rang: 98.4% #65`** (stat product rank).
   * Ligue 10000 : **`IV: 97.8% (15/14/15)`**.
5. **Coûts en Ressources** :
   * Affichage groupé et épuré :
     * `✨ [Poussières requises]` (formaté avec séparateur de milliers : `25 000`)
     * `🍬 [Bonbons requis]`
     * `🔷 [Bonbons XL requis]` (omis si 0)
6. **Attaques Recommandées & Statut** :
   * Affichage des 3 attaques avec leurs badges de statut (`isKnown`, `isElite`).

#### Vue Dépliée (Expanded)
* **Bloc Comparatif « Évolué possédé vs Non-évolué candidat »** :
  * Présenté sous forme de deux cartes côte-à-côte :
    * **Spécimen Actuel (Déjà évolué)** : CP actuel, Rang actuel, Coût d'amélioration (souvent faible ou nul).
    * **Candidat à Faire Évoluer** : Nom du stade de base, Rang supérieur, Coût complet (évolution + niveau + bonbons XL éventuels).
  * Permet à l'entraîneur de décider en connaissance de cause s'il souhaite investir ou jouer immédiatement son Pokémon existant.

### 2.5 Filtre « Sans bonbons XL » dans `SearchBar.vue`
* Un bouton à bascule stylisé `Sans bonbons XL` est positionné dans la barre d'outils.
* Lorsqu'il est actif :
  * Filtre toute entrée dont `xlCandyCost > 0` (ou dont le niveau cible pour la ligue dépasse le niveau 40).
  * État persistant ou synchronisé avec le store de filtres.

---

## 3. Schéma de Données & Types

### 3.1 Structure enrichie de `MatchedPokemon`
```typescript
interface RecommendedMoveInfo {
  moveId: string;
  nameFr: string;
  type: string;
  isFast: boolean;
  isElite: boolean;     // Présent dans eliteMoves de l'espèce
  isKnown: boolean;     // Déjà appris par ce spécimen spécifique
}

interface UnevolvedCandidateInfo {
  pokemon: ScannedPokemon;
  speciesName: string;
  rank: number;
  rankPercent: number;
  dustCost: number;
  candyCost: number;
  xlCandyCost: number;
  targetCp: number;
  targetLevel: number;
}

interface MatchedPokemon {
  speciesId: string;
  dexNumber: number;
  speciesName: string;
  form?: string;
  isShadow: boolean;
  pvpokeRank: number;
  pvpokeScore: number;
  specimen: ScannedPokemon;
  
  // Nouveaux champs d'arbitrage
  isAlreadyEvolved: boolean;
  needsEvolution: boolean;
  betterUnevolvedCandidate?: UnevolvedCandidateInfo;
  
  // Statistiques et coûts
  rank: number;
  rankPercent: number;
  dustCost: number;
  candyCost: number;
  xlCandyCost: number;
  requiresXl: boolean;
  
  // Attaques qualifiées
  fastMove: RecommendedMoveInfo;
  chargedMoves: RecommendedMoveInfo[];
}
```

### 3.2 Structure de l'historique d'import CSV
```typescript
interface CsvImportRecord {
  id: string;
  fileName: string;
  importedAt: string;
  totalRows: number;    // Total de spécimens valides dans le CSV
  addedCount: number;   // Nouveaux spécimens uniques ajoutés
}
```

---

## 4. Architecture & Flux de Données

1. **Import CSV** :
   `CsvUploader` ➔ `csvParser.js` :
   - Calcule `totalRows` du fichier.
   - Compare les clés uniques `getUniqueKey(p)` avec la collection existante pour déterminer `addedCount`.
   - Ajoute le record dans `pokemonStore.history`.
   - Fusionne les nouveaux Pokémon dans `pokemonStore.scannedPokemon`.

2. **Récupération des Données PvPoke** :
   - `pvpokeCache.js` (IPC Electron) stocke dans `gamemaster_cache.json` la table des `eliteMoves`.
   - Au démarrage ou lors du clic sur `Rafraîchir`, `pvpokeCache.refreshAll()` récupère les données distantes et les diffuse au renderer via `window.electronAPI.onPvPokeUpdated()`.

3. **Moteur de Matching (`usePokemonMatcher.js`)** :
   - Pour chaque Pokémon du classement PvPoke :
     - Recherche tous les spécimens correspondants de la boîte du joueur (y compris les pré-évolutions).
     - Groupe les candidats en :
       - `evolvedCandidates` (ceux dont le nom correspond à l'espèce finale).
       - `unevolvedCandidates` (pré-évolutions).
     - Sélectionne le meilleur candidat évolué s'il existe.
     - Si un candidat non-évolué possède un `rankPercent` strictement supérieur, l'attache en tant que `betterUnevolvedCandidate`.
     - Si aucun candidat évolué n'existe, sélectionne le meilleur candidat non-évolué et positionne `needsEvolution = true`.
     - Résout les attaques recommandées en vérifiant l'appartenance à `eliteMoves` et aux attaques actuelles du spécimen.

4. **Filtrage & Affichage (`PokemonList.vue` & `PokemonRow.vue`)** :
   - La liste applique les filtres : recherche textuelle, ligue, favoris, statut possédé/manquant, et désormais **`excludeXl`**.
   - `PokemonRow` affiche le sprite pixel, les badges de statut, les coûts en ressources et l'avis comparatif.

---

## 5. Gestion des Erreurs & Cas Limites

* **Spécimen sans attaques renseignées** (colonnes vides dans le CSV) : `isKnown` est positionné à `false` avec fallback propre sans planter.
* **Pokemon sans sprite pixel disponible** : Attribut `@error` sur l'image basculant automatiquement sur l'icône SVG Pokéball par défaut.
* **Pokémon n'ayant pas de bonbons XL requis** : La pastille XL est masquée ou affiche `0 XL` sans encombrer la carte.
* **Spécimen déjà évolué et aucun candidat non-évolué meilleur** : Pas d'avis affiché, comportement standard épuré.
* **Échec du rafraîchissement réseau PvPoke** : Notification d'erreur dans l'UI sans écraser les données locales déjà en cache.

---

## 6. Stratégie de Test & Critères d'Acceptation

### 6.1 Tests Unitaires (Vitest)
1. `tests/unit/csvParser.test.js` :
   - Valide le calcul de `totalRows` et `addedCount`.
   - Valide l'extraction des colonnes d'attaques et de coûts de ressources.
2. `tests/unit/usePokemonMatcher.test.js` :
   - Valide la priorité accordée à un spécimen déjà évolué.
   - Valide l'attachement de `betterUnevolvedCandidate` quand une pré-évolution a un rang plus élevé.
   - Valide la qualification des attaques (`isElite`, `isKnown`).
   - Valide le flag `requiresXl` et le calcul des coûts.
3. `tests/unit/PokemonRow.test.js` :
   - Valide le rendu du sprite pixel statique.
   - Valide le badge de forme et le badge d'évolution.
   - Valide l'affichage `Rang: XX.X% #XX` vs `IV: XX.X%`.
   - Valide l'affichage des badges de ressources et de statut d'attaques.
4. `tests/unit/SearchBar.test.js` :
   - Valide le basculement du filtre XL.

### 6.2 Critères d'Acceptation Visuels & Fonctionnels
* L'application affiche `1 852 au total · +1 176 ajoutés` lors de l'import du second CSV d'exemple.
* La ligne d'un Pokémon affiche son sprite pixel, ses badges de forme / évolution, ses coûts et le statut de ses attaques.
* Les Pokémon nécessitant des bonbons XL disparaissent lorsque le filtre « Sans bonbons XL » est enclenché.
* La comparaison côte-à-côte apparaît distinctement lors du dépliage d'un Pokémon possédant un meilleur non-évolué.
* Tous les tests unitaires passent à 100% (`npm test`).
