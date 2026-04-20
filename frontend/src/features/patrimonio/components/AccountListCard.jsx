import React from 'react';
import { ChevronRight } from 'lucide-react';
import { color } from '../../../theme/tokens';

const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// AccountListCard — compact account breakdown card (PR-U7).
//
// Replaces the former `AccountCard` list rendering in Patrimonio.jsx with a
// tighter typographic treatment per the architect's plan:
//   - 12px muted eyebrow title (uppercase, letter-spaced)
//   - 11px rows (name + value)
//   - total row at bottom separated by a 1px top border
//
// Empty state and click-through to AccountDetail are preserved. Rows remain
// inline (no modal) — selecting an account calls `onSelect(conta)`, which
// the parent uses to swap the whole tab into AccountDetail.
//
// Props:
//   title:      string — card eyebrow (e.g. "Ativos" / "Passivos")
//   totalLabel: string — label for total row (e.g. "Total ativos")
//   accounts:   [{ nome, caminho, tipo, saldo }]
//   total:      number — already absolute for passivos; raw for ativos
//   emptyText:  string — shown when accounts is empty
//   valueColor: token — color.feedback.positive | color.feedback.negative
//   onSelect:   (conta) => void
function AccountListCard({ title, totalLabel, accounts, total, emptyText, valueColor, onSelect }) {
  return (
    <div className="card">
      <div
        className="sans"
        style={{
          fontSize: 12,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        {title}
      </div>

      {accounts.length === 0 ? (
        <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>
          {emptyText}
        </div>
      ) : (
        <>
          {accounts.map((conta, i) => (
            <AccountRow
              key={conta.caminho}
              conta={conta}
              valueColor={valueColor}
              onSelect={onSelect}
              isLast={i === accounts.length - 1}
            />
          ))}

          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: `1px solid ${color.border.default}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span
              className="sans"
              style={{ fontSize: 12, color: color.text.muted }}
            >
              {totalLabel}
            </span>
            <span
              className="serif"
              style={{ fontSize: 16, fontWeight: 600, color: valueColor }}
            >
              {BRLc(total)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

function AccountRow({ conta, valueColor, onSelect, isLast }) {
  return (
    <div
      onClick={() => onSelect(conta)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 0',
        borderBottom: isLast ? 'none' : `1px solid ${color.border.subtle}`,
        cursor: 'pointer',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: valueColor,
            flexShrink: 0,
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            className="sans"
            style={{
              fontSize: 13,
              color: color.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {conta.nome}
          </div>
          <div
            className="sans"
            style={{
              fontSize: 11,
              color: color.text.disabled,
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {conta.caminho}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <span
          className="serif"
          style={{ fontSize: 14, fontWeight: 600, color: valueColor }}
        >
          {BRLc(Math.abs(conta.saldo))}
        </span>
        <ChevronRight size={13} style={{ color: color.text.disabled }} />
      </div>
    </div>
  );
}

export default AccountListCard;
