import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import MatrixTable from '../components/MatrixTable.jsx';
import { usePrincipioMes } from '../hooks/usePrincipioMes.js';

// Display-key → pt-BR label. These mirror what backend returns as
// `display_key` (e.g. "principle.custos-fixos"). i18n proper is still
// deferred (see ErrorBox.jsx note "post PR-F9"), so we inline the
// dictionary here and will migrate to frontend/src/i18n/ when i18n
// lands. Keeping keys identical to the ones the backend emits ensures
// a future t()-based replacement is a pure search-and-replace.
const PRINCIPLE_LABELS_PT_BR = {
  'principle.custos-fixos':          'Custos Fixos',
  'principle.conforto':              'Conforto',
  'principle.metas':                 'Metas',
  'principle.prazeres':              'Prazeres',
  'principle.liberdade-financeira':  'Liberdade Financeira',
  'principle.aumentar-renda':        'Aumentar Renda',
  'principle.reserva-oportunidade':  'Reserva de Oportunidade',
};

function labelFor(key) {
  return PRINCIPLE_LABELS_PT_BR[key] || key;
}

function PrincipioMesView({ year }) {
  const { data, error, loading } = usePrincipioMes(year);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;
  if (!data || !data.principles?.length) {
    return (
      <div className="sans" style={{ color: color.text.muted, fontSize: 13, padding: 24 }}>
        Nenhum dado encontrado para {year}.
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
        Princípio × Mês · {year}
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
        {anyOff
          ? 'Atenção: soma dos % em algum mês não bateu 100% (verifique backend).'
          : 'Cada coluna soma 100% (arredondamento por maior resto).'}
      </div>
    </div>
  );
}

export default PrincipioMesView;
