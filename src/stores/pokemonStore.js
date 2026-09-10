import { defineStore } from 'pinia';
import { matchPokemon } from '../composables/usePokemonMatcher.js';
import { useAppStore } from './appStore.js';

function cleanStr(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const usePokemonStore = defineStore('pokemon', {
  state: () => ({
    rawMatched: [],
    isLoading: false,
    error: null,
    searchQuery: '',
    sortOption: 'score',
    activeView: 'my-pokemon',
    excludeXl: false,
    isRefreshingPvpoke: false
  }),
  getters: {
    displayedPokemon(state) {
      let list = state.rawMatched;

      if (state.activeView === 'my-pokemon') {
        list = list.filter(item => item.mine !== null);
      }

      if (state.excludeXl) {
        list = list.filter(item => {
          const mineRequiresXl = item.mine ? item.mine.requiresXl : false;
          const metaRequiresXl = item.meta ? Boolean(item.meta.requiresXl) : false;
          return !mineRequiresXl && !metaRequiresXl;
        });
      }

      if (state.searchQuery.trim() !== '') {
        const q = cleanStr(state.searchQuery);
        list = list.filter(item => {
          const metaName = cleanStr(item.meta.nameFr);
          const mineName = item.mine ? cleanStr(item.mine.name) : '';
          return metaName.includes(q) || mineName.includes(q);
        });
      }

      const sorted = [...list];
      if (state.sortOption === 'score') {
        sorted.sort((a, b) => (b.meta.score || 0) - (a.meta.score || 0));
      } else if (state.sortOption === 'ivRank') {
        sorted.sort((a, b) => {
          const rankA = a.mine ? a.mine.ivRankPercent || 0 : 0;
          const rankB = b.mine ? b.mine.ivRankPercent || 0 : 0;
          return rankB - rankA;
        });
      } else if (state.sortOption === 'name') {
        sorted.sort((a, b) => (a.meta.nameFr || '').localeCompare(b.meta.nameFr || ''));
      } else if (state.sortOption === 'cost') {
        sorted.sort((a, b) => {
          const costA = a.mine ? a.mine.dustCost || 0 : 9999999;
          const costB = b.mine ? b.mine.dustCost || 0 : 9999999;
          return costA - costB;
        });
      }

      return sorted;
    }
  },
  actions: {
    async loadData() {
      const appStore = useAppStore();
      this.isLoading = true;
      this.error = null;

      try {
        if (typeof window === 'undefined' || !window.electronAPI) return;

        const [master, rankingsRes, forms, history, eliteMovesMap, pokemonMetadata] = await Promise.all([
          window.electronAPI.getMasterPokemon(),
          window.electronAPI.getRankings(appStore.activeLeague),
          window.electronAPI.getForms(),
          window.electronAPI.getImportHistory(),
          window.electronAPI.getEliteMoves ? window.electronAPI.getEliteMoves() : {},
          window.electronAPI.getPokemonMetadata ? window.electronAPI.getPokemonMetadata() : null
        ]);

        appStore.customForms = forms || {};
        appStore.importHistory = history || [];

        const { matched, unmatchedForms, unmatchedPokemonNames, unmatchedFormDetails } = matchPokemon(
          master || [],
          rankingsRes.data || [],
          appStore.activeLeague,
          appStore.customForms,
          eliteMovesMap || {},
          pokemonMetadata || {}
        );

        this.rawMatched = matched;
        appStore.unmatchedForms = unmatchedForms;
        appStore.unmatchedPokemonNames = unmatchedPokemonNames || [];
        appStore.unmatchedFormDetails = unmatchedFormDetails || [];

        if (rankingsRes.fromCache && rankingsRes.cachedAt) {
          appStore.showToast(`Données PvPoke en cache (mise à jour: ${new Date(rankingsRes.cachedAt).toLocaleDateString('fr-FR')})`);
        }
      } catch (err) {
        this.error = err.message || 'Erreur de chargement des données';
      } finally {
        this.isLoading = false;
      }
    },

    async refreshPvpoke() {
      const appStore = useAppStore();
      this.isRefreshingPvpoke = true;
      try {
        if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.refreshPvpoke) {
          await window.electronAPI.refreshPvpoke();
          appStore.showToast('Classements PvPoke actualisés avec succès.');
        }
        await this.loadData();
      } catch (err) {
        this.error = err.message || 'Erreur lors du rafraîchissement PvPoke';
        appStore.showToast('Erreur lors du rafraîchissement: ' + err.message);
      } finally {
        this.isRefreshingPvpoke = false;
      }
    }
  }
});
