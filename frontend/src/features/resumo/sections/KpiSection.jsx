// Resumo — Section 1: KPI cards (Despesas + Saldo) with inline sparklines.
//
// Two cards side-by-side on desktop, stacked on narrow viewports:
//   - Despesas:       negative color, 6-month expense sparkline
//   - Saldo (destaque): primary accent color, 6-month net balance sparkline
//
// Both cards still honour `compareMode` + `DeltaBadge` (same-month-last-year)
// driven by MonthContext — that wiring is preserved verbatim from pre-PR-U2
// so compare-mode behaviour doesn't regress.

import React from 'react';
import { ArrowDownRight, Wallet } from 'lucide-react';
import { color } from '../../../theme/tokens';
import KPI from '../../../components/KPI.jsx';
import Sparkline from '../../../components/Sparkline.jsx';
import DeltaBadge from '../../../components/DeltaBadge.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useApi } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';
import { useSparklines } from '../hooks/useSparklines.js';
import { t } from '../../../i18n/index.js';

// Same month last year — used for YoY delta compare.
function lastYearMonth(ym) {
  const [y, m] = ym.split('-');
  return `${parseInt(y, 10) - 1}-${m}`;
}

function KpiSection() {
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
  const { despesas: sparkDespesas, saldo: sparkSaldo } = useSparklines();

  if (error) return <ErrorBox msg={error} />;

  const despesasColor = color.feedback.negative;
  const saldoColor = color.accent.primary;

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}
    >
      <KPI
        label={t('resumo.kpi.expenses')}
        valor={summary?.despesas}
        icon={<ArrowDownRight size={15} />}
        cor={despesasColor}
        loading={loading}
        delta={
          compareMode && compSummary ? (
            <DeltaBadge
              current={summary?.despesas}
              previous={compSummary?.despesas}
            />
          ) : null
        }
        sparkline={
          sparkDespesas.length >= 2 ? (
            <Sparkline data={sparkDespesas} color={despesasColor} height={36} />
          ) : null
        }
      />
      <KPI
        label={t('resumo.kpi.balance')}
        valor={summary?.saldo}
        icon={<Wallet size={15} />}
        cor={saldoColor}
        destaque
        loading={loading}
        delta={
          compareMode && compSummary ? (
            <DeltaBadge
              current={summary?.saldo}
              previous={compSummary?.saldo}
            />
          ) : null
        }
        sparkline={
          sparkSaldo.length >= 2 ? (
            <Sparkline data={sparkSaldo} color={saldoColor} height={36} />
          ) : null
        }
      />
    </div>
  );
}

export default KpiSection;
