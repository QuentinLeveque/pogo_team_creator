import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PokemonRow from '../../src/components/PokemonRow.vue';

describe('PokemonRow.vue', () => {
  const item = {
    meta: {
      speciesId: 'charizard',
      nameFr: 'Dracaufeu',
      score: 88,
      rank: 12,
      types: ['Feu', 'Vol'],
      recommendedMoveset: {
        fast: 'Cru-Ailes',
        charged: ['Rafale Feu', 'Draco-Griffe']
      },
      matchups: [{ opponentNameFr: 'Tinkaton', rating: 650 }],
      counters: [{ opponentNameFr: 'Quagsire (Obs)', rating: 350 }]
    },
    mine: {
      name: 'Salamèche',
      cp: 456,
      level: 14,
      atkIv: 15,
      defIv: 13,
      staIv: 15,
      ivRankPercent: 98.66,
      ivRankNumber: 56,
      isShadow: false,
      isLucky: false,
      dustCost: 17600,
      candyCost: 16,
      needsEvolution: true,
      uniqueKey: 'key1'
    }
  };

  it('renders collapsed row summary with French name and score', () => {
    const wrapper = mount(PokemonRow, {
      props: { item }
    });

    expect(wrapper.text()).toContain('Dracaufeu');
    expect(wrapper.text()).toContain('#12');
    expect(wrapper.text()).toContain('88');
    expect(wrapper.text()).toContain('Possédé');
    expect(wrapper.text()).toContain('98.7%');
  });

  it('toggles expansion when row is clicked', async () => {
    const wrapper = mount(PokemonRow, {
      props: { item }
    });

    expect(wrapper.find('.expanded-details').exists()).toBe(false);
    await wrapper.find('.row-header').trigger('click');
    expect(wrapper.find('.expanded-details').exists()).toBe(true);

    expect(wrapper.text()).toContain('Salamèche');
    expect(wrapper.text()).toContain('Cru-Ailes');
    expect(wrapper.text()).toContain('Rafale Feu');
  });
});
