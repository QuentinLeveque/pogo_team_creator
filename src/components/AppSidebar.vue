<template>
  <aside class="sidebar">
    <div class="brand">
      <h2>PoGo Team Creator</h2>
    </div>

    <div class="section-title">Ligues</div>
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
      <button class="action-btn-mini" @click="appStore.isImporterOpen = true">+ Importer</button>
    </div>

    <div class="history-list">
      <div v-if="appStore.importHistory.length === 0" class="empty-history">
        Aucun fichier importé
      </div>
      <div v-for="item in appStore.importHistory" :key="item.id" class="history-item">
        <div class="history-file">{{ item.originalFilename }}</div>
        <div class="history-meta">
          <span>{{ new Date(item.importedAt).toLocaleDateString('fr-FR') }}</span>
          <span class="added-tag">+{{ item.newPokemonAdded }} Pokémon</span>
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
import { useAppStore } from '../stores/appStore.js';
import { usePokemonStore } from '../stores/pokemonStore.js';

const appStore = useAppStore();
const pokemonStore = usePokemonStore();

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
</style>
