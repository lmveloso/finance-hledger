// frontend/src/theme/tokens.js
//
// Dark editorial palette — centralizes every color literal used across the app.
// Fase 0 rule: zero visual change. Every hex below is a value that already
// exists in Dashboard.jsx, Login.jsx, or config.js. Variants (*Alt) preserve
// near-duplicates that shipped historically; collapse them only via a
// follow-up ADR after confirming visual parity.
//
// Consumption pattern: inline styles.
//   style={{ color: tokens.color.text.primary, background: tokens.color.bg.card }}
//
// See docs/01-ESTABILIZACAO.md §4.3 (inline + tokens strategy).

export const color = {
  bg: {
    page:     '#1a1815',  // Dashboard root, tooltip bg
    pageAlt:  '#1a1816',  // Login wrapper + input bg (1-digit variant, preserved)
    card:     '#252220',
    hover:    '#2a2724',
    opening:  '#242220',  // "saldo inicial" row background
  },

  border: {
    default: '#3a3632',
    subtle:  '#2a2724',
  },

  text: {
    primary:     '#e8e2d5',
    primaryAlt:  '#e8e0d4',  // Login-only variant, preserved
    secondary:   '#c4bcab',
    muted:       '#8a8275',
    disabled:    '#6a6258',
    faint:       '#4a4642',
    faintAlt:    '#4a4640',  // Dashboard PL breakdown label, preserved
  },

  accent: {
    warm:      '#d4a574',  // primary accent (KPIs, highlights, selected state)
    secondary: '#c97b5c',  // warm secondary / also used as negative feedback
  },

  feedback: {
    positive:    '#8b9d7a',  // income, positive delta, reduced debt
    negative:    '#c97b5c',  // expense, negative delta (alias of accent.secondary)
    info:        '#6b8ca3',  // transfers, reference line, saldo series
    errorText:   '#e05252',
    errorBg:     '#3a2020',
    errorBorder: '#5a3030',
    errorRule:   '#4a2a2a',  // separator inside error boxes
  },

  chart: {
    // Recharts category palette — cycles when #categories > length.
    // Previously lived in config.js as CONFIG.categoryColors.
    category: [
      '#d4a574',
      '#c97b5c',
      '#8b9d7a',
      '#6b8ca3',
      '#b8956a',
      '#9c7b9c',
      '#7a7a7a',
    ],
  },

  overlay: {
    // Alpha-blended surfaces. Kept as literals (not computed from base colors)
    // so that Fase 0 is a pure byte-preserving refactor.
    credito:        'rgba(139,157,122,0.15)',  // positive.15
    debito:         'rgba(201,123,92,0.15)',   // negative.15
    transferencia:  'rgba(107,140,163,0.15)',  // info.15
    saldoInicial:   'rgba(138,130,117,0.18)',  // muted.18
    accentWarmSoft: 'rgba(212,165,116,0.04)',  // KPI emphasis background
    pageScrim:      'rgba(26,24,21,0.4)',      // subtle panel overlay
    // Heat-map cell fill is computed with a dynamic alpha — see Dashboard.jsx
    // line ~1315. Not tokenized because the alpha is data-driven.
  },
};

export const tokens = { color };

export default tokens;
