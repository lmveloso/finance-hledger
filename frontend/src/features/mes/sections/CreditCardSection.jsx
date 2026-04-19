// Section 6 — Despesas por cartão de crédito.
//
// One row per active credit-card liability account discovered for the month,
// sorted by total spend desc. Clicking a row toggles an inline expansion with
// a category legend and the top 10 purchases for that card. Only one card can
// be expanded at a time.
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

  const toggle = (conta) =>
    setExpandedCard((prev) => (prev === conta ? null : conta));

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
          const expanded = expandedCard === c.conta;
          return (
            <div key={c.conta}>
              <CreditCardRow
                conta={c.conta}
                nome={c.nome}
                total={c.total}
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
