import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PokemonRow from '../../src/components/PokemonRow.vue';

describe('PokemonRow.vue', () => {
  const item = {
    meta: {
      speciesId: 'charizard',
      dexNumber: 6,
      nameFr: 'Dracaufeu',
      score: 88,
      rank: 12,
      types: ['Feu', 'Vol'],
      recommendedMoveset: {
        fast: { moveId: 'WING_ATTACK', nameFr: 'Cru-Ailes', isElite: true, isKnown: true, toString() { return 'Cru-Ailes'; } },
        charged: [
          { moveId: 'BLAST_BURN', nameFr: 'Rafale Feu', isElite: true, isKnown: false, toString() { return 'Rafale Feu'; } },
          { moveId: 'DRAGON_CLAW', nameFr: 'Draco-Griffe', isElite: false, isKnown: true, toString() { return 'Draco-Griffe'; } }
        ]
      },
      matchups: [{ opponentNameFr: 'Tinkaton', rating: 650 }],
      counters: [{ opponentNameFr: 'Quagsire (Obs)', rating: 350 }]
    },
    mine: {
      dexNumber: 6,
      name: 'Dracaufeu',
      form: '',
      cp: 1485,
      level: 19.5,
      atkIv: 1,
      defIv: 15,
      staIv: 14,
      ivRankPercent: 98.7,
      ivRankNumber: 56,
      isShadow: false,
      isLucky: false,
      dustCost: 17600,
      candyCost: 16,
      xlCandyCost: 0,
      requiresXl: false,
      isAlreadyEvolved: true,
      needsEvolution: false,
      betterUnevolvedCandidate: {
        name: 'Salamèche',
        ivRankPercent: 99.8,
        ivRankNumber: 4,
        dustCost: 110000,
        candyCost: 125,
        xlCandyCost: 0
      },
      uniqueKey: 'key1'
    }
  };

  it('renders collapsed row summary with sprite, Rang label, and resource costs', () => {
    const wrapper = mount(PokemonRow, {
      props: { item }
    });

    expect(wrapper.text()).toContain('Dracaufeu');
    expect(wrapper.text()).toContain('#12');
    expect(wrapper.text()).toContain('88');
    expect(wrapper.text()).toContain('Possédé');
    // Correct label: Rang: 98.7% #56
    expect(wrapper.text()).toContain('Rang: 98.7%');
    expect(wrapper.text()).toContain('#56');
    // Resource costs on collapsed card
    expect(wrapper.text()).toContain('17 600');
    expect(wrapper.text()).toContain('16');
    // Inline notice for better unevolved candidate
    expect(wrapper.text()).toContain('Non-évolué disponible : Salamèche (Rang 99.8%)');
    // Sprite rendered
    expect(wrapper.findComponent({ name: 'PokemonSprite' }).exists()).toBe(true);
  });

  it('displays form badge and evolution badge when applicable', () => {
    const itemWithFormAndEvo = {
      meta: {
        speciesId: 'ninetales_alola',
        dexNumber: 38,
        nameFr: 'Feunard',
        score: 85,
        rank: 20,
        types: ['Glace', 'Fée'],
        recommendedMoveset: {
          fast: { moveId: 'POWDER_SNOW', nameFr: 'Poudreuse', isElite: false, isKnown: true },
          charged: [{ moveId: 'WEATHER_BALL_ICE', nameFr: "Ball'Météo", isElite: false, isKnown: true }]
        },
        matchups: [],
        counters: []
      },
      mine: {
        dexNumber: 37,
        name: 'Goupix',
        form: 'Alola',
        ivRankPercent: 97.5,
        ivRankNumber: 110,
        isShadow: false,
        dustCost: 45000,
        candyCost: 65,
        xlCandyCost: 80,
        requiresXl: true,
        needsEvolution: true,
        uniqueKey: 'k2'
      }
    };

    const wrapper = mount(PokemonRow, {
      props: { item: itemWithFormAndEvo }
    });

    expect(wrapper.text()).toContain('Alola');
    expect(wrapper.text()).toContain('Évolution requise');
    expect(wrapper.text()).toContain('80 XL');
  });

  it('toggles expansion and shows move badges and side-by-side comparison', async () => {
    const wrapper = mount(PokemonRow, {
      props: { item }
    });

    expect(wrapper.find('.expanded-details').exists()).toBe(false);
    await wrapper.find('.row-header').trigger('click');
    expect(wrapper.find('.expanded-details').exists()).toBe(true);

    // Moves with elite & known indicators
    expect(wrapper.text()).toContain('Cru-Ailes');
    expect(wrapper.text()).toContain('Rafale Feu');
    expect(wrapper.text()).toContain('Draco-Griffe');
    expect(wrapper.text()).toContain('CT Élite requise');

    // Comparison block
    expect(wrapper.find('.comparison-section').exists()).toBe(true);
    expect(wrapper.text()).toContain('Salamèche');
    expect(wrapper.text()).toContain('99.8%');
  });
});
