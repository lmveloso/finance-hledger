// Per-card detail view — replaces the list inside CreditCardSection while
// the user is drilled into a single card. The list <-> detail swap is
// owned by CreditCardSection; this component is the detail half.
//
// Layout:
//   1. Header — card name + "Voltar" button (top-right).
//   2. Two metric tiles side-by-side: Gasto no mês · Devendo. Stacked
//      vertically on narrow widths.
//   3. CATEGORIAS DO MÊS — top-5 categorias for THIS card, each row with
//      label + percentage + amount + a thin progress bar in the
//      categoria's chart hue.
//   4. MAIORES COMPRAS — top transactions for THIS card, neutral amount
//      colour (the card detail is a focused subview; the global Despesa
//      surface is where colour-coded numbers live).
//   5. Footer — "Ver todas as transações ›" hands off to the Transações
//      tab. Today the handoff is global (the Transações tab does not yet
//      filter by card account); the chevron-suffix preserves the
//      affordance until that filter ships.
//
// Deferred (not in scope this iteration; would need backend extensions):
//   - Card metadata in the header (final 4 digits, due day) — needs an
//     account-directive metadata read.
//   - "Composição da Dívida" (à vista vs. parcelas pendentes value) —
//     needs parcelamento-tag-aware aggregation per card. The
//     /api/credit-cards endpoint already returns `live_installments`
//     (count) so this can land later as a pure UI pass once the value
//     is also exposed.

import React from 'react';
import { color } from '../../../theme/tokens';
import { formatBRL } from '../../../lib/formatBRL';
import { useNav } from '../../../contexts/NavContext.jsx';
import { t } from '../../../i18n/index.js';
import { ArrowLeft } from 'lucide-react';
import InstallmentRow from '../../../components/InstallmentRow.jsx';
import PurchaseRow from './PurchaseRow.jsx';

function MetricTile({ label, value, valueColor, alignItems, breakdown }) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: color.bg.cardAlt,
        border: `1px solid ${color.border.subtle}`,
        borderRadius: 4,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        alignItems
      }}
    >
      <span
        className="sans"
        style={{
          fontSize: 10,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        className="serif"
        style={{
          fontSize: 22,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          color: valueColor || color.text.primary,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </span>
      {breakdown && (
        <span
          className="sans"
          style={{
            fontSize: 11,
            color: color.text.muted,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {breakdown}
        </span>
      )}
    </div>
  );
}

function CategoryRow({ nome, valor, pct, hue, isLast }) {
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: isLast ? 'none' : `1px solid ${color.border.subtle}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
          gap: 12,
        }}
      >
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
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            whiteSpace: 'nowrap',
          }}
        >
          <span
            className="sans"
            style={{ fontSize: 11, color: color.text.muted }}
          >
            {Math.round(pct)}%
          </span>
          <span
            className="serif"
            style={{ fontSize: 14, color: color.text.primary }}
          >
            {formatBRL(valor)}
          </span>
        </span>
      </div>
      <div
        style={{
          height: 4,
          background: color.border.default,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: hue,
            opacity: 0.85,
          }}
        />
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      className="sans"
      style={{
        fontSize: 10,
        letterSpacing: '0.15em',
        color: color.text.muted,
        textTransform: 'uppercase',
        marginBottom: 4,
      }}
    >
      {children}
    </div>
  );
}

function CreditCardDetail({ card, onBack }) {
  const { goToTransactions } = useNav();
  const cats = (card.categories || []).slice(0, 5);
  const purchases = (card.transactions || []).slice(0, 5);
  const installments = card.installments || [];
  const installmentsRemainingValue = card.installmentsRemainingValue || 0;
  const outstandingBalance = card.outstandingBalance || 0;
  const totalDebt = outstandingBalance + installmentsRemainingValue;
  const breakdown =
    installmentsRemainingValue > 0
      ? t('mes.creditCards.detail.debtBreakdown', {
          invoice: formatBRL(outstandingBalance),
          committed: formatBRL(installmentsRemainingValue),
        })
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* Header. */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 12,
        }}
      >
        <span
          className="serif"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: color.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {card.nome}
        </span>
        <button
          type="button"
          onClick={onBack}
          className="sans"
          style={{
            background: 'none',
            border: `1px solid ${color.border.default}`,
            borderRadius: 3,
            color: color.accent.primary,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            padding: '5px 12px',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ArrowLeft size={14} /> {t('mes.expand.drilldown.back')}
        </button>
      </div>

      {/* Two metric tiles. Dívida Total = fatura + comprometido (ADR-011);
          breakdown line shows only when comprometido > 0. */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <MetricTile
          label={t('mes.creditCards.detail.totalDebtTile')}
          value={formatBRL(totalDebt)}
          breakdown={breakdown}
        />
        <MetricTile
          label={t('mes.creditCards.detail.spentTile')}
          value={formatBRL(card.monthlySpend || 0)}
          alignItems="flex-end"
        />
      </div>

      {/* CATEGORIAS DO MÊS. */}
      {cats.length > 0 && (
        <div>
          <SectionLabel>
            {t('mes.creditCards.detail.categoriesTitle')}
          </SectionLabel>
          {cats.map((c, i) => (
            <CategoryRow
              key={c.raw}
              nome={c.nome}
              valor={c.valor}
              pct={c.pct}
              hue={c.color}
              isLast={i === cats.length - 1}
            />
          ))}
        </div>
      )}

      {/* PARCELAS FUTURAS. Hidden when no active series for this card. */}
      {installments.length > 0 && (
        <div>
          <SectionLabel>
            {t('mes.creditCards.detail.installmentsTitle')}
          </SectionLabel>
          {installments.map((inst, i) => (
            <InstallmentRow
              key={inst.name}
              installment={inst}
              isLast={i === installments.length - 1}
            />
          ))}
        </div>
      )}

      {/* MAIORES COMPRAS. */}
      <div>
        <SectionLabel>
          {t('mes.creditCards.detail.purchasesTitle')}
        </SectionLabel>
        {purchases.length === 0 ? (
          <div
            className="sans"
            style={{ fontSize: 13, color: color.text.muted, padding: '8px 0' }}
          >
            {t('mes.creditCards.transactionsEmpty')}
          </div>
        ) : (
          purchases.map((tx, i) => (
            <PurchaseRow
              key={`${tx.data}-${tx.descricao}-${i}`}
              data={tx.data}
              descricao={tx.descricao}
              categoria={tx.categoria}
              valor={tx.valor}
              tags={tx.tags}
              isLast={i === purchases.length - 1}
            />
          ))
        )}
      </div>

      {/* CTA. */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 4 }}>
        <button
          type="button"
          onClick={() => goToTransactions(null)}
          className="sans"
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            color: color.accent.primary,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {t('mes.creditCards.detail.seeAllTransactions')}
        </button>
      </div>
    </div>
  );
}

export default CreditCardDetail;
