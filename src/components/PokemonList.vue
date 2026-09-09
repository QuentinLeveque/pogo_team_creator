<template>
  <div class="pokemon-list-wrapper">
    <div v-if="pokemonStore.isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Chargement des Pokémon et données PvPoke...</p>
    </div>

    <div v-else-if="pokemonStore.error" class="error-state">
      <p>⚠ {{ pokemonStore.error }}</p>
      <button class="retry-btn" @click="pokemonStore.loadData">Réessayer</button>
    </div>

    <div v-else-if="pokemonStore.displayedPokemon.length === 0" class="empty-state">
      <p>Aucun Pokémon trouvé pour cette sélection.</p>
    </div>

    <div v-else class="list-container">
      <PokemonRow
        v-for="item in pokemonStore.displayedPokemon"
        :key="item.meta.speciesId"
        :item="item"
        @request-remove="handleRemoveRequest"
      />
    </div>

    <ConfirmDialog
      :is-open="confirmDialogState.isOpen"
      :title="'Retirer de ma collection'"
      :message="`Êtes-vous sûr de vouloir retirer ${confirmDialogState.pokemonName} de votre collection ?`"
      @cancel="confirmDialogState.isOpen = false"
      @confirm="executeRemoval"
    />
  </div>
</template>

<script setup>
import { reactive } from 'vue';
import { usePokemonStore } from '../stores/pokemonStore.js';
import { useAppStore } from '../stores/appStore.js';
import PokemonRow from './PokemonRow.vue';
import ConfirmDialog from './ConfirmDialog.vue';

const pokemonStore = usePokemonStore();
const appStore = useAppStore();

const confirmDialogState = reactive({
  isOpen: false,
  uniqueKey: null,
  pokemonName: ''
});

function handleRemoveRequest(key, name) {
  confirmDialogState.uniqueKey = key;
  confirmDialogState.pokemonName = name;
  confirmDialogState.isOpen = true;
}

async function executeRemoval() {
  if (!confirmDialogState.uniqueKey) return;
  confirmDialogState.isOpen = false;

  if (typeof window !== 'undefined' && window.electronAPI?.removePokemon) {
    const success = await window.electronAPI.removePokemon(confirmDialogState.uniqueKey);
    if (success) {
      appStore.showToast(`${confirmDialogState.pokemonName} retiré de la collection.`);
      await pokemonStore.loadData();
    }
  }
}
</script>

<style scoped>
.pokemon-list-wrapper {
  flex: 1;
  overflow-y: auto;
}
.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #718096;
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E2E8F0;
  border-top-color: #3B82F6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.retry-btn {
  padding: 0.5rem 1rem;
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-top: 0.5rem;
}
</style>
