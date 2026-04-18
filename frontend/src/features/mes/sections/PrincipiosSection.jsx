// Section 3 — Targets by principle.
//
// Expected backend contract (PR-D1, to land in /api/principles/summary):
//   { month, principles: [{ id, target_pct, realized_pct, realized_amount }] }
//
// Until PR-D1 is merged, useApi returns an HTTP error. We render a friendly
// "endpoint unavailable" placeholder rather than an ErrorBox so the rest of
// the page remains usable.
//
// Table layout (PRD §5.3): 7 rows × 4 cols — Principle | Target% | Realized%
// | Amount — plus an inline progress bar computed from realized/target.

import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import { usePrincipios } from '../hooks/usePrincipios.js';
import { t } from '../../../i18n/index.js';
import ProgressBar from '../components/ProgressBar.jsx';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

// Ordered list of principle IDs (PRD §4.1). Rendered in this order even when
// the backend omits some principles or returns them in a different order.
const PRINCIPLE_ORDER = [
  'custos-fixos',
  'conforto',
  'metas',
  'prazeres',
  'liberdade-financeira',
  'aumentar-renda',
  'reserva-de-oportunidade',
];

function Header({ children, width, align = 'left' }) {
  return (
    <div
      className="sans"
      style={{
        fontSize: 10,
        letterSpacing: '0.1em',
        color: color.text.muted,
        textTransform: 'uppercase',
        width,
        textAlign: align,
      }}
    >
      {children}
    </div>
  );
}

function PrincipleRow({ id, target, realized, amount, isLast }) {
  const ratio =
    Number.isFinite(target) && target > 0 && Number.isFinite(realized)
      ? (realized / target) * 100
      : 0;
  return (
    <div
      style={{
        padding: '12px 0',
        borderBottom: isLast ? 'none' : `1px solid ${color.border.default}`,
        display: 'grid',
        gridTemplateColumns: '2fr 1fr 1fr 1.2fr',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <span
        className="sans"
        style={{ fontSize: 14, color: color.text.secondary }}
      >
        {t(`principle.${id}`)}
      </span>
      <span
        className="sans"
        style={{ fontSize: 13, color: color.text.muted, textAlign: 'right' }}
      >
        {Number.isFinite(target) ? `${Math.round(target)}%` : '—'}
      </span>
      <span
        className="sans"
        style={{ fontSize: 13, color: color.text.primary, textAlign: 'right' }}
      >
        {Number.isFinite(realized) ? `${Math.round(realized)}%` : '—'}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span
          className="serif"
          style={{ fontSize: 14, color: color.text.primary, textAlign: 'right' }}
        >
          {amount ? BRL(amount) : '—'}
        </span>
        <ProgressBar pct={ratio} />
      </div>
    </div>
  );
}

function PrincipiosSection() {
  const { data, error, loading } = usePrincipios();

  const principles = data?.principles || [];
  const byId = Object.fromEntries(principles.map((p) => [p.id, p]));

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
        {t('mes.principles.title')}
      </div>

      {loading ? (
        <Spinner />
      ) : error ? (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted, padding: '8px 0' }}
        >
          {t('mes.principles.unavailable')}
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1.2fr',
              gap: 12,
              paddingBottom: 8,
              borderBottom: `1px solid ${color.border.default}`,
            }}
          >
            <Header>{t('mes.principles.header.principle')}</Header>
            <Header align="right">{t('mes.principles.header.target')}</Header>
            <Header align="right">{t('mes.principles.header.realized')}</Header>
            <Header align="right">{t('mes.principles.header.amount')}</Header>
          </div>
          {PRINCIPLE_ORDER.map((id, i) => {
            const p = byId[id] || {};
            return (
              <PrincipleRow
                key={id}
                id={id}
                target={p.target_pct}
                realized={p.realized_pct}
                amount={p.realized_amount}
                isLast={i === PRINCIPLE_ORDER.length - 1}
              />
            );
          })}
        </>
      )}
    </div>
  );
}

export default PrincipiosSection;
