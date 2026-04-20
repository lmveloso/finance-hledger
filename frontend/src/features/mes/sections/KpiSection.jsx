// Section 2 — Three KPI cards (revenue, expense, result).
//
// Layout: 3 cards side-by-side on desktop, stacked on narrow viewports.
// Uses the shared KPI atom via KpiCard wrapper.
//
// Result color is conditional (PRD §5.2):
//   > +threshold → feedback.positive
//   | delta | ≤ threshold → accent.primary (neutral / small delta)
//   < -threshold → feedback.negative
//
// Threshold: 1% of revenue, floor 100 BRL. Picks revenue (not |expense|) as
// the reference because revenue is the month's ceiling (PRD §2).

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet } from 'lucide-react';
import { color } from '../../../theme/tokens';
import KpiCard from '../components/KpiCard.jsx';
import { useKpiData } from '../hooks/useKpiData.js';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { t } from '../../../i18n/index.js';

function pickResultColor(result, revenue) {
  const ref = Math.max(Math.abs(revenue || 0) * 0.01, 100);
  if (result > ref) return color.feedback.positive;
  if (result < -ref) return color.feedback.negative;
  return color.accent.primary;
}

function KpiSection() {
  const { data, error, loading } = useKpiData();

  if (error) return <ErrorBox msg={error} />;

  const receitas = data?.receitas;
  const despesas = data?.despesas;
  const saldo = data?.saldo;
  const resultColor = pickResultColor(saldo, receitas);

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
    >
      <KpiCard
        label={t('mes.kpi.revenue')}
        value={receitas}
        icon={<ArrowUpRight size={15} />}
        color={color.feedback.positive}
        loading={loading}
      />
      <KpiCard
        label={t('mes.kpi.expense')}
        value={despesas}
        icon={<ArrowDownRight size={15} />}
        color={color.feedback.negative}
        loading={loading}
      />
      <KpiCard
        label={t('mes.kpi.result')}
        value={saldo}
        icon={<Wallet size={15} />}
        color={resultColor}
        emphasized
        loading={loading}
      />
    </div>
  );
}

export default KpiSection;
