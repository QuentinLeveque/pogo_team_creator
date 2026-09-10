<template>
  <div v-if="appStore.isFormEditorOpen" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <h3>Formes Pokémon non reconnues</h3>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <p class="editor-desc">
        Les formes suivantes issues de vos imports PokeGenie n'ont pas de correspondance avec PvPoke.
        Pour les Pokémon sans forme alternative (ex: costumes événementiels), cliquez sur <strong>⚡ Forme standard</strong> pour ignorer le suffixe.
        Pour les vraies formes régionales ou alternatives (ex: Alola, Galar, Totem), renseignez le suffixe anglais correspondant.
      </p>

      <div v-if="appStore.unmatchedPokemonNames && appStore.unmatchedPokemonNames.length > 0" class="affected-pokemon-box">
        <strong>Pokémon concernés :</strong> {{ appStore.unmatchedPokemonNames.join(', ') }}
      </div>

      <div class="table-container">
        <table class="diagnostic-table">
          <thead>
            <tr>
              <th>Pokémon</th>
              <th>Forme CSV</th>
              <th>ID PvPoke calculé</th>
              <th>Action / Suffixe PvPoke</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in diagnosticRows" :key="row.key" class="diagnostic-row">
              <td class="pokemon-cell">
                <PokemonSprite :dex-number="row.dexNumber" />
                <div class="pokemon-info">
                  <span class="pokemon-name">{{ row.pokemonNameFr }}</span>
                  <span v-if="row.count" class="specimen-count">{{ row.count }} ex.</span>
                </div>
              </td>
              <td class="form-cell">
                <span class="raw-form-badge">{{ row.rawForm }}</span>
              </td>
              <td class="id-cell">
                <code>{{ row.generatedId }}</code>
              </td>
              <td class="action-cell">
                <div class="action-wrapper">
                  <button
                    type="button"
                    class="standard-form-btn"
                    :class="{ active: inputMappings[row.rawForm] === '' && isExplicitStandard[row.rawForm] }"
                    @click="setStandardForm(row.rawForm)"
                    title="Traiter comme forme standard sans aucun suffixe"
                  >
                    ⚡ Forme standard
                  </button>
                  <input
                    v-model="inputMappings[row.rawForm]"
                    type="text"
                    class="suffix-input"
                    placeholder="ou suffixe (ex: alolan)"
                    @input="onInputSuffix(row.rawForm)"
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="close">Annuler</button>
        <button class="save-btn" @click="save">Sauvegarder et re-matcher</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, watch } from 'vue';
import { useAppStore } from '../stores/appStore.js';
import { usePokemonStore } from '../stores/pokemonStore.js';
import PokemonSprite from './PokemonSprite.vue';

const appStore = useAppStore();
const pokemonStore = usePokemonStore();

const inputMappings = reactive({});
const isExplicitStandard = reactive({});

const diagnosticRows = computed(() => {
  if (appStore.unmatchedFormDetails && appStore.unmatchedFormDetails.length > 0) {
    return appStore.unmatchedFormDetails.map(d => ({
      key: `${d.pokemonNameFr}_${d.rawForm}`,
      pokemonNameFr: d.pokemonNameFr,
      rawForm: d.rawForm,
      dexNumber: d.dexNumber || 0,
      generatedId: d.generatedId || '',
      count: d.count || 0
    }));
  }
  return (appStore.unmatchedForms || []).map(form => ({
    key: form,
    pokemonNameFr: appStore.unmatchedPokemonNames?.[0] || 'Pokémon',
    rawForm: form,
    dexNumber: 0,
    generatedId: form.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_'),
    count: 0
  }));
});

watch(
  [() => appStore.unmatchedForms, () => appStore.unmatchedFormDetails],
  () => {
    const forms = appStore.unmatchedForms || [];
    forms.forEach(f => {
      if (inputMappings[f] === undefined) {
        inputMappings[f] = appStore.customForms[f] !== undefined ? appStore.customForms[f] : '';
        if (appStore.customForms[f] === '') {
          isExplicitStandard[f] = true;
        }
      }
    });
    if (appStore.unmatchedFormDetails) {
      appStore.unmatchedFormDetails.forEach(d => {
        if (inputMappings[d.rawForm] === undefined) {
          inputMappings[d.rawForm] = appStore.customForms[d.rawForm] !== undefined ? appStore.customForms[d.rawForm] : '';
          if (appStore.customForms[d.rawForm] === '') {
            isExplicitStandard[d.rawForm] = true;
          }
        }
      });
    }
  },
  { immediate: true, deep: true }
);

function setStandardForm(formName) {
  inputMappings[formName] = '';
  isExplicitStandard[formName] = true;
}

function onInputSuffix(formName) {
  if (inputMappings[formName] && inputMappings[formName].trim() !== '') {
    isExplicitStandard[formName] = false;
  }
}

function close() {
  appStore.isFormEditorOpen = false;
}

async function save() {
  const patch = {};
  for (const [form, suffix] of Object.entries(inputMappings)) {
    if (suffix && suffix.trim() !== '') {
      patch[form] = suffix.trim().toLowerCase();
    } else if (isExplicitStandard[form]) {
      patch[form] = '';
    }
  }

  if (typeof window !== 'undefined' && window.electronAPI?.saveForms) {
    await window.electronAPI.saveForms(patch);
    appStore.showToast('Correspondances de formes enregistrées.');
    await pokemonStore.loadData();
  }
  close();
}
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-box {
  background: #FFFFFF;
  border-radius: 12px;
  width: 760px;
  max-width: 95%;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1E293B;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #94A3B8;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: color 0.15s ease;
}

.close-btn:hover {
  color: #475569;
}

.editor-desc {
  font-size: 0.85rem;
  color: #475569;
  line-height: 1.45;
  margin-bottom: 1rem;
}

.editor-desc code {
  background: #F1F5F9;
  padding: 0.15rem 0.35rem;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #0F172A;
}

.affected-pokemon-box {
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  color: #92400E;
  padding: 0.55rem 0.85rem;
  border-radius: 6px;
  font-size: 0.82rem;
  margin-bottom: 1rem;
  line-height: 1.4;
}

.table-container {
  overflow-y: auto;
  max-height: 340px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.diagnostic-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.85rem;
}

.diagnostic-table thead {
  position: sticky;
  top: 0;
  background: #F8FAFC;
  z-index: 2;
  border-bottom: 1px solid #E2E8F0;
}

.diagnostic-table th {
  padding: 0.65rem 0.75rem;
  font-weight: 600;
  color: #475569;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.diagnostic-row {
  border-bottom: 1px solid #F1F5F9;
  transition: background 0.15s ease;
}

.diagnostic-row:hover {
  background: #F8FAFC;
}

.diagnostic-table td {
  padding: 0.65rem 0.75rem;
  vertical-align: middle;
}

.pokemon-cell {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.pokemon-info {
  display: flex;
  flex-direction: column;
}

.pokemon-name {
  font-weight: 600;
  color: #1E293B;
}

.specimen-count {
  font-size: 0.72rem;
  color: #64748B;
}

.raw-form-badge {
  display: inline-block;
  background: #EEF2F6;
  color: #334155;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.78rem;
  font-weight: 500;
}

.id-cell code {
  background: #F1F5F9;
  color: #0284C7;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  font-size: 0.78rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.action-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.standard-form-btn {
  white-space: nowrap;
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  border: 1px solid #CBD5E1;
  background: #F8FAFC;
  color: #334155;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.standard-form-btn:hover {
  background: #E2E8F0;
  border-color: #94A3B8;
}

.standard-form-btn.active {
  background: #ECFDF5;
  color: #047857;
  border-color: #10B981;
}

.suffix-input {
  width: 140px;
  padding: 0.35rem 0.55rem;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  font-size: 0.8rem;
  outline: none;
  transition: border-color 0.15s ease;
}

.suffix-input:focus {
  border-color: #3B82F6;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 0.5rem;
}

.cancel-btn {
  padding: 0.5rem 1rem;
  background: #F1F5F9;
  color: #475569;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}

.cancel-btn:hover {
  background: #E2E8F0;
}

.save-btn {
  padding: 0.5rem 1.1rem;
  background: #2563EB;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.save-btn:hover {
  background: #1D4ED8;
}
</style>
