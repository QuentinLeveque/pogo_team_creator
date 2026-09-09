const { toSpeciesId, speciesIdToFrench } = require('../../electron/services/nameTranslator.js');
const { translateMove } = require('../../electron/services/pvpokeCache.js');

function parsePercent(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(',', '.').replace('%', '')) || 0;
}

function parseNumber(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(',', '.')) || 0;
}

function matchPokemon(masterList, rankings, league, customForms = {}) {
  const unmatchedFormsSet = new Set();
  const ownedCandidatesBySpecies = new Map();

  const isMaster = league === '10000';
  const suffix = league === '1500' ? ' (G)' : league === '2500' ? ' (U)' : league === '500' ? ' (L)' : '';

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
    const translation = toSpeciesId(targetName, targetForm, isShadow, customForms);

    if (translation.unmatched && translation.unmatchedForm) {
      unmatchedFormsSet.add(translation.unmatchedForm);
    }

    const speciesId = translation.id;
    if (!speciesId) continue;

    const candidate = {
      name: row['Nom'],
      form: row['Forme'] || '',
      targetEvolvedName: targetName,
      cp: parseInt(row['PC'], 10) || 0,
      level: parseNumber(row['Niveau Min']),
      atkIv: parseInt(row['Atq IV'], 10) || 0,
      defIv: parseInt(row['Déf IV'], 10) || 0,
      staIv: parseInt(row['Rés IV'], 10) || 0,
      ivAverage: parseNumber(row['IV Moyen']),
      ivRankPercent: rankPercent,
      ivRankNumber: rankNumber,
      isShadow,
      isLucky: row['Chanceux'] === '1',
      dustCost,
      candyCost,
      needsEvolution: (row['Nom'] || '').toLowerCase() !== targetName.toLowerCase(),
      uniqueKey: `${row['Nom']}_${row['Forme']}_${row['Atq IV']}_${row['Déf IV']}_${row['Rés IV']}_${row['Date Attrapée']}`
    };

    if (!ownedCandidatesBySpecies.has(speciesId)) {
      ownedCandidatesBySpecies.set(speciesId, candidate);
    } else {
      const existing = ownedCandidatesBySpecies.get(speciesId);
      if (isMaster) {
        if (candidate.ivAverage > existing.ivAverage) {
          ownedCandidatesBySpecies.set(speciesId, candidate);
        }
      } else {
        if (candidate.ivRankPercent > existing.ivRankPercent) {
          ownedCandidatesBySpecies.set(speciesId, candidate);
        }
      }
    }
  }

  const matched = rankings.map((ranking, index) => {
    const speciesId = ranking.speciesId;
    const { frenchName } = speciesIdToFrench(speciesId, customForms);
    const owned = ownedCandidatesBySpecies.get(speciesId) || null;

    const moveset = ranking.moveset || [];
    const fastMove = moveset[0] ? translateMove(moveset[0]) : '';
    const chargedMoves = moveset.slice(1).map(m => translateMove(m));

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

    return {
      meta: {
        speciesId,
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
    unmatchedForms: Array.from(unmatchedFormsSet)
  };
}

module.exports = {
  matchPokemon
};
