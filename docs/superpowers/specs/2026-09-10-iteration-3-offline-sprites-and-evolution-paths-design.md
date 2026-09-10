# Spécification de Conception : PoGo Team Creator — Itération 3

**Date** : 2026-09-10  
**Statut** : Validé par l'utilisateur  
**Auteur** : Quentin Leveque & Antigravity  
**Branche cible** : `main`

---

## 1. Vue d'ensemble & Objectifs

Cette troisième itération vise à rendre l'application **PoGo Team Creator** 100 % autonome et hors-ligne pour les visuels, à enrichir la vue méta avec les sprites de tous les Pokémon et la trajectoire de capture sauvage (chaîne d'évolution inversée), tout en épurant l'interface graphique selon les retours d'utilisation.

### Améliorations clés :
1. **Sprites 100% Locaux et Embarqués (Zéro Requête Réseau)** :
   - Embarquer l'ensemble des 1 025 sprites pixel art (Gen 1 à 9) directement dans le code source de l'application sous `public/sprites/{dex}.png` (~1.5 Mo au total).
   - Servir instantanément les images en local sans aucune requête externe vers GitHub ou PokeAPI.
2. **Affichage des Sprites pour Tous les Pokémon de la Méta** :
   - Extraire du `gamemaster.json` de PvPoke la table de correspondance `speciesId ➔ dexNumber`.
   - Garantir que chaque Pokémon dans la vue « Tous les Pokémon » (possédé ou non) possède son numéro Pokédex et affiche son sprite local.
3. **Chaîne d'Évolution Inverse sur les Cartes Non Possédées** :
   - Pour tout Pokémon de la méta non possédé issu d'une lignée évolutive (ex: *Florizarre*), afficher sa chaîne d'ascendance inversée vers le stade sauvage de base :
     `Florizarre ⇽ Herbizarre ⇽ Bulbizarre`
   - Permet à l'entraîneur de savoir immédiatement quel Pokémon chasser dans la nature (le stade de base à l'extrémité droite).
   - Masquer la chaîne si le Pokémon est déjà un stade de base (ex: *Airmure*, *Cresselia*).
4. **Modale des Formes Non Reconnues Précise** :
   - Conserver la bannière synthétique dans la barre latérale (`⚠ 2 Pokémon avec forme non reconnue`).
   - Dans la modale, afficher distinctement les **noms des Pokémon** qui ont déclenché l'avertissement (ex: `Deoxys`, `Necrozma`), permettant une vérification manuelle rapide.
5. **Épuration Visuelle des Cartes Pokémon** :
   - Supprimer définitivement la pastille textuelle `✅ Possédé`.
   - Supprimer la barre de progression horizontale grise située entre le numéro de rang et le score de combat.

---

## 2. Spécification Détaillée des Fonctionnalités

### 2.1 Embarquement des Sprites Locaux (`public/sprites/`)
* **Stockage** : Répertoire `public/sprites/` contenant les fichiers `{dex}.png` pour les numéros Pokédex 1 à 1025.
* **Résolution dans le composant `PokemonSprite.vue`** :
  * Chemin d'accès relatif : `/sprites/${dexNumber}.png`.
  * Rendu CSS : `image-rendering: pixelated;`.
  * Fallback gracieux en cas de numéro invalide ou d'image manquante vers l'icône SVG Pokéball existante.
* **Avantage immédiat** : Fonctionnement 100 % hors-ligne dès l'installation, sans aucun risque de limitation de débit (rate-limiting) ou de blocage réseau.

### 2.2 Table de Correspondance Pokédex & Généalogie (`gamemaster.json`)
* **Extraction des Numéros Pokédex** :
  * Le fichier `gamemaster.json` contient pour chaque espèce :
    ```json
    {
      "speciesId": "venusaur",
      "dex": 3,
      "family": {
        "id": "FAMILY_BULBASAUR",
        "parent": "ivysaur"
      }
    }
    ```
  * `pvpokeCache.js` extrait un dictionnaire `speciesDexMap: Record<string, number>` associant chaque `speciesId` à son `dex`.
  * Ce dictionnaire est transmis au renderer pour enrichir l'objet `meta.dexNumber` de chaque Pokémon, assurant l'affichage du sprite même lorsque `item.mine` est `null`.
* **Reconstitution de la Chaîne d'Ascendance Inverse** :
  * Une fonction `buildReverseEvolutionPath(speciesId, gamemasterPokemonMap, customForms)` :
    1. Si `pokemon.family.parent` est absent : le Pokémon est une forme de base, retourne `null`.
    2. Tant qu'un parent existe, on remonte l'arbre généalogique (`speciesId ➔ parent ➔ grand-parent...`).
    3. Chaque maillon est traduit en nom français via `speciesIdToFrench()`.
    4. La chaîne est assemblée avec le séparateur ` ⇽ ` :
       `[Nom Actuel] ⇽ [Stade Intermédiaire] ⇽ [Stade de Base]`
    5. Exemple : `Florizarre ⇽ Herbizarre ⇽ Bulbizarre`.

### 2.3 Interface Utilisateur & Composants

#### Carte Réduite (`PokemonRow.vue`)
* **En-tête épuré** :
  * Rang `#{{ item.meta.rank }}`.
  * Score numérique direct `{{ item.meta.score }}` (sans la barre de progression grise intermédiaire).
  * Sprite pixel statique issu de `/sprites/${dexNumber}.png`.
  * Ligne d'informations :
    * Nom de l'espèce.
    * Badges de forme, obscur, chanceux, évolution requise.
    * Si non possédé et issu d'une évolution : affichage d'un badge élégant :
      `🌱 Florizarre ⇽ Herbizarre ⇽ Bulbizarre`
  * Bloc de droite :
    * Si possédé : pastille de rang (`Rang: 98.4% #65`) et pastilles de ressources (`✨`, `🍬`, `🔷`).
    * Suppression complète de la pastille `✅ Possédé`.
    * Si non possédé : pastille `❌ Non possédé`.

#### Modale des Formes Non Reconnues (`FormMappingEditor.vue`)
* **Affichage des Pokémon concernés** :
  * La structure retournée par `usePokemonMatcher.js` inclut désormais `unmatchedPokemonNames: string[]` (ex: `['Deoxys', 'Necrozma']`).
  * La modale présente un encadré clair :
    `Pokémon concernés : Deoxys, Necrozma`
  * Permet à l'utilisateur d'identifier en un coup d'œil l'espèce concernée dans sa boîte pour entrer le suffixe anglais adéquat.

---

## 3. Schéma de Données

### 3.1 Structure enrichie de `meta` dans `MatchedPokemon`
```typescript
interface MatchedPokemonMeta {
  speciesId: string;
  dexNumber: number;            // Déterminé via gamemaster, garanti présent
  speciesName: string;
  nameFr: string;
  score: number;
  rank: number;
  types: string[];
  reverseEvolutionPath?: string | null; // ex: "Florizarre ⇽ Herbizarre ⇽ Bulbizarre"
  recommendedMoveset: {
    fast: RecommendedMoveInfo;
    charged: RecommendedMoveInfo[];
  };
  matchups: MatchupItem[];
  counters: CounterItem[];
}
```

### 3.2 Structure de retour du matcher
```typescript
interface MatchResult {
  matched: MatchedPokemon[];
  unmatchedForms: string[];
  unmatchedPokemonNames: string[]; // Nouveauté : Noms uniques des espèces déclenchant l'alerte
}
```

---

## 4. Stratégie de Test & Critères d'Acceptation

### 4.1 Tests Unitaires (Vitest)
1. `tests/pvpokeCache.test.js` :
   - Extraction correcte de `speciesDexMap` depuis `gamemaster.json`.
   - Extraction correcte des relations de parenté d'évolution.
2. `tests/usePokemonMatcher.test.js` :
   - Attribution du bon `dexNumber` pour un Pokémon non possédé dans les classements.
   - Construction du `reverseEvolutionPath` pour les espèces évoluées.
   - Absence de chaîne pour les espèces de base (ex: Airmure).
   - Présence des noms uniques dans `unmatchedPokemonNames`.
3. `tests/components/PokemonSprite.test.js` :
   - Vérification du chemin local `/sprites/${dex}.png`.
4. `tests/components/PokemonRow.test.js` :
   - Vérification de l'absence de `✅ Possédé`.
   - Vérification de l'absence de la barre grise de score.
   - Vérification du rendu du chemin d'évolution inversé sur carte non possédée.
5. `tests/components/FormMappingEditor.test.js` :
   - Vérification de l'affichage des noms de Pokémon concernés.

### 4.2 Critères d'Acceptation Visuels
* Les sprites s'affichent instantanément même sans aucune connexion Internet active.
* Les cartes non possédées affichent l'icône de l'espèce et la chaîne d'évolution menant à la forme sauvage de base.
* La ligne de chaque Pokémon est plus aérée et compacte, libérée du tag redondant et de la barre grise.
