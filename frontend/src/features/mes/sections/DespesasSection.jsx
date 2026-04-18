// Section 4 — Expenses by category (level 2).
//
// Flat list, sorted by value desc (already sorted by the backend). Each row
// shows the category name, absolute amount, and the share of the month's
// total expenses. Uses the chart category palette for visual variety.
//
// Drill-down is intentionally NOT implemented here (per frontend-dev rules,
// any future drill-down is an inline expansion, not a modal). If we enable
// drill-down later, it follows the same pattern as Resumo.jsx -> detalhe.

import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useDespesas } from '../hooks/useDespesas.js';
import { t } from '../../../i18n/index.js';
import CategoriaRow from '../components/CategoriaRow.jsx';

function DespesasSection() {
  const { data, error, loading } = useDespesas();

  if (error) return <ErrorBox msg={error} />;

  const categorias = data?.categorias || [];
  const total = categorias.reduce((s, c) => s + (c.valor || 0), 0);
  const palette = color.chart.category;

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
        {t('mes.expenses.title')}
      </div>

      {loading ? (
        <Spinner />
      ) : categorias.length === 0 ? (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted, padding: '8px 0' }}
        >
          {t('mes.expenses.empty')}
        </div>
      ) : (
        categorias.map((c, i) => (
          <CategoriaRow
            key={c.segmento_raw || c.nome}
            nome={c.nome}
            valor={c.valor}
            pct={total > 0 ? (c.valor / total) * 100 : 0}
            accentColor={palette[i % palette.length]}
            isLast={i === categorias.length - 1}
          />
        ))
      )}
    </div>
  );
}

export default DespesasSection;
