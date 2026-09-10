import { defineStore } from 'pinia';

export const useAppStore = defineStore('app', {
  state: () => ({
    activeLeague: '1500',
    activeView: 'my-pokemon', // 'my-pokemon' | 'meta'
    searchQuery: '',
    sortOption: 'score', // 'score' | 'ivRank' | 'name' | 'cost'
    importHistory: [],
    unmatchedForms: [],
    unmatchedPokemonNames: [],
    customForms: {},
    isImporterOpen: false,
    isFormEditorOpen: false,
    toastMessage: ''
  }),
  actions: {
    setLeague(league) {
      this.activeLeague = league;
      if (typeof window !== 'undefined' && window.electronAPI?.saveSettings) {
        window.electronAPI.saveSettings({ lastActiveLeague: league });
      }
    },
    setView(view) {
      this.activeView = view;
      if (typeof window !== 'undefined' && window.electronAPI?.saveSettings) {
        window.electronAPI.saveSettings({ lastView: view });
      }
    },
    showToast(msg) {
      this.toastMessage = msg;
      setTimeout(() => {
        if (this.toastMessage === msg) this.toastMessage = '';
      }, 4000);
    }
  }
});
