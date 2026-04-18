// Minimal i18n runtime.
//
// Per docs/01-ESTABILIZACAO.md §6.1, we intentionally avoid heavier libs
// (react-i18next, lingui) for this project. Resolution picks a dictionary
// from the browser's language and falls back to the key itself on miss
// (so missing translations are visible during development).

import en from './en.js';
import ptBR from './pt-BR.js';

const DICTS = {
  en,
  'pt-BR': ptBR,
};

function pickLang() {
  if (typeof navigator === 'undefined' || !navigator.language) return 'pt-BR';
  return navigator.language.startsWith('pt') ? 'pt-BR' : 'en';
}

const currentLang = pickLang();
const dict = DICTS[currentLang] || DICTS.en;

function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] != null ? String(params[key]) : `{${key}}`
  );
}

/**
 * Resolve a translation key.
 *
 *   t('mes.revenues.title')                → 'Receitas'
 *   t('user.greeting', { name: 'Lucas' })  → 'Oi, Lucas' (if template has {name})
 *
 * Missing keys return the key itself so the gap is visible.
 */
export function t(key, params) {
  const template = dict[key];
  if (template == null) return key;
  return interpolate(template, params);
}

export const lang = currentLang;
