// Maiores Gastos (top 5 with "see all" shortcut) — ported from
// features/resumo/sections/MaioresGastosSection.jsx during the Resumo + Mês
// merge (Fase UX-Polish #3). Rendered inside the Despesa KPI expansion,
// next to CategoriasSection.
//
// Key design choice: amounts use `color.text.primary` (not
// `feedback.negative`) — the redesign argues that colour-coding every
// single expense as "red" adds noise. The list is already bounded to
// "big spends"; the amount contrast through serif weight is enough.
//
// If there are more than 5 transactions, the footer exposes "Ver todas (N)"
// which delegates to `goToTransactions` from NavContext — inline handoff
// to the Transações tab, not a modal.

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';
import { useNav } from '../../../contexts/NavContext.jsx';
import { formatBRL } from '../../../lib/formatBRL';
import { t } from '../../../i18n/index.js';

// `framing` controls whether the section ships its own outer card +
// heading. Default `card` keeps the legacy behavior; `bare` strips both
// for callers (like the new Despesa surface) that already provide a
// surrounding container — DESIGN.md §5 forbids nested cards.
//
// `category` (optional) narrows the query to a specific L1 expense
// category — used when the user has drilled into a categoria from the
// sibling CategoriasSection so this list reflects "biggest spends in X"
// instead of the global month list.
function MaioresGastosSection({ framing = 'card', category = null } = {}) {
  const { selectedMonth, refreshKey } = useMonth();
  const { goToTransactions } = useNav();

  const path = category
    ? `/api/top-expenses?month=${selectedMonth}&limit=5&category=${encodeURIComponent(category)}`
    : `/api/top-expenses?month=${selectedMonth}&limit=5`;
  const { data, error, loading } = useApi(path, [path, refreshKey]);

  if (error) return <ErrorBox msg={error} />;

  const transactions = data?.transacoes || [];
  const displayed = transactions.slice(0, 5);
  const hasMore = transactions.length > 5;

  const Wrapper = framing === 'card' ? 'div' : React.Fragment;
  const wrapperProps = framing === 'card' ? { className: 'card' } : {};

  return (
    <Wrapper {...wrapperProps}>
      <div
        className="sans"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        {t('mes.expand.topExpenses.title')}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          {displayed.map((g, i) => (
            <div
              key={i}
              style={{
                padding: '13px 0',
                borderBottom:
                  i < displayed.length - 1
                    ? `1px solid ${color.border.subtle}`
                    : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                <span
                  className="sans"
                  style={{
                    fontSize: 13,
                    color: color.text.primary,
                    lineHeight: 1.3,
                    flex: 1,
                  }}
                >
                  {g.descricao}
                </span>
                <span
                  className="serif"
                  style={{
                    fontSize: 15,
                    color: color.text.primary,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatBRL(g.valor)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                <span
                  className="sans"
                  style={{ fontSize: 10, color: color.text.muted }}
                >
                  {g.categoria}
                </span>
                <span
                  className="sans"
                  style={{ fontSize: 10, color: color.text.disabled }}
                >
                  ·
                </span>
                <span
                  className="sans"
                  style={{ fontSize: 10, color: color.text.muted }}
                >
                  {g.data}
                </span>
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              onClick={() => goToTransactions(category || null)}
              className="sans"
              style={{
                background: 'none',
                border: `1px solid ${color.border.default}`,
                borderRadius: 3,
                color: color.accent.primary,
                cursor: 'pointer',
                fontSize: 12,
                padding: '8px 12px',
                width: '100%',
                marginTop: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'background 0.12s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = color.bg.hover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              {t('mes.expand.topExpenses.seeAll', { count: transactions.length })}{' '}
              <ChevronRight size={14} />
            </button>
          )}
        </>
      )}
    </Wrapper>
  );
}

export default MaioresGastosSection;
