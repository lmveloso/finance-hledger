import React from 'react';
import { color } from '../../../theme/tokens';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

// KPI row for the Fluxo tab.
//
// Revenue / Expense come from total_entradas / total_saidas on /api/flow.
// "Economia" is the accrual-basis savings (rec − desp). "Δ ativos" is the
// cash-basis movement across asset accounts — these differ when credit card
// purchases are booked (accrual expense without cash outflow yet).
function FlowKpiCards({ data }) {
  const receitas = data?.total_entradas ?? 0;
  const despesas = data?.total_saidas ?? 0;
  const economia = data?.total_economia ?? receitas - despesas;
  const contas = data?.contas || [];
  const ativos = contas.filter((c) => c.tipo === 'ativo');
  const passivos = contas.filter((c) => c.tipo === 'passivo');
  const dAtivos = ativos.reduce(
    (s, c) => s + ((c.saldo_final ?? 0) - (c.saldo_inicial ?? 0)),
    0,
  );
  const dPassivos = passivos.reduce(
    (s, c) => s + ((c.saldo_final ?? 0) - (c.saldo_inicial ?? 0)),
    0,
  );

  const items = [
    { label: 'Receitas', value: receitas, cor: color.feedback.positive },
    { label: 'Despesas', value: despesas, cor: color.feedback.negative },
    {
      label: 'Economia',
      value: economia,
      cor: economia >= 0 ? color.accent.warm : color.feedback.negative,
      destaque: true,
    },
    {
      label: 'Δ Ativos',
      value: dAtivos,
      cor: dAtivos >= 0 ? color.feedback.positive : color.feedback.negative,
      hint: 'Caixa líquido',
    },
  ];
  if (passivos.length > 0) {
    items.push({
      label: 'Δ Dívida',
      value: dPassivos,
      // For liabilities, growth (positive delta) is bad.
      cor: dPassivos > 0 ? color.feedback.negative : dPassivos < 0 ? color.feedback.positive : color.text.muted,
    });
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
      }}
    >
      {items.map((kpi) => (
        <div
          key={kpi.label}
          className="card"
          style={{
            borderLeft: kpi.destaque
              ? `3px solid ${kpi.cor}`
              : `1px solid ${color.border.default}`,
            padding: 16,
          }}
        >
          <div
            className="sans"
            style={{
              fontSize: 10,
              letterSpacing: '0.15em',
              color: color.text.muted,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {kpi.label}
          </div>
          <div
            className="serif"
            style={{
              fontSize: kpi.destaque ? 26 : 22,
              fontWeight: 600,
              color: kpi.destaque ? kpi.cor : color.text.primary,
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
            }}
          >
            {BRL(kpi.value)}
          </div>
          {kpi.hint && (
            <div
              className="sans"
              style={{ fontSize: 10, color: color.text.muted, marginTop: 4 }}
            >
              {kpi.hint}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default FlowKpiCards;
