// ReceitaExpanded — panel shown when the Receita KPI card is expanded on
// the Mês tab (Fase UX-Polish #3).
//
// Unlike the Despesa expansion (two-column with category drill-down), the
// Receita expansion is a simple grouped list: revenues are bucketed by
// their derived "type" (see `lib/groupReceitas`) so the reader sees at a
// glance the shape of the month's income (e.g. "Salario 12 000" +
// "Dividendo 320" rather than 37 individual postings).
//
// The raw revenues come from /api/revenues — the same endpoint the former
// ReceitasSection used. Grouping happens client-side because the "type"
// is a heuristic (see groupReceitas for the rules) and we want the backend
// to stay free of display logic.

import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useReceitas } from '../hooks/useReceitas.js';
import { groupReceitas } from '../lib/groupReceitas.js';
import { t } from '../../../i18n/index.js';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });

function ReceitaExpanded() {
  const { data, error, loading } = useReceitas();

  if (error) return <ErrorBox msg={error} />;

  const revenues = data?.revenues || [];
  const total = data?.total ?? 0;
  const groups = groupReceitas(revenues);

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
        {t('mes.expand.revenue.title')}
      </div>

      {loading ? (
        <Spinner />
      ) : groups.length === 0 ? (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted, padding: '8px 0' }}
        >
          {t('mes.expand.revenue.empty')}
        </div>
      ) : (
        <>
          {groups.map((g, i) => (
            <div
              key={g.type}
              style={{
                padding: '12px 0',
                borderBottom:
                  i < groups.length - 1
                    ? `1px solid ${color.border.subtle}`
                    : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                <span
                  className="sans"
                  style={{
                    fontSize: 14,
                    color: color.text.primary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {g.type}
                </span>
                {g.count > 1 && (
                  <span
                    className="sans"
                    style={{ fontSize: 11, color: color.text.muted }}
                  >
                    {t('mes.expand.revenue.count', { count: g.count })}
                  </span>
                )}
              </div>
              <span
                className="serif"
                style={{
                  fontSize: 16,
                  color: color.text.primary,
                  whiteSpace: 'nowrap',
                }}
              >
                {BRL(g.total)}
              </span>
            </div>
          ))}
          <div
            style={{
              marginTop: 16,
              paddingTop: 12,
              borderTop: `1px solid ${color.border.default}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
            }}
          >
            <span
              className="sans"
              style={{
                fontSize: 11,
                letterSpacing: '0.1em',
                color: color.text.muted,
                textTransform: 'uppercase',
              }}
            >
              {t('mes.expand.revenue.total')}
            </span>
            <span
              className="serif"
              style={{
                fontSize: 22,
                color: color.feedback.positive,
                fontWeight: 600,
              }}
            >
              {BRL(total)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export default ReceitaExpanded;
