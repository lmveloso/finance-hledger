// Section 6 — Despesas por cartão de crédito.
//
// One row per credit-card liability account discovered from the union of
// /api/flow (monthly activity) and /api/accounts (outstanding balance).
// Active cards (monthly spend > 0) sort first and can be expanded to show the
// category legend + top 10 purchases. Dormant cards (outstanding-only, issue
// #20) render as a compact flat row showing the outstanding balance without
// an expansion affordance.
//
// Mobile (<768px): the whole list stays collapsed behind a "Ver cartões (N)"
// button to avoid a long scroll. Desktop renders the list immediately.
//
// No modals. Inline + tokens styling only.

import React, { useState } from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useCreditCards } from '../hooks/useCreditCards.js';
import { useMediaQuery } from '../../../hooks/useMediaQuery.js';
import { t } from '../../../i18n/index.js';
import CreditCardRow from '../components/CreditCardRow.jsx';
import CreditCardExpanded from '../components/CreditCardExpanded.jsx';

function CreditCardSection() {
  const { cards, loading, error } = useCreditCards();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [expandedCard, setExpandedCard] = useState(null);
  const [mobileVisible, setMobileVisible] = useState(false);

  // Only toggles for cards with monthly activity. Dormant rows don't have an
  // expansion target (no categories, no transactions) and render flat.
  const toggle = (conta) => {
    const card = (cards || []).find((c) => c.conta === conta);
    if (!card || !card.hasMonthlyActivity) return;
    setExpandedCard((prev) => (prev === conta ? null : conta));
  };

  const showList = isDesktop || mobileVisible;

  return (
    <div className="card">
      <div
        className="sans"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        {t('mes.creditCards.title')}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <ErrorBox msg={error} />
      ) : cards.length === 0 ? (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted, padding: '8px 0' }}
        >
          {t('mes.creditCards.empty')}
        </div>
      ) : !showList ? (
        <button
          type="button"
          className="sans"
          onClick={() => setMobileVisible(true)}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'transparent',
            border: `1px solid ${color.border.default}`,
            color: color.text.secondary,
            fontSize: 12,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {t('mes.creditCards.showOnMobile', { count: cards.length })}
        </button>
      ) : (
        cards.map((c, i) => {
          const isLast = i === cards.length - 1;
          const expanded = expandedCard === c.conta && c.hasMonthlyActivity;
          return (
            <div key={c.conta}>
              <CreditCardRow
                conta={c.conta}
                nome={c.nome}
                monthlySpend={c.monthlySpend}
                outstandingBalance={c.outstandingBalance}
                hasMonthlyActivity={c.hasMonthlyActivity}
                categories={c.categories}
                expanded={expanded}
                onToggle={toggle}
                isLast={isLast}
                isDesktop={isDesktop}
              />
              {expanded && (
                <CreditCardExpanded
                  categories={c.categories}
                  transactions={c.transactions}
                  outstandingBalance={c.outstandingBalance}
                  isDesktop={isDesktop}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export default CreditCardSection;
