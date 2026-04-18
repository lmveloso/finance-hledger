import React from 'react';
import { color } from '../../../theme/tokens';
import DeltaBadge from './DeltaBadge.jsx';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

// Single account node used in GrafoView.
// Shows the account name, the closing balance and a delta badge.
// Assets sit on the left column; liabilities on the right.
//
// Props:
//   conta: { nome, tipo, saldo_inicial, saldo_final,
//            entradas_externas, saidas_externas,
//            transfers_in, transfers_out }
//   selected: boolean
//   onClick: () => void
function ContaNode({ conta, selected, onClick }) {
  const delta = (conta.saldo_final ?? 0) - (conta.saldo_inicial ?? 0);
  const accentFor = conta.tipo === 'ativo'
    ? color.feedback.positive
    : color.accent.secondary;

  return (
    <button
      type="button"
      onClick={onClick}
      className="sans"
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: selected ? color.bg.hover : color.bg.card,
        border: `1px solid ${selected ? accentFor : color.border.default}`,
        borderLeft: `3px solid ${accentFor}`,
        borderRadius: 3,
        padding: '12px 14px',
        cursor: 'pointer',
        transition: 'background 0.12s, border 0.12s',
        color: color.text.primary,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: color.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {conta.nome}
        </span>
        <DeltaBadge delta={delta} tipo={conta.tipo} />
      </div>
      <div
        className="serif"
        style={{
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          color: color.text.primary,
        }}
      >
        {BRL(conta.saldo_final)}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
          fontSize: 11,
          color: color.text.muted,
        }}
      >
        <span>início {BRL(conta.saldo_inicial)}</span>
        <span style={{ color: color.text.faint }}>
          {conta.tipo === 'ativo' ? 'ativo' : 'passivo'}
        </span>
      </div>
    </button>
  );
}

export default ContaNode;
