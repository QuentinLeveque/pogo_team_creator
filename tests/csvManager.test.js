import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  initCsvManager,
  parsePokeGenieCsv,
  getUniqueKey,
  importAndMerge,
  getMasterPokemon,
  removePokemon,
  exportMergedCsv,
  getImportHistory
} from '../electron/services/csvManager.js';

describe('csvManager', () => {
  let tmpDir;

  const validCsv =
`Index,Nom,Forme,Pokemon,Sexe,PC,PV,Atq IV,Déf IV,Rés IV,IV Moyen,Niveau Min,Niveau Max,Attaque Rapide,Attaque Chargée,Attaque Chargée 2,Date Analyse,Date Attrapée,Poids,Taille,Chanceux,Obscur/Purifié,Favori,Poussières,Rang % (G),Rang # (G),Prod Stat (G),Coût Poussières (G),Coût Bonbon (G),Nom (G),Forme (G),Obs/Pur (G),Rang % (U),Rang # (U),Prod Stat (U),Coût Poussières (U),Coût Bonbon (U),Nom (U),Forme (U),Obs/Pur (U),Rang % (L),Rang # (L),Prod Stat (L),Coût Poussières (L),Coût Bonbon (L),Nom (L),Forme (L),Obs/Pur (L),Marqué pour Utilisation en PvP
1,Lixy,,403,♂,680,99,12,15,13,88.9,28.0,28.0,,,,"2025-04-24 15:59",18/12/2021,7.37kg,0.45m,1,0,0,4500,80.85%,785,95.55%,111000,223,Luxio,,0,78.85%,867,97.05%,17500,155,Luxray,,0,,,,,,,,,
2,Dracaufeu,,6,♂,1480,120,1,15,14,66.7,19.5,19.5,,,,"2025-04-24 16:00",10/05/2022,90.5kg,1.7m,0,0,0,2500,98.2%,15,99.1%,0,0,Dracaufeu,,0,,,,,,,,,,,,,,,`;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pogo-test-csv-'));
    initCsvManager(tmpDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('validates and parses valid PokeGenie CSV', () => {
    const res = parsePokeGenieCsv(validCsv);
    expect(res.valid).toBe(true);
    expect(res.data.length).toBe(2);
    expect(res.data[0].Nom).toBe('Lixy');
  });

  it('rejects invalid CSV without required columns', () => {
    const invalidCsv = 'ColA,ColB\n1,2';
    const res = parsePokeGenieCsv(invalidCsv);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('generates a stable unique key', () => {
    const parsed = parsePokeGenieCsv(validCsv).data[0];
    const key = getUniqueKey(parsed);
    expect(key).toBe('Lixy__12_15_13_18/12/2021');
  });

  it('merges on import and avoids duplicates', () => {
    const res1 = importAndMerge(validCsv, 'export1.csv');
    expect(res1.addedCount).toBe(2);
    expect(getMasterPokemon().length).toBe(2);

    // Re-import the exact same file -> 0 added
    const res2 = importAndMerge(validCsv, 'export2.csv');
    expect(res2.addedCount).toBe(0);
    expect(getMasterPokemon().length).toBe(2);

    // Check history
    const history = getImportHistory();
    expect(history.length).toBe(2);
    expect(history[0].originalFilename).toBe('export1.csv');
  });

  it('removes a Pokemon from master collection', () => {
    importAndMerge(validCsv, 'export1.csv');
    const pokemon = getMasterPokemon()[0];
    const key = getUniqueKey(pokemon);

    const removed = removePokemon(key);
    expect(removed).toBe(true);
    expect(getMasterPokemon().length).toBe(1);
  });

  it('exports merged master collection back to CSV string', () => {
    importAndMerge(validCsv, 'export1.csv');
    const exported = exportMergedCsv();
    expect(exported).toContain('Index,Nom,Forme');
    expect(exported).toContain('Lixy');
    expect(exported).toContain('Dracaufeu');
  });
});
