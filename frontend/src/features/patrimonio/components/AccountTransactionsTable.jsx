import React from 'react';
import { color } from '../../../theme/tokens';
import TipoChip from '../../../components/TipoChip.jsx';
import { t } from '../../../i18n';

// Local formatter — same pattern used across features (see docs §6.2).
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const thStyle = {
  textAlign: 'left', padding: '10px 8px', fontSize: 11, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: color.text.muted,
  borderBottom: `1px solid ${color.border.default}`,
};
const tdStyle = {
  padding: '12px 8px', fontSize: 13, color: color.text.secondary,
  borderBottom: `1px solid ${color.border.default}`,
};

// AccountTransactionsTable — shared transaction list used by AccountDetail.
// When `withBalance` is true, a running balance column is rendered; the
// `transactions` array must already carry `runningBalance` in that case.
//
// Props:
//   transactions: [{ data, descricao, categoria, tipo_movimento, valor, runningBalance? }]
//   withBalance:  boolean — add "Saldo" column (statement view)
function AccountTransactionsTable({ transactions, withBalance = false }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>{t('patrimonio.tx.date')}</th>
            <th style={thStyle}>{t('patrimonio.tx.description')}</th>
            <th style={thStyle}>{t('patrimonio.tx.category')}</th>
            <th style={{ ...thStyle, textAlign: 'center' }}>{t('patrimonio.tx.type')}</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>{t('patrimonio.tx.amount')}</th>
            {withBalance && (
              <th style={{ ...thStyle, textAlign: 'right' }}>{t('patrimonio.tx.balance')}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx, i) => {
            const isOpening = tx.tipo_movimento === 'saldo_inicial';
            const valorColor = tx.valor > 0
              ? color.feedback.positive
              : tx.valor < 0 ? color.feedback.negative : 'inherit';
            return (
              <tr
                key={i}
                onMouseEnter={(e) => { e.currentTarget.style.background = color.bg.hover; }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isOpening ? color.bg.opening : 'transparent';
                }}
                style={isOpening ? { background: color.bg.opening, fontStyle: 'italic' } : {}}
              >
                <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: color.text.muted, fontSize: 12 }}>
                  {tx.data}
                </td>
                <td style={tdStyle}>{tx.descricao}</td>
                <td style={{ ...tdStyle, color: color.text.muted, fontSize: 12 }}>{tx.categoria}</td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <TipoChip tipo={tx.tipo_movimento} />
                </td>
                <td
                  style={{
                    ...tdStyle, textAlign: 'right',
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontWeight: 600, color: valorColor,
                  }}
                >
                  {BRLc(tx.valor)}
                </td>
                {withBalance && (
                  <td
                    style={{
                      ...tdStyle, textAlign: 'right',
                      fontFamily: "'Instrument Serif', Georgia, serif", fontWeight: 600,
                      color: tx.runningBalance < 0 ? color.feedback.negative : color.feedback.positive,
                    }}
                  >
                    {BRLc(tx.runningBalance)}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default AccountTransactionsTable;
