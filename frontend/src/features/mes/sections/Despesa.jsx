// Despesa — peer card on the Mês tab.
//
// Always-open card (no accordion): the heading + total stay visible above
// the body and the body is rendered immediately. The change from a
// disclosure to a flat container was driven by user feedback after the
// first craft round — drilling into a categoria via CategoriasSection was
// being swallowed by the disclosure's outer click handler.
//
// Body composition (PRD-08 §4.3 + user feedback rounds):
//   1. CategoriasSection with topLimit=5 — stacked composition bar at top,
//      then top-5 categorias, "Mostrar mais" toggle aligned right. Click
//      a row to drill into the L1 → L2 sub-category list inline.
//   2. MaioresGastosSection — top expense transactions. When the user has
//      drilled into a categoria, this section narrows to that category
//      so the reader sees "biggest spends in Saúde" instead of globals.
//      The drilldown state is HOISTED here for that reason; it lives in
//      `selected` and is fed into both sections.
//   3. CTA "Mostrar na tela de Transações" — hands off to the Transações
//      tab via `goToTransactions(category | null)` so the filter survives
//      the hop.

import React, { useState } from 'react';
import { color, padding } from '../../../theme/tokens';
import { useNav } from '../../../contexts/NavContext.jsx';
import { formatBRL } from '../../../lib/formatBRL';
import { t } from '../../../i18n/index.js';
import CategoriasSection from './CategoriasSection.jsx';
import MaioresGastosSection from './MaioresGastosSection.jsx';

function Despesa({ summary, summaryLoading }) {
  const { goToTransactions } = useNav();
  const [selected, setSelected] = useState(null);
  const total = summary?.expense;
  const showEmpty = !summaryLoading && total === 0;

  const filterCategory = selected
    ? selected.segmento_raw || selected.nome
    : null;

  return (
    <section
      style={{
        background: color.bg.card,
        border: `1px solid ${color.border.default}`,
        borderRadius: 4,
        padding: padding.rounded.card,
      }}
    >
      <h2
        className="sans"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          fontWeight: 500,
          margin: 0,
          marginBottom: 10,
        }}
      >
        {t('mes.row.expense.label')}
      </h2>
      <div
        className="serif"
        style={{
          fontSize: 30,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: color.text.primary,
          fontVariantNumeric: 'tabular-nums',
          marginBottom: 22,
        }}
      >
        {summaryLoading || total == null ? '···' : formatBRL(total)}
      </div>

      {showEmpty ? (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted }}
        >
          {t('mes.row.expense.empty')}
        </div>
      ) : (
        <>
          <CategoriasSection
            framing="bare"
            topLimit={5}
            selectedCategory={selected}
            onSelectCategory={setSelected}
          />

          <div
            style={{
              marginTop: 24,
              paddingTop: 20,
              borderTop: `1px solid ${color.border.subtle}`,
            }}
          >
            <MaioresGastosSection framing="bare" category={filterCategory} />
          </div>

          <div
            style={{
              marginTop: 16,
              display: 'flex',
              justifyContent: 'flex-start',
            }}
          >
            <button
              type="button"
              onClick={() => goToTransactions(filterCategory)}
              className="sans"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                color: color.accent.primary,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('mes.row.expense.cta')}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default Despesa;
