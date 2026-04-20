import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import ParcelamentoCard from '../components/ParcelamentoCard.jsx';
import { useInstallments } from '../hooks/useInstallments.js';
import { t } from '../../../i18n';

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 2,
});

// Vista 2 (PRD §7) — active credit-card installments.
// Shows a list of parcelamentos and the monthly/remaining totals.
function DividaView() {
  const { data, loading, error } = useInstallments();

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const rows = data?.installments || [];
  const totalMonthly = data?.total_monthly ?? 0;
  const totalRemaining = data?.total_remaining ?? 0;

  if (!rows.length) {
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
          {t('plano.divida.title')}
        </div>
        <div className="sans" style={{ color: color.text.muted, fontSize: 13, padding: '8px 0' }}>
          {t('plano.divida.empty')}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          className="sans"
          style={{
            fontSize: 11,
            letterSpacing: '0.15em',
            color: color.text.muted,
            textTransform: 'uppercase',
          }}
        >
          {t('plano.divida.title', { count: rows.length })}
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <TotalChip label={t('plano.divida.totalMonthly')} value={BRL(totalMonthly)} />
          <TotalChip label={t('plano.divida.totalRemaining')} value={BRL(totalRemaining)} accent />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {rows.map(row => (
          <ParcelamentoCard key={row.name} row={row} />
        ))}
      </div>
    </div>
  );
}

function TotalChip({ label, value, accent = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
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
          fontWeight: 600,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default DividaView;
