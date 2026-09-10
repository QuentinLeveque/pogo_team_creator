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
    isRefreshingPvpoke: false,
    cachedRankings: {},
    cachedMatchedByLeague: {},
    masterList: null,
    eliteMovesMap: null,
    pokemonMetadata: null
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
    computeMatchForLeague(league) {
      const appStore = useAppStore();
      const rankingObj = this.cachedRankings[league];
      if (!rankingObj || !this.masterList) return null;

      const result = matchPokemon(
        this.masterList || [],
        rankingObj.data || [],
        league,
        appStore.customForms || {},
        this.eliteMovesMap || {},
        this.pokemonMetadata || {}
      );

      this.cachedMatchedByLeague[league] = result;
      return result;
    },

    runMatching(league) {
      const appStore = useAppStore();
      let result = this.cachedMatchedByLeague[league];
      if (!result) {
        result = this.computeMatchForLeague(league);
      }
      if (!result) return;

      this.rawMatched = result.matched;
      appStore.unmatchedForms = result.unmatchedForms;
      appStore.unmatchedPokemonNames = result.unmatchedPokemonNames || [];
      appStore.unmatchedFormDetails = result.unmatchedFormDetails || [];
    },

    async preloadOtherLeagues() {
      const allLeagues = ['1500', '2500', '10000', '500'];
      if (!this.masterList || !this.pokemonMetadata) return;

      for (const leagueId of allLeagues) {
        // Yield to event loop between leagues to keep UI buttery smooth
        await new Promise(resolve => setTimeout(resolve, 60));

        // Skip if already computed
        if (this.cachedMatchedByLeague[leagueId]) continue;

        try {
          if (!this.cachedRankings[leagueId]) {
            if (typeof window !== 'undefined' && window.electronAPI?.getRankings) {
              const rankingsRes = await window.electronAPI.getRankings(leagueId);
              this.cachedRankings[leagueId] = rankingsRes;
            }
          }

          await new Promise(resolve => setTimeout(resolve, 30));
          this.computeMatchForLeague(leagueId);
        } catch (err) {
          console.warn(`[preloadOtherLeagues] Failed to preload league ${leagueId}:`, err);
        }
      }
    },

    async changeLeague(leagueId) {
      const appStore = useAppStore();
      if (appStore.activeLeague === leagueId && this.rawMatched.length > 0) return;
      appStore.setLeague(leagueId);

      // If this league was already calculated in this session (or preloaded in background!), restore immediately (0ms!)
      if (this.cachedMatchedByLeague[leagueId]) {
        const cached = this.cachedMatchedByLeague[leagueId];
        this.rawMatched = cached.matched;
        appStore.unmatchedForms = cached.unmatchedForms;
        appStore.unmatchedPokemonNames = cached.unmatchedPokemonNames;
        appStore.unmatchedFormDetails = cached.unmatchedFormDetails;
        this.isLoading = false;
        return;
      }

      // If base data not yet loaded, perform full loadData
      if (!this.masterList || !this.pokemonMetadata) {
        return await this.loadData();
      }

      this.isLoading = true;
      this.error = null;
      // Allow UI thread to display active tab and loading spinner immediately
      await new Promise(resolve => setTimeout(resolve, 15));

      try {
        if (!this.cachedRankings[leagueId]) {
          if (typeof window !== 'undefined' && window.electronAPI?.getRankings) {
            const rankingsRes = await window.electronAPI.getRankings(leagueId);
            this.cachedRankings[leagueId] = rankingsRes;
          }
        }
        this.runMatching(leagueId);
      } catch (err) {
        this.error = err.message || 'Erreur de chargement des classements';
      } finally {
        this.isLoading = false;
      }
    },

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

        this.masterList = master || [];
        this.eliteMovesMap = eliteMovesMap || {};
        this.pokemonMetadata = pokemonMetadata || {};
        this.cachedRankings[appStore.activeLeague] = rankingsRes;
        this.cachedMatchedByLeague = {};

        appStore.customForms = forms || {};
        appStore.importHistory = history || [];

        this.runMatching(appStore.activeLeague);

        if (rankingsRes && rankingsRes.fromCache && rankingsRes.cachedAt) {
          appStore.showToast(`Données PvPoke en cache (mise à jour: ${new Date(rankingsRes.cachedAt).toLocaleDateString('fr-FR')})`);
        }
      } catch (err) {
        this.error = err.message || 'Erreur de chargement des données';
      } finally {
        this.isLoading = false;
        // Pre-charge remaining leagues in background during idle time
        setTimeout(() => {
          this.preloadOtherLeagues();
        }, 150);
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
        this.cachedRankings = {};
        this.cachedMatchedByLeague = {};
        await this.loadData();
      } catch (err) {
        this.error = err.message || 'Erreur lors du rafraîchissement PvPoke';
        appStore.showToast('Erreur lors du rafraîchissement: ' + err.message);
      } finally {
        this.isRefreshingPvpoke = false;
      }
    },

    setView(view) {
      this.activeView = view;
      if (typeof window !== 'undefined' && window.electronAPI?.saveSettings) {
        window.electronAPI.saveSettings({ lastView: view });
      }
    }
  }
});

