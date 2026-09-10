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
      matchups: [{ opponent: 'tinkaton', opponentNameFr: 'Tinkaton', dexNumber: 959, rating: 650 }],
      counters: [{ opponent: 'quagsire_shadow', opponentNameFr: 'Maraiste', isShadow: true, dexNumber: 195, rating: 350 }]
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
      fastMove: 'Cru-Ailes',
      chargedMove1: 'Lance-Flammes',
      chargedMove2: 'Rafale Feu',
      mineMoves: {
        fast: { nameFr: 'Cru-Ailes', isElite: true },
        charged1: { nameFr: 'Lance-Flammes', isElite: false },
        charged2: { nameFr: 'Rafale Feu', isElite: true }
      },
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
    expect(wrapper.text()).not.toContain('Possédé');
    expect(wrapper.find('.score-bar-bg').exists()).toBe(false);
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

  it('displays reverse evolution path on unowned pokemon and does not render owned tag or score bar', () => {
    const unownedItem = {
      meta: {
        speciesId: 'venusaur',
        dexNumber: 3,
        nameFr: 'Florizarre',
        score: 92,
        rank: 5,
        types: ['Plante', 'Poison'],
        reverseEvolutionPath: 'Florizarre ⇽ Herbizarre ⇽ Bulbizarre',
        recommendedMoveset: { fast: {}, charged: [] },
        matchups: [],
        counters: []
      },
      mine: null
    };

    const wrapper = mount(PokemonRow, {
      props: { item: unownedItem }
    });

    expect(wrapper.text()).not.toContain('Possédé');
    expect(wrapper.find('.score-bar-bg').exists()).toBe(false);
    expect(wrapper.find('.reverse-evo-path').exists()).toBe(true);
    expect(wrapper.find('.reverse-evo-path').text()).toContain('Florizarre ⇽ Herbizarre ⇽ Bulbizarre');
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

  it('toggles expansion and shows 2-column moves overhaul without any CT badges', async () => {
    const wrapper = mount(PokemonRow, {
      props: { item }
    });

    expect(wrapper.find('.expanded-details').exists()).toBe(false);
    await wrapper.find('.row-header').trigger('click');
    expect(wrapper.find('.expanded-details').exists()).toBe(true);

    // Two column headers
    expect(wrapper.text()).toContain('Recommandées (PvPoke)');
    expect(wrapper.text()).toContain('Actuelles de mon Pokémon');

    // Moves names from both columns
    expect(wrapper.text()).toContain('Cru-Ailes');
    expect(wrapper.text()).toContain('Rafale Feu');
    expect(wrapper.text()).toContain('Draco-Griffe');
    expect(wrapper.text()).toContain('Lance-Flammes');

    // Elite badges shown
    expect(wrapper.text()).toContain('⭐ Élite');

    // Completely removed obsolete CT badges
    expect(wrapper.text()).not.toContain('CT requise');
    expect(wrapper.text()).not.toContain('CT Élite requise');
    expect(wrapper.text()).not.toContain('✓ Connue');

    // Comparison block
    expect(wrapper.find('.comparison-section').exists()).toBe(true);
    expect(wrapper.text()).toContain('Salamèche');
    expect(wrapper.text()).toContain('99.8%');
  });

  it('renders shadow badge on row header when meta.isShadow is true even if unowned', () => {
    const shadowUnownedItem = {
      meta: {
        speciesId: 'ninetales_shadow',
        dexNumber: 38,
        nameFr: 'Feunard',
        score: 95,
        rank: 2,
        isShadow: true,
        types: ['Feu'],
        recommendedMoveset: { fast: {}, charged: [] },
        matchups: [],
        counters: []
      },
      mine: null
    };

    const wrapper = mount(PokemonRow, {
      props: { item: shadowUnownedItem }
    });

    const shadowBadge = wrapper.find('.shadow-badge');
    expect(shadowBadge.exists()).toBe(true);
    expect(shadowBadge.text()).toBe('Obscur');
    expect(wrapper.classes()).toContain('shadow');
  });

  it('renders key matchups and counters as visual chips with sprites', async () => {
    const wrapper = mount(PokemonRow, {
      props: { item }
    });

    await wrapper.find('.row-header').trigger('click');

    const matchupChips = wrapper.findAll('.matchup-chip');
    expect(matchupChips.length).toBe(2);

    expect(wrapper.text()).toContain('Victoires clés');
    expect(wrapper.text()).toContain('Contres clés');
    expect(wrapper.text()).toContain('Tinkaton');
    expect(wrapper.text()).toContain('Maraiste');
    expect(wrapper.text()).not.toContain('(Obs)');
    expect(wrapper.text()).not.toContain('(Obscur)');
    const chipShadowBadge = wrapper.find('.chip-shadow-badge');
    expect(chipShadowBadge.exists()).toBe(true);
    expect(chipShadowBadge.text()).toBe('Obscur');
    expect(wrapper.text()).toContain('650');
    expect(wrapper.text()).toContain('350');
  });

  it('displays visual evolution line with sprites, names and arrows when expanded', async () => {
    const itemWithEvolutionLine = {
      meta: {
        speciesId: 'venusaur',
        dexNumber: 3,
        nameFr: 'Florizarre',
        score: 91,
        rank: 8,
        types: ['Plante', 'Poison'],
        evolutionLine: [
          {
            speciesId: 'bulbasaur',
            dexNumber: 1,
            nameFr: 'Bulbizarre',
            isTarget: false,
            isOwned: true,
            ownedCandidate: { name: 'Bulbizarre', ivRankPercent: 99.2, ivRankNumber: 15 }
          },
          {
            speciesId: 'ivysaur',
            dexNumber: 2,
            nameFr: 'Herbizarre',
            isTarget: false,
            isOwned: false
          },
          {
            speciesId: 'venusaur',
            dexNumber: 3,
            nameFr: 'Florizarre',
            isTarget: true,
            isOwned: true
          }
        ],
        recommendedMoveset: { fast: {}, charged: [] },
        matchups: [],
        counters: []
      },
      mine: {
        dexNumber: 3,
        name: 'Florizarre',
        ivRankPercent: 88.0,
        uniqueKey: 'k1'
      }
    };

    const wrapper = mount(PokemonRow, {
      props: { item: itemWithEvolutionLine }
    });

    // Quand la carte est fermée : pas de lignée visuelle dépliée
    expect(wrapper.find('.evolution-chain-section').exists()).toBe(false);

    // Déplier la carte
    await wrapper.find('.row-header').trigger('click');
    expect(wrapper.find('.evolution-chain-section').exists()).toBe(true);

    // Vérifier la présence des 3 stades avec noms et sprites
    const stageCards = wrapper.findAll('.stage-card');
    expect(stageCards.length).toBe(3);

    expect(stageCards[0].text()).toContain('Bulbizarre');
    expect(stageCards[0].text()).toContain('En stock');
    expect(stageCards[0].text()).toContain('99.2%');

    expect(stageCards[1].text()).toContain('Herbizarre');
    expect(stageCards[1].text()).toContain('Non possédé');

    expect(stageCards[2].text()).toContain('Florizarre');
    expect(stageCards[2].text()).toContain('Cible');
    expect(stageCards[2].text()).toContain('En stock');
    expect(stageCards[2].text()).not.toContain('Cible Ligue #');

    // Vérifier la présence des flèches
    const arrows = wrapper.findAll('.stage-arrow');
    expect(arrows.length).toBe(2);
  });

  it('displays owned rank for evolved stage and unevolved stage, or non-possédé if unowned', async () => {
    const itemWithBothOwned = {
      meta: {
        speciesId: 'araquanid',
        dexNumber: 752,
        nameFr: 'Tarenbulle',
        score: 88,
        rank: 22,
        types: ['Eau', 'Insecte'],
        evolutionLine: [
          {
            speciesId: 'dewpider',
            dexNumber: 751,
            nameFr: 'Araqua',
            isTarget: false,
            isOwned: true,
            ownedCandidate: { name: 'Araqua', ivRankPercent: 96.6, ivRankNumber: 140 }
          },
          {
            speciesId: 'araquanid',
            dexNumber: 752,
            nameFr: 'Tarenbulle',
            isTarget: true,
            isOwned: true,
            ownedCandidate: { name: 'Tarenbulle', ivRankPercent: 82.1, ivRankNumber: 750 }
          }
        ],
        recommendedMoveset: { fast: {}, charged: [] },
        matchups: [],
        counters: []
      },
      mine: {
        dexNumber: 752,
        name: 'Tarenbulle',
        ivRankPercent: 82.1,
        ivRankNumber: 750,
        betterUnevolvedCandidate: {
          name: 'Araqua',
          ivRankPercent: 96.6,
          ivRankNumber: 140
        },
        uniqueKey: 'tar1'
      }
    };

    const wrapper = mount(PokemonRow, {
      props: { item: itemWithBothOwned }
    });

    await wrapper.find('.row-header').trigger('click');

    const stages = wrapper.findAll('.stage-card');
    expect(stages.length).toBe(2);

    // Araqua stage
    expect(stages[0].text()).toContain('Araqua');
    expect(stages[0].text()).toContain('En stock');
    expect(stages[0].text()).toContain('96.6% #140');

    // Tarenbulle stage shows target badge AND owned status with its own IV rank #750
    expect(stages[1].text()).toContain('Tarenbulle');
    expect(stages[1].text()).toContain('Cible');
    expect(stages[1].text()).toContain('En stock');
    expect(stages[1].text()).toContain('82.1% #750');
    // Does NOT contain the confusing '#22' in the evolution stage
    expect(stages[1].find('.badge-target').text()).toBe('🎯 Cible');

    // If target stage is unowned
    const itemWithUnownedTarget = {
      meta: {
        speciesId: 'araquanid',
        dexNumber: 752,
        nameFr: 'Tarenbulle',
        score: 88,
        rank: 22,
        types: ['Eau', 'Insecte'],
        evolutionLine: [
          {
            speciesId: 'dewpider',
            dexNumber: 751,
            nameFr: 'Araqua',
            isTarget: false,
            isOwned: true,
            ownedCandidate: { name: 'Araqua', ivRankPercent: 96.6, ivRankNumber: 140 }
          },
          {
            speciesId: 'araquanid',
            dexNumber: 752,
            nameFr: 'Tarenbulle',
            isTarget: true,
            isOwned: false
          }
        ],
        recommendedMoveset: { fast: {}, charged: [] },
        matchups: [],
        counters: []
      },
      mine: {
        dexNumber: 751,
        name: 'Araqua',
        ivRankPercent: 96.6,
        ivRankNumber: 140,
        needsEvolution: true,
        uniqueKey: 'ara1'
      }
    };

    const wrapper2 = mount(PokemonRow, {
      props: { item: itemWithUnownedTarget }
    });

    await wrapper2.find('.row-header').trigger('click');
    const stages2 = wrapper2.findAll('.stage-card');
    expect(stages2[1].text()).toContain('Tarenbulle');
    expect(stages2[1].text()).toContain('Cible');
    expect(stages2[1].text()).toContain('Non possédé');
  });

  it('renders dedicated purple Obscur badges and no (Obscur) text in header, stages, comparisons, and matchups', async () => {
    const shadowItem = {
      meta: {
        speciesId: 'ninetales_shadow',
        dexNumber: 38,
        nameFr: 'Feunard',
        score: 94,
        rank: 5,
        isShadow: true,
        types: ['Feu'],
        reverseEvolutionPath: 'Feunard ⇽ Goupix',
        evolutionLine: [
          {
            speciesId: 'vulpix_shadow',
            dexNumber: 37,
            nameFr: 'Goupix',
            isTarget: false,
            isShadow: true,
            isOwned: true,
            ownedCandidate: { name: 'Goupix', ivRankPercent: 99.1, ivRankNumber: 20 }
          },
          {
            speciesId: 'ninetales_shadow',
            dexNumber: 38,
            nameFr: 'Feunard',
            isTarget: true,
            isShadow: true,
            isOwned: true,
            ownedCandidate: { name: 'Feunard', ivRankPercent: 91.0, ivRankNumber: 350 }
          }
        ],
        recommendedMoveset: { fast: {}, charged: [] },
        matchups: [{ opponent: 'tinkaton', opponentNameFr: 'Tinkaton', dexNumber: 959, rating: 650, isShadow: false }],
        counters: [{ opponent: 'quagsire_shadow', opponentNameFr: 'Maraiste', dexNumber: 195, rating: 350, isShadow: true }]
      },
      mine: {
        dexNumber: 38,
        name: 'Feunard',
        isShadow: true,
        ivRankPercent: 91.0,
        ivRankNumber: 350,
        betterUnevolvedCandidate: {
          name: 'Goupix',
          isShadow: true,
          ivRankPercent: 99.1,
          ivRankNumber: 20
        }
      }
    };

    const wrapper = mount(PokemonRow, {
      props: { item: shadowItem }
    });

    // In unexpanded view:
    // Header has Obscur badge
    expect(wrapper.find('.row-header .shadow-badge').text()).toBe('Obscur');
    // Better unevolved notice has Obscur badge
    expect(wrapper.find('.better-unevolved-notice .shadow-badge').text()).toBe('Obscur');
    // No parenthetical (Obscur) or (Obs) in text
    expect(wrapper.text()).not.toContain('(Obscur)');
    expect(wrapper.text()).not.toContain('(Obs)');

    // Expand card
    await wrapper.find('.row-header').trigger('click');

    // Evolution chain stages have badges
    const stageBadges = wrapper.findAll('.evolution-chain-section .shadow-badge');
    expect(stageBadges.length).toBe(2);
    expect(stageBadges[0].text()).toBe('Obscur');
    expect(stageBadges[1].text()).toBe('Obscur');

    // Comparison cards have badges
    const compBadges = wrapper.findAll('.comparison-section .shadow-badge');
    expect(compBadges.length).toBe(2);

    // Matchup chips: counter chip has chip-shadow-badge
    const chipBadges = wrapper.findAll('.chip-shadow-badge');
    expect(chipBadges.length).toBe(1);
    expect(chipBadges[0].text()).toBe('Obscur');

    // Verify completely free of (Obscur) and (Obs)
    expect(wrapper.text()).not.toContain('(Obscur)');
    expect(wrapper.text()).not.toContain('(Obs)');
  });
});

