// Collapsed row for one credit card in the "Despesas por cartão de crédito"
// section.
//
// Two visual variants, split across two files for readability:
//   • hasMonthlyActivity === true  — interactive row rendered here: stacked
//     bar, chips, chevron. Big amount is the monthly spend, labelled
//     "Este mês". Clicking anywhere on the row toggles the inline expansion.
//   • hasMonthlyActivity === false — compact non-interactive row rendered by
//     `CreditCardDormantRow` (issue #20: cards with outstanding liability
//     but zero monthly purchases must stay visible but should not advertise
//     a drill-down they can't produce).
//
// Desktop active: [name + monthly] [stacked bar] [top-3 chips] [chevron].
// Mobile active:  name+monthly (row 1) · stacked bar (row 2) · chips wrap (row 3).

import React from 'react';
import { color } from '../../../theme/tokens';
import CreditCardCategoryBar from './CreditCardCategoryBar.jsx';
import CreditCardDormantRow from './CreditCardDormantRow.jsx';
import { formatBRL } from '../../../lib/formatBRL';
import { t } from '../../../i18n/index.js';

function AmountCaption({ children }) {
  return (
    <span
      className="sans"
      style={{
        fontSize: 10,
        letterSpacing: '0.12em',
        color: color.text.muted,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </span>
  );
}

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

function Chevron({ expanded }) {
  return (
    <span
      className="sans"
      aria-hidden="true"
      style={{
        fontSize: 12,
        color: color.text.muted,
        transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s ease',
        display: 'inline-block',
      }}
    >
      ›
    </span>
  );
}

function CreditCardRow({
  conta,
  nome,
  monthlySpend,
  outstandingBalance,
  hasMonthlyActivity,
  categories,
  expanded,
  onToggle,
  isLast,
  isDesktop,
}) {
  if (!hasMonthlyActivity) {
    return (
      <CreditCardDormantRow
        nome={nome}
        outstandingBalance={outstandingBalance}
        isLast={isLast}
        isDesktop={isDesktop}
      />
    );
  }

  const chips = (categories || []).slice(0, 3);
  const handleClick = () => onToggle && onToggle(conta);
  const handleKey = (e) => {
    if (!onToggle) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(conta);
    }
  };

  const activeRow = {
    padding: '12px 0',
    borderBottom:
      expanded || isLast ? 'none' : `1px solid ${color.border.subtle}`,
    userSelect: 'none',
    cursor: 'pointer',
  };

  if (isDesktop) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? t('mes.creditCards.collapse') : t('mes.creditCards.expand')}
        onClick={handleClick}
        onKeyDown={handleKey}
        style={{
          ...activeRow,
          display: 'grid',
          gridTemplateColumns: '220px 1fr auto 24px',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span
            className="sans"
            style={{
              fontSize: 13,
              color: color.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nome}
          </span>
          <AmountCaption>{t('mes.creditCards.thisMonthLabel')}</AmountCaption>
          <span
            className="serif"
            style={{ fontSize: 16, color: color.text.primary }}
          >
            {formatBRL(monthlySpend)}
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          <CreditCardCategoryBar categories={categories} />
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {chips.map((c) => (
            <CategoryChip key={c.raw} nome={c.nome} color={c.color} />
          ))}
        </div>
        <div style={{ textAlign: 'right' }}>
          <Chevron expanded={expanded} />
        </div>
      </div>
    );
  }

  // Mobile active: stacked layout.
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={expanded ? t('mes.creditCards.collapse') : t('mes.creditCards.expand')}
      onClick={handleClick}
      onKeyDown={handleKey}
      style={{
        ...activeRow,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 12,
        }}
      >
        <span
          className="sans"
          style={{
            fontSize: 13,
            color: color.text.secondary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {nome}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <AmountCaption>{t('mes.creditCards.thisMonthLabel')}</AmountCaption>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span
              className="serif"
              style={{ fontSize: 16, color: color.text.primary }}
            >
              {formatBRL(monthlySpend)}
            </span>
            <Chevron expanded={expanded} />
          </div>
        </div>
      </div>
      <CreditCardCategoryBar categories={categories} />
      {chips.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {chips.map((c) => (
            <CategoryChip key={c.raw} nome={c.nome} color={c.color} />
          ))}
        </div>
      )}
    </div>
  );
}

export default CreditCardRow;
