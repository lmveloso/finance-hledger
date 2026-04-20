import React from 'react';
import { color } from '../../../theme/tokens';
import { t } from '../../../i18n';

// Localised short month labels. Same convention used in features/ano and
// features/previsao (PT-BR labels still inline — existing pattern).
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_LABELS[idx] || ym} ${String(y).slice(-2)}`;
}

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
});

// ForecastTable — one column per forecast month, three data rows
// (receitas, despesas, saldo) plus a cumulative saldo row so the user can
// see the accumulated projected balance across the horizon.
//
// Props:
//   months: [{ mes: 'YYYY-MM', receitas: number, despesas: number, saldo: number }]
function ForecastTable({ months }) {
  const list = Array.isArray(months) ? months : [];

  let running = 0;
  const cumulative = list.map(m => {
    running += m.saldo ?? 0;
    return running;
  });

  const saldoColor = (v) => (v >= 0 ? color.feedback.positive : color.feedback.negative);

  const headCellStyle = (align) => ({
    textAlign: align,
    padding: '8px 10px',
    color: color.text.muted,
    borderBottom: `1px solid ${color.border.default}`,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
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
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 12,
    color: color.text.primary,
    whiteSpace: 'nowrap',
  };

  const totalsCellStyle = {
    borderTop: `1px solid ${color.border.default}`,
    background: color.bg.hover,
    fontWeight: 600,
  };

  const cumulativeCellStyle = {
    background: color.overlay.accentPrimarySoft,
    fontWeight: 600,
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={headCellStyle('left')}>&nbsp;</th>
            {list.map(m => (
              <th key={m.mes} style={headCellStyle('right')}>
                {monthLabel(m.mes)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={rowLabelStyle} className="sans">{t('plano.row.receitas')}</td>
            {list.map(m => (
              <td key={m.mes} style={{ ...dataCellStyle, color: color.feedback.positive }}>
                {(m.receitas ?? 0) > 0 ? BRL(m.receitas) : <span style={{ color: color.text.faint }}>—</span>}
              </td>
            ))}
          </tr>
          <tr>
            <td style={rowLabelStyle} className="sans">{t('plano.row.despesas')}</td>
            {list.map(m => (
              <td key={m.mes} style={{ ...dataCellStyle, color: color.feedback.negative }}>
                {(m.despesas ?? 0) > 0 ? BRL(m.despesas) : <span style={{ color: color.text.faint }}>—</span>}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ ...rowLabelStyle, ...totalsCellStyle }} className="sans">
              {t('plano.row.saldo')}
            </td>
            {list.map(m => (
              <td
                key={m.mes}
                style={{
                  ...dataCellStyle,
                  ...totalsCellStyle,
                  color: saldoColor(m.saldo ?? 0),
                }}
              >
                {BRL(m.saldo ?? 0)}
              </td>
            ))}
          </tr>
          <tr>
            <td style={{ ...rowLabelStyle, ...cumulativeCellStyle }} className="sans">
              {t('plano.row.saldoAcumulado')}
            </td>
            {list.map((m, i) => (
              <td
                key={m.mes}
                style={{
                  ...dataCellStyle,
                  ...cumulativeCellStyle,
                  color: saldoColor(cumulative[i] ?? 0),
                }}
              >
                {BRL(cumulative[i] ?? 0)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default ForecastTable;

