import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePokemonStore } from '../src/stores/pokemonStore.js';

describe('pokemonStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('filters by view ("my-pokemon" vs "meta")', () => {
    const store = usePokemonStore();
    store.rawMatched = [
      { meta: { nameFr: 'Dracaufeu', score: 90 }, mine: { name: 'Salamèche', ivRankPercent: 98 } },
      { meta: { nameFr: 'Tinkaton', score: 93 }, mine: null }
    ];

    store.activeView = 'my-pokemon';
    expect(store.displayedPokemon.length).toBe(1);
    expect(store.displayedPokemon[0].meta.nameFr).toBe('Dracaufeu');

    store.activeView = 'meta';
    expect(store.displayedPokemon.length).toBe(2);
  });

  it('filters by search query case- and accent-insensitively', () => {
    const store = usePokemonStore();
    store.rawMatched = [
      { meta: { nameFr: 'Dracaufeu', score: 90 }, mine: { name: 'Salamèche' } },
      { meta: { nameFr: 'Laggron', score: 85 }, mine: { name: 'Gobou' } }
    ];
    store.activeView = 'meta';

    store.searchQuery = 'drac';
    expect(store.displayedPokemon.length).toBe(1);

    // Search by pre-evolution name
    store.searchQuery = 'gobou';
    expect(store.displayedPokemon.length).toBe(1);
    expect(store.displayedPokemon[0].meta.nameFr).toBe('Laggron');
  });

  it('sorts list by score, IV rank, name, and dust cost', () => {
    const store = usePokemonStore();
    store.rawMatched = [
      { meta: { nameFr: 'B', score: 80 }, mine: { ivRankPercent: 99, dustCost: 50000 } },
      { meta: { nameFr: 'A', score: 95 }, mine: { ivRankPercent: 80, dustCost: 10000 } }
    ];
    store.activeView = 'meta';

    store.sortOption = 'score';
    expect(store.displayedPokemon[0].meta.nameFr).toBe('A');

    store.sortOption = 'name';
    expect(store.displayedPokemon[0].meta.nameFr).toBe('A');

    store.sortOption = 'ivRank';
    expect(store.displayedPokemon[0].meta.nameFr).toBe('B');

    store.sortOption = 'cost';
    expect(store.displayedPokemon[0].meta.nameFr).toBe('A');
  });

  it('filters out pokemon requiring XL candy when excludeXl is true', () => {
    const store = usePokemonStore();
    store.rawMatched = [
      { meta: { nameFr: 'Azumarill', score: 90 }, mine: { name: 'Azumarill', requiresXl: true } },
      { meta: { nameFr: 'Laggron', score: 88 }, mine: { name: 'Laggron', requiresXl: false } }
    ];
    store.activeView = 'my-pokemon';

    store.excludeXl = false;
    expect(store.displayedPokemon.length).toBe(2);

    store.excludeXl = true;
    expect(store.displayedPokemon.length).toBe(1);
    expect(store.displayedPokemon[0].meta.nameFr).toBe('Laggron');
  });
});

