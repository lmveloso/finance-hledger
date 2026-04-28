// `N/M` chip rendered next to a transaction or installment row when the
// row is part of a parcelamento series (ADR-011). Mode-invariant accent
// recipe per DESIGN.md §6: tinted background + full-strength accent text;
// no border, no shadow.
//
// Used by both:
//   - frontend/src/features/mes/components/CreditCardDetail.jsx
//   - frontend/src/features/fluxo-reformado/components/AccountDetailPanel.jsx
//
// Sizing: ~10–11px, 0.08em letter-spacing — quiet enough that it reads as
// a chip, sharp enough that it survives the truncation of the description.

import React from 'react';
import { color } from '../theme/tokens';

// `n` is the numerator the caller wants to show — it carries no built-in
// semantic. For transaction rows the caller passes the literal parcel index
// from the tag (e.g. 1/3 for the April leg). For series rows in the
// "Parcelas/Compromisso Futuro" sections the caller passes `paid + 1` —
// the next parcel coming, not the last one charged.
export function InstallmentPill({ n, total }) {
  if (n == null || total == null) return null;
  return (
    <span
      className="sans"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: color.accent.primaryMuted,
        color: color.accent.primary,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        lineHeight: 1,
        padding: '3px 6px',
        borderRadius: 3,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      {n}/{total}
    </span>
  );
}

// Parser for the canonical tag value `<NAME> <N>/<M>` (ADR-011 §Tag).
// Returns `{ name, n, m }` or null when the value does not match. Tolerates
// trailing whitespace.
const TAG_RE = /^(.+?)\s+(\d+)\/(\d+)\s*$/;

export function parseParcelamentoTag(value) {
  if (typeof value !== 'string') return null;
  const m = TAG_RE.exec(value);
  if (!m) return null;
  return {
    name: m[1].trim(),
    n: Number(m[2]),
    m: Number(m[3]),
  };
}

// Pull the parcelamento (n, m) pair from a transaction's `tags` array, if
// present. The backend exposes `tags: [[key, value], ...]`. Returns null
// when the transaction is not part of a parcelamento series.
export function parcelamentoFromTags(tags) {
  if (!Array.isArray(tags)) return null;
  for (const entry of tags) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const [key, value] = entry;
    if (key !== 'parcelamento') continue;
    const parsed = parseParcelamentoTag(value);
    if (parsed) return parsed;
  }
  return null;
}

export default InstallmentPill;
