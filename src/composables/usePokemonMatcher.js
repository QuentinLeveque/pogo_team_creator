import { toSpeciesId, speciesIdToFrench } from '../../electron/services/nameTranslator.js';
import { translateMove } from '../data/moves.js';
import { calculateResourceCosts } from '../utils/costCalculator.js';

function parsePercent(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(',', '.').replace('%', '')) || 0;
}

function parseNumber(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(',', '.')) || 0;
}

function buildReverseEvolutionPath(speciesId, familyMap, customForms) {
  if (!familyMap || !speciesId) return null;
  const cleanId = (id) => id ? id.replace(/_shadow$/, '') : '';
  let curr = speciesId;
  const visited = new Set();
  const chain = [];

  while (curr && !visited.has(curr)) {
    visited.add(curr);
    const entry = familyMap[curr] || familyMap[cleanId(curr)];
    if (!entry || !entry.parent) break;
    chain.push(entry.parent);
    curr = entry.parent;
  }

  if (chain.length === 0) return null;

  const allIds = [speciesId, ...chain];
  const frenchNames = allIds.map(id => {
    const info = speciesIdToFrench(id, customForms);
    return info.frenchName || id;
  });

  return frenchNames.join(' ⇽ ');
}

export function matchPokemon(masterList, rankings, league, customForms = {}, eliteMovesMap = {}, metadata = {}) {
  const unmatchedFormsSet = new Set();
  const unmatchedPokemonSet = new Set();
  const candidatesBySpecies = new Map();

  const isMaster = league === '10000';
  const suffix = league === '1500' ? ' (G)' : league === '2500' ? ' (U)' : league === '500' ? ' (L)' : '';

  // Scan masterList for unknown forms across all specimens
  for (const row of masterList) {
    const rawNom = row['Nom'] || '';
    const formsToCheck = new Set([row['Forme'], row[`Forme${suffix}`]].filter(Boolean));
    for (const fVal of formsToCheck) {
      if (fVal.trim() !== '' && fVal.trim() !== 'Normale') {
        const check = toSpeciesId(rawNom, fVal, false, customForms);
        if (check.unmatched && check.unmatchedForm) {
          unmatchedFormsSet.add(check.unmatchedForm);
          if (rawNom) {
            unmatchedPokemonSet.add(rawNom);
          }
        }
      }
    }
  }

  for (const row of masterList) {
    let targetName = '';
    let targetForm = '';
    let rankPercent = 0;
    let ivAverage = 0;
    let dustCost = 0;
    let candyCost = 0;
    let rankNumber = 0;

    if (isMaster) {
      targetName = row['Nom'] || '';
      targetForm = row['Forme'] || '';
      ivAverage = parseNumber(row['IV Moyen']);
      if (ivAverage <= 85) continue;
    } else {
      const rankKey = `Rang %${suffix}`;
      if (!row[rankKey] || row[rankKey].trim() === '') continue;
      targetName = row[`Nom${suffix}`] || row['Nom'] || '';
      targetForm = row[`Forme${suffix}`] || row['Forme'] || '';
      rankPercent = parsePercent(row[rankKey]);
      rankNumber = parseInt(row[`Rang #${suffix}`], 10) || 0;
      dustCost = parseInt(row[`Coût Poussières${suffix}`], 10) || 0;
      candyCost = parseInt(row[`Coût Bonbon${suffix}`], 10) || 0;
    }

    const isShadow = row['Obscur/Purifié'] === '1' || row[`Obs/Pur${suffix}`] === '1';
    const isLucky = row['Chanceux'] === '1';
    const initialLevel = parseNumber(row['Niveau Min']);

    const costs = calculateResourceCosts(initialLevel, dustCost, candyCost, isShadow, isLucky);

    const translation = toSpeciesId(targetName, targetForm, isShadow, customForms);

    if (translation.unmatched && translation.unmatchedForm) {
      unmatchedFormsSet.add(translation.unmatchedForm);
    }

    const speciesId = translation.id;
    if (!speciesId) continue;

    const candidate = {
      dexNumber: parseInt(row['Pokemon'], 10) || 0,
      name: row['Nom'],
      form: row['Forme'] || '',
      targetEvolvedName: targetName,
      cp: parseInt(row['PC'], 10) || 0,
      level: initialLevel,
      atkIv: parseInt(row['Atq IV'], 10) || 0,
      defIv: parseInt(row['Déf IV'], 10) || 0,
      staIv: parseInt(row['Rés IV'], 10) || 0,
      ivAverage: parseNumber(row['IV Moyen']),
      ivRankPercent: rankPercent,
      ivRankNumber: rankNumber,
      isShadow,
      isLucky,
      dustCost: costs.dustCost,
      candyCost: costs.candyCost,
      xlCandyCost: costs.xlCandyCost,
      requiresXl: costs.requiresXl,
      fastMove: row['Attaque Rapide'] || '',
      chargedMove1: row['Attaque Chargée'] || '',
      chargedMove2: row['Attaque Chargée 2'] || '',
      needsEvolution: (row['Nom'] || '').toLowerCase() !== targetName.toLowerCase(),
      uniqueKey: `${row['Nom']}_${row['Forme']}_${row['Atq IV']}_${row['Déf IV']}_${row['Rés IV']}_${row['Date Attrapée'] || row['Date Analyse'] || ''}`
    };

    if (!candidatesBySpecies.has(speciesId)) {
      candidatesBySpecies.set(speciesId, []);
    }
    candidatesBySpecies.get(speciesId).push(candidate);
  }

  // Sort candidates and select primary specimen per species
  const ownedCandidatesBySpecies = new Map();
  const sortCandidates = (a, b) => isMaster ? (b.ivAverage - a.ivAverage) : (b.ivRankPercent - a.ivRankPercent);

  for (const [speciesId, candidates] of candidatesBySpecies.entries()) {
    const evolvedCandidates = candidates.filter(c => (c.name || '').toLowerCase() === (c.targetEvolvedName || '').toLowerCase());
    const unevolvedCandidates = candidates.filter(c => (c.name || '').toLowerCase() !== (c.targetEvolvedName || '').toLowerCase());

    evolvedCandidates.sort(sortCandidates);
    unevolvedCandidates.sort(sortCandidates);

    if (evolvedCandidates.length > 0) {
      const chosen = { ...evolvedCandidates[0] };
      chosen.isAlreadyEvolved = true;
      chosen.needsEvolution = false;
      if (unevolvedCandidates.length > 0) {
        const bestUnevolved = unevolvedCandidates[0];
        const isBetter = isMaster
          ? bestUnevolved.ivAverage > chosen.ivAverage
          : bestUnevolved.ivRankPercent > chosen.ivRankPercent;
        if (isBetter) {
          chosen.betterUnevolvedCandidate = bestUnevolved;
        }
      }
      ownedCandidatesBySpecies.set(speciesId, chosen);
    } else if (unevolvedCandidates.length > 0) {
      const chosen = { ...unevolvedCandidates[0] };
      chosen.isAlreadyEvolved = false;
      chosen.needsEvolution = true;
      chosen.betterUnevolvedCandidate = null;
      ownedCandidatesBySpecies.set(speciesId, chosen);
    }
  }

function normalizeMove(str) {
  if (!str) return '';
  return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

function moveMatches(specimenMoves, targetNameFr) {
  const normTarget = normalizeMove(targetNameFr);
  if (!normTarget) return false;
  return specimenMoves.some(sm => {
    const normSm = normalizeMove(sm);
    return normSm === normTarget || (normSm.length >= 6 && normTarget.length >= 6 && (normSm.startsWith(normTarget) || normTarget.startsWith(normSm)));
  });
}

  const matched = rankings.map((ranking, index) => {
    const speciesId = ranking.speciesId;
    const { frenchName } = speciesIdToFrench(speciesId, customForms);
    const owned = ownedCandidatesBySpecies.get(speciesId) || null;

    const eliteMoves = (eliteMovesMap && eliteMovesMap[speciesId]) || [];
    const specimenMoves = owned
      ? [owned.fastMove, owned.chargedMove1, owned.chargedMove2].filter(Boolean)
      : [];

    const moveset = ranking.moveset || [];
    const fastId = moveset[0] || '';
    const fastNameFr = fastId ? translateMove(fastId) : '';
    const fastMove = fastId ? {
      moveId: fastId,
      nameFr: fastNameFr,
      isElite: eliteMoves.includes(fastId),
      isKnown: moveMatches(specimenMoves, fastNameFr),
      toString() { return this.nameFr; }
    } : { moveId: '', nameFr: '', isElite: false, isKnown: false, toString() { return ''; } };

    const chargedMoves = moveset.slice(1).map(m => {
      const nameFr = translateMove(m);
      return {
        moveId: m,
        nameFr,
        isElite: eliteMoves.includes(m),
        isKnown: moveMatches(specimenMoves, nameFr),
        toString() { return this.nameFr; }
      };
    });

    const matchups = (ranking.matchups || []).slice(0, 5).map(m => {
      const info = speciesIdToFrench(m.opponent, customForms);
      return {
        opponent: m.opponent,
        opponentNameFr: info.frenchName + (info.isShadow ? ' (Obs)' : ''),
        rating: m.rating
      };
    });

    const counters = (ranking.counters || []).slice(0, 5).map(c => {
      const info = speciesIdToFrench(c.opponent, customForms);
      return {
        opponent: c.opponent,
        opponentNameFr: info.frenchName + (info.isShadow ? ' (Obs)' : ''),
        rating: c.rating
      };
    });

    const speciesDexMap = metadata?.speciesDexMap || {};
    const familyMap = metadata?.familyMap || {};
    const cleanSpeciesId = speciesId ? speciesId.replace(/_shadow$/, '') : '';
    const dexNumber = ranking.dex || speciesDexMap[speciesId] || speciesDexMap[cleanSpeciesId] || (owned ? owned.dexNumber : 0);
    const reverseEvolutionPath = buildReverseEvolutionPath(speciesId, familyMap, customForms);

    return {
      meta: {
        speciesId,
        dexNumber,
        reverseEvolutionPath,
        speciesName: ranking.speciesName,
        nameFr: frenchName,
        score: ranking.score,
        rank: index + 1,
        types: ranking.types || [],
        recommendedMoveset: {
          fast: fastMove,
          charged: chargedMoves
        },
        matchups,
        counters
      },
      mine: owned
    };
  });

  return {
    matched,
    unmatchedForms: Array.from(unmatchedFormsSet),
    unmatchedPokemonNames: Array.from(unmatchedPokemonSet)
  };
}
