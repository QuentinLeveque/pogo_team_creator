# PoGo Team Creator 🎮⚔️

> Application de bureau moderne et performante pour les dresseurs de **Pokémon GO** : croisez instantanément votre collection scannée avec **PokeGenie** et les classements compétitifs de référence de **PvPoke**.

---

## 🌟 Fonctionnalités Principales

- **📥 Bibliothèque Multi-CSV** : Import, fusion intelligente et déduplication automatique de vos exports PokeGenie.
- **🏆 Méta PvPoke** : Classements compétitifs pour les 4 ligues (Super 1500, Hyper 2500, Master et Petite 500).
- **⚔️ Analyse des Attaques** : Comparatif côte à côte (PvPoke vs vos attaques), détection des attaques nécessitant une CT d'élite (`⭐ Élite`) et noms en français.
- **💎 Coûts & Filtre XL** : Calcul précis de la poussière d'étoiles, bonbons et bonbons XL requis, avec filtre rapide sans XL.
- **🔍 Gestion des Formes** : Outil interactif pour associer les formes événementielles ou méconnues à leur variante standard.
- **🔒 100% Local & Hors-Ligne** : Aucune télémétrie, traitement et stockage entièrement sur votre machine.

---

## 🤖 Développement

> Ce projet a été intégralement conçu et développé avec **Google Gemini**.

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

## 📄 Licence & Mentions Légales

### Licence du Projet
Ce projet est open-source et distribué sous licence **MIT** (voir le fichier [`LICENSE`](file:///home/quentin/Documents/script/pogo_team_creator/LICENSE)).

### Mentions Légales & Ressources Tierces
- **PokéAPI** : Les sprites officiels et données de base sont distribués sous licence **BSD 3-Clause** (Copyright (c) 2013–2023 Paul Hallett et contributeurs PokéAPI).
- **PvPoke** : Les classements compétitifs et le Game Master proviennent de [PvPoke](https://pvpoke.com/).
- **Pokémon** et les noms associés sont des marques déposées de **Nintendo**, **Creatures Inc.** et **GAME FREAK Inc.** / **The Pokémon Company**. Ce logiciel est un projet non officiel créé par des fans à des fins non commerciales.