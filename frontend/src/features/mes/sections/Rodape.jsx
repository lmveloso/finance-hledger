// Rodape — last-updated footer below the four cards.
//
// Renders absolute time per the brief Open Q resolution (15.3):
//   pt-BR: "Última atualização: 25/04/2026 09:14"
//   en:    "Last updated: Apr 25, 2026 9:14am"
//
// The brief's example uses mixed case (not uppercase), so this footer
// drops the Micro token's optional uppercase + caps tracking — Micro size
// (10px) and weight (500) hold; tracking is gentle (0.04em) for mixed
// case readability.
//
// When summary.last_updated is null OR the empty string the backend may
// return, falls back to "—" (Open Q 15.4). Honest about the unknown
// rather than hiding the footer.

import React from 'react';
import { color } from '../../../theme/tokens';
import { t, lang } from '../../../i18n/index.js';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatLastUpdated(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  if (lang === 'pt-BR') {
    // "DD/MM/YYYY HH:MM" — manual formatting to avoid Intl's comma between
    // date and time on locale 'pt-BR'.
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hour24 = d.getHours();
  const ampm = hour24 < 12 ? 'am' : 'pm';
  const hour12 = ((hour24 + 11) % 12) + 1;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${hour12}:${pad2(d.getMinutes())}${ampm}`;
}

function Rodape({ summary }) {
  const when = formatLastUpdated(summary?.last_updated);
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 4,
      }}
    >
      <span
        className="sans"
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.04em',
          color: color.text.muted,
        }}
      >
        {t('mes.footer.lastUpdated', { when })}
      </span>
    </div>
  );
}

export default Rodape;
