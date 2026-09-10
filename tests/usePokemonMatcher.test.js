import { describe, it, expect } from 'vitest';
import { matchPokemon } from '../src/composables/usePokemonMatcher.js';

describe('usePokemonMatcher', () => {
  const mockRankings = [
    {
      speciesId: 'charizard',
      speciesName: 'Charizard',
      score: 88,
      moveset: ['WING_ATTACK', 'BLAST_BURN', 'DRAGON_CLAW'],
      matchups: [{ opponent: 'tinkaton', rating: 650 }],
      counters: [{ opponent: 'quagsire', rating: 350 }]
    },
    {
      speciesId: 'tinkaton',
      speciesName: 'Tinkaton',
      score: 93,
      moveset: ['FAIRY_WIND', 'GIGATON_HAMMER'],
      matchups: [],
      counters: []
    }
  ];

  const mockMaster = [
    // Specimen 1: Salameche evolving to Dracaufeu (rank 98.2%)
    {
      Nom: 'Salamèche',
      Forme: '',
      'Atq IV': '1',
      'Déf IV': '15',
      'Rés IV': '14',
      'IV Moyen': '66.7',
      'Date Attrapée': '10/05/2022',
      PC: '450',
      'Niveau Min': '15',
      Chanceux: '0',
      'Obscur/Purifié': '0',
      'Nom (G)': 'Dracaufeu',
      'Forme (G)': '',
      'Rang % (G)': '98.2%',
      'Rang # (G)': '15',
      'Coût Poussières (G)': '25000',
      'Coût Bonbon (G)': '125'
    },
    // Specimen 2: Another Salameche with lower rank (85.0%) -> should be deduplicated
    {
      Nom: 'Salamèche',
      Forme: '',
      'Atq IV': '10',
      'Déf IV': '10',
      'Rés IV': '10',
      'IV Moyen': '66.7',
      'Date Attrapée': '11/05/2022',
      PC: '400',
      'Niveau Min': '14',
      Chanceux: '0',
      'Obscur/Purifié': '0',
      'Nom (G)': 'Dracaufeu',
      'Forme (G)': '',
      'Rang % (G)': '85.0%',
      'Rang # (G)': '200',
      'Coût Poussières (G)': '40000',
      'Coût Bonbon (G)': '150'
    },
    // Specimen 3: Form with unmapped value
    {
      Nom: 'Deoxys',
      Forme: 'InconnuForm',
      'Atq IV': '15',
      'Déf IV': '15',
      'Rés IV': '15',
      'IV Moyen': '100',
      'Date Attrapée': '01/01/2023',
      PC: '1500',
      'Niveau Min': '20',
      'Nom (G)': 'Deoxys',
      'Forme (G)': 'InconnuForm',
      'Rang % (G)': '99.0%'
    }
  ];

  it('matches owned Pokemon to ranking and keeps highest rank % specimen', () => {
    const { matched, unmatchedForms } = matchPokemon(mockMaster, mockRankings, '1500');

    expect(unmatchedForms).toContain('InconnuForm');

    const charizardMatch = matched.find(m => m.meta.speciesId === 'charizard');
    expect(charizardMatch).toBeDefined();
    expect(charizardMatch.meta.rank).toBe(1); // position in rankings
    expect(charizardMatch.mine).not.toBeNull();
    expect(charizardMatch.mine.name).toBe('Salamèche');
    expect(charizardMatch.mine.ivRankPercent).toBe(98.2);
    expect(charizardMatch.mine.needsEvolution).toBe(true);
    expect(charizardMatch.mine.dustCost).toBe(25000);
    expect(charizardMatch.mine.candyCost).toBe(125);

    // Tinkaton is not in user master collection -> mine is null
    const tinkatonMatch = matched.find(m => m.meta.speciesId === 'tinkaton');
    expect(tinkatonMatch).toBeDefined();
    expect(tinkatonMatch.mine).toBeNull();
  });

  it('supports Master league IV Moyen > 85 logic', () => {
    const masterLeagueSpecimen = [
      {
        Nom: 'Dracaufeu',
        Forme: '',
        'Atq IV': '15',
        'Déf IV': '15',
        'Rés IV': '15',
        'IV Moyen': '100',
        'Date Attrapée': '10/05/2022',
        PC: '3000',
        'Niveau Min': '40',
        Chanceux: '1',
        'Obscur/Purifié': '0'
      }
    ];

    const { matched } = matchPokemon(masterLeagueSpecimen, mockRankings, '10000');
    const charizardMatch = matched.find(m => m.meta.speciesId === 'charizard');
    expect(charizardMatch.mine).not.toBeNull();
    expect(charizardMatch.mine.ivAverage).toBe(100);
    expect(charizardMatch.mine.isLucky).toBe(true);
  });

  it('prioritizes already evolved specimen and attaches better unevolved candidate if present', () => {
    const masterList = [
      // Déjà évolué mais rang moyen (88.5%)
      {
        Nom: 'Florizarre', Forme: '', 'Atq IV': '5', 'Déf IV': '10', 'Rés IV': '12',
        'Rang % (G)': '88.5%', 'Rang # (G)': '450', 'Coût Poussières (G)': '10000', 'Coût Bonbon (G)': '25',
        'Niveau Min': '20.0', 'Attaque Rapide': 'Fouet Lianes', 'Attaque Chargée': 'Végé-Attaque', 'Date Attrapée': '2025-01-01'
      },
      // Non-évolué mais avec un meilleur rang (99.5%)
      {
        Nom: 'Bulbizarre', Forme: '', 'Nom (G)': 'Florizarre', 'Forme (G)': 'Normale',
        'Atq IV': '0', 'Déf IV': '14', 'Rés IV': '15',
        'Rang % (G)': '99.5%', 'Rang # (G)': '12', 'Coût Poussières (G)': '125000', 'Coût Bonbon (G)': '124',
        'Niveau Min': '10.0', 'Attaque Rapide': 'Charge', 'Attaque Chargée': 'Canon Graine', 'Date Attrapée': '2025-02-01'
      }
    ];

    const rankings = [
      {
        speciesId: 'venusaur',
        speciesName: 'Venusaur',
        moveset: ['VINE_WHIP', 'FRENZY_PLANT', 'SLUDGE_BOMB']
      }
    ];

    const eliteMovesMap = {
      venusaur: ['FRENZY_PLANT']
    };

    const { matched } = matchPokemon(masterList, rankings, '1500', {}, eliteMovesMap);
    const v = matched[0];

    expect(v.mine).toBeDefined();
    expect(v.mine.name).toBe('Florizarre');
    expect(v.mine.isAlreadyEvolved).toBe(true);
    expect(v.mine.needsEvolution).toBe(false);
    expect(v.mine.betterUnevolvedCandidate).toBeDefined();
    expect(v.mine.betterUnevolvedCandidate.name).toBe('Bulbizarre');
    expect(v.mine.betterUnevolvedCandidate.ivRankPercent).toBe(99.5);

    // Moves qualification
    const moves = v.meta.recommendedMoveset;
    expect(moves.fast.nameFr).toBe('Fouet Lianes');
    expect(moves.fast.isKnown).toBe(true);
    expect(moves.fast.isElite).toBe(false);

    expect(moves.charged[0].nameFr).toBe('Végé-Attaque');
    expect(moves.charged[0].isElite).toBe(true);
    expect(moves.charged[0].isKnown).toBe(true); // known on active Florizarre

    expect(moves.charged[1].nameFr).toBe('Bombe Beurk');
    expect(moves.charged[1].isElite).toBe(false);
    expect(moves.charged[1].isKnown).toBe(false); // not learned
  });

  it('computes reverseEvolutionPath for unowned evolved pokemon and assigns dexNumber', () => {
    const masterList = []; // Utilisateur ne possède rien
    const rankings = [
      {
        speciesId: 'venusaur',
        speciesName: 'Venusaur',
        moveset: ['VINE_WHIP', 'FRENZY_PLANT']
      },
      {
        speciesId: 'skarmory',
        speciesName: 'Skarmory',
        moveset: ['STEEL_WING', 'BRAVE_BIRD']
      }
    ];

    const speciesDexMap = { venusaur: 3, ivysaur: 2, bulbasaur: 1, skarmory: 227 };
    const familyMap = {
      venusaur: { id: 'FAMILY_BULBASAUR', parent: 'ivysaur' },
      ivysaur: { id: 'FAMILY_BULBASAUR', parent: 'bulbasaur' },
      bulbasaur: { id: 'FAMILY_BULBASAUR' },
      skarmory: { id: 'FAMILY_SKARMORY' }
    };

    const { matched } = matchPokemon(masterList, rankings, '1500', {}, {}, { speciesDexMap, familyMap });

    const venusaur = matched.find(m => m.meta.speciesId === 'venusaur');
    expect(venusaur.meta.dexNumber).toBe(3);
    expect(venusaur.meta.reverseEvolutionPath).toBe('Florizarre ⇽ Herbizarre ⇽ Bulbizarre');

    const skarmory = matched.find(m => m.meta.speciesId === 'skarmory');
    expect(skarmory.meta.dexNumber).toBe(227);
    expect(skarmory.meta.reverseEvolutionPath).toBeNull(); // Forme de base
  });

  it('returns unique unmatchedPokemonNames when specimens have unknown forms', () => {
    const masterList = [
      { Nom: 'Deoxys', Forme: 'FormeInconnue1', 'Atq IV': '10', 'Déf IV': '10', 'Rés IV': '10', 'Date Attrapée': '2025-01-01', PC: '1000' },
      { Nom: 'Deoxys', Forme: 'FormeInconnue2', 'Atq IV': '12', 'Déf IV': '12', 'Rés IV': '12', 'Date Attrapée': '2025-01-02', PC: '1100' },
      { Nom: 'Kyurem', Forme: 'FormeInconnue3', 'Atq IV': '15', 'Déf IV': '15', 'Rés IV': '15', 'Date Attrapée': '2025-01-03', PC: '2000' }
    ];

    const { unmatchedForms, unmatchedPokemonNames } = matchPokemon(masterList, [], '1500');
    expect(unmatchedForms.length).toBe(3);
    expect(unmatchedPokemonNames).toEqual(['Deoxys', 'Kyurem']);
  });

  it('builds chronological evolutionLine with sprites, names and ownership details for both owned and unowned stages', () => {
    // L'utilisateur possède un Bulbizarre rang 99.5%
    const masterList = [
      {
        Nom: 'Bulbizarre', Forme: '', 'Nom (G)': 'Florizarre', 'Forme (G)': 'Normale',
        'Atq IV': '0', 'Déf IV': '14', 'Rés IV': '15',
        'Rang % (G)': '99.5%', 'Rang # (G)': '12', 'Coût Poussières (G)': '125000', 'Coût Bonbon (G)': '124',
        'Niveau Min': '10.0', 'Date Attrapée': '2025-02-01', PC: '500'
      }
    ];

    const rankings = [
      {
        speciesId: 'venusaur',
        speciesName: 'Venusaur',
        score: 91,
        moveset: ['VINE_WHIP', 'FRENZY_PLANT']
      }
    ];

    const speciesDexMap = { venusaur: 3, ivysaur: 2, bulbasaur: 1 };
    const familyMap = {
      venusaur: { id: 'FAMILY_BULBASAUR', parent: 'ivysaur' },
      ivysaur: { id: 'FAMILY_BULBASAUR', parent: 'bulbasaur' },
      bulbasaur: { id: 'FAMILY_BULBASAUR' }
    };

    const { matched } = matchPokemon(masterList, rankings, '1500', {}, {}, { speciesDexMap, familyMap });
    const venusaur = matched[0];

    expect(venusaur.meta.evolutionLine).toBeDefined();
    expect(venusaur.meta.evolutionLine.length).toBe(3);

    // Ordre chronologique naturel : Bulbizarre ➔ Herbizarre ➔ Florizarre
    const [stage1, stage2, stage3] = venusaur.meta.evolutionLine;

    expect(stage1.speciesId).toBe('bulbasaur');
    expect(stage1.nameFr).toBe('Bulbizarre');
    expect(stage1.dexNumber).toBe(1);
    expect(stage1.isTarget).toBe(false);
    expect(stage1.isOwned).toBe(true);
    expect(stage1.ownedCandidate.ivRankPercent).toBe(99.5);

    expect(stage2.speciesId).toBe('ivysaur');
    expect(stage2.nameFr).toBe('Herbizarre');
    expect(stage2.dexNumber).toBe(2);
    expect(stage2.isTarget).toBe(false);
    expect(stage2.isOwned).toBe(false);

    expect(stage3.speciesId).toBe('venusaur');
    expect(stage3.nameFr).toBe('Florizarre');
    expect(stage3.dexNumber).toBe(3);
    expect(stage3.isTarget).toBe(true);
  });

  it('collects detailed unmatchedFormDetails with pokemon name, dexNumber and generatedId with underscores', () => {
    const masterList = [
      { Nom: 'Pikachu', Forme: 'Costume Fête', Pokemon: '25', PC: '300' },
      { Nom: 'Pikachu', Forme: 'Costume Fête', Pokemon: '25', PC: '400' },
      { Nom: 'Kyurem', Forme: 'Forme Bizarre', Pokemon: '646', PC: '2000' }
    ];

    const speciesDexMap = { pikachu: 25, kyurem: 646 };
    const { unmatchedFormDetails } = matchPokemon(masterList, [], '1500', {}, {}, { speciesDexMap });

    expect(unmatchedFormDetails).toBeDefined();
    expect(unmatchedFormDetails.length).toBe(2);

    const pikachuDetail = unmatchedFormDetails.find(d => d.pokemonNameFr === 'Pikachu');
    expect(pikachuDetail).toBeDefined();
    expect(pikachuDetail.rawForm).toBe('Costume Fête');
    expect(pikachuDetail.dexNumber).toBe(25);
    expect(pikachuDetail.generatedId).toBe('pikachu_costume_fete');
    expect(pikachuDetail.count).toBe(2);

    const kyuremDetail = unmatchedFormDetails.find(d => d.pokemonNameFr === 'Kyurem');
    expect(kyuremDetail).toBeDefined();
    expect(kyuremDetail.rawForm).toBe('Forme Bizarre');
    expect(kyuremDetail.dexNumber).toBe(646);
    expect(kyuremDetail.generatedId).toBe('kyurem_forme_bizarre');
    expect(kyuremDetail.count).toBe(1);
  });

  it('correctly matches Rocabot Diurne, Zygarde 10%, and Hoopa Enchaîné with gamemaster metadata', () => {
    const masterList = [
      {
        Nom: 'Rocabot',
        Forme: 'Diurne',
        Pokemon: '744',
        'Nom (G)': 'Lougaroc',
        'Forme (G)': 'Diurne',
        'Rang % (G)': '95.0%',
        'Rang # (G)': '50'
      },
      {
        Nom: 'Zygarde',
        Forme: '10%',
        Pokemon: '718',
        'Nom (G)': 'Zygarde',
        'Forme (G)': '10%',
        'Rang % (G)': '92.0%',
        'Rang # (G)': '80'
      },
      {
        Nom: 'Hoopa',
        Forme: 'Enchaîné',
        Pokemon: '720',
        'Nom (G)': 'Hoopa',
        'Forme (G)': 'Enchaîné',
        'Rang % (G)': '89.0%',
        'Rang # (G)': '120'
      }
    ];

    const mockRankings = [
      { speciesId: 'lycanroc_midday', score: 85, moveset: [] },
      { speciesId: 'zygarde_10', score: 90, moveset: [] },
      { speciesId: 'hoopa', score: 80, moveset: [] }
    ];

    const metadata = {
      speciesDexMap: {
        rockruff: 744,
        lycanroc_midday: 745,
        zygarde: 718,
        zygarde_10: 718,
        hoopa: 720
      },
      familyMap: {
        lycanroc_midday: { parent: 'rockruff' }
      }
    };

    const { matched, unmatchedForms } = matchPokemon(masterList, mockRankings, '1500', {}, {}, metadata);

    expect(unmatchedForms).toEqual([]);

    const lycanrocMatch = matched.find(m => m.meta.speciesId === 'lycanroc_midday');
    expect(lycanrocMatch).toBeDefined();
    expect(lycanrocMatch.mine).not.toBeNull();
    expect(lycanrocMatch.mine.name).toBe('Rocabot');
    expect(lycanrocMatch.mine.needsEvolution).toBe(true);

    const zygardeMatch = matched.find(m => m.meta.speciesId === 'zygarde_10');
    expect(zygardeMatch).toBeDefined();
    expect(zygardeMatch.mine).not.toBeNull();
    expect(zygardeMatch.mine.name).toBe('Zygarde');

    const hoopaMatch = matched.find(m => m.meta.speciesId === 'hoopa');
    expect(hoopaMatch).toBeDefined();
    expect(hoopaMatch.mine).not.toBeNull();
    expect(hoopaMatch.mine.name).toBe('Hoopa');
  });

  it('strictly isolates shadow and non-shadow species in matching and evolution line', () => {
    const masterList = [
      // Normal Goupix evolving to Feunard
      {
        Nom: 'Goupix',
        Forme: '',
        'Obscur/Purifié': '0',
        'Nom (G)': 'Feunard',
        'Forme (G)': '',
        'Obs/Pur (G)': '0',
        'Rang % (G)': '90.0%',
        'Rang # (G)': '100'
      },
      // Shadow Goupix evolving to Shadow Feunard
      {
        Nom: 'Goupix',
        Forme: '',
        'Obscur/Purifié': '1',
        'Nom (G)': 'Feunard',
        'Forme (G)': '',
        'Obs/Pur (G)': '1',
        'Rang % (G)': '95.0%',
        'Rang # (G)': '20',
        'Attaque Rapide': 'Danse Flammes',
        'Attaque Chargée': "Ball'Météo",
        'Attaque Chargée 2': 'Plaquage'
      }
    ];

    const mockRankings = [
      {
        speciesId: 'ninetales_shadow',
        score: 96,
        moveset: ['FIRE_SPIN', 'WEATHER_BALL_FIRE', 'OVERHEAT'],
        matchups: [{ opponent: 'tinkaton', rating: 600 }],
        counters: [{ opponent: 'swampert', rating: 400 }]
      },
      {
        speciesId: 'ninetales',
        score: 91,
        moveset: ['FIRE_SPIN', 'WEATHER_BALL_FIRE', 'OVERHEAT'],
        matchups: [],
        counters: []
      }
    ];

    const metadata = {
      speciesDexMap: { vulpix: 37, ninetales: 38, ninetales_shadow: 38, tinkaton: 959, swampert: 260 },
      familyMap: {
        ninetales_shadow: { parent: 'vulpix' },
        ninetales: { parent: 'vulpix' }
      },
      speciesStatsMap: {
        ninetales_shadow: { maxCp40: 2279 }
      }
    };

    const eliteMovesMap = {
      ninetales_shadow: ['BODY_SLAM', 'EMBER'],
      ninetales: ['BODY_SLAM', 'EMBER']
    };

    const { matched } = matchPokemon(masterList, mockRankings, '1500', {}, eliteMovesMap, metadata);

    const shadowMatch = matched.find(m => m.meta.speciesId === 'ninetales_shadow');
    expect(shadowMatch).toBeDefined();
    expect(shadowMatch.meta.isShadow).toBe(true);
    expect(shadowMatch.mine).not.toBeNull();
    expect(shadowMatch.mine.isShadow).toBe(true);
    expect(shadowMatch.mine.ivRankPercent).toBe(95.0);

    // Evolution line check for shadow
    expect(shadowMatch.evolutionLine).toBeDefined();
    expect(shadowMatch.evolutionLine.length).toBe(2);
    expect(shadowMatch.evolutionLine[0].isShadow).toBe(true);
    expect(shadowMatch.evolutionLine[0].frenchName).toContain('Obscur');
    expect(shadowMatch.evolutionLine[0].isOwned).toBe(true);

    // Check mineMoves with isElite
    expect(shadowMatch.mine.mineMoves).toBeDefined();
    expect(shadowMatch.mine.mineMoves.fast.nameFr).toBe('Danse Flammes');
    expect(shadowMatch.mine.mineMoves.fast.isElite).toBe(false);
    expect(shadowMatch.mine.mineMoves.charged2.nameFr).toBe('Plaquage');
    expect(shadowMatch.mine.mineMoves.charged2.isElite).toBe(true);

    // Check matchups have dexNumber
    expect(shadowMatch.meta.matchups[0].dexNumber).toBe(959);
    expect(shadowMatch.meta.counters[0].dexNumber).toBe(260);

    // Normal ninetales should match normal Goupix
    const normalMatch = matched.find(m => m.meta.speciesId === 'ninetales');
    expect(normalMatch).toBeDefined();
    expect(normalMatch.meta.isShadow).toBe(false);
    expect(normalMatch.mine).not.toBeNull();
    expect(normalMatch.mine.isShadow).toBe(false);
    expect(normalMatch.mine.ivRankPercent).toBe(90.0);
  });
});

