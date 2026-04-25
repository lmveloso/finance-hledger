// Section 6 — Despesas por cartão de crédito.
//
// LIST → DETAIL navigation: the section starts in LIST mode (one row per
// card, with monthly spend, outstanding balance, stacked composition bar,
// top-3 category chips). Clicking a row swaps the body to DETAIL mode for
// that card; the "Voltar" button in the detail returns to the list. The
// list is owned here so a single section keeps the swap state without a
// modal or a tab change.
//
// Always-open at every breakpoint. The previous "Ver cartões (N)" mobile
// gate was removed after user feedback ("on mobile cards still come
// closed") — density was the goal, not collapse.
//
// One row per credit-card liability account discovered from the union of
// /api/flow (monthly activity) and /api/accounts (outstanding balance).
// Active cards (monthly spend > 0) sort first; dormant cards (outstanding
// only) follow and stay clickable so the user can still inspect them.
//
// Below the list a single "Total devendo" footer summarises the combined
// outstanding balance — useful for the family dashboard read where the
// aggregate matters more than any single card.

import React, { useState } from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useCreditCards } from '../hooks/useCreditCards.js';
import { formatBRL } from '../../../lib/formatBRL';
import { t } from '../../../i18n/index.js';
import CreditCardListRow from '../components/CreditCardListRow.jsx';
import CreditCardDetail from '../components/CreditCardDetail.jsx';

function CreditCardSection() {
  const { cards, loading, error } = useCreditCards();
  const [selectedConta, setSelectedConta] = useState(null);

  const totalOwing = (cards || []).reduce(
    (s, c) => s + (c.outstandingBalance || 0),
    0,
  );

  const selectedCard =
    selectedConta != null
      ? (cards || []).find((c) => c.conta === selectedConta) || null
      : null;

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
      ) : selectedCard ? (
        <CreditCardDetail
          card={selectedCard}
          onBack={() => setSelectedConta(null)}
        />
      ) : (
        <>
          {cards.map((c, i) => (
            <CreditCardListRow
              key={c.conta}
              card={c}
              onSelect={setSelectedConta}
              isLast={i === cards.length - 1}
            />
          ))}
          {totalOwing > 0 && (
            <div
              style={{
                marginTop: 16,
                paddingTop: 14,
                borderTop: `1px solid ${color.border.subtle}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 12,
              }}
            >
              <span
                className="sans"
                style={{
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  color: color.text.muted,
                  textTransform: 'uppercase',
                }}
              >
                {t('mes.creditCards.totalOwing')}
              </span>
              <span
                className="serif"
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: color.text.primary,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatBRL(totalOwing)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CreditCardSection;
