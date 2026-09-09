import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  initPvpokeCache,
  getRankings,
  getEliteMovesMap,
  refreshAll,
  translateMove
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
});

