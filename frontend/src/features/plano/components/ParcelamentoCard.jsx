import React from 'react';
import { color } from '../../../theme/tokens';
import { t } from '../../../i18n';

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 2,
});

function formatEndDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  if (!y || !m) return iso;
  return `${d || '01'}/${m}/${y}`;
}

// ParcelamentoCard — one active installment summarised as a compact row.
// Shows name, paid/total, monthly value and the remaining total; renders a
// slim progress bar so the user can skim debt decay at a glance.
//
// Props:
//   row: { name, monthly_value, paid, total, remaining, remaining_value, end_date }
function ParcelamentoCard({ row }) {
  const paid = row.paid ?? 0;
  const total = row.total ?? 0;
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;

  return (
    <div
      style={{
        border: `1px solid ${color.border.default}`,
        borderRadius: 3,
        padding: '14px 16px',
        background: color.bg.card,
        display: 'grid',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <div className="serif" style={{ fontSize: 16, fontWeight: 600, color: color.text.primary }}>
          {row.name}
        </div>
        <div className="sans" style={{ fontSize: 11, letterSpacing: '0.08em', color: color.text.muted, textTransform: 'uppercase' }}>
          {t('plano.parcelamento.parcelas', { paid, total })}
        </div>
      </div>

      <div
        style={{
          height: 4,
          background: color.border.subtle,
          borderRadius: 2,
          overflow: 'hidden',
        }}
        aria-label={t('plano.parcelamento.progressLabel')}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: color.accent.primary,
            transition: 'width 0.2s ease',
          }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 12,
        }}
      >
        <Field label={t('plano.parcelamento.monthly')} value={BRL(row.monthly_value)} accent />
        <Field
          label={t('plano.parcelamento.remaining')}
          value={BRL(row.remaining_value)}
        />
        <Field
          label={t('plano.parcelamento.endDate')}
          value={formatEndDate(row.end_date)}
        />
      </div>
    </div>
  );
}

function Field({ label, value, accent = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span
        className="sans"
        style={{
          fontSize: 10,
          letterSpacing: '0.1em',
          color: color.text.muted,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <span
        className="serif"
        style={{
          fontSize: 14,
          color: accent ? color.accent.primary : color.text.primary,
          fontWeight: accent ? 600 : 500,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default ParcelamentoCard;
