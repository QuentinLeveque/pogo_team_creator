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
});
