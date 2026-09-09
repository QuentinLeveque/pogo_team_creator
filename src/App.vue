<template>
  <div class="app-container">
    <AppSidebar />
    <main class="main-content">
      <div class="top-bar">
        <ViewToggle />
      </div>
      <SearchBar />
      <PokemonList />
    </main>

    <CsvImporter />
    <FormMappingEditor />

    <div v-if="appStore.toastMessage" class="toast-notification">
      {{ appStore.toastMessage }}
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useAppStore } from './stores/appStore.js';
import { usePokemonStore } from './stores/pokemonStore.js';
import AppSidebar from './components/AppSidebar.vue';
import ViewToggle from './components/ViewToggle.vue';
import SearchBar from './components/SearchBar.vue';
import PokemonList from './components/PokemonList.vue';
import CsvImporter from './components/CsvImporter.vue';
import FormMappingEditor from './components/FormMappingEditor.vue';
import './assets/styles.css';

const appStore = useAppStore();
const pokemonStore = usePokemonStore();

onMounted(async () => {
  if (typeof window !== 'undefined' && window.electronAPI?.getSettings) {
    const settings = await window.electronAPI.getSettings();
    if (settings.lastActiveLeague) appStore.activeLeague = settings.lastActiveLeague;
    if (settings.lastView) {
      appStore.activeView = settings.lastView;
      pokemonStore.activeView = settings.lastView;
    }
  }
  await pokemonStore.loadData();
});
</script>

<style scoped>
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.toast-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: #1F2937;
  color: #F9FAFB;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.85rem;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
