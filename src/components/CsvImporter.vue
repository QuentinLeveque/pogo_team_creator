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

      <div v-if="appStore.importHistory.length > 0" class="importer-history-section">
        <div class="importer-history-header">
          <span class="importer-history-title">Fichiers actuellement appliqués ({{ appStore.importHistory.length }})</span>
          <button
            type="button"
            class="clear-all-csv-btn"
            @click="showClearAllModal = true"
          >
            Tout effacer
          </button>
        </div>
        <div class="importer-history-list">
          <div v-for="item in appStore.importHistory" :key="item.id" class="importer-history-row">
            <span class="importer-history-filename">{{ item.originalFilename }}</span>
            <span class="importer-history-count">{{ Number(item.pokemonCountInFile || 0).toLocaleString('fr-FR') }} Pokémon</span>
            <button
              type="button"
              class="delete-csv-btn"
              title="Supprimer ce fichier"
              @click="fileToDelete = item"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      <!-- Clear All Confirmation Modal -->
      <div v-if="showClearAllModal" class="confirm-backdrop">
        <div class="confirm-modal-box">
          <h4>Supprimer toutes les données ?</h4>
          <p>Cette action supprimera tous les fichiers CSV importés, l'historique complet et réinitialisera votre collection de Pokémon. Cette action est irréversible.</p>
          <div class="confirm-modal-actions">
            <button type="button" class="btn-cancel" @click="showClearAllModal = false">Annuler</button>
            <button type="button" class="confirm-delete-btn" @click="handleClearAll">Confirmer la suppression</button>
          </div>
        </div>
      </div>

      <!-- Single CSV Deletion Confirmation Modal -->
      <div v-if="fileToDelete" class="confirm-backdrop">
        <div class="confirm-modal-box">
          <h4>Supprimer ce fichier CSV ?</h4>
          <p>
            Voulez-vous vraiment supprimer le fichier <strong>« {{ fileToDelete.originalFilename }} »</strong> ?
            La collection sera recalculée à partir des fichiers restants. Cette action est irréversible.
          </p>
          <div class="confirm-modal-actions">
            <button type="button" class="btn-cancel" @click="fileToDelete = null">Annuler</button>
            <button type="button" class="confirm-delete-btn" @click="confirmDeleteSingle">Confirmer la suppression</button>
          </div>
        </div>
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
const showClearAllModal = ref(false);
const fileToDelete = ref(null);

function close() {
  appStore.isImporterOpen = false;
  errorMessage.value = '';
  successMessage.value = '';
  showClearAllModal.value = false;
  fileToDelete.value = null;
}

async function confirmDeleteSingle() {
  if (!fileToDelete.value) return;
  const id = fileToDelete.value.id;
  fileToDelete.value = null;
  await handleDeleteFile(id);
}

async function handleDeleteFile(id) {
  if (typeof window === 'undefined' || !window.electronAPI) return;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const res = await window.electronAPI.removeCsvFile(id);
    if (res && res.success) {
      appStore.importHistory = res.history || [];
      successMessage.value = `Fichier supprimé. Collection mise à jour (${res.totalCount} Pokémon restants).`;
      await pokemonStore.loadData();
    }
  } catch (err) {
    errorMessage.value = err.message || 'Erreur lors de la suppression';
  }
}

async function handleClearAll() {
  if (typeof window === 'undefined' || !window.electronAPI) return;
  errorMessage.value = '';
  successMessage.value = '';
  try {
    const res = await window.electronAPI.removeAllCsvs();
    if (res && res.success) {
      appStore.importHistory = [];
      showClearAllModal.value = false;
      successMessage.value = 'Toutes les données CSV et la collection ont été supprimées.';
      await pokemonStore.loadData();
    }
  } catch (err) {
    errorMessage.value = err.message || 'Erreur lors de la réinitialisation';
  }
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
.importer-history-section {
  margin-top: 1.5rem;
  border-top: 1px solid #E2E8F0;
  padding-top: 1rem;
}
.importer-history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.importer-history-title {
  font-size: 0.85rem;
  font-weight: 600;
  color: #4A5568;
}
.clear-all-csv-btn {
  background: none;
  border: 1px solid #FED7D7;
  color: #E53E3E;
  border-radius: 4px;
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.clear-all-csv-btn:hover {
  background: #FFF5F5;
  border-color: #FEB2B2;
}
.importer-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 180px;
  overflow-y: auto;
}
.importer-history-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
  font-size: 0.8rem;
}
.importer-history-filename {
  font-weight: 500;
  color: #1A202C;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.importer-history-count {
  color: #718096;
  font-size: 0.75rem;
  margin: 0 0.75rem;
}
.delete-csv-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.1rem 0.3rem;
  opacity: 0.65;
  transition: opacity 0.15s ease;
}
.delete-csv-btn:hover {
  opacity: 1;
}
.confirm-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2100;
}
.confirm-modal-box {
  background: #FFFFFF;
  border-radius: 10px;
  width: 420px;
  max-width: 90%;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}
.confirm-modal-box h4 {
  margin: 0 0 0.75rem 0;
  font-size: 1.05rem;
  color: #991B1B;
}
.confirm-modal-box p {
  font-size: 0.85rem;
  color: #4A5568;
  line-height: 1.4;
  margin: 0 0 1.25rem 0;
}
.confirm-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
.btn-cancel {
  padding: 0.5rem 0.9rem;
  background: #E2E8F0;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
}
.confirm-delete-btn {
  padding: 0.5rem 0.9rem;
  background: #DC2626;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}
.confirm-delete-btn:hover {
  background: #B91C1C;
}
</style>
