<template>
  <div v-if="appStore.isImporterOpen" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <h3>Importer un export PokeGenie (.csv)</h3>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <div
        class="drop-zone"
        :class="{ dragging: isDragging }"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleDrop"
      >
        <p>Glissez et déposez votre fichier CSV ici</p>
        <p class="or-label">ou</p>
        <label class="file-picker-btn">
          Choisir un fichier
          <input type="file" accept=".csv" @change="handleFileSelect" style="display: none;" />
        </label>
      </div>

      <div v-if="errorMessage" class="error-msg">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="success-msg">
        {{ successMessage }}
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="close">Fermer</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '../stores/appStore.js';
import { usePokemonStore } from '../stores/pokemonStore.js';

const appStore = useAppStore();
const pokemonStore = usePokemonStore();

const isDragging = ref(false);
const errorMessage = ref('');
const successMessage = ref('');

function close() {
  appStore.isImporterOpen = false;
  errorMessage.value = '';
  successMessage.value = '';
}

async function processFile(file) {
  if (!file) return;
  errorMessage.value = '';
  successMessage.value = '';

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = e.target.result;
      if (typeof window === 'undefined' || !window.electronAPI) return;
      const res = await window.electronAPI.importCsv(content, file.name);
      successMessage.value = `Import réussi : ${res.addedCount} nouveaux Pokémon ajoutés (${res.totalCount} au total).`;
      await pokemonStore.loadData();
    } catch (err) {
      errorMessage.value = err.message || "Erreur lors de l'import";
    }
  };
  reader.readAsText(file);
}

function handleDrop(e) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  processFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files?.[0];
  processFile(file);
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: #FFFFFF;
  border-radius: 10px;
  width: 500px;
  max-width: 90%;
  padding: 1.5rem;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #718096;
}
.drop-zone {
  border: 2px dashed #CBD5E1;
  border-radius: 8px;
  padding: 2.5rem;
  text-align: center;
  background: #F8FAFC;
  transition: all 0.2s ease;
}
.drop-zone.dragging {
  border-color: #3B82F6;
  background: #EFF6FF;
}
.or-label {
  color: #A0AEC0;
  font-size: 0.85rem;
  margin: 0.5rem 0;
}
.file-picker-btn {
  display: inline-block;
  background: #3B82F6;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
}
.error-msg {
  color: #DC2626;
  background: #FEE2E2;
  padding: 0.6rem;
  border-radius: 6px;
  margin-top: 1rem;
  font-size: 0.85rem;
}
.success-msg {
  color: #059669;
  background: #D1FAE5;
  padding: 0.6rem;
  border-radius: 6px;
  margin-top: 1rem;
  font-size: 0.85rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.25rem;
}
.cancel-btn {
  padding: 0.5rem 1rem;
  background: #E2E8F0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
