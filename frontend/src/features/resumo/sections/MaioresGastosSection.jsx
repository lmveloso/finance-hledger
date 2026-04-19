// Resumo — Section 4: Maiores Gastos (top 5 with "see all" shortcut).
//
// Visual layout ported from docs/design/fase-u/project/src/tab-resumo.jsx
// (lines 51-66). Key design choice: amounts use `color.text.primary` (not
// `feedback.negative`) — the redesign argues that colour-coding every single
// expense as "red" adds noise. The list is already bounded to "big spends";
// the amount contrast through serif weight is enough.
//
// If there are more than 5 transactions, the footer exposes "Ver todas (N)"
// which delegates to `goToTransactions` from NavContext — inline handoff to
// the Transações tab, not a modal.

import React from 'react';
import { ChevronRight } from 'lucide-react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';
import { useNav } from '../../../contexts/NavContext.jsx';
import { t } from '../../../i18n/index.js';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

function MaioresGastosSection() {
  const { selectedMonth, refreshKey } = useMonth();
  const { goToTransactions } = useNav();

  const { data, error, loading } = useApi(
    `/api/top-expenses?month=${selectedMonth}&limit=5`,
    [selectedMonth, refreshKey],
  );

  if (error) return <ErrorBox msg={error} />;

  const transactions = data?.transacoes || [];
  const displayed = transactions.slice(0, 5);
  const hasMore = transactions.length > 5;

  return (
    <div className="card">
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
        {t('resumo.topExpenses.title')}
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
                  {BRL(g.valor)}
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
              onClick={() => goToTransactions(null)}
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
              {t('resumo.topExpenses.seeAll', { count: transactions.length })}{' '}
              <ChevronRight size={14} />
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default MaioresGastosSection;
