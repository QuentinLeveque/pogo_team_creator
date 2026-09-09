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
});
