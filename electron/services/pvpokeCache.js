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

  const isCacheValid = cachedAt && (Date.now() - new Date(cachedAt).getTime() < 24 * 60 * 60 * 1000);

  if (filePath && fs.existsSync(filePath) && isCacheValid && !forceRefresh) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return { data, fromCache: true, cachedAt };
    } catch (e) {
      // Fallback to fetch
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
  const isCacheValid = cachedAt && (Date.now() - new Date(cachedAt).getTime() < 7 * 24 * 60 * 60 * 1000);

  if (filePath && fs.existsSync(filePath) && isCacheValid && !forceRefresh) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
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

module.exports = {
  initPvpokeCache,
  getRankings,
  getGameMaster,
  translateMove,
  MOVE_TRANSLATIONS
};
