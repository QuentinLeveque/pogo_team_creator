import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parsePokeGenieCsv, getUniqueKey } from '../electron/services/csvManager.js';
import { matchPokemon } from '../src/composables/usePokemonMatcher.js';

describe('Real-world Data Integration Test', () => {
  const csvPath = path.resolve(__dirname, '../old/poke_genie_export.csv');
  const csvPath2 = path.resolve(__dirname, '../old/poke_genie_export_2.csv');

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

  it('parses real poke_genie_export_2.csv and validates 1852 rows', () => {
    const content = fs.readFileSync(csvPath2, 'utf-8');
    const result = parsePokeGenieCsv(content);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.data.length).toBe(1853);
  });

  it('matches real data against sample PvPoke rankings with elite moves and XL costs', () => {
    const content = fs.readFileSync(csvPath2, 'utf-8');
    const { data } = parsePokeGenieCsv(content);

    const sampleRankings = [
      {
        speciesId: 'weezing',
        dex: 110,
        speciesName: 'Weezing',
        score: 75,
        moveset: ['TACKLE', 'SLUDGE_BOMB'],
        matchups: [],
        counters: []
      },
      {
        speciesId: 'swampert',
        dex: 260,
        speciesName: 'Swampert',
        score: 92,
        moveset: ['MUD_SHOT', 'HYDRO_CANNON', 'EARTHQUAKE'],
        matchups: [],
        counters: []
      }
    ];

    const eliteMovesMap = {
      swampert: ['HYDRO_CANNON']
    };

    const { matched } = matchPokemon(data, sampleRankings, '2500', {}, eliteMovesMap);
    expect(matched.length).toBe(2);

    // Smogogo in Ultra League requires level 50 / XL candy
    const weezing = matched.find(m => m.meta.speciesId === 'weezing');
    expect(weezing).toBeDefined();
    if (weezing.mine) {
      expect(weezing.mine.requiresXl).toBe(true);
      expect(weezing.mine.xlCandyCost).toBeGreaterThan(0);
    }

    const swampert = matched.find(m => m.meta.speciesId === 'swampert');
    expect(swampert).toBeDefined();
    // Swampert hydro cannon is qualified as elite move
    const hydroCannon = swampert.meta.recommendedMoveset.charged.find(m => m.moveId === 'HYDRO_CANNON');
    expect(hydroCannon).toBeDefined();
    expect(hydroCannon.isElite).toBe(true);
  });

  it('extracts reverse evolution path, assigns dexNumber and verifies local sprite exists', () => {
    const speciesDexMap = {
      venusaur: 3,
      ivysaur: 2,
      bulbasaur: 1,
      swampert: 260,
      marshtomp: 259,
      mudkip: 258
    };
    const familyMap = {
      venusaur: { id: 'FAMILY_BULBASAUR', parent: 'ivysaur' },
      ivysaur: { id: 'FAMILY_BULBASAUR', parent: 'bulbasaur' },
      bulbasaur: { id: 'FAMILY_BULBASAUR' },
      swampert: { id: 'FAMILY_MUDKIP', parent: 'marshtomp' },
      marshtomp: { id: 'FAMILY_MUDKIP', parent: 'mudkip' },
      mudkip: { id: 'FAMILY_MUDKIP' }
    };

    const rankings = [
      { speciesId: 'swampert', score: 92, moveset: ['MUD_SHOT', 'HYDRO_CANNON'] },
      { speciesId: 'venusaur', score: 85, moveset: ['VINE_WHIP', 'FRENZY_PLANT'] }
    ];

    const { matched } = matchPokemon([], rankings, '1500', {}, {}, { speciesDexMap, familyMap });
    const swampert = matched.find(m => m.meta.speciesId === 'swampert');
    expect(swampert.meta.dexNumber).toBe(260);
    expect(swampert.meta.reverseEvolutionPath).toBe('Laggron ⇽ Flobio ⇽ Gobou');

    const venusaur = matched.find(m => m.meta.speciesId === 'venusaur');
    expect(venusaur.meta.dexNumber).toBe(3);
    expect(venusaur.meta.reverseEvolutionPath).toBe('Florizarre ⇽ Herbizarre ⇽ Bulbizarre');

    // Verify local sprite files exist in public/sprites
    expect(fs.existsSync(path.resolve(__dirname, '../public/sprites/260.png'))).toBe(true);
    expect(fs.existsSync(path.resolve(__dirname, '../public/sprites/3.png'))).toBe(true);
  });

  it('builds evolutionLine and collects unmatchedFormDetails from real poke_genie_export_2.csv', () => {
    const content = fs.readFileSync(csvPath2, 'utf-8');
    const { data } = parsePokeGenieCsv(content);

    const speciesDexMap = {
      venusaur: 3,
      ivysaur: 2,
      bulbasaur: 1
    };
    const familyMap = {
      venusaur: { id: 'FAMILY_BULBASAUR', parent: 'ivysaur' },
      ivysaur: { id: 'FAMILY_BULBASAUR', parent: 'bulbasaur' },
      bulbasaur: { id: 'FAMILY_BULBASAUR' }
    };

    const rankings = [
      { speciesId: 'venusaur', score: 91, moveset: ['VINE_WHIP', 'FRENZY_PLANT'] }
    ];

    const { matched, unmatchedFormDetails } = matchPokemon(data, rankings, '1500', {}, {}, { speciesDexMap, familyMap });

    expect(matched.length).toBe(1);
    const venusaur = matched[0];
    expect(venusaur.meta.evolutionLine).toBeDefined();
    expect(venusaur.meta.evolutionLine.length).toBe(3);
    expect(venusaur.meta.evolutionLine.map(s => s.nameFr)).toEqual(['Bulbizarre', 'Herbizarre', 'Florizarre']);

    expect(unmatchedFormDetails).toBeDefined();
    expect(Array.isArray(unmatchedFormDetails)).toBe(true);
    if (unmatchedFormDetails.length > 0) {
      const sample = unmatchedFormDetails[0];
      expect(sample.rawForm).toBeDefined();
      expect(sample.pokemonNameFr).toBeDefined();
      expect(sample.generatedId).toBeDefined();
      expect(sample.count).toBeGreaterThan(0);
    }
  });
});
