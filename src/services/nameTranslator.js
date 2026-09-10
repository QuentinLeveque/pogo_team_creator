import frNames from '../data/fr.json';
import enNames from '../data/en.json';
import defaultForms from '../data/forms.json';

function normalizeName(str) {
  if (!str) return '';
  return str.trim().toLowerCase();
}

function normalizeFormKey(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const frNameToIndex = new Map();
frNames.forEach((name, i) => {
  if (name) frNameToIndex.set(name.toLowerCase(), i);
});

const enToFrIndex = new Map();
enNames.forEach((name, i) => {
  if (name) {
    const key = name.replace(/ /g, '_').replace(/-/g, '_').replace(/\. /g, '_').replace(/\./g, '_').toLowerCase();
    enToFrIndex.set(key, i);
  }
});

export function toSpeciesId(frenchName, form, isShadow = false, customForms = {}) {
  if (!frenchName) {
    return { id: '', unmatched: false, unmatchedForm: null };
  }

  const cleanFrName = normalizeName(frenchName);
  const frIndex = frNameToIndex.has(cleanFrName) ? frNameToIndex.get(cleanFrName) : -1;

  if (frIndex === -1) {
    return { id: cleanFrName.replace(/ /g, '_'), unmatched: false, unmatchedForm: null };
  }

  const enRaw = enNames[frIndex];
  let id = enRaw.replace(/ /g, '_').replace(/-/g, '_').replace(/\. /g, '_').replace(/\./g, '_').toLowerCase();

  const combinedForms = { ...defaultForms, ...customForms };

  let unmatched = false;
  let unmatchedForm = null;

  if (form && form.trim() !== '' && form.trim() !== 'Normale') {
    const trimmedForm = form.trim();
    let suffix = combinedForms[trimmedForm];

    if (suffix === undefined) {
      const normForm = normalizeFormKey(trimmedForm);
      for (const [k, v] of Object.entries(combinedForms)) {
        if (normalizeFormKey(k) === normForm) {
          suffix = v;
          break;
        }
      }
    }

    if (suffix !== undefined) {
      if (suffix && suffix.trim() !== '') {
        id += `_${suffix.trim().toLowerCase()}`;
      }
    } else {
      unmatched = true;
      unmatchedForm = trimmedForm;
    }
  }

  if (isShadow) {
    id += '_shadow';
  }

  return { id, unmatched, unmatchedForm };
}

export function speciesIdToFrench(speciesId, customForms = {}) {
  if (!speciesId) return { frenchName: '', form: '', isShadow: false };

  let cleanId = speciesId;
  let isShadow = false;
  if (cleanId.endsWith('_shadow')) {
    isShadow = true;
    cleanId = cleanId.replace(/_shadow$/, '');
  }

  const combinedForms = { ...defaultForms, ...customForms };
  let formName = '';

  // Look for form suffix
  for (const [frForm, enSuffix] of Object.entries(combinedForms)) {
    if (enSuffix && cleanId.endsWith(`_${enSuffix}`)) {
      formName = frForm;
      cleanId = cleanId.slice(0, -(enSuffix.length + 1));
      break;
    }
  }

  const foundIndex = enToFrIndex.has(cleanId) ? enToFrIndex.get(cleanId) : -1;
  let frenchName = cleanId;
  if (foundIndex !== -1 && frNames[foundIndex]) {
    frenchName = frNames[foundIndex];
    frenchName = frenchName.charAt(0).toUpperCase() + frenchName.slice(1);
  }

  return { frenchName, form: formName, isShadow };
}
