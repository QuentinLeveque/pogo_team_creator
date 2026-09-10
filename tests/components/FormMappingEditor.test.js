import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import FormMappingEditor from '../../src/components/FormMappingEditor.vue';
import { useAppStore } from '../../src/stores/appStore.js';

describe('FormMappingEditor.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders unrecognized forms and saves mappings', async () => {
    const appStore = useAppStore();
    appStore.isFormEditorOpen = true;
    appStore.unmatchedForms = ['Céleste', 'Terrestre'];

    window.electronAPI = {
      saveForms: vi.fn().mockResolvedValue({ 'Céleste': 'sky', 'Terrestre': 'land' })
    };

    const wrapper = mount(FormMappingEditor);
    expect(wrapper.text()).toContain('Céleste');
    expect(wrapper.text()).toContain('Terrestre');

    const inputs = wrapper.findAll('input');
    await inputs[0].setValue('sky');
    await inputs[1].setValue('land');

    await wrapper.find('.save-btn').trigger('click');
    expect(window.electronAPI.saveForms).toHaveBeenCalledWith({
      'Céleste': 'sky',
      'Terrestre': 'land'
    });
  });

  it('displays the list of affected Pokemon names in the modal', () => {
    const appStore = useAppStore();
    appStore.isFormEditorOpen = true;
    appStore.unmatchedForms = ['Forme Bizarre'];
    appStore.unmatchedPokemonNames = ['Deoxys', 'Necrozma'];

    const wrapper = mount(FormMappingEditor);
    const pokemonBox = wrapper.find('.affected-pokemon-box');
    expect(pokemonBox.exists()).toBe(true);
    expect(pokemonBox.text()).toContain('Deoxys, Necrozma');
  });

  it('renders diagnostic table with pokemon info and allows setting empty standard form suffix', async () => {
    const appStore = useAppStore();
    appStore.isFormEditorOpen = true;
    appStore.unmatchedForms = ['Costume Fête'];
    appStore.unmatchedFormDetails = [
      {
        pokemonNameFr: 'Pikachu',
        rawForm: 'Costume Fête',
        dexNumber: 25,
        generatedId: 'pikachu_costume_fete',
        count: 3
      }
    ];

    window.electronAPI = {
      saveForms: vi.fn().mockResolvedValue({})
    };

    const wrapper = mount(FormMappingEditor);

    // Vérifier la présence du tableau diagnostique
    expect(wrapper.find('.diagnostic-table').exists()).toBe(true);
    expect(wrapper.text()).toContain('Pikachu');
    expect(wrapper.text()).toContain('Costume Fête');
    expect(wrapper.text()).toContain('pikachu_costume_fete');
    expect(wrapper.text()).toContain('3 ex.');

    // Clic sur le bouton action rapide "Forme standard"
    const standardBtn = wrapper.find('.standard-form-btn');
    expect(standardBtn.exists()).toBe(true);
    await standardBtn.trigger('click');

    // Sauvegarder
    await wrapper.find('.save-btn').trigger('click');
    expect(window.electronAPI.saveForms).toHaveBeenCalledWith({
      'Costume Fête': ''
    });
  });
});
