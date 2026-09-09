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

  it('toggles pokemonStore.excludeXl when clicking the Sans bonbons XL button', async () => {
    const wrapper = mount(SearchBar);
    const store = usePokemonStore();
    expect(store.excludeXl).toBe(false);

    const xlBtn = wrapper.find('.xl-toggle-btn');
    expect(xlBtn.exists()).toBe(true);
    expect(xlBtn.classes()).not.toContain('active');

    await xlBtn.trigger('click');
    expect(store.excludeXl).toBe(true);
    expect(xlBtn.classes()).toContain('active');

    await xlBtn.trigger('click');
    expect(store.excludeXl).toBe(false);
  });
});

