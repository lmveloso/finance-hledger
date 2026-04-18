// Section 1 — Receitas.
//
// Lists revenue postings of the selected month in a card. Total is pinned at
// the bottom of the list in emphasized type; comparison vs previous month
// comes from the hook on `previous` (not yet available from /api/revenues,
// so delta is rendered only when we can compute it locally).
//
// Empty state: friendly message, not an ErrorBox. Only real HTTP failures
// surface as ErrorBox.

import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useReceitas } from '../hooks/useReceitas.js';
import { t } from '../../../i18n/index.js';
import ReceitaRow from '../components/ReceitaRow.jsx';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });

function ReceitasSection() {
  const { data, error, loading } = useReceitas();

  if (error) return <ErrorBox msg={error} />;

  const revenues = data?.revenues || [];
  const total = data?.total ?? 0;

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
        {t('mes.revenues.title')}
      </div>

      {loading ? (
        <Spinner />
      ) : revenues.length === 0 ? (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted, padding: '8px 0' }}
        >
          {t('mes.revenues.empty')}
        </div>
      ) : (
        <>
          {revenues.map((r, i) => (
            <ReceitaRow
              key={`${r.date}-${r.description}-${i}`}
              date={r.date}
              description={r.description}
              amount={r.amount}
              isLast={i === revenues.length - 1}
            />
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
              {t('mes.revenues.total')}
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

export default ReceitasSection;
