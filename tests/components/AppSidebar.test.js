import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
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
});
