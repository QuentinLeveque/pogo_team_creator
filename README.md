# PoGo Team Creator 🎮⚔️

> Application de bureau moderne et performante pour les dresseurs de **Pokémon GO** : croisez instantanément votre collection scannée avec **PokeGenie** et les classements compétitifs de référence de **PvPoke**.

---

## 🌟 Fonctionnalités Principales

- **📥 Gestion & Fusion Multi-CSV (Bibliothèque PokeGenie)** :
  - Importez un ou plusieurs fichiers d'export PokeGenie (CSV).
  - Fusion intelligente et déduplication automatique des Pokémon basée sur les attributs uniques (IVs, forme, date de capture).
  - Suppression individuelle par fichier avec modale de confirmation ou réinitialisation complète (« Tout effacer »).
  - Export de la collection fusionnée et nettoyée.

- **🏆 Classements PvPoke & Détection de Méta** :
  - Intégration complète des 4 ligues majeures : **Ligue Super (1500 PC)**, **Ligue Hyper (2500 PC)**, **Ligue Master (Sans limite)** et **Ligue Petite (500 PC)**.
  - Basculement entre la vue **« Mes Pokémon »** (vos spécimens qualifiés dans le méta) et **« Méta complète »** (l'ensemble des meilleurs Pokémon de la ligue).

- **⚡ Performance Extrême & Basculement Instantané (0 ms)** :
  - Architecture **Cache-First** : données PvPoke stockées localement pour un démarrage hors-ligne immédiat sans freeze réseau.
  - Algorithme de matching optimisé en **O(1)** via des tables de hachage précalculées.
  - **Préchargement silencieux en arrière-plan** : dès l'ouverture, toutes les ligues sont pré-calculées sans impacter la fluidité de l'interface, rendant chaque changement de ligue instantané.

- **🟣 Spécialisation des Pokémon Obscurs** :
  - Isolation stricte entre Pokémon normaux et obscurs (aucun risque de faux positifs dans les classements).
  - Badges visuels violets dédiés `Obscur` dans toute l'interface.
  - Arbre d'évolution obscur cohérent (ex. *Goupix (Obscur) ➔ Feunard (Obscur)*).

- **⚔️ Comparatif d'Attaques & Badges Attaques d'Élite** :
  - Présentation en deux colonnes : **Attaques recommandées PvPoke** vs **Attaques actuelles de votre Pokémon**.
  - Détection automatique et affichage des badges **`⭐ Élite`** pour les attaques nécessitant une CT d'élite.
  - Dictionnaire officiel intégrant plus de 350 attaques traduites en français.

- **💎 Calculateur de Coûts & Filtre Bonbons XL** :
  - Estimation exacte de la Poussière d'étoiles, des Bonbons et des Bonbons XL nécessaires pour atteindre le niveau cible.
  - Bouton filtre universel **`🔷 Sans bonbons XL`** pour écarter instantanément les Pokémon et espèces méta nécessitant un niveau > 40.

- **🔍 Éditeur & Diagnostic des Formes Méconnues** :
  - Panneau interactif signalant les formes événementielles ou non répertoriées (ex. costumes, formes régionales).
  - Possibilité de mapper facilement une forme personnalisée vers sa variante PvPoke standard.

- **🔒 100% Local & Respectueux de la Vie Privée** :
  - Aucune télémétrie, aucun compte requis, aucun envoi de données externes. Tout est stocké et calculé localement sur votre ordinateur.

---

## 🛠️ Stack Technique

- **Runtime** : [Electron 31](https://www.electronjs.org/)
- **Frontend** : [Vue 3](https://vuejs.org/) (Composition API, `<script setup>`)
- **State Management** : [Pinia 2](https://pinia.vuejs.org/)
- **Bundler & Build Tool** : [Vite 5](https://vitejs.dev/)
- **Tests** : [Vitest 1](https://vitest.dev/) & [@vue/test-utils](https://test-utils.vuejs.org/)

---

## 🚀 Démarrage Rapide

### Prérequis
- [Node.js](https://nodejs.org/) (version 18 ou supérieure recommandée)
- `npm` (inclus avec Node.js)

### Installation
Clonez le dépôt et installez les dépendances :
```bash
git clone https://github.com/QuentinLeveque/pogo_team_creator.git
cd pogo_team_creator
npm install
```

### Lancer en Développement
Pour démarrer l'environnement de développement avec rechargement à chaud (Vite + Electron) :
```bash
npm run electron:dev
```

### Lancer la Suite de Tests
Exécuter tous les tests unitaires et d'intégration (15 suites, 84 tests) :
```bash
npm test
```

Pour lancer Vitest en mode surveillance (watch) :
```bash
npm run test:watch
```

### Compiler pour la Production
Pour construire les bundles statiques de production :
```bash
npm run build
```

---

## 📂 Structure du Projet

```text
pogo_team_creator/
├── electron/
│   ├── main.js                  # Point d'entrée Electron & IPC handlers
│   ├── preload.js               # Contexte bridge sécurisé
│   └── services/
│       ├── csvManager.js        # Gestion, fusion et archivage des CSV
│       ├── pvpokeCache.js       # Téléchargement et cache local PvPoke / Game Master
│       └── settingsManager.js   # Persistance des préférences utilisateur et formes
├── public/
│   └── sprites/                 # Sprites officiels des 1025 Pokémon (hors-ligne)
├── src/
│   ├── assets/                  # Feuilles de styles et palette de types
│   ├── components/              # Composants Vue 3 (Sidebar, Rows, Modales, Importer)
│   ├── composables/             # Moteur de matching PvPoke (usePokemonMatcher)
│   ├── data/                    # Dictionnaires FR/EN, formes et attaques
│   ├── services/                # Traduction et indexation des noms (nameTranslator)
│   ├── stores/                  # Stores Pinia (appStore, pokemonStore)
│   └── utils/                   # Calculateur de ressources (costCalculator)
└── tests/
    ├── fixtures/                # Fichiers CSV réels pour les tests d'intégration
    ├── components/              # Tests unitaires des composants Vue
    └── ...                      # Tests unitaires des modules et algorithmes
```

---

## 📄 Licence
Ce projet est sous licence libre. Les données de classements et de Game Master sont fournies sous l'égide de [PvPoke](https://pvpoke.com/).