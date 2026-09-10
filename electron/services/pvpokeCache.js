const fs = require('fs');
const path = require('path');

let cacheDir = null;
let metaPath = null;

const PVP_URLS = {
  '1500': 'https://pvpoke.com/data/rankings/all/overall/rankings-1500.json',
  '2500': 'https://pvpoke.com/data/rankings/all/overall/rankings-2500.json',
  '10000': 'https://pvpoke.com/data/rankings/all/overall/rankings-10000.json',
  '500': 'https://pvpoke.com/data/rankings/little/overall/rankings-500.json',
  'gamemaster': 'https://pvpoke.com/data/gamemaster.min.json'
};

// Common move translations French
const MOVE_TRANSLATIONS = require('../../src/data/moves.json');

function translateMove(moveId) {
  if (!moveId) return '';
  return MOVE_TRANSLATIONS[moveId] || moveId;
}

function initPvpokeCache(userDataDir) {
  cacheDir = path.join(userDataDir, 'cache');
  metaPath = path.join(cacheDir, 'cache-meta.json');

  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  if (!fs.existsSync(metaPath)) {
    fs.writeFileSync(metaPath, JSON.stringify({}, null, 2), 'utf-8');
  }
}

function getCacheMeta() {
  if (!metaPath || !fs.existsSync(metaPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function setCacheMeta(key, timestamp) {
  const meta = getCacheMeta();
  meta[key] = timestamp;
  if (metaPath) {
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
  }
}


async function fetchFromNetwork(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status} fetching ${url}`);
  }
  return await res.json();
}

async function getRankings(league, forceRefresh = false) {
  const filename = `rankings-${league}.json`;
  const filePath = cacheDir ? path.join(cacheDir, filename) : null;
  const meta = getCacheMeta();
  const cachedAt = meta[`rankings-${league}`];

  if (filePath && fs.existsSync(filePath) && !forceRefresh) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { data, fromCache: true, cachedAt: cachedAt || new Date().toISOString() };
    } catch (e) {
      // Fallback to fetch if parse fails
    }
  }

  const url = PVP_URLS[league];
  if (!url) {
    throw new Error(`Unknown league: ${league}`);
  }

  try {
    const data = await fetchFromNetwork(url);
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
      const now = new Date().toISOString();
      setCacheMeta(`rankings-${league}`, now);
      return { data, fromCache: false, cachedAt: now };
    }
    return { data, fromCache: false, cachedAt: new Date().toISOString() };
  } catch (networkErr) {
    // If offline but cache exists, return stale cache
    if (filePath && fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { data, fromCache: true, cachedAt: cachedAt || 'Inconnu' };
    }
    throw networkErr;
  }
}

async function getGameMaster(forceRefresh = false) {
  const filePath = cacheDir ? path.join(cacheDir, 'gamemaster.json') : null;
  const meta = getCacheMeta();
  const cachedAt = meta.gamemaster;

  if (filePath && fs.existsSync(filePath) && !forceRefresh) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      // Fallback to fetch
    }
  }

  try {
    const data = await fetchFromNetwork(PVP_URLS.gamemaster);
    if (filePath) {
      fs.writeFileSync(filePath, JSON.stringify(data), 'utf-8');
      setCacheMeta('gamemaster', new Date().toISOString());
    }
    return data;
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
    return null;
  }
}

let eliteMovesCache = null;

async function getEliteMovesMap(forceRefresh = false) {
  if (eliteMovesCache && !forceRefresh) {
    return eliteMovesCache;
  }
  const gm = await getGameMaster(forceRefresh);
  const map = {};
  if (gm && Array.isArray(gm.pokemon)) {
    for (const p of gm.pokemon) {
      if (p.speciesId) {
        map[p.speciesId] = Array.isArray(p.eliteMoves) ? p.eliteMoves : [];
      }
    }
  }
  eliteMovesCache = map;
  return map;
}

let gamemasterMetadataCache = null;

async function getGamemasterPokemonMetadata(forceRefresh = false) {
  if (gamemasterMetadataCache && !forceRefresh) {
    return gamemasterMetadataCache;
  }
  const gm = await getGameMaster(forceRefresh);
  const speciesDexMap = {};
  const familyMap = {};
  const speciesStatsMap = {};

  const CPM_40 = 0.7903001;

  if (gm && Array.isArray(gm.pokemon)) {
    for (const p of gm.pokemon) {
      if (p.speciesId) {
        if (p.dex) {
          speciesDexMap[p.speciesId] = p.dex;
        }
        if (p.family) {
          familyMap[p.speciesId] = p.family;
        }
        if (p.baseStats && p.baseStats.atk && p.baseStats.def && p.baseStats.hp) {
          const atk = p.baseStats.atk;
          const def = p.baseStats.def;
          const hp = p.baseStats.hp;
          const maxCp40 = Math.floor(
            ((atk + 15) * Math.sqrt(def + 15) * Math.sqrt(hp + 15) * (CPM_40 ** 2)) / 10
          );
          speciesStatsMap[p.speciesId] = { maxCp40 };
        }
      }
    }
  }

  gamemasterMetadataCache = { speciesDexMap, familyMap, speciesStatsMap };
  return gamemasterMetadataCache;
}

async function refreshAll(leagues = ['1500', '2500', '10000', '500']) {
  const updatedLeagues = [];
  for (const league of leagues) {
    await getRankings(league, true);
    updatedLeagues.push(league);
  }
  await getGameMaster(true);
  await getEliteMovesMap(true);
  await getGamemasterPokemonMetadata(true);
  return {
    success: true,
    updatedLeagues,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  initPvpokeCache,
  getRankings,
  getGameMaster,
  getEliteMovesMap,
  getGamemasterPokemonMetadata,
  refreshAll,
  translateMove,
  MOVE_TRANSLATIONS
};

