import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SearchBar from '../../src/components/SearchBar.vue';
import { usePokemonStore } from '../../src/stores/pokemonStore.js';

describe('SearchBar.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('updates pokemonStore searchQuery when user types', async () => {
    const wrapper = mount(SearchBar);
    const store = usePokemonStore();
    const input = wrapper.find('input');

    await input.setValue('Pikachu');
    expect(store.searchQuery).toBe('Pikachu');
  });

  it('updates pokemonStore sortOption when select changes', async () => {
    const wrapper = mount(SearchBar);
    const store = usePokemonStore();
    const select = wrapper.find('select');

    await select.setValue('ivRank');
    expect(store.sortOption).toBe('ivRank');
  });
});
