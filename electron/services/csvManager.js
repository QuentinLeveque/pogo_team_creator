const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let storageDir = null;
let masterPath = null;
let historyPath = null;
let originalsDir = null;

const REQUIRED_COLUMNS = ['Nom', 'Forme', 'Atq IV', 'Déf IV', 'Rés IV', 'Date Attrapée'];

function initCsvManager(userDataDir) {
  storageDir = path.join(userDataDir, 'csv-library');
  originalsDir = path.join(storageDir, 'originals');
  masterPath = path.join(storageDir, 'master.json');
  historyPath = path.join(storageDir, 'import-history.json');

  if (!fs.existsSync(originalsDir)) {
    fs.mkdirSync(originalsDir, { recursive: true });
  }

  if (!fs.existsSync(masterPath)) {
    fs.writeFileSync(masterPath, JSON.stringify([], null, 2), 'utf-8');
  }

  if (!fs.existsSync(historyPath)) {
    fs.writeFileSync(historyPath, JSON.stringify([], null, 2), 'utf-8');
  }
}

// Simple RFC 4180 compliant CSV line parser
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parsePokeGenieCsv(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, errors: ['Contenu CSV vide ou invalide'], data: [] };
  }

  const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { valid: false, errors: ['Le fichier ne contient pas de données'], data: [] };
  }

  const headers = parseCsvLine(lines[0]);
  const missingHeaders = REQUIRED_COLUMNS.filter(col => !headers.includes(col));

  if (missingHeaders.length > 0) {
    return {
      valid: false,
      errors: [`Colonnes manquantes: ${missingHeaders.join(', ')}`],
      data: []
    };
  }

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] !== undefined ? values[index] : '';
    });
    data.push(row);
  }

  return { valid: true, errors: [], data };
}

function getUniqueKey(pokemon) {
  const nom = pokemon.Nom || '';
  const forme = pokemon.Forme || '';
  const atq = pokemon['Atq IV'] || '';
  const def = pokemon['Déf IV'] || '';
  const sta = pokemon['Rés IV'] || '';
  const date = (pokemon['Date Attrapée'] && pokemon['Date Attrapée'].trim() !== '')
    ? pokemon['Date Attrapée']
    : (pokemon['Date Analyse'] || '');
  return `${nom}_${forme}_${atq}_${def}_${sta}_${date}`;
}

function getMasterPokemon() {
  if (!masterPath || !fs.existsSync(masterPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(masterPath, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function getImportHistory() {
  if (!historyPath || !fs.existsSync(historyPath)) return [];
  try {
    return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function importAndMerge(csvContent, originalFilename) {
  const parsed = parsePokeGenieCsv(csvContent);
  if (!parsed.valid) {
    throw new Error(parsed.errors.join('; '));
  }

  const master = getMasterPokemon();
  const existingKeySet = new Set(master.map(p => getUniqueKey(p)));

  let addedCount = 0;
  for (const item of parsed.data) {
    const key = getUniqueKey(item);
    if (!existingKeySet.has(key)) {
      master.push(item);
      existingKeySet.add(key);
      addedCount++;
    }
  }

  fs.writeFileSync(masterPath, JSON.stringify(master, null, 2), 'utf-8');

  // Archive original CSV
  const dateStr = new Date().toISOString().slice(0, 10);
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const storedFilename = `export_${dateStr}_${randomSuffix}.csv`;
  fs.writeFileSync(path.join(originalsDir, storedFilename), csvContent, 'utf-8');

  // Update history
  const history = getImportHistory();
  const historyEntry = {
    id: randomSuffix,
    originalFilename,
    storedFilename,
    importedAt: new Date().toISOString(),
    pokemonCountInFile: parsed.data.length,
    newPokemonAdded: addedCount
  };
  history.push(historyEntry);
  fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');

  return {
    success: true,
    addedCount,
    totalCount: master.length,
    historyEntry
  };
}

function removePokemon(uniqueKey) {
  const master = getMasterPokemon();
  const initialLen = master.length;
  const filtered = master.filter(p => getUniqueKey(p) !== uniqueKey);

  if (filtered.length !== initialLen) {
    fs.writeFileSync(masterPath, JSON.stringify(filtered, null, 2), 'utf-8');
    return true;
  }
  return false;
}

function exportMergedCsv() {
  const master = getMasterPokemon();
  if (master.length === 0) return '';

  const headers = Object.keys(master[0]);
  const rows = [headers.join(',')];

  for (const item of master) {
    const line = headers.map(h => {
      const val = (item[h] !== undefined && item[h] !== null) ? String(item[h]) : '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
    rows.push(line);
  }

  return rows.join('\n');
}

function removeAllCsvs() {
  const history = getImportHistory();
  if (originalsDir && fs.existsSync(originalsDir)) {
    for (const entry of history) {
      if (entry.storedFilename) {
        const filePath = path.join(originalsDir, entry.storedFilename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error('Failed to unlink archive file:', e);
          }
        }
      }
    }
  }

  if (masterPath) {
    fs.writeFileSync(masterPath, JSON.stringify([], null, 2), 'utf-8');
  }
  if (historyPath) {
    fs.writeFileSync(historyPath, JSON.stringify([], null, 2), 'utf-8');
  }

  return { success: true, totalCount: 0, history: [] };
}

function removeCsvFile(historyId) {
  const history = getImportHistory();
  const index = history.findIndex(h => h.id === historyId);
  if (index === -1) {
    throw new Error(`Entrée d'historique non trouvée : ${historyId}`);
  }

  const target = history[index];
  if (originalsDir && target.storedFilename) {
    const targetPath = path.join(originalsDir, target.storedFilename);
    if (fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
      } catch (e) {
        console.error('Failed to unlink target archive file:', e);
      }
    }
  }

  history.splice(index, 1);
  if (historyPath) {
    fs.writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf-8');
  }

  // Reconstitute master.json from remaining CSVs
  const newMaster = [];
  const existingKeys = new Set();

  for (const entry of history) {
    if (originalsDir && entry.storedFilename) {
      const filePath = path.join(originalsDir, entry.storedFilename);
      if (fs.existsSync(filePath)) {
        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const parsed = parsePokeGenieCsv(content);
          if (parsed.valid) {
            for (const item of parsed.data) {
              const key = getUniqueKey(item);
              if (!existingKeys.has(key)) {
                newMaster.push(item);
                existingKeys.add(key);
              }
            }
          }
        } catch (err) {
          console.error(`Failed to reparse ${entry.storedFilename}:`, err);
        }
      }
    }
  }

  if (masterPath) {
    fs.writeFileSync(masterPath, JSON.stringify(newMaster, null, 2), 'utf-8');
  }

  return { success: true, totalCount: newMaster.length, history };
}

module.exports = {
  initCsvManager,
  parsePokeGenieCsv,
  getUniqueKey,
  getMasterPokemon,
  getImportHistory,
  importAndMerge,
  removePokemon,
  exportMergedCsv,
  removeAllCsvs,
  removeCsvFile
};
