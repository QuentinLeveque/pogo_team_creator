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
      { meta: { nameFr: 'Azumarill', score: 90, requiresXl: false }, mine: { name: 'Azumarill', requiresXl: true } },
      { meta: { nameFr: 'Méditikka', score: 92, requiresXl: true }, mine: null },
      { meta: { nameFr: 'Laggron', score: 88, requiresXl: false }, mine: { name: 'Laggron', requiresXl: false } }
    ];
    store.activeView = 'meta';

    store.excludeXl = false;
    expect(store.displayedPokemon.length).toBe(3);

    store.excludeXl = true;
    expect(store.displayedPokemon.length).toBe(1);
    expect(store.displayedPokemon[0].meta.nameFr).toBe('Laggron');
  });

  it('switches league quickly using cached rankings without refetching', async () => {
    const store = usePokemonStore();
    store.masterList = [{ Nom: 'Dracaufeu', Forme: '', 'Rang % (G)': '95%', 'Rang # (G)': '12', 'Coût Poussières (G)': '10000', 'Coût Bonbon (G)': '10' }];
    store.pokemonMetadata = { speciesDexMap: { charizard: 6 } };
    store.eliteMovesMap = {};
    store.cachedRankings = {
      '1500': { data: [{ speciesId: 'charizard', score: 88 }] },
      '2500': { data: [{ speciesId: 'charizard', score: 92 }] }
    };

    window.electronAPI = {
      getRankings: vi.fn()
    };

    await store.changeLeague('2500');
    expect(window.electronAPI.getRankings).not.toHaveBeenCalled();
    expect(store.rawMatched.length).toBe(1);
    expect(store.rawMatched[0].meta.score).toBe(92);

    // Switching to 1500 uses cache directly
    await store.changeLeague('1500');
    expect(window.electronAPI.getRankings).not.toHaveBeenCalled();
    expect(store.rawMatched[0].meta.score).toBe(88);

    // Returning to 2500 now restores from cachedMatchedByLeague instantly without recalculating
    expect(store.cachedMatchedByLeague['2500']).toBeDefined();
    await store.changeLeague('2500');
    expect(store.rawMatched[0].meta.score).toBe(92);
  });

  it('fetches only the target league rankings if not in memory during changeLeague', async () => {
    const store = usePokemonStore();
    store.masterList = [{ Nom: 'Dracaufeu', Forme: '', 'Rang % (U)': '98%', 'Rang # (U)': '5' }];
    store.pokemonMetadata = { speciesDexMap: { charizard: 6 } };
    store.eliteMovesMap = {};
    store.cachedRankings = {
      '1500': { data: [{ speciesId: 'charizard', score: 88 }] }
    };

    window.electronAPI = {
      getRankings: vi.fn().mockResolvedValue({ data: [{ speciesId: 'charizard', score: 95 }] })
    };

    await store.changeLeague('2500');
    expect(window.electronAPI.getRankings).toHaveBeenCalledWith('2500');
    expect(store.cachedRankings['2500']).toBeDefined();
    expect(store.rawMatched[0].meta.score).toBe(95);
  });
});


