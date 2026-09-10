import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CsvImporter from '../../src/components/CsvImporter.vue';
import { useAppStore } from '../../src/stores/appStore.js';
import { usePokemonStore } from '../../src/stores/pokemonStore.js';

describe('CsvImporter.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders import dropzone and history when open', () => {
    const appStore = useAppStore();
    appStore.isImporterOpen = true;
    appStore.importHistory = [
      { id: 'h1', originalFilename: 'batch1.csv', pokemonCountInFile: 50, newPokemonAdded: 50 }
    ];

    const wrapper = mount(CsvImporter);
    expect(wrapper.find('.drop-zone').exists()).toBe(true);
    expect(wrapper.find('.importer-history-section').exists()).toBe(true);
    expect(wrapper.text()).toContain('batch1.csv');
    expect(wrapper.text()).toContain('50 Pokémon');
  });

  it('deletes an individual file from history list', async () => {
    const appStore = useAppStore();
    const pokemonStore = usePokemonStore();
    appStore.isImporterOpen = true;
    appStore.importHistory = [
      { id: 'h1', originalFilename: 'batch1.csv', pokemonCountInFile: 50, newPokemonAdded: 50 }
    ];

    window.electronAPI = {
      removeCsvFile: vi.fn().mockResolvedValue({ success: true, totalCount: 0, history: [] })
    };
    pokemonStore.loadData = vi.fn().mockResolvedValue();

    const wrapper = mount(CsvImporter);
    const deleteBtn = wrapper.find('.delete-csv-btn');
    expect(deleteBtn.exists()).toBe(true);

    await deleteBtn.trigger('click');
    await flushPromises();

    expect(window.electronAPI.removeCsvFile).toHaveBeenCalledWith('h1');
    expect(pokemonStore.loadData).toHaveBeenCalled();
  });

  it('shows confirmation modal and clears all CSVs', async () => {
    const appStore = useAppStore();
    const pokemonStore = usePokemonStore();
    appStore.isImporterOpen = true;
    appStore.importHistory = [
      { id: 'h1', originalFilename: 'batch1.csv', pokemonCountInFile: 50, newPokemonAdded: 50 }
    ];

    window.electronAPI = {
      removeAllCsvs: vi.fn().mockResolvedValue({ success: true, totalCount: 0, history: [] })
    };
    pokemonStore.loadData = vi.fn().mockResolvedValue();

    const wrapper = mount(CsvImporter);
    const clearBtn = wrapper.find('.clear-all-csv-btn');
    expect(clearBtn.exists()).toBe(true);

    await clearBtn.trigger('click');
    expect(wrapper.find('.confirm-backdrop').exists()).toBe(true);

    const confirmBtn = wrapper.find('.confirm-delete-btn');
    await confirmBtn.trigger('click');
    await flushPromises();

    expect(window.electronAPI.removeAllCsvs).toHaveBeenCalled();
    expect(pokemonStore.loadData).toHaveBeenCalled();
    expect(wrapper.find('.confirm-backdrop').exists()).toBe(false);
  });
});
