import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  initPvpokeCache,
  getRankings,
  getEliteMovesMap,
  refreshAll,
  translateMove,
  getGamemasterPokemonMetadata
} from '../electron/services/pvpokeCache.js';

describe('pvpokeCache', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pogo-test-cache-'));
    initPvpokeCache(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('translates common move IDs to French display names', () => {
    expect(translateMove('FAIRY_WIND')).toBe('Vent Féerique');
    expect(translateMove('WING_ATTACK')).toBe('Cru-Ailes');
    expect(translateMove('HYDRO_CANNON')).toBe('Hydroblast');
    // Fallback for untranslated move
    expect(translateMove('UNKNOWN_MOVE_XYZ')).toBe('UNKNOWN_MOVE_XYZ');
  });

  it('translates common and special moves from Game Master correctly into French', () => {
    expect(translateMove('AERIAL_ACE')).toBe('Aéropique');
    expect(translateMove('AURA_SPHERE')).toBe('Aurasphère');
    expect(translateMove('WEATHER_BALL_FIRE')).toBe("Ball'Météo (Feu)");
    expect(translateMove('SACRED_SWORD')).toBe('Lame Sainte');
    expect(translateMove('ACID_SPRAY')).toBe('Bombe Acide');
    expect(translateMove('HYDRO_CANNON')).toBe('Hydroblast');
    expect(translateMove('FRENZY_PLANT')).toBe('Végé-Attaque');
    expect(translateMove('BLAST_BURN')).toBe('Rafale Feu');
  });

  it('saves and reads rankings from local cache file', async () => {
    const mockRankings = [{ speciesId: 'tinkaton', score: 93 }];
    const cacheFile = path.join(tmpDir, 'cache', 'rankings-1500.json');
    const metaFile = path.join(tmpDir, 'cache', 'cache-meta.json');

    fs.mkdirSync(path.join(tmpDir, 'cache'), { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(mockRankings), 'utf-8');
    fs.writeFileSync(metaFile, JSON.stringify({ 'rankings-1500': new Date().toISOString() }), 'utf-8');

    const result = await getRankings('1500');
    expect(result.fromCache).toBe(true);
    expect(result.data.length).toBe(1);
    expect(result.data[0].speciesId).toBe('tinkaton');
  });

  it('extracts eliteMoves map from gamemaster correctly', async () => {
    const fakeGameMaster = {
      pokemon: [
        { speciesId: 'charizard', eliteMoves: ['BLAST_BURN', 'DRAGON_BREATH', 'EMBER', 'WING_ATTACK'] },
        { speciesId: 'venusaur', eliteMoves: ['FRENZY_PLANT'] },
        { speciesId: 'pikachu' }
      ]
    };
    const gmFile = path.join(tmpDir, 'cache', 'gamemaster.json');
    const metaFile = path.join(tmpDir, 'cache', 'cache-meta.json');
    fs.mkdirSync(path.join(tmpDir, 'cache'), { recursive: true });
    fs.writeFileSync(gmFile, JSON.stringify(fakeGameMaster), 'utf-8');
    fs.writeFileSync(metaFile, JSON.stringify({ gamemaster: new Date().toISOString() }), 'utf-8');

    const eliteMap = await getEliteMovesMap();
    expect(eliteMap.charizard).toEqual(['BLAST_BURN', 'DRAGON_BREATH', 'EMBER', 'WING_ATTACK']);
    expect(eliteMap.venusaur).toEqual(['FRENZY_PLANT']);
    expect(eliteMap.pikachu).toEqual([]);
  });

  it('extracts speciesDexMap and familyMap from gamemaster correctly', async () => {
    const fakeGameMaster = {
      pokemon: [
        { speciesId: 'venusaur', dex: 3, family: { id: 'FAMILY_BULBASAUR', parent: 'ivysaur' } },
        { speciesId: 'ivysaur', dex: 2, family: { id: 'FAMILY_BULBASAUR', parent: 'bulbasaur' } },
        { speciesId: 'bulbasaur', dex: 1, family: { id: 'FAMILY_BULBASAUR' } },
        { speciesId: 'skarmory', dex: 227, family: { id: 'FAMILY_SKARMORY' } }
      ]
    };
    const gmFile = path.join(tmpDir, 'cache', 'gamemaster.json');
    const metaFile = path.join(tmpDir, 'cache', 'cache-meta.json');
    fs.mkdirSync(path.join(tmpDir, 'cache'), { recursive: true });
    fs.writeFileSync(gmFile, JSON.stringify(fakeGameMaster), 'utf-8');
    fs.writeFileSync(metaFile, JSON.stringify({ gamemaster: new Date().toISOString() }), 'utf-8');

    const { speciesDexMap, familyMap } = await getGamemasterPokemonMetadata();
    expect(speciesDexMap.venusaur).toBe(3);
    expect(speciesDexMap.bulbasaur).toBe(1);
    expect(speciesDexMap.skarmory).toBe(227);

    expect(familyMap.venusaur.parent).toBe('ivysaur');
    expect(familyMap.bulbasaur.parent).toBeUndefined();
    expect(familyMap.skarmory.parent).toBeUndefined();
  });
});

