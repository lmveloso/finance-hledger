import React from 'react';
import { color, radius } from '../../../theme/tokens';
import { t } from '../../../i18n/index.js';
import { useMediaQuery } from '../../../hooks/useMediaQuery.js';

// Per-category figures need 2 decimals for the "/ orçado" reading to line up
// with journal amounts. Hero card uses 0 decimals.
const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });

const PCT = (n) => `${Math.round(n)}%`;

/**
 * Single category row inside the "Por categoria" card (PR-U6 / ux-polish #8).
 *
 * Responsive behaviour (breakpoint 768px):
 *   - Desktop (≥768px): single-row CSS Grid — dot / name / chip /
 *     realizado + "/ orçado" / pct. Everything on one line.
 *   - Mobile (<768px): CSS Grid with template-areas
 *       "name      realizado"
 *       "orcado    pct"
 *
 * Over-budget visuals (PRD §5 PR-U6, refined plan):
 *   - % turns red + bold
 *   - realizado turns red
 *   - a small "+R$X" chip appears next to realizado
 *   - the bar fill is NOT red (category palette is preserved)
 *   - no yellow warning state at 90%
 *
 * Under-budget surplus:
 *   - a small "R$ X restante" chip appears next to realizado in green
 */
function CategoryRow({ nome, orcado, realizado, barColor, isLast }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  const safeOrcado = Number(orcado) || 0;
  const safeReal = Number(realizado) || 0;
  const pct = safeOrcado > 0 ? (safeReal / safeOrcado) * 100 : 0;
  const over = safeReal > safeOrcado;
  const surplus = !over && safeReal < safeOrcado;

  const dot = (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: 999,
        background: barColor,
        marginRight: 8,
        flexShrink: 0,
      }}
    />
  );

  const chipBase = {
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    fontSize: 10,
    padding: '2px 7px',
    borderRadius: radius.rounded.xs,
    whiteSpace: 'nowrap',
  };

  const overChip = over && (
    <span
      style={{
        ...chipBase,
        color: color.text.secondary,
        background: color.bg.hover,
      }}
    >
      {t('orcamento.over.chip', { amount: BRL(safeReal - safeOrcado) })}
    </span>
  );

  const surplusChip = surplus && (
    <span
      style={{
        ...chipBase,
        color: color.feedback.positive,
        background: color.feedback.positiveMuted,
      }}
    >
      {t('orcamento.surplus.chip', { amount: BRL(safeOrcado - safeReal) })}
    </span>
  );

  const realizadoText = (
    <span
      style={{
        fontFamily: "'Google Sans Flex', 'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: 14,
        color: color.text.primary,
      }}
    >
      {BRL(safeReal)}
    </span>
  );

  const orcadoText = (
    <span
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: 11,
        color: color.text.disabled,
      }}
    >
      {BRL(safeOrcado)}
    </span>
  );

  const pctText = (
    <span
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: 10,
        color: over ? color.feedback.negative : color.text.disabled,
        fontWeight: over ? 700 : 400,
      }}
    >
      {PCT(pct)}
    </span>
  );

  const nameLabel = (
    <span
      style={{
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        fontSize: 13,
        color: color.text.secondary,
        display: 'inline-flex',
        alignItems: 'center',
        minWidth: 0,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {dot}
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {nome}
      </span>
    </span>
  );

  const wrapperStyle = {
    marginBottom: isLast ? 0 : 18,
  };

  if (isDesktop) {
    const ariaLabel = `${nome}: ${BRL(safeReal)} ${t('orcamento.category.separator')} ${BRL(safeOrcado)} (${PCT(pct)})`;

    // Standalone dot (detached from nameLabel so the name cell can ellipsis
    // independently in its own grid column).
    const dotStandalone = (
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: 999,
          background: barColor,
          flexShrink: 0,
        }}
      />
    );

    const nameOnly = (
      <span
        style={{
          fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          fontSize: 13,
          color: color.text.secondary,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'block',
          textTransform: 'capitalize',
        }}
      >
        {nome}
      </span>
    );

    return (
      <div
        role="group"
        aria-label={ariaLabel}
        style={{ display: 'contents' }}
      >
        {dotStandalone}
        {nameOnly}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            whiteSpace: 'nowrap',
          }}
        >
          {overChip}
          {surplusChip}
        </div>
        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          {realizadoText}
        </div>
        <div style={{ textAlign: 'right', whiteSpace: 'nowrap', display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'flex-end' }}>
          {orcadoText}
        </div>
        <div style={{ textAlign: 'right' }}>{pctText}</div>
      </div>
    );
  }

  // Mobile grid.
  return (
    <div style={wrapperStyle}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gridTemplateAreas: `
            "name realizado"
            "orcado pct"
          `,
          rowGap: 6,
          columnGap: 10,
          alignItems: 'center',
        }}
      >
        <div style={{ gridArea: 'name', minWidth: 0 }}>{nameLabel}</div>
        <div
          style={{
            gridArea: 'realizado',
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            justifyContent: 'flex-end',
            flexWrap: 'wrap',

          }}
        >
          {overChip}
          {surplusChip}
          {realizadoText}
        </div>
        <div style={{ gridArea: 'orcado' }}>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: 11,
              color: color.text.disabled,
            }}
          >
            {t('orcamento.category.separator')} {BRL(safeOrcado)}
          </span>
        </div>
        <div style={{ gridArea: 'pct', textAlign: 'right' }}>{pctText}</div>
      </div>
    </div>
  );
}

export default CategoryRow;
