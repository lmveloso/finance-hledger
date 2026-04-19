// Collapsed row for one credit card in the "Despesas por cartão de crédito"
// section. Clicking anywhere on the row toggles the inline expansion.
//
// Desktop: [name + total] [stacked bar] [top-3 chips] [chevron].
// Mobile:  name+total (row 1) · stacked bar (row 2) · chips wrap (row 3).

import React from 'react';
import { color } from '../../../theme/tokens';
import CreditCardCategoryBar from './CreditCardCategoryBar.jsx';
import { t } from '../../../i18n/index.js';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

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
  total,
  categories,
  expanded,
  onToggle,
  isLast,
  isDesktop,
}) {
  const chips = (categories || []).slice(0, 3);
  const handleClick = () => onToggle(conta);
  const handleKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle(conta);
    }
  };

  const baseRow = {
    padding: '12px 0',
    borderBottom:
      expanded || isLast ? 'none' : `1px solid ${color.border.subtle}`,
    cursor: 'pointer',
    userSelect: 'none',
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
          ...baseRow,
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
          <span
            className="serif"
            style={{ fontSize: 16, color: color.text.primary }}
          >
            {BRL(total)}
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

  // Mobile: stacked layout.
  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={expanded ? t('mes.creditCards.collapse') : t('mes.creditCards.expand')}
      onClick={handleClick}
      onKeyDown={handleKey}
      style={{
        ...baseRow,
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
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span
            className="serif"
            style={{ fontSize: 16, color: color.text.primary }}
          >
            {BRL(total)}
          </span>
          <Chevron expanded={expanded} />
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
