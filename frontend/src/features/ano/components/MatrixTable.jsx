import React from 'react';
import { color } from '../../../theme/tokens';

// Localised short month labels. Mirrors the convention already used in
// features/previsao/Previsao.jsx, kept local to avoid premature sharing.
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabel(ym) {
  const m = parseInt(ym.split('-')[1], 10);
  return MONTH_LABELS[m - 1] || ym;
}

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
});
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL',
});

// Generic N × 12 matrix with:
//   - left column: row labels (category or principle name)
//   - 12 data columns: one per month
//   - totals row at the bottom
//
// Props:
//   months:    ['YYYY-MM', ...] (exactly 12 expected, but any length works)
//   rows:      [{ key, label, cells: { [ym]: { value, pct? } } }]
//   totals:    { [ym]: number } — rendered as a "Totais" row
//   showPct:   boolean — if true, cell is "R$ value \n pct%"
//   emptyText: string for rows with no cells (unused currently — kept for reuse)
function MatrixTable({ months, rows, totals, showPct = false }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={headCellStyle('left')}>&nbsp;</th>
            {months.map(m => (
              <th key={m} style={headCellStyle('right')}>
                {monthLabel(m)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key}>
              <td style={rowLabelStyle} className="sans">{row.label}</td>
              {months.map(m => {
                const cell = row.cells?.[m];
                return (
                  <td
                    key={m}
                    title={cell ? `${row.label} · ${monthLabel(m)}: ${BRLc(cell.value)}` : undefined}
                    style={dataCellStyle}
                  >
                    {cell && cell.value > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.25 }}>
                        <span>{BRL(cell.value)}</span>
                        {showPct && cell.pct != null && cell.pct > 0 && (
                          <span style={{ color: color.text.muted, fontSize: 10 }}>
                            {Math.round(cell.pct)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: color.text.faint }}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {totals && (
            <tr>
              <td style={{ ...rowLabelStyle, ...totalsCellStyle }} className="sans">Totais</td>
              {months.map(m => (
                <td key={m} style={{ ...dataCellStyle, ...totalsCellStyle }}>
                  {(totals[m] || 0) > 0 ? BRL(totals[m]) : <span style={{ color: color.text.faint }}>—</span>}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const headCellStyle = (align) => ({
  textAlign: align,
  padding: '8px 10px',
  color: color.text.muted,
  borderBottom: `1px solid ${color.border.default}`,
  fontWeight: 500,
  whiteSpace: 'nowrap',
  fontFamily: 'Inter, sans-serif',
});

const rowLabelStyle = {
  padding: '8px 10px',
  borderBottom: `1px solid ${color.border.subtle}`,
  color: color.text.secondary,
  whiteSpace: 'nowrap',
  textAlign: 'left',
};

const dataCellStyle = {
  textAlign: 'right',
  padding: '6px 8px',
  borderBottom: `1px solid ${color.border.subtle}`,
  fontFamily: "'Fraunces', Georgia, serif",
  fontSize: 12,
  color: color.text.primary,
  whiteSpace: 'nowrap',
};

const totalsCellStyle = {
  borderTop: `1px solid ${color.border.default}`,
  background: color.bg.hover,
  color: color.accent.warm,
  fontWeight: 600,
};

export default MatrixTable;
export { monthLabel };
