// One row inside the "Maiores compras" section of the credit-card detail.
// Extracted from CreditCardDetail.jsx so the detail view stays under the
// 400-line guideline. The N/M chip surfaces parcelamento series alongside
// the description (ADR-011), parsed from the transaction's `tags` array.

import React from 'react';
import { color } from '../../../theme/tokens';
import { formatBRL } from '../../../lib/formatBRL';
import {
  InstallmentPill,
  parcelamentoFromTags,
} from '../../../components/InstallmentPill.jsx';

function PurchaseRow({ data, descricao, categoria, valor, tags, isLast }) {
  const parcel = parcelamentoFromTags(tags);
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: isLast ? 'none' : `1px solid ${color.border.subtle}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 12,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            className="sans"
            style={{
              fontSize: 14,
              color: color.text.primary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {descricao || '—'}
          </span>
          {parcel && <InstallmentPill n={parcel.n} total={parcel.m} />}
        </div>
        <span
          className="sans"
          style={{ fontSize: 11, color: color.text.muted }}
        >
          {categoria ? `${categoria} · ${data}` : data}
        </span>
      </div>
      <span
        className="serif"
        style={{
          fontSize: 14,
          color: color.text.primary,
          whiteSpace: 'nowrap',
        }}
      >
        {formatBRL(Math.abs(valor || 0))}
      </span>
    </div>
  );
}

export default PurchaseRow;
