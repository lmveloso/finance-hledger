import React from 'react';
import { ChevronRight } from 'lucide-react';
import { color } from '../../../theme/tokens';

// Local formatter — duplicated pattern used across features. A shared
// formatters module will likely land with the i18n/currency decoupling
// noted in docs §6.2.
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// AccountCard — single row in the Patrimonio asset/liability lists.
// Extracted from the former Contas.jsx during PR-D7. Click opens the
// inline AccountDetail view via `onSelect`.
//
// Props:
//   conta:    { nome, caminho, tipo: 'ativo' | 'passivo', saldo }
//   onSelect: (conta) => void
function AccountCard({ conta, onSelect }) {
  const isNeg = conta.saldo < 0;
  const saldoColor = isNeg ? color.feedback.negative : color.feedback.positive;

  return (
    <div
      className="crow"
      onClick={() => onSelect(conta)}
      style={{ cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: conta.tipo === 'ativo' ? color.feedback.positive : color.feedback.negative,
            flexShrink: 0,
          }}
        />
        <div>
          <div className="sans" style={{ fontSize: 14, color: color.text.secondary }}>
            {conta.nome}
          </div>
          <div className="sans" style={{ fontSize: 11, color: color.text.disabled, marginTop: 2 }}>
            {conta.caminho}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="serif" style={{ fontSize: 16, fontWeight: 600, color: saldoColor }}>
          {BRLc(conta.saldo)}
        </span>
        <ChevronRight size={14} style={{ color: color.text.disabled }} />
      </div>
    </div>
  );
}

export default AccountCard;
