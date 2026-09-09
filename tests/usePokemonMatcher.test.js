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
});

