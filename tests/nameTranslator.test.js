import { describe, it, expect } from 'vitest';
import { toSpeciesId, speciesIdToFrench } from '../electron/services/nameTranslator.js';

describe('nameTranslator', () => {
  it('translates standard Pokemon without form', () => {
    const res = toSpeciesId('Dracaufeu', '', false);
    expect(res).toEqual({ id: 'charizard', unmatched: false, unmatchedForm: null });
  });

  it('translates shadow Pokemon', () => {
    const res = toSpeciesId('Dracaufeu', '', true);
    expect(res).toEqual({ id: 'charizard_shadow', unmatched: false, unmatchedForm: null });
  });

  it('translates known regional form (Galar)', () => {
    const res = toSpeciesId('Limonde', 'Galar', false);
    expect(res).toEqual({ id: 'stunfisk_galarian', unmatched: false, unmatchedForm: null });
  });

  it('translates shadow regional form', () => {
    const res = toSpeciesId('Ossatueur', 'Alola', true);
    expect(res).toEqual({ id: 'marowak_alolan_shadow', unmatched: false, unmatchedForm: null });
  });

  it('treats "Normale" or empty form as no suffix', () => {
    const res1 = toSpeciesId('Rattata', 'Normale', false);
    expect(res1).toEqual({ id: 'rattata', unmatched: false, unmatchedForm: null });

    const res2 = toSpeciesId('Rattata', null, false);
    expect(res2).toEqual({ id: 'rattata', unmatched: false, unmatchedForm: null });
  });

  it('detects unrecognized form and flags it', () => {
    const res = toSpeciesId('Deoxys', 'FormeInconnueXYZ', false);
    expect(res.unmatched).toBe(true);
    expect(res.unmatchedForm).toBe('FormeInconnueXYZ');
  });

  it('uses customForms mapping override when provided', () => {
    const customForms = { 'FormeInconnueXYZ': 'speed' };
    const res = toSpeciesId('Deoxys', 'FormeInconnueXYZ', false, customForms);
    expect(res).toEqual({ id: 'deoxys_speed', unmatched: false, unmatchedForm: null });
  });

  it('reverses speciesId to French name and attributes', () => {
    const res = speciesIdToFrench('charizard_shadow');
    expect(res.frenchName.toLowerCase()).toBe('dracaufeu');
    expect(res.isShadow).toBe(true);
  });

  it('treats an empty string customForm as an explicit standard base form mapping', () => {
    const result = toSpeciesId('Pikachu', "Costume d'Halloween", false, {
      "Costume d'Halloween": ''
    });

    expect(result.unmatched).toBe(false);
    expect(result.unmatchedForm).toBeNull();
    expect(result.id).toBe('pikachu');
  });

  it('matches forms case-insensitively and accent-insensitively', () => {
    const resMega = toSpeciesId('Rayquaza', 'Mega', false);
    expect(resMega).toEqual({ id: 'rayquaza_mega', unmatched: false, unmatchedForm: null });

    const resMegaAccented = toSpeciesId('Rayquaza', 'Méga', false);
    expect(resMegaAccented).toEqual({ id: 'rayquaza_mega', unmatched: false, unmatchedForm: null });

    const resBuyo = toSpeciesId('Plumeline', 'Buyo', false);
    expect(resBuyo).toEqual({ id: 'oricorio_sensu', unmatched: false, unmatchedForm: null });

    const resPomPom = toSpeciesId('Plumeline', 'Pom Pom', false);
    expect(resPomPom).toEqual({ id: 'oricorio_pom_pom', unmatched: false, unmatchedForm: null });

    const resZygarde = toSpeciesId('Zygarde', '10%', false);
    expect(resZygarde).toEqual({ id: 'zygarde_10', unmatched: false, unmatchedForm: null });

    const resHoopa = toSpeciesId('Hoopa', 'Enchaîné', false);
    expect(resHoopa).toEqual({ id: 'hoopa', unmatched: false, unmatchedForm: null });

    const resHoopaUnaccented = toSpeciesId('Hoopa', 'Enchaine', false);
    expect(resHoopaUnaccented).toEqual({ id: 'hoopa', unmatched: false, unmatchedForm: null });

    const resLougaroc = toSpeciesId('Lougaroc', 'Diurne', false);
    expect(resLougaroc).toEqual({ id: 'lycanroc_midday', unmatched: false, unmatchedForm: null });
  });
});
