// frontend/src/theme/tokens.js
//
// Dual-mode indigo-violet design tokens. Replaces the prior warm-brown
// editorial palette as part of Fase U (see docs/04-PRD-ui-ux.md §4.2).
//
// ── Consumption pattern ────────────────────────────────────────────────
// Most call-sites read the legacy `color` export unchanged:
//
//   import { color } from '../theme/tokens';
//   style={{ background: color.bg.card, color: color.text.primary }}
//
// `color` is a Proxy whose property lookups resolve against the currently
// active mode (`dark` or `light`). Mode changes are driven by
// `contexts/ThemeContext.jsx`, which calls `_setActiveMode(mode)` below.
//
// For components that need to re-render on mode change (Recharts configs,
// memoised closures, etc.) use the `useTheme()` hook from ThemeContext —
// or rely on the `key={mode}` remount applied in `main.jsx`.
//
// ── Legacy-key compatibility ───────────────────────────────────────────
// A number of keys from the warm-brown token tree (e.g. `color.bg.pageAlt`,
// `color.overlay.credito`, `color.feedback.errorBg`) are not present in the
// new tree. The Proxy below resolves these as aliases to the closest
// semantic match so that ~48 existing call-sites keep working unchanged.
// See the `_legacy` map at the bottom of this file for the full mapping.
//
// New code should prefer the canonical names:
//   bg.page  border.default  text.primary  accent.primary  feedback.positive
//   chart.colors[]  bg.cardAlt
//
// ── Values ──────────────────────────────────────────────────────────────
// Mirrors docs/design/fase-u/project/src/theme.js exactly.

const _dark = {
  bg: {
    page:    '#0d0f1a',
    sidebar: '#080a14',
    card:    '#12152a',
    cardAlt: '#181c32',
    hover:   '#1e2240',
    input:   '#181c32',
  },
  border: {
    default: '#252848',
    subtle:  '#1a1d38',
    focus:   '#6366f1',
  },
  text: {
    primary:   '#e0e6ff',
    secondary: '#8b94c4',
    muted:     '#555c88',
    disabled:  '#2e3360',
  },
  accent: {
    primary:        '#6366f1',
    secondary:      '#8b5cf6',
    primaryMuted:   'rgba(99,102,241,0.14)',
    secondaryMuted: 'rgba(139,92,246,0.14)',
  },
  feedback: {
    positive:      '#34d399',
    positiveMuted: 'rgba(52,211,153,0.12)',
    negative:      '#f87171',
    negativeMuted: 'rgba(248,113,113,0.12)',
    warning:       '#fbbf24',
    warningMuted:  'rgba(251,191,36,0.12)',
    info:          '#60a5fa',
    infoMuted:     'rgba(96,165,250,0.12)',
  },
  chart: {
    colors: ['#6366f1', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#e879f9'],
  },
  isDark: true,
};

const _light = {
  bg: {
    page:    '#f0f1ff',
    sidebar: '#ffffff',
    card:    '#ffffff',
    cardAlt: '#f4f5ff',
    hover:   '#eaebff',
    input:   '#f4f5ff',
  },
  border: {
    default: '#dde0f5',
    subtle:  '#ebebfb',
    focus:   '#6366f1',
  },
  text: {
    primary:   '#18193a',
    secondary: '#4a5280',
    muted:     '#7880aa',
    disabled:  '#b8bcd8',
  },
  accent: {
    primary:        '#6366f1',
    secondary:      '#8b5cf6',
    primaryMuted:   'rgba(99,102,241,0.08)',
    secondaryMuted: 'rgba(139,92,246,0.08)',
  },
  feedback: {
    positive:      '#059669',
    positiveMuted: 'rgba(5,150,105,0.08)',
    negative:      '#dc2626',
    negativeMuted: 'rgba(220,38,38,0.08)',
    warning:       '#d97706',
    warningMuted:  'rgba(217,119,6,0.08)',
    info:          '#2563eb',
    infoMuted:     'rgba(37,99,235,0.08)',
  },
  chart: {
    colors: ['#6366f1', '#8b5cf6', '#059669', '#d97706', '#dc2626', '#2563eb', '#db2777'],
  },
  isDark: false,
};

const _modes = { dark: _dark, light: _light };

let _activeMode = 'dark';

export function _setActiveMode(mode) {
  if (mode !== 'dark' && mode !== 'light') {
    throw new Error(`_setActiveMode: invalid mode "${mode}"`);
  }
  _activeMode = mode;
}

export function _getActiveMode() {
  return _activeMode;
}

// Legacy-key shims. Each entry resolves lazily against the currently active
// mode so toggling propagates automatically. Keys not listed here fall
// through to the live mode tree.
const _legacy = {
  bg: {
    pageAlt: () => _modes[_activeMode].bg.cardAlt,
    opening: () => _modes[_activeMode].bg.cardAlt,
  },
  text: {
    primaryAlt: () => _modes[_activeMode].text.primary,
    faint:      () => _modes[_activeMode].text.disabled,
    faintAlt:   () => _modes[_activeMode].text.disabled,
  },
  // The `accent.warm` shim was removed in PR-U9 after all call-sites were
  // migrated to `accent.primary`. `accent.secondary` has always lived in the
  // active tree directly, so no shim is needed there.
  feedback: {
    errorText:   () => _modes[_activeMode].feedback.negative,
    errorBg:     () => _modes[_activeMode].feedback.negativeMuted,
    errorBorder: () => _modes[_activeMode].feedback.negative,
    errorRule:   () => _modes[_activeMode].border.subtle,
  },
  chart: {
    category: () => _modes[_activeMode].chart.colors,
  },
  overlay: {
    credito:        () => _modes[_activeMode].feedback.positiveMuted,
    debito:         () => _modes[_activeMode].feedback.negativeMuted,
    transferencia:  () => _modes[_activeMode].feedback.infoMuted,
    saldoInicial:      () => _modes[_activeMode].bg.cardAlt,
    accentPrimarySoft: () => _modes[_activeMode].accent.primaryMuted,
    pageScrim:         () => (_activeMode === 'dark' ? 'rgba(13,15,26,0.4)' : 'rgba(240,241,255,0.4)'),
  },
};

function _makeGroupProxy(groupName) {
  return new Proxy({}, {
    get(_t, key) {
      const active = _modes[_activeMode];
      const group = active[groupName];
      if (group && Object.prototype.hasOwnProperty.call(group, key)) {
        return group[key];
      }
      const legacyGroup = _legacy[groupName];
      if (legacyGroup && Object.prototype.hasOwnProperty.call(legacyGroup, key)) {
        return legacyGroup[key]();
      }
      return undefined;
    },
    has(_t, key) {
      const active = _modes[_activeMode];
      const group = active[groupName];
      if (group && Object.prototype.hasOwnProperty.call(group, key)) return true;
      const legacyGroup = _legacy[groupName];
      if (legacyGroup && Object.prototype.hasOwnProperty.call(legacyGroup, key)) return true;
      return false;
    },
    ownKeys(_t) {
      const active = _modes[_activeMode];
      const group = active[groupName] || {};
      const legacyGroup = _legacy[groupName] || {};
      return Array.from(new Set([...Object.keys(group), ...Object.keys(legacyGroup)]));
    },
    getOwnPropertyDescriptor() {
      return { enumerable: true, configurable: true };
    },
  });
}

// The top-level `color` proxy exposes one group proxy per semantic group.
// `isDark` is also surfaced directly so existing code can branch on mode.
const _colorGroups = {
  bg:       _makeGroupProxy('bg'),
  border:   _makeGroupProxy('border'),
  text:     _makeGroupProxy('text'),
  accent:   _makeGroupProxy('accent'),
  feedback: _makeGroupProxy('feedback'),
  chart:    _makeGroupProxy('chart'),
  overlay:  _makeGroupProxy('overlay'),
};

export const color = new Proxy({}, {
  get(_t, key) {
    if (key === 'isDark') return _modes[_activeMode].isDark;
    if (Object.prototype.hasOwnProperty.call(_colorGroups, key)) {
      return _colorGroups[key];
    }
    return undefined;
  },
  has(_t, key) {
    return key === 'isDark' || Object.prototype.hasOwnProperty.call(_colorGroups, key);
  },
  ownKeys() {
    return [...Object.keys(_colorGroups), 'isDark'];
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
});

// Explicit snapshot access for consumers that need a frozen copy of one mode
// (e.g. for SSR-style comparisons or test assertions). Not used by app code.
export function getModeTokens(mode) {
  if (mode !== 'dark' && mode !== 'light') {
    throw new Error(`getModeTokens: invalid mode "${mode}"`);
  }
  return _modes[mode];
}

export const fonts = {
  jakarta: {
    body:    "'Plus Jakarta Sans', system-ui, sans-serif",
    display: "'Instrument Serif', Georgia, serif",
    label:   'Jakarta',
  },
};

export const radius = {
  rounded: { xs: 6, sm: 10, md: 16, lg: 22 },
};

export const padding = {
  rounded: { card: 24, inner: 20 },
};

export const tokens = { color, fonts, radius, padding };

export default tokens;
