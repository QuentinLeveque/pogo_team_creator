# Spécification de Conception : PoGo Team Creator — Itération 4
## Lignée d'Évolution Visuelle Dépliée & Diagnostic Détaillé des Formes Non Reconnues

**Date :** 10 septembre 2026  
**Statut :** Validé  
**Branche cible :** `feature/iteration-4-visual-evolution-lines-and-form-diagnostics`  

---

## 1. Contexte & Objectifs

Cette itération 4 répond à deux besoins identifiés lors de l'utilisation en conditions réelles de l'application :

1. **Amélioration de la Lignée d'Évolution dans la Carte Dépliée** :
   - L'itération 3 a introduit la chaîne d'évolution textuelle inversée (`🌱 Florizarre ⇽ Herbizarre ⇽ Bulbizarre`) sur la carte réduite pour les Pokémon non possédés.
   - **Nouveau besoin** : Lorsque la carte est dépliée, afficher la lignée d'évolution complète dans l'ordre chronologique naturel (`Base ➔ Intermédiaire ➔ Cible finale`), pour **tous les Pokémon** (possédés et non possédés), avec le **sprite pixel** et le **nom français** de chaque stade.
   - Si l'utilisateur possède déjà un ou plusieurs stades de la famille dans sa collection (ex: un *Bulbizarre* ou un *Herbizarre* en stock), ce stade est mis en valeur avec ses statistiques de rang pour identifier immédiatement quel spécimen faire évoluer.

2. **Diagnostic Précis & Résolution des Fausses Formes dans la Modale** :
   - PokéGenie renseigne parfois des libellés dans la colonne `Forme` qui ne correspondent à aucune forme de combat PvPoke (costumes d'événements, chapeaux, motifs).
   - Ces libellés génèrent une alerte de forme non reconnue et échouent lors de la correspondance avec PvPoke (ex. `pikachu_costume_d_halloween`).
   - **Nouveau besoin** : Transformer la modale `FormMappingEditor.vue` en un tableau diagnostique complet affichant le Pokémon concerné (nom + sprite), la forme brute PokéGenie, et l'identifiant PvPoke calculé avec les underscores. Offrir un bouton d'action rapide pour ignorer la forme et utiliser l'espèce standard de base sans suffixe.

---

## 2. Architecture & Modèle de Données

### 2.1 Structure de la Lignée d'Évolution (`evolutionLine`)

Dans `src/composables/usePokemonMatcher.js`, nous créons une fonction `buildEvolutionLine(speciesId, familyMap, customForms, masterList, ownedCandidatesBySpecies, league)` :

```typescript
interface EvolutionStage {
  speciesId: string;       // ex: 'bulbasaur'
  dexNumber: number;       // ex: 1
  nameFr: string;          // ex: 'Bulbizarre'
  isTarget: boolean;       // true si c'est l'espèce correspondant au classement de la ligue
  isOwned: boolean;        // true si l'utilisateur possède au moins un spécimen de cette espèce
  ownedCandidate?: {       // Meilleur spécimen possédé pour ce stade
    name: string;          // ex: 'Bulbizarre'
    ivRankPercent?: number;// ex: 99.5
    ivRankNumber?: number; // ex: 12
    ivAverage?: number;    // pour Master League (ex: 94.2)
    isCurrent: boolean;    // true s'il s'agit du spécimen principal déjà affiché sur la carte
  };
}
```

#### Logique de Construction :
1. À partir de `speciesId`, on remonte les parents dans `familyMap` :
   - `venusaur` a pour parent `ivysaur`, qui a pour parent `bulbasaur` (aucun parent).
   - Liste des ancêtres : `['venusaur', 'ivysaur', 'bulbasaur']`.
2. On inverse cette liste pour obtenir l'ordre chronologique naturel :
   - `['bulbasaur', 'ivysaur', 'venusaur']`.
3. Pour chaque stade :
   - On déduit le `dexNumber` via `speciesDexMap`.
   - On déduit le nom français via `speciesIdToFrench`.
   - On vérifie si ce stade est `isTarget` (`id === speciesId`).
   - On vérifie si l'utilisateur possède un spécimen de cette espèce dans `ownedCandidatesBySpecies` (ou en filtrant `masterList`). Si oui, on renseigne `isOwned: true` et l'objet `ownedCandidate`.
4. Si la famille ne compte qu'un seul stade (ex. *Airmure* / *Skarmory*), `evolutionLine` contiendra 1 seul élément et ne sera pas affichée dans la carte dépliée.

### 2.2 Diagnostic Détaillé des Formes (`unmatchedFormDetails`)

Dans `src/composables/usePokemonMatcher.js`, lors du parcours de `masterList` :
- Dès qu'une forme n'est pas reconnue (absente de `forms.json` et des `customForms`), nous enregistrons un objet diagnostique détaillé :

```typescript
interface UnmatchedFormDetail {
  rawForm: string;        // Forme brute issue du CSV (ex: 'Costume')
  pokemonNameFr: string;  // Nom français du Pokémon (ex: 'Pikachu')
  dexNumber: number;      // Numéro Pokédex (ex: 25)
  generatedId: string;    // Identifiant calculé avec underscore (ex: 'pikachu_costume')
  count: number;          // Nombre d'occurrences de ce cas dans le CSV
}
```

- Les détails sont dédupliqués par la paire `(rawForm, pokemonNameFr)` et stockés dans `appStore.unmatchedFormDetails`.

---

## 3. Interface Utilisateur & Interactions

### 3.1 Carte Dépliée : Lignée d'Évolution Visuelle (`PokemonRow.vue`)

Dans `PokemonRow.vue`, au sein du bloc `expanded-details` et avant la section des attaques :

```html
<div v-if="item.meta.evolutionLine && item.meta.evolutionLine.length > 1" class="evolution-chain-section">
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

#### Règles Visuelles :
- Palette claire respectant le thème général :
  - Fond de carte de stade : `#F8FAFC`, bordure `#E2E8F0`, bordure arrondie `8px`.
  - Stade cible : bordure `#3B82F6` avec fond bleuté très léger `#EFF6FF`.
  - Stade possédé en stock : badge vert pastel `#DEF7EC` avec texte `#03543F`.
  - Flèche de transition : couleur `#94A3B8`, police grasse.

### 3.2 Modale de Correspondance des Formes (`FormMappingEditor.vue`)

La modale actuelle présente désormais un tableau clair :

1. **En-tête de la modale** :
   - Titre : « Formes Pokémon non reconnues ».
   - Explication : « Certaines formes renseignées dans vos scans PokéGenie ne correspondent pas aux standards PvPoke. Vous pouvez leur associer un suffixe anglais (ex: *galarian*, *alolan*) ou choisir d'utiliser la forme standard sans suffixe pour les costumes et motifs. »

2. **Tableau diagnostique** :
   - Colonne **Pokémon** : Sprite pixel + Nom français.
   - Colonne **Forme détectée** : Valeur brute du CSV PokéGenie.
   - Colonne **Identifiant PvPoke calculé** : `<code>species_forme</code>` (ex: `pikachu_costume`).
   - Colonne **Action / Suffixe** :
     - Bouton **`⚡ Forme standard (sans suffixe)`** : remplit automatiquement l'entrée avec `""` (chaîne vide).
     - Champ texte : permet la saisie d'un suffixe personnalisé.

3. **Traitement de la chaîne vide (`""`) dans `nameTranslator.js`** :
   - Si `customForms[form] === ""` : la forme est considérée comme explicitement sans suffixe. L'espèce reste la forme de base standard (`pikachu`), et n'est plus signalée comme `unmatched`.

---

## 4. Stratégie de Test

1. **Tests unitaires de traduction (`tests/nameTranslator.test.js`)** :
   - Tester qu'une forme avec suffixe `""` dans `customForms` retourne l'ID de base sans suffixe et avec `unmatched: false`.
2. **Tests unitaires du matcher (`tests/usePokemonMatcher.test.js`)** :
   - Tester `buildEvolutionLine` pour une famille à 3 stades (ex: *Bulbizarre* ➔ *Herbizarre* ➔ *Florizarre*) avec le drapeau `isTarget` sur le stade final.
   - Tester la détection d'un spécimen possédé pour un stade intermédiaire ou de base.
   - Tester la génération des objets `unmatchedFormDetails` avec le nom, le sprite, et l'identifiant généré avec underscore.
3. **Tests unitaires des composants Vue** :
   - `PokemonRow.test.js` : Vérifier l'affichage des sprites, des noms et des flèches `➔` lors du dépliage.
   - `FormMappingEditor.test.js` : Vérifier le rendu du tableau diagnostique et le comportement du bouton « Forme standard ».
4. **Validation Globale** :
   - `npm test` : 100% de réussite.
   - `npm run build` : Compilation Vite réussie.
