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
const MOVE_TRANSLATIONS = {
  FAIRY_WIND: 'Vent Féerique',
  WING_ATTACK: 'Cru-Ailes',
  DRAGON_BREATH: 'Draco-Souffle',
  COUNTER: 'Riposte',
  SHADOW_CLAW: 'Griffe Ombre',
  MUD_SHOT: 'Tir de Boue',
  WATER_GUN: 'Pistolet à O',
  BULLET_SEED: 'Balle Graine',
  POISON_JAB: 'Direct Toxik',
  SNARL: 'Aboiement',
  INCINERATE: 'Calcination',
  VOLT_SWITCH: 'Change Éclair',
  GIGATON_HAMMER: 'Marteau Prodigieux',
  BULLDOZE: 'Piétinement',
  HYDRO_CANNON: 'Hydroblast',
  FRENZY_PLANT: 'Végé-Attak',
  BLAST_BURN: 'Rafale Feu',
  DRAGON_CLAW: 'Draco-Griffe',
  BODY_SLAM: 'Plaquage',
  SURF: 'Surf',
  ICE_BEAM: 'Laser Glace',
  THUNDERBOLT: 'Tonnerre',
  FLAMETHROWER: 'Lance-Flammes',
  SHADOW_BALL: 'Ball\'Ombre',
  SLUDGE_BOMB: 'Bomb-Beurk',
  EARTHQUAKE: 'Séisme',
  CLOSE_COMBAT: 'Close Combat',
  CRUNCH: 'Mâchouille',
  FOUL_PLAY: 'Tricherie',
  BRAVE_BIRD: 'Rapace',
  SKY_ATTACK: 'Piqué',
  ROCK_SLIDE: 'Éboulement',
  STONE_EDGE: 'Lame de Roc',
  AQUA_TAIL: 'Aqua-Queue',
  WEATHER_BALL_WATER: 'Ball\'Météo (Eau)',
  WEATHER_BALL_FIRE: 'Ball\'Météo (Feu)',
  WEATHER_BALL_ICE: 'Ball\'Météo (Glace)',
  WEATHER_BALL_ROCK: 'Ball\'Météo (Roche)'
};

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

function translateMove(moveId) {
  if (!moveId) return '';
  return MOVE_TRANSLATIONS[moveId] || moveId;
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
