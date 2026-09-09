import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import PokemonSprite from '../../src/components/PokemonSprite.vue';

describe('PokemonSprite.vue', () => {
  it('renders image with PokeAPI pixel sprite URL', () => {
    const wrapper = mount(PokemonSprite, {
      props: { dexNumber: 6, alt: 'Dracaufeu' }
    });

    const img = wrapper.find('img');
    expect(img.exists()).toBe(true);
    expect(img.attributes('src')).toBe('https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png');
    expect(img.attributes('alt')).toBe('Dracaufeu');
  });

  it('renders fallback SVG when image encounters an error or dexNumber is 0', async () => {
    const wrapper = mount(PokemonSprite, {
      props: { dexNumber: 0 }
    });

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('.sprite-fallback').exists()).toBe(true);
  });
});
