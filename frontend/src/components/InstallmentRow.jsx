// Single row inside the "Parcelas futuras" (Mês card detail) and
// "Compromisso futuro" (Fluxo passive panel) sections. Mirrors the
// installment shape returned by `/api/installments`:
//
//   { name, monthly_value, paid, total, end_date, account, ... }
//
// Visual: name (left, may truncate) + N/M chip + monthly value + "termina
// MM/AA". One bordered subsection partition per row (1px border-bottom),
// no shadows, no nested cards. Uses the shared `InstallmentPill` so the
// chip recipe stays consistent with the parcelamento pill on transaction
// rows.

import React from 'react';
import { color } from '../theme/tokens';
import { formatBRL } from '../lib/formatBRL';
import { t } from '../i18n/index.js';
import { InstallmentPill } from './InstallmentPill.jsx';

// Parse `YYYY-MM-DD` to `MM/AA`. Falls back to the raw string when the
// shape is unexpected so we never silently drop information.
function endDateMMYY(iso) {
  if (typeof iso !== 'string' || iso.length < 7) return iso || '—';
  const [y, m] = iso.split('-');
  if (!y || !m) return iso;
  return `${m}/${y.slice(-2)}`;
}

export function InstallmentRow({ installment, isLast }) {
  const paid = installment.paid ?? 0;
  const total = installment.total ?? 0;
  const monthly = installment.monthly_value ?? 0;
  const dateLabel = t('mes.creditCards.detail.installmentEndDate', {
    date: endDateMMYY(installment.end_date),
  });
  const monthlyLabel = t('mes.creditCards.detail.installmentMonthly', {
    amount: formatBRL(monthly),
  });

  return (
    <div
      style={{
        padding: '10px 0',
        borderBottom: isLast ? 'none' : `1px solid ${color.border.subtle}`,
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        columnGap: 12,
        alignItems: 'baseline',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span
          className="sans"
          style={{
            fontSize: 13,
            color: color.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            minWidth: 0,
          }}
        >
          {installment.name}
        </span>
        {/* Series row chip = next parcel coming. Backend computes total − future_count + 1 in /api/installments (ADR-011 errata 2026-04-28). */}
        <InstallmentPill n={installment.next_parcel ?? (paid + 1)} total={total} />
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
          className="serif"
          style={{
            fontSize: 13,
            color: color.text.primary,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {monthlyLabel}
        </span>
        <span
          className="sans"
          style={{
            fontSize: 10,
            color: color.text.muted,
            letterSpacing: '0.05em',
          }}
        >
          {dateLabel}
        </span>
      </div>
    </div>
  );
}

export default InstallmentRow;
