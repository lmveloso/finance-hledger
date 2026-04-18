import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import MatrixTable from '../components/MatrixTable.jsx';
import { useCategoriaMes } from '../hooks/useCategoriaMes.js';

// View 1 (PRD §6.1) — Categoria × Mês. Union of all categories encountered
// in the 12 months of `year`, one row per category, sorted by yearly total.
function CategoriaMesView({ year }) {
  const { loading, error, months, categories, matrix, totals } = useCategoriaMes(year);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  if (!categories.length) {
    return (
      <div className="sans" style={{ color: color.text.muted, fontSize: 13, padding: 24 }}>
        Nenhuma despesa registrada em {year}.
      </div>
    );
  }

  const rows = categories.map(name => ({
    key: name,
    label: name,
    cells: Object.fromEntries(
      months.map(m => [m, matrix[name]?.[m] ? { value: matrix[name][m] } : null])
        .filter(([, v]) => v)
    ),
  }));

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
        Categoria × Mês · {year}
      </div>
      <MatrixTable months={months} rows={rows} totals={totals} />
    </div>
  );
}

export default CategoriaMesView;
