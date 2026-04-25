// One row in the credit-card LIST view. Clicking the row navigates the
// surrounding section into the per-card DETAIL view (the list and detail
// are mutually exclusive; CreditCardSection owns the swap).
//
// Layout (single column, full row click target):
//   ┌──────────────────────────────────────────────────────────────────┐
//   │ Name (Owner)                              GASTO NO MÊS  R$ X  ›  │
//   │ Devendo R$ Y                                                     │
//   │ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮ │
//   │ • Alimentação  • Saúde  • Moradia                                │
//   └──────────────────────────────────────────────────────────────────┘
//
// On mobile the right-hand "GASTO NO MÊS" cluster wraps to its own line
// to preserve readability — the rest of the row stays the same. There
// is NO mobile collapse gate: the list always renders inline.
//
// Dormant cards (no monthly activity, only outstanding debt) render the
// same shape but skip the stacked bar and chips, and the right-hand
// cluster shows R$ 0,00 spent — the row stays clickable so the reader
// can still drill into a (mostly empty) detail view if they want.

import React from 'react';
import { color } from '../../../theme/tokens';
import { formatBRL } from '../../../lib/formatBRL';
import { t } from '../../../i18n/index.js';
import CreditCardCategoryBar from './CreditCardCategoryBar.jsx';

function CategoryChip({ nome, color: hue }) {
  return (
    <span
      className="sans"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: color.text.muted,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          background: hue,
          borderRadius: 2,
          flexShrink: 0,
        }}
      />
      {nome}
    </span>
  );
}

function Chevron() {
  return (
    <span
      className="sans"
      aria-hidden="true"
      style={{
        fontSize: 14,
        color: color.text.muted,
        display: 'inline-block',
        marginLeft: 6,
      }}
    >
      ›
    </span>
  );
}

function CreditCardListRow({
  card,
  onSelect,
  isLast,
}) {
  const {
    conta,
    nome,
    monthlySpend,
    outstandingBalance,
    hasMonthlyActivity,
    categories,
  } = card;

  const chips = (categories || []).slice(0, 3);

  const handleClick = () => onSelect && onSelect(conta);
  const handleKey = (e) => {
    if (!onSelect) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(conta);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t('mes.creditCards.row.viewDetail')}
      onClick={handleClick}
      onKeyDown={handleKey}
      style={{
        padding: '14px 0',
        borderBottom: isLast ? 'none' : `1px solid ${color.border.subtle}`,
        cursor: 'pointer',
        userSelect: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Top row: identity (left) ↔ "GASTO NO MÊS R$ X ›" cluster (right). */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
          <span
            className="sans"
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: color.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nome}
          </span>
          <span
            className="sans"
            style={{
              fontSize: 12,
              color: color.text.muted,
              whiteSpace: 'nowrap',
            }}
          >
            {t('mes.creditCards.row.owingLabel')}{' '}
            <span style={{ color: color.text.secondary }}>
              {formatBRL(outstandingBalance)}
            </span>
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 2,
            whiteSpace: 'nowrap',
          }}
        >
          <span
            className="sans"
            style={{
              fontSize: 10,
              letterSpacing: '0.12em',
              color: color.text.muted,
              textTransform: 'uppercase',
            }}
          >
            {t('mes.creditCards.row.spentLabel')}
          </span>
          <span style={{ display: 'flex', alignItems: 'baseline' }}>
            <span
              className="serif"
              style={{ fontSize: 18, color: color.text.primary }}
            >
              {formatBRL(monthlySpend || 0)}
            </span>
            <Chevron />
          </span>
        </div>
      </div>

      {/* Bottom block: stacked bar + chips. Skipped for dormant cards. */}
      {hasMonthlyActivity && (
        <>
          <CreditCardCategoryBar categories={categories} />
          {chips.length > 0 && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {chips.map((c) => (
                <CategoryChip key={c.raw} nome={c.nome} color={c.color} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CreditCardListRow;
