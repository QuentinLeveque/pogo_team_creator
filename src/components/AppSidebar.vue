<template>
  <aside class="sidebar">
    <div class="brand">
      <h2>PoGo Team Creator</h2>
    </div>

    <div class="section-header">
      <span class="section-title">Ligues</span>
      <button
        type="button"
        class="refresh-pvpoke-btn"
        :class="{ spinning: pokemonStore.isRefreshingPvpoke }"
        title="Rafraîchir les classements PvPoke"
        @click="pokemonStore.refreshPvpoke()"
      >
        ↻
      </button>
    </div>
    <div class="league-selector">
      <button
        v-for="league in leagues"
        :key="league.id"
        :class="['league-btn', { active: appStore.activeLeague === league.id }]"
        :style="{ '--badge-color': league.color }"
        @click="selectLeague(league.id)"
      >
        <span class="league-indicator"></span>
        <span class="league-name">{{ league.name }}</span>
        <span class="league-cp">{{ league.cp }}</span>
      </button>
    </div>

    <div v-if="appStore.unmatchedForms.length > 0" class="warning-box" @click="appStore.isFormEditorOpen = true">
      <span class="warning-icon">⚠</span>
      <span>{{ appStore.unmatchedForms.length }} forme(s) non reconnue(s)</span>
    </div>

    <hr class="divider" />

    <div class="section-header">
      <span class="section-title">Historique CSV</span>
      <div class="history-header-actions">
        <button
          v-if="appStore.importHistory.length > 0"
          type="button"
          class="clear-all-csv-btn"
          title="Tout effacer"
          @click="showClearAllModal = true"
        >
          Tout effacer
        </button>
        <button class="action-btn-mini" @click="appStore.isImporterOpen = true">+ Importer</button>
      </div>
    </div>

    <div class="history-list">
      <div v-if="appStore.importHistory.length === 0" class="empty-history">
        Aucun fichier importé
      </div>
      <div v-for="item in appStore.importHistory" :key="item.id" class="history-item">
        <div class="history-item-main">
          <div class="history-file">{{ item.originalFilename }}</div>
          <button
            type="button"
            class="delete-csv-btn"
            title="Supprimer ce fichier"
            @click="fileToDelete = item"
          >
            🗑️
          </button>
        </div>
        <div class="history-meta">
          <span>{{ new Date(item.importedAt).toLocaleDateString('fr-FR') }}</span>
          <span class="added-tag">
            {{ Number(item.pokemonCountInFile || 0).toLocaleString('fr-FR') }} au total · {{ item.newPokemonAdded > 0 ? `+${Number(item.newPokemonAdded).toLocaleString('fr-FR')} ajoutés` : '0 nouveau' }}
          </span>
        </div>
      </div>
    </div>

    <!-- Clear All Confirmation Modal -->
    <div v-if="showClearAllModal" class="modal-backdrop">
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
    <div v-if="fileToDelete" class="modal-backdrop">
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

    <div class="sidebar-footer">
      <button class="export-btn" @click="exportMerged">
        📥 Exporter CSV fusionné
      </button>
    </div>
  </aside>
</template>

<script setup>
import { ref } from 'vue';
import { useAppStore } from '../stores/appStore.js';
import { usePokemonStore } from '../stores/pokemonStore.js';

const appStore = useAppStore();
const pokemonStore = usePokemonStore();

const showClearAllModal = ref(false);
const fileToDelete = ref(null);

async function confirmDeleteSingle() {
  if (!fileToDelete.value) return;
  const id = fileToDelete.value.id;
  fileToDelete.value = null;
  await handleDeleteFile(id);
}

async function handleDeleteFile(id) {
  if (typeof window === 'undefined' || !window.electronAPI) return;
  try {
    const res = await window.electronAPI.removeCsvFile(id);
    if (res && res.success) {
      appStore.importHistory = res.history || [];
      appStore.showToast('Fichier supprimé et collection mise à jour.');
      await pokemonStore.loadData();
    }
  } catch (err) {
    appStore.showToast('Erreur lors de la suppression : ' + (err.message || err));
  }
}

async function handleClearAll() {
  if (typeof window === 'undefined' || !window.electronAPI) return;
  try {
    const res = await window.electronAPI.removeAllCsvs();
    if (res && res.success) {
      appStore.importHistory = [];
      showClearAllModal.value = false;
      appStore.showToast('Toutes les données CSV ont été supprimées.');
      await pokemonStore.loadData();
    }
  } catch (err) {
    appStore.showToast('Erreur lors de la réinitialisation : ' + (err.message || err));
  }
}

const leagues = [
  { id: '1500', name: 'Ligue Super', cp: '1500 PC', color: '#3B82F6' },
  { id: '2500', name: 'Ligue Hyper', cp: '2500 PC', color: '#EAB308' },
  { id: '10000', name: 'Ligue Master', cp: 'Sans limite', color: '#8B5CF6' },
  { id: '500', name: 'Ligue Petite', cp: '500 PC', color: '#22C55E' }
];

async function selectLeague(id) {
  appStore.setLeague(id);
  await pokemonStore.loadData();
}

async function exportMerged() {
  if (typeof window === 'undefined' || !window.electronAPI) return;
  const csvData = await window.electronAPI.exportMergedCsv();
  if (!csvData) {
    appStore.showToast('Aucun Pokémon dans la collection à exporter.');
    return;
  }
  const saveRes = await window.electronAPI.showSaveDialog({
    title: 'Exporter le CSV fusionné',
    defaultPath: 'pokegenie_master_export.csv',
    filters: [{ name: 'CSV Files', extensions: ['csv'] }]
  });

  if (!saveRes.canceled && saveRes.filePath) {
    await window.electronAPI.writeFile(saveRes.filePath, csvData);
    appStore.showToast('CSV exporté avec succès.');
  }
}
</script>

<style scoped>
.brand h2 {
  font-size: 1.2rem;
  margin: 0 0 1.5rem 0;
  color: #1A202C;
}
.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #718096;
  margin-bottom: 0.75rem;
}
.league-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.league-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
}
.league-btn.active {
  background: #EFF6FF;
  border-color: #3B82F6;
  font-weight: 600;
}
.league-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--badge-color);
}
.league-name {
  flex: 1;
  font-size: 0.9rem;
}
.league-cp {
  font-size: 0.75rem;
  color: #718096;
}
.warning-box {
  margin-top: 1rem;
  padding: 0.6rem 0.75rem;
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #92400E;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}
.divider {
  border: 0;
  border-top: 1px solid #E2E8F0;
  margin: 1.5rem 0;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}
.action-btn-mini {
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}
.refresh-pvpoke-btn {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  font-size: 0.95rem;
  color: #718096;
  line-height: 1;
  transition: all 0.2s ease;
}
.refresh-pvpoke-btn:hover {
  background: #EDF2F7;
  color: #2B6CB0;
  border-color: #CBD5E0;
}
.refresh-pvpoke-btn.spinning {
  animation: spin 1s linear infinite;
  pointer-events: none;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.history-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.empty-history {
  font-size: 0.8rem;
  color: #A0AEC0;
  font-style: italic;
}
.history-item {
  padding: 0.5rem;
  background: #F8FAFC;
  border-radius: 6px;
  font-size: 0.8rem;
}
.history-file {
  font-weight: 500;
  word-break: break-all;
}
.history-meta {
  display: flex;
  justify-content: space-between;
  color: #718096;
  font-size: 0.7rem;
  margin-top: 0.25rem;
}
.added-tag {
  color: #059669;
  font-weight: 600;
}
.sidebar-footer {
  margin-top: 1rem;
}
.export-btn {
  width: 100%;
  padding: 0.6rem;
  background: #FFFFFF;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.15s;
}
.export-btn:hover {
  background: #F1F5F9;
}
.history-header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.clear-all-csv-btn {
  background: none;
  border: 1px solid #FED7D7;
  color: #E53E3E;
  border-radius: 4px;
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.clear-all-csv-btn:hover {
  background: #FFF5F5;
  border-color: #FEB2B2;
}
.history-item-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.delete-csv-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.1rem 0.25rem;
  opacity: 0.6;
  transition: opacity 0.15s ease;
}
.delete-csv-btn:hover {
  opacity: 1;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}
.confirm-modal-box {
  background: #FFFFFF;
  border-radius: 10px;
  width: 420px;
  max-width: 90%;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
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
