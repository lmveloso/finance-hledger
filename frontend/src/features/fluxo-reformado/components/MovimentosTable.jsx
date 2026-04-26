import React from 'react';
import { color } from '../../../theme/tokens';
import { t } from '../../../i18n/index.js';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

// Flat table with one row per account, showing initial balance, inflows,
// outflows, transfers and the closing balance. Matches the data on the
// node cards but gives a quick overview side by side.
function MovimentosTable({ contas }) {
  if (!contas || contas.length === 0) return null;

  const ativos = contas.filter((c) => c.tipo === 'ativo');
  const passivos = contas.filter((c) => c.tipo === 'passivo');

  const renderRow = (c) => {
    const delta = (c.saldo_final ?? 0) - (c.saldo_inicial ?? 0);
    const deltaColor = (delta >= 0 ? color.feedback.positive : color.feedback.negative);
    return (
      <tr key={c.conta}>
        <td style={{ ...td('left'), color: color.text.primary }}>
          {c.nome}
        </td>
        <td style={td('right')}>{BRL(c.saldo_inicial)}</td>
        <td style={{ ...td('right'), color: color.feedback.positive }}>
          {c.entradas_externas > 0 ? BRL(c.entradas_externas) : <span style={{ color: color.text.faint }}>—</span>}
        </td>
        <td style={{ ...td('right'), color: color.feedback.negative }}>
          {c.saidas_externas > 0 ? BRL(c.saidas_externas) : <span style={{ color: color.text.faint }}>—</span>}
        </td>
        <td style={{ ...td('right'), color: color.feedback.info }}>
          {c.transfers_in > 0 ? BRL(c.transfers_in) : <span style={{ color: color.text.faint }}>—</span>}
        </td>
        <td style={{ ...td('right'), color: color.feedback.info }}>
          {c.transfers_out > 0 ? BRL(c.transfers_out) : <span style={{ color: color.text.faint }}>—</span>}
        </td>
        <td style={{ ...td('right'), color: color.text.primary, fontWeight: 600 }}>
          {BRL(c.saldo_final)}
        </td>
        <td style={{ ...td('right'), color: deltaColor, fontWeight: 600 }}>
          {delta > 0 ? '+' : ''}{BRL(delta)}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
        }}
      >
        <thead>
          <tr>
            <th style={th('left')}>Conta</th>
            <th style={th('right')}>Início</th>
            <th style={th('right')}>Entradas</th>
            <th style={th('right')}>Saídas</th>
            <th style={th('right')}>Transf. in</th>
            <th style={th('right')}>Transf. out</th>
            <th style={th('right')}>Final</th>
            <th style={th('right')}>Δ</th>
          </tr>
        </thead>
        <tbody>
          {ativos.length > 0 && (
            <tr>
              <td colSpan="8" style={sectionHeaderStyle}>
                {t('fluxo.contas.sectionAtivos')}
              </td>
            </tr>
          )}
          {ativos.map(renderRow)}
          {passivos.length > 0 && (
            <tr>
              <td colSpan="8" style={sectionHeaderStyle}>
                {t('fluxo.contas.sectionPassivos')}
              </td>
            </tr>
          )}
          {passivos.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}

const th = (align) => ({
  textAlign: align,
  padding: '8px 10px',
  fontSize: 10,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: color.text.muted,
  borderBottom: `1px solid ${color.border.default}`,
  fontWeight: 500,
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  whiteSpace: 'nowrap',
});

const td = (align) => ({
  textAlign: align,
  padding: '10px',
  borderBottom: `1px solid ${color.border.subtle}`,
  color: color.text.secondary,
  fontFamily: align === 'right' ? "'Google Sans Flex', 'Plus Jakarta Sans', system-ui, sans-serif" : "'Plus Jakarta Sans', system-ui, sans-serif",
  whiteSpace: 'nowrap',
});

const sectionHeaderStyle = {
  textAlign: 'left',
  padding: '20px 10px 8px',
  fontSize: 10,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: color.text.muted,
  fontWeight: 600,
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};

export default MovimentosTable;
