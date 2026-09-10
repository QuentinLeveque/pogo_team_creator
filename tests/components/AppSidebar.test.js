import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import AppSidebar from '../../src/components/AppSidebar.vue';
import { useAppStore } from '../../src/stores/appStore.js';
import { usePokemonStore } from '../../src/stores/pokemonStore.js';

describe('AppSidebar.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('displays formatted CSV history with total and added counts', () => {
    const appStore = useAppStore();
    appStore.importHistory = [
      {
        id: 'abc1',
        originalFilename: 'poke_genie_export_2.csv',
        importedAt: '2026-09-09T18:00:00.000Z',
        pokemonCountInFile: 1852,
        newPokemonAdded: 1176
      },
      {
        id: 'abc2',
        originalFilename: 'poke_genie_duplicate.csv',
        importedAt: '2026-09-09T19:00:00.000Z',
        pokemonCountInFile: 500,
        newPokemonAdded: 0
      }
    ];

    const wrapper = mount(AppSidebar);
    const historyItems = wrapper.findAll('.history-item');
    expect(historyItems.length).toBe(2);

    expect(historyItems[0].find('.added-tag').text()).toContain('1 852 au total · +1 176 ajoutés');
    expect(historyItems[1].find('.added-tag').text()).toContain('500 au total · 0 nouveau');
  });

  it('renders pvpoke refresh button and triggers refresh', async () => {
    const pokemonStore = usePokemonStore();
    pokemonStore.refreshPvpoke = vi.fn().mockResolvedValue();

    const wrapper = mount(AppSidebar);
    const refreshBtn = wrapper.find('.refresh-pvpoke-btn');
    expect(refreshBtn.exists()).toBe(true);

    await refreshBtn.trigger('click');
    expect(pokemonStore.refreshPvpoke).toHaveBeenCalled();
  });

  it('shows confirmation modal before deleting an individual CSV file and calls removeCsvFile on confirm', async () => {
    const appStore = useAppStore();
    const pokemonStore = usePokemonStore();
    pokemonStore.loadData = vi.fn().mockResolvedValue();

    appStore.importHistory = [
      { id: 'f1', originalFilename: 'file1.csv', importedAt: '2026-09-09', pokemonCountInFile: 10, newPokemonAdded: 10 }
    ];

    window.electronAPI = {
      removeCsvFile: vi.fn().mockResolvedValue({ success: true, totalCount: 0, history: [] })
    };

    const wrapper = mount(AppSidebar);
    const deleteBtn = wrapper.find('.delete-csv-btn');
    expect(deleteBtn.exists()).toBe(true);

    // Initial state: no confirmation modal
    expect(wrapper.find('.confirm-modal-box').exists()).toBe(false);

    // Click trash button -> opens confirmation modal
    await deleteBtn.trigger('click');
    expect(wrapper.find('.confirm-modal-box').exists()).toBe(true);
    expect(wrapper.find('.confirm-modal-box').text()).toContain('Supprimer ce fichier CSV ?');
    expect(wrapper.find('.confirm-modal-box').text()).toContain('file1.csv');

    // Click Annuler -> cancels and closes modal without deleting
    const cancelBtn = wrapper.find('.btn-cancel');
    await cancelBtn.trigger('click');
    expect(wrapper.find('.confirm-modal-box').exists()).toBe(false);
    expect(window.electronAPI.removeCsvFile).not.toHaveBeenCalled();

    // Open modal again and confirm
    await deleteBtn.trigger('click');
    expect(wrapper.find('.confirm-modal-box').exists()).toBe(true);
    const confirmBtn = wrapper.find('.confirm-delete-btn');
    await confirmBtn.trigger('click');
    await flushPromises();

    expect(window.electronAPI.removeCsvFile).toHaveBeenCalledWith('f1');
    expect(pokemonStore.loadData).toHaveBeenCalled();
    expect(wrapper.find('.confirm-modal-box').exists()).toBe(false);
  });

  it('displays confirmation modal on "Tout effacer" and calls removeAllCsvs on confirmation', async () => {
    const appStore = useAppStore();
    const pokemonStore = usePokemonStore();
    pokemonStore.loadData = vi.fn().mockResolvedValue();

    appStore.importHistory = [
      { id: 'f1', originalFilename: 'file1.csv', importedAt: '2026-09-09', pokemonCountInFile: 10, newPokemonAdded: 10 }
    ];

    window.electronAPI = {
      removeAllCsvs: vi.fn().mockResolvedValue({ success: true, totalCount: 0, history: [] })
    };

    const wrapper = mount(AppSidebar);
    const clearAllBtn = wrapper.find('.clear-all-csv-btn');
    expect(clearAllBtn.exists()).toBe(true);

    // Modal not open initially
    expect(wrapper.find('.confirm-modal-box').exists()).toBe(false);

    await clearAllBtn.trigger('click');
    expect(wrapper.find('.confirm-modal-box').exists()).toBe(true);

    // Click confirm in modal
    const confirmBtn = wrapper.find('.confirm-delete-btn');
    await confirmBtn.trigger('click');
    await flushPromises();

    expect(window.electronAPI.removeAllCsvs).toHaveBeenCalled();
    expect(pokemonStore.loadData).toHaveBeenCalled();
    expect(wrapper.find('.confirm-modal-box').exists()).toBe(false);
  });
});
