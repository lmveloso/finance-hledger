import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import MatrixTable from '../components/MatrixTable.jsx';
import { usePrincipioMes } from '../hooks/usePrincipioMes.js';
import { t } from '../../../i18n';

// Backend emits `display_key` as `principle.<id>` (e.g.
// "principle.custos-fixos"). These keys live in the i18n dictionaries so we
// resolve labels through `t()` — keeps EN/PT in sync without a local table.
function labelFor(key) {
  return t(key);
}

function PrincipioMesView({ year }) {
  const { data, error, loading } = usePrincipioMes(year);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;
  if (!data || !data.principles?.length) {
    return (
      <div className="sans" style={{ color: color.text.muted, fontSize: 13, padding: 24 }}>
        {t('ano.empty', { year })}
      </div>
    );
  }

  const months = data.months || [];
  const rows = (data.principles || []).map(p => ({
    key: p.principle,
    label: labelFor(p.display_key),
    cells: Object.fromEntries(
      (p.monthly || []).map(c => [c.month, { value: c.value, pct: c.pct }])
    ),
  }));
  const totals = Object.fromEntries(
    (data.monthly_totals || []).map(t => [t.month, t.value])
  );

  // Sanity indicator: sum of pct across principles per month. Should be
  // ~100 when the month has expenses, 0 when empty. Shown as a tiny
  // caption below the table to surface regressions without taking UI room.
  const pctSums = months.map(m => {
    const sum = (data.principles || []).reduce((acc, p) => {
      const c = (p.monthly || []).find(x => x.month === m);
      return acc + (c?.pct || 0);
    }, 0);
    return { month: m, sum };
  });
  const anyOff = pctSums.some(s => s.sum > 0 && Math.abs(s.sum - 100) > 0.5);

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
        {t('ano.title.principio', { year })}
      </div>
      <MatrixTable months={months} rows={rows} totals={totals} showPct />
      <div
        className="sans"
        style={{
          fontSize: 11,
          color: anyOff ? color.feedback.negative : color.text.muted,
          marginTop: 12,
        }}
      >
        {anyOff ? t('ano.warning.sumNot100') : t('ano.warning.sumOk')}
      </div>
    </div>
  );
}

export default PrincipioMesView;
