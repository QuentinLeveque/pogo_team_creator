import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parsePokeGenieCsv, getUniqueKey } from '../electron/services/csvManager.js';
import { matchPokemon } from '../src/composables/usePokemonMatcher.js';

describe('Real-world Data Integration Test', () => {
  const csvPath = path.resolve(__dirname, '../old/poke_genie_export.csv');

  it('parses real poke_genie_export.csv without errors', () => {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const result = parsePokeGenieCsv(content);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.data.length).toBe(673);

    // Verify key generation on real data
    const keys = result.data.map(p => getUniqueKey(p));
    const uniqueKeys = new Set(keys);
    // 673 rows with 18 duplicate scans in original export -> 655 unique Pokemon
    expect(uniqueKeys.size).toBe(655);
  });

  it('matches real data against sample PvPoke rankings', () => {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const { data } = parsePokeGenieCsv(content);

    // Sample rankings with a few Pokémon that exist in the export
    const sampleRankings = [
      {
        speciesId: 'luxray',
        speciesName: 'Luxray',
        score: 80,
        moveset: ['SPARK', 'WILD_CHARGE', 'CRUNCH'],
        matchups: [],
        counters: []
      },
      {
        speciesId: 'swampert',
        speciesName: 'Swampert',
        score: 92,
        moveset: ['MUD_SHOT', 'HYDRO_CANNON', 'EARTHQUAKE'],
        matchups: [],
        counters: []
      }
    ];

    const { matched } = matchPokemon(data, sampleRankings, '2500');
    expect(matched.length).toBe(2);

    const luxray = matched.find(m => m.meta.speciesId === 'luxray');
    expect(luxray).toBeDefined();
    expect(luxray.mine).not.toBeNull();
    expect(luxray.mine.name).toBe('Lixy'); // Pre-evolution
    expect(luxray.mine.needsEvolution).toBe(true);
  });
});
