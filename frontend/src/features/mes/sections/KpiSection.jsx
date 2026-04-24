// Section 1 — Three KPI cards (Receita, Despesa, Saldo) with inline
// sparklines and click-to-expand panels.
//
// Refactored during the Resumo + Mês merge (Fase UX-Polish #3). The old
// Resumo tab kept two KPIs (Despesas + Saldo) with sparklines; the old
// Mês KpiSection had three (Receita + Despesa + Saldo) but no sparklines
// and no expansion. This section combines the best of both:
//
//   - Three cards in one responsive grid.
//   - Each card has a 6-month sparkline + optional YoY compare badge.
//   - Each card is click-to-expand: the parent owns the `expandedKpi`
//     state (only one expanded at a time). The expanded panel renders
//     BELOW the grid as a full-width sibling — never inside a grid cell
//     (would cause layout jank on desktop when the row height changes).
//
// Result/Saldo color is conditional (from the old Mês KpiSection §5.2):
//   > +threshold → feedback.positive
//   | delta | ≤ threshold → accent.primary (neutral / small delta)
//   < -threshold → feedback.negative
//   Threshold: 1% of revenue, floor 100 BRL.

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { color } from '../../../theme/tokens';
import KPI from '../../../components/KPI.jsx';
import Sparkline from '../../../components/Sparkline.jsx';
import DeltaBadge from '../../../components/DeltaBadge.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import KpiExpander from '../components/KpiExpander.jsx';
import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';
import { useSparklines } from '../hooks/useSparklines.js';
import { t } from '../../../i18n/index.js';

// Same month last year — used for the optional YoY delta compare.
function lastYearMonth(ym) {
  const [y, m] = ym.split('-');
  return `${parseInt(y, 10) - 1}-${m}`;
}

function pickResultColor(result, revenue) {
  const ref = Math.max(Math.abs(revenue || 0) * 0.01, 100);
  if (result > ref) return color.feedback.positive;
  if (result < -ref) return color.feedback.negative;
  return color.accent.primary;
}

function KpiSection({ expandedKpi, onToggle }) {
  const { selectedMonth, compareMode, refreshKey } = useMonth();

  const { data: summary, error, loading } = useApi(
    `/api/summary?month=${selectedMonth}`,
    [selectedMonth, refreshKey],
  );
  const compMonth = lastYearMonth(selectedMonth);
  const { data: compSummary } = useApi(
    `/api/summary?month=${compMonth}`,
    [compMonth, refreshKey],
  );
  const {
    receitas: sparkReceitas,
    despesas: sparkDespesas,
    saldo: sparkSaldo,
  } = useSparklines();

  if (error) return <ErrorBox msg={error} />;

  const receitas = summary?.receitas;
  const despesas = summary?.despesas;
  const saldo = summary?.saldo;

  const receitaColor = color.feedback.positive;
  const despesaColor = color.feedback.negative;
  const saldoColor = pickResultColor(saldo, receitas);

  const compareDelta = (curr, prev) =>
    compareMode && compSummary ? (
      <DeltaBadge current={curr} previous={prev} />
    ) : null;

  const sparkline = (data, col) =>
    data.length >= 2 ? <Sparkline data={data} color={col} height={36} /> : null;

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
    >
      <KpiExpander
        id="receita"
        expandedId={expandedKpi}
        onToggle={onToggle}
        panelId="mes-kpi-panel-receita"
      >
        <KPI
          label={t('mes.kpi.revenue')}
          valor={receitas}
          icon={<ArrowUpRight size={15} />}
          cor={receitaColor}
          loading={loading}
          delta={compareDelta(receitas, compSummary?.receitas)}
          sparkline={sparkline(sparkReceitas, receitaColor)}
        />
      </KpiExpander>

      <KpiExpander
        id="despesa"
        expandedId={expandedKpi}
        onToggle={onToggle}
        panelId="mes-kpi-panel-despesa"
      >
        <KPI
          label={t('mes.kpi.expense')}
          valor={despesas}
          icon={<ArrowDownRight size={15} />}
          cor={despesaColor}
          loading={loading}
          delta={compareDelta(despesas, compSummary?.despesas)}
          sparkline={sparkline(sparkDespesas, despesaColor)}
        />
      </KpiExpander>

      <KpiExpander
        id="saldo"
        expandedId={expandedKpi}
        onToggle={onToggle}
        panelId="mes-kpi-panel-saldo"
      >
        <KPI
          label={t('mes.kpi.result')}
          valor={saldo}
          icon={<Wallet size={15} />}
          cor={saldoColor}
          destaque
          loading={loading}
          delta={compareDelta(saldo, compSummary?.saldo)}
          sparkline={sparkline(sparkSaldo, saldoColor)}
        />
      </KpiExpander>
    </div>
  );
}

export default KpiSection;
