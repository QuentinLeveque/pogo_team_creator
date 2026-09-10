<template>
  <div v-if="appStore.isFormEditorOpen" class="modal-backdrop">
    <div class="modal-box">
      <div class="modal-header">
        <h3>Formes Pokémon non reconnues</h3>
        <button class="close-btn" @click="close">✕</button>
      </div>

      <p class="editor-desc">
        Les formes suivantes issues de vos imports PokeGenie n'ont pas de correspondance avec PvPoke.
        Entrez le suffixe anglais correspondant (ex: <code>galarian</code>, <code>origin</code>, <code>mega</code>, <code>therian</code>).
      </p>

      <div v-if="appStore.unmatchedPokemonNames && appStore.unmatchedPokemonNames.length > 0" class="affected-pokemon-box">
        <strong>Pokémon concernés :</strong> {{ appStore.unmatchedPokemonNames.join(', ') }}
      </div>

      <div class="form-mappings-list">
        <div v-for="form in appStore.unmatchedForms" :key="form" class="mapping-row">
          <span class="french-form">{{ form }}</span>
          <span class="arrow">→</span>
          <input
            v-model="inputMappings[form]"
            type="text"
            class="suffix-input"
            placeholder="suffixe anglais (ex: sky)"
          />
        </div>
      </div>

      <div class="modal-footer">
        <button class="cancel-btn" @click="close">Annuler</button>
        <button class="save-btn" @click="save">Sauvegarder et re-matcher</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue';
import { useAppStore } from '../stores/appStore.js';
import { usePokemonStore } from '../stores/pokemonStore.js';

const appStore = useAppStore();
const pokemonStore = usePokemonStore();

const inputMappings = reactive({});

watch(
  () => appStore.unmatchedForms,
  (forms) => {
    if (forms) {
      forms.forEach(f => {
        if (inputMappings[f] === undefined) {
          inputMappings[f] = appStore.customForms[f] || '';
        }
      });
    }
  },
  { immediate: true }
);

function close() {
  appStore.isFormEditorOpen = false;
}

async function save() {
  const patch = {};
  for (const [form, suffix] of Object.entries(inputMappings)) {
    if (suffix && suffix.trim() !== '') {
      patch[form] = suffix.trim().toLowerCase();
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
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-box {
  background: #FFFFFF;
  border-radius: 10px;
  width: 550px;
  max-width: 90%;
  padding: 1.5rem;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
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
.editor-desc {
  font-size: 0.85rem;
  color: #4A5568;
  line-height: 1.4;
  margin-bottom: 1.25rem;
}
.affected-pokemon-box {
  background: #FEF3C7;
  border: 1px solid #F59E0B;
  color: #92400E;
  padding: 0.6rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 1.25rem;
  line-height: 1.4;
}
.form-mappings-list {
  max-height: 250px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.mapping-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.french-form {
  width: 130px;
  font-weight: 600;
  font-size: 0.85rem;
}
.arrow {
  color: #A0AEC0;
}
.suffix-input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: 1px solid #CBD5E1;
  border-radius: 6px;
  font-size: 0.85rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
.cancel-btn {
  padding: 0.5rem 1rem;
  background: #E2E8F0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
.save-btn {
  padding: 0.5rem 1rem;
  background: #3B82F6;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}
</style>
