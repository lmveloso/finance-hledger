// Design tokens — indigo-violet palette, dark + light
window.THEME = {
  dark: {
    bg: {
      page:    '#0d0f1a',
      sidebar: '#080a14',
      card:    '#12152a',
      cardAlt: '#181c32',
      hover:   '#1e2240',
      input:   '#181c32',
    },
    border:  { default: '#252848', subtle: '#1a1d38', focus: '#6366f1' },
    text:    { primary: '#e0e6ff', secondary: '#8b94c4', muted: '#555c88', disabled: '#2e3360' },
    accent:  { primary: '#6366f1', secondary: '#8b5cf6',
               primaryMuted: 'rgba(99,102,241,0.14)', secondaryMuted: 'rgba(139,92,246,0.14)' },
    feedback:{
      positive: '#34d399', positiveMuted: 'rgba(52,211,153,0.12)',
      negative: '#f87171', negativeMuted: 'rgba(248,113,113,0.12)',
      warning:  '#fbbf24', warningMuted:  'rgba(251,191,36,0.12)',
      info:     '#60a5fa', infoMuted:     'rgba(96,165,250,0.12)',
    },
    chart: { colors: ['#6366f1','#a78bfa','#34d399','#fbbf24','#f87171','#60a5fa','#e879f9'] },
    isDark: true,
  },
  light: {
    bg: {
      page:    '#f0f1ff',
      sidebar: '#ffffff',
      card:    '#ffffff',
      cardAlt: '#f4f5ff',
      hover:   '#eaebff',
      input:   '#f4f5ff',
    },
    border:  { default: '#dde0f5', subtle: '#ebebfb', focus: '#6366f1' },
    text:    { primary: '#18193a', secondary: '#4a5280', muted: '#7880aa', disabled: '#b8bcd8' },
    accent:  { primary: '#6366f1', secondary: '#8b5cf6',
               primaryMuted: 'rgba(99,102,241,0.08)', secondaryMuted: 'rgba(139,92,246,0.08)' },
    feedback:{
      positive: '#059669', positiveMuted: 'rgba(5,150,105,0.08)',
      negative: '#dc2626', negativeMuted: 'rgba(220,38,38,0.08)',
      warning:  '#d97706', warningMuted:  'rgba(217,119,6,0.08)',
      info:     '#2563eb', infoMuted:     'rgba(37,99,235,0.08)',
    },
    chart: { colors: ['#6366f1','#8b5cf6','#059669','#d97706','#dc2626','#2563eb','#db2777'] },
    isDark: false,
  },

  fonts: {
    jakarta: { body: "'Plus Jakarta Sans', system-ui, sans-serif", display: "'Instrument Serif', Georgia, serif", label: 'Jakarta' },
    classic: { body: "'Inter', system-ui, sans-serif",             display: "'Playfair Display', Georgia, serif",  label: 'Classic' },
    grotesk: { body: "'Space Grotesk', system-ui, sans-serif",     display: "'DM Serif Display', Georgia, serif",  label: 'Grotesk' },
  },

  radius: {
    rounded: { xs: 6, sm: 10, md: 16, lg: 22 },
    sharp:   { xs: 2, sm: 3,  md: 4,  lg: 6  },
    compact: { xs: 4, sm: 6,  md: 10, lg: 14 },
  },
  padding: {
    rounded: { card: 24, inner: 20 },
    sharp:   { card: 24, inner: 20 },
    compact: { card: 16, inner: 14 },
  },
};
