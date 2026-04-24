// SaldoExpanded — panel shown when the Saldo KPI card is expanded on the
// Mês tab (Fase UX-Polish #3).
//
// Restores the "Contábil × Caixa real × Δ" reconciliation strip that used
// to live at the top of the old Resumo tab (removed in PR-U2). The three
// values answer three different questions:
//
//   - Contábil  = receitas − despesas  (accrual, what was EARNED/SPENT)
//                 Source: /api/summary.saldo
//   - Caixa real = inflows − outflows through bank accounts this month
//                 Source: /api/flow.total_economia
//   - Δ         = Contábil − Caixa real
//                 Non-zero typically means the month's credit-card
//                 purchases were booked but not yet paid from a bank
//                 account — so the caixa still shows the money sitting in
//                 checking while the contábil already removed it.
//
// Layout: three-column strip on desktop (repeat(3, 1fr)), stacks on mobile
// below 600px via an auto-fit grid.
//
// Edge cases:
//   - When flow shows zero liability movement (no cards in/out), we hide
//     the Δ column and show a short "no card activity" note. The two
//     remaining columns will still read the same value in that case,
//     which makes the reconciliation trivially uninformative.
//   - When |Δ| / receitas > 1%, we show a caption explaining the likely
//     cause (credit-card timing). Below that threshold the two figures
//     are close enough that highlighting the gap would be misleading.

import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';
import { t } from '../../../i18n/index.js';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

function signedColor(value) {
  if (!Number.isFinite(value)) return color.text.muted;
  if (value > 0) return color.feedback.positive;
  if (value < 0) return color.feedback.negative;
  return color.text.primary;
}

function StripCell({ label, value, valueColor, children }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        className="sans"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        className="serif"
        style={{
          fontSize: 24,
          fontWeight: 600,
          color: valueColor || color.text.primary,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          wordBreak: 'break-word',
        }}
      >
        {value}
      </div>
      {children}
    </div>
  );
}

function SaldoExpanded() {
  const { selectedMonth, refreshKey } = useMonth();

  const summaryQ = useApi(`/api/summary?month=${selectedMonth}`, [
    selectedMonth,
    refreshKey,
  ]);
  const flowQ = useApi(`/api/flow?month=${selectedMonth}`, [
    selectedMonth,
    refreshKey,
  ]);

  const error = summaryQ.error || flowQ.error;
  const loading = summaryQ.loading || flowQ.loading;

  if (error) return <ErrorBox msg={error} />;

  const contabil = Number(summaryQ.data?.saldo) || 0;
  const caixa = Number(flowQ.data?.total_economia) || 0;
  const delta = contabil - caixa;

  const receitas = Math.abs(Number(summaryQ.data?.receitas) || 0);

  // Treat a liability column as "card activity" when any passivo conta
  // shows external inflow/outflow or transfers in/out. We can't just read
  // total_* because those aggregate both assets and liabilities.
  const contas = flowQ.data?.contas || [];
  const cardActivity = contas.some(
    (c) =>
      c.tipo === 'passivo' &&
      (Math.abs(c.entradas_externas || 0) > 0 ||
        Math.abs(c.saidas_externas || 0) > 0 ||
        Math.abs(c.transfers_in || 0) > 0 ||
        Math.abs(c.transfers_out || 0) > 0),
  );

  // Threshold for showing the reconciliation explanation. 1% of revenue,
  // matching the tolerance used for the KPI result color heuristic.
  const showDeltaExplanation =
    cardActivity &&
    receitas > 0 &&
    Math.abs(delta) / receitas > 0.01;

  const columns = cardActivity
    ? 'repeat(auto-fit, minmax(180px, 1fr))'
    : 'repeat(auto-fit, minmax(220px, 1fr))';

  return (
    <div className="card">
      <div
        className="sans"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 18,
        }}
      >
        {t('mes.expand.balance.title')}
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <>
          <div
            className="grid"
            style={{
              gridTemplateColumns: columns,
              gap: 20,
            }}
          >
            <StripCell
              label={t('mes.expand.balance.contabil')}
              value={BRL(contabil)}
              valueColor={signedColor(contabil)}
            />
            <StripCell
              label={t('mes.expand.balance.caixa')}
              value={BRL(caixa)}
              valueColor={signedColor(caixa)}
            />
            {cardActivity && (
              <StripCell
                label={t('mes.expand.balance.delta')}
                value={BRL(delta)}
                valueColor={signedColor(delta)}
              />
            )}
          </div>

          {!cardActivity && (
            <div
              className="sans"
              style={{
                marginTop: 14,
                fontSize: 12,
                color: color.text.muted,
                lineHeight: 1.5,
              }}
            >
              {t('mes.expand.balance.noCardActivity')}
            </div>
          )}

          {showDeltaExplanation && (
            <div
              className="sans"
              style={{
                marginTop: 14,
                fontSize: 12,
                color: color.text.muted,
                lineHeight: 1.5,
              }}
            >
              {t('mes.expand.balance.deltaExplanation')}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SaldoExpanded;
