// SobraAncora — the anchor card on the Mês tab.
//
// The anchor differs from the three subordinate cards through type scale
// (Display-Emphasis 38px vs Display 30px) and color on the number — never
// through a different surface, stripe, or shadow (DESIGN.md §4 Tonal-Depth).
// Number color: accent.primary when leftover ≥ 0, feedback.negative when
// leftover < 0 (PRD-08 §3.2). The leading sign is rendered explicitly by
// formatBRL → Intl.NumberFormat → unicode minus (U+2212).
//
// Expansion (PRD-08 §4.1): receita, despesa with two indented sub-items
// (↳ saiu da conta = expense_via_assets, ↳ foi pro cartão =
// expense_via_credit_card), separator, then "Pagamento de fatura no mês"
// (credit_card_payment) — informative, not part of the equation.

import React from 'react';
import { color } from '../../../theme/tokens';
import { formatBRL } from '../../../lib/formatBRL';
import { t } from '../../../i18n/index.js';
import ExpandableCard from '../components/ExpandableCard.jsx';
import SectionSubtitle from '../../../components/SectionSubtitle.jsx';

const PANEL_ID = 'mes-anchor-panel';

function AnchorRow({ label, value, indent = false, muted = false, valueColor }) {
  let _valueColor = valueColor ?? (muted ? color?.text.secondary : color.text.primary);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 14,
        paddingLeft: indent ? 18 : 0,
        paddingTop: 6,
        paddingBottom: 6,
      }}
    >
      <span
        className="sans"
        style={{
          fontSize: 13,
          color: muted ? color.text.secondary : color.text.primary,
        }}
      >
        {label}
      </span>
      <span
        className="sans"
        style={{
          fontSize: indent ? 13 : 14,
          fontWeight: muted ? 400 : 600,
          color: _valueColor,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}

function SobraAncora({ summary, loading, open, onToggle }) {
  const leftover = summary?.leftover;
  const isPositive = (leftover ?? 0) >= 0;
  const numberColor = isPositive ? color.accent.primary : color.feedback.negative;

  const expanseCaixa = summary?.expense_via_assets + summary?.credit_card_payment;
  const leftoverCaixa = summary?.income - expanseCaixa;
  const isPositiveCaixa = (leftoverCaixa ?? 0) >= 0;
  const numberColorCaixa = isPositiveCaixa ? color.accent.primary : color.feedback.negative;

  const header = (
    <>
      <SectionSubtitle>
        {t('mes.anchor.expand.label')}
      </SectionSubtitle>
      <div
        className="serif"
        style={{
          fontSize: 38,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: numberColorCaixa,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {loading || leftoverCaixa == null ? '···' : formatBRL(leftoverCaixa)}
      </div>
    </>
  );

  return (
    <ExpandableCard
      open={open}
      onToggle={onToggle}
      panelId={PANEL_ID}
      header={header}
    >
      {loading || !summary ? (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted }}
        >
          ···
        </div>
      ) : (
        <>
          <SectionSubtitle>{t('mes.anchor.expand.cashFlow')}</SectionSubtitle>
          <AnchorRow
            label={t('mes.anchor.expand.income')}
            value={formatBRL(summary.income ?? 0)}
          />
          <AnchorRow
            label={t('mes.anchor.expand.expense')}
            value={formatBRL(expanseCaixa ?? 0)}
          />
          <AnchorRow
            label={t('mes.anchor.expand.viaAssets')}
            value={formatBRL(summary.expense_via_assets ?? 0)}
            indent
            muted
          />
          <AnchorRow
            label={t('mes.anchor.expand.cardPayment')}
            value={formatBRL(summary.credit_card_payment ?? 0)}
            indent
            muted
          />
          <AnchorRow
            label={t('mes.anchor.expand.label')}
            value={formatBRL(leftoverCaixa ?? 0)}
            valueColor={numberColor}
          />

          <div
            style={{
              borderTop: `1px solid ${color.border.subtle}`,
              marginTop: 10,
              paddingTop: 4,
              marginBottom: 20
            }}
          />
          <SectionSubtitle>{t('mes.anchor.expand.accrual')}</SectionSubtitle>
          <AnchorRow
            label={t('mes.anchor.expand.income')}
            value={formatBRL(summary.income ?? 0)}
          />
          <AnchorRow
            label={t('mes.anchor.expand.expense')}
            value={formatBRL(summary.expense ?? 0)}
          />
          <AnchorRow
            label={t('mes.anchor.expand.viaAssets')}
            value={formatBRL(summary.expense_via_assets ?? 0)}
            indent
            muted
          />
          <AnchorRow
            label={t('mes.anchor.expand.viaCard')}
            value={formatBRL(summary.expense_via_credit_card ?? 0)}
            indent
            muted
          />
          <AnchorRow
            label={t('mes.anchor.label')}
            value={formatBRL(leftover ?? 0)}
            valueColor={numberColor}
          />


        </>
      )}
    </ExpandableCard>
  );
}

export default SobraAncora;
