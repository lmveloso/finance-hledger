// Compact flat row for a credit card with outstanding liability but zero
// spend in the selected month (issue #20). Non-interactive: no role=button,
// no click handlers, no chevron, no category bar. Shows the card name and
// its current outstanding balance, labelled "Saldo devedor".

import React from 'react';
import { color } from '../../../theme/tokens';
import { t } from '../../../i18n/index.js';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

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

function CreditCardDormantRow({
  nome,
  outstandingBalance,
  isLast,
  isDesktop,
}) {
  const baseRow = {
    padding: '12px 0',
    borderBottom: isLast ? 'none' : `1px solid ${color.border.subtle}`,
    userSelect: 'none',
  };

  const nameSpan = (
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
  );

  const amountSpan = (
    <span className="serif" style={{ fontSize: 16, color: color.text.primary }}>
      {BRL(outstandingBalance)}
    </span>
  );

  if (isDesktop) {
    return (
      <div
        style={{
          ...baseRow,
          display: 'grid',
          gridTemplateColumns: '220px 1fr auto',
          gap: 16,
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          {nameSpan}
          <AmountCaption>
            {t('mes.creditCards.outstandingBalanceLabel')}
          </AmountCaption>
        </div>
        <div aria-hidden="true" />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 2,
          }}
        >
          {amountSpan}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseRow,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
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
        {nameSpan}
        {amountSpan}
      </div>
      <AmountCaption>
        {t('mes.creditCards.outstandingBalanceLabel')}
      </AmountCaption>
    </div>
  );
}

export default CreditCardDormantRow;
