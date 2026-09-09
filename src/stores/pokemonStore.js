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
    excludeXl: false
  }),
  getters: {
    displayedPokemon(state) {
      let list = state.rawMatched;

      if (state.activeView === 'my-pokemon') {
        list = list.filter(item => item.mine !== null);
      }

      if (state.excludeXl) {
        list = list.filter(item => !item.mine || !item.mine.requiresXl);
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

        const [master, rankingsRes, forms, history] = await Promise.all([
          window.electronAPI.getMasterPokemon(),
          window.electronAPI.getRankings(appStore.activeLeague),
          window.electronAPI.getForms(),
          window.electronAPI.getImportHistory()
        ]);

        appStore.customForms = forms || {};
        appStore.importHistory = history || [];

        const { matched, unmatchedForms } = matchPokemon(
          master || [],
          rankingsRes.data || [],
          appStore.activeLeague,
          appStore.customForms
        );

        this.rawMatched = matched;
        appStore.unmatchedForms = unmatchedForms;

        if (rankingsRes.fromCache && rankingsRes.cachedAt) {
          appStore.showToast(`Données PvPoke en cache (mise à jour: ${new Date(rankingsRes.cachedAt).toLocaleDateString('fr-FR')})`);
        }
      } catch (err) {
        this.error = err.message || 'Erreur de chargement des données';
      } finally {
        this.isLoading = false;
      }
    }
  }
});
