const fs = require('fs');
const path = require('path');

const frPath = path.resolve(__dirname, '../../src/data/fr.json');
const enPath = path.resolve(__dirname, '../../src/data/en.json');
const formsPath = path.resolve(__dirname, '../../src/data/forms.json');

const frNames = JSON.parse(fs.readFileSync(frPath, 'utf-8'));
const enNames = JSON.parse(fs.readFileSync(enPath, 'utf-8'));
const defaultForms = JSON.parse(fs.readFileSync(formsPath, 'utf-8'));

function normalizeName(str) {
  if (!str) return '';
  return str.trim().toLowerCase();
}

function toSpeciesId(frenchName, form, isShadow = false, customForms = {}) {
  if (!frenchName) {
    return { id: '', unmatched: false, unmatchedForm: null };
  }

  const cleanFrName = normalizeName(frenchName);
  const frIndex = frNames.findIndex(n => n.toLowerCase() === cleanFrName);

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
    if (combinedForms[trimmedForm] !== undefined) {
      const suffix = combinedForms[trimmedForm];
      if (suffix) {
        id += `_${suffix}`;
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

function speciesIdToFrench(speciesId, customForms = {}) {
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

  // Look up base english name in enNames
  const normalizedEnNames = enNames.map(name =>
    name.replace(/ /g, '_').replace(/-/g, '_').replace(/\. /g, '_').replace(/\./g, '_').toLowerCase()
  );

  const foundIndex = normalizedEnNames.indexOf(cleanId);
  let frenchName = cleanId;
  if (foundIndex !== -1 && frNames[foundIndex]) {
    frenchName = frNames[foundIndex];
    frenchName = frenchName.charAt(0).toUpperCase() + frenchName.slice(1);
  }

  return { frenchName, form: formName, isShadow };
}

module.exports = {
  toSpeciesId,
  speciesIdToFrench
};
