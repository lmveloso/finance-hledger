// AnoDrilldown — inline expansion card anchored to the currently selected
// month column in either Ano view. Clicking the same month again collapses
// the card (state lives in Ano.jsx). No modal, per the frontend-dev rules.
//
// Rendered visually with a top border so the card reads as "an extension of
// the matrix that owns it", not as an overlay.

import React from 'react';
import { color } from '../../../theme/tokens';
import { t, lang } from '../../../i18n/index.js';
import PrincipiosCard from './PrincipiosCard.jsx';
import CategoriasCard from './CategoriasCard.jsx';

// Locale-aware "Month Year" string. Uses the runtime `lang` resolved by the
// i18n runtime (pt-BR or en) so the drill-down header reads naturally in
// both dictionaries — "Abril 2026" vs "April 2026".
function formatMonthLong(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  const locale = lang === 'pt-BR' ? 'pt-BR' : 'en-US';
  const str = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function AnoDrilldown({ kind, month }) {
  if (!month) return null;

  const titleKey =
    kind === 'categoria'
      ? 'ano.drilldown.categoria.title'
      : 'ano.drilldown.principio.title';

  return (
    <div
      className="card"
      style={{
        marginTop: 16,
        borderTop: `2px solid ${color.accent.primary}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          flexDirection: 'column',
          gap: 8,
          marginBottom: 16,
        }}
      >
        {formatMonthLong(month)}
        <div
          className="sans"
          style={{
            fontSize: 11,
            letterSpacing: '0.15em',
            color: color.text.muted,
            textTransform: 'uppercase',
          }}
        >
          {t(titleKey)}
        </div>
      </div>

      {kind === 'categoria' ? (
        <CategoriasCard month={month} />
      ) : (
        <PrincipiosCard month={month} />
      )}
    </div>
  );
}

export default AnoDrilldown;
