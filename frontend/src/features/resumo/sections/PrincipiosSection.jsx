// Resumo — Section 3: Compact Principios (7 progress bars).
//
// Different layout from the `features/mes/sections/PrincipiosSection` table:
// this one is a dense, scanable list optimized for the Resumo overview card.
// Each row: principle label + realized/target % + ProgressBar. Consuming the
// ProgressBar component from features/mes (shared by design; each feature
// keeps its own section). If `/api/principles/summary` errors, we show the
// existing `mes.principles.unavailable` placeholder so messaging stays
// consistent between Resumo and Mês.

import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ProgressBar from '../../mes/components/ProgressBar.jsx';
import { usePrincipiosResumo } from '../hooks/usePrincipiosResumo.js';
import { t } from '../../../i18n/index.js';

// Order-of-appearance mirrors docs/02-PRD-dashboard-v2.md §4.1. The last id
// matches the backend enum value (`reserva-oportunidade`, without the middle
// "de"); the translation key uses the same id.
const PRINCIPLE_ORDER = [
  'custos-fixos',
  'conforto',
  'metas',
  'prazeres',
  'liberdade-financeira',
  'aumentar-renda',
  'reserva-oportunidade',
];

function PrincipleRow({ id, target, realized, isLast }) {
  const targetLabel = Number.isFinite(target) ? `${Math.round(target)}%` : '—';
  const realizedLabel = Number.isFinite(realized)
    ? `${Math.round(realized)}%`
    : '—';
  const ratio =
    Number.isFinite(target) && target > 0 && Number.isFinite(realized)
      ? (realized / target) * 100
      : 0;

  return (
    <div
      style={{
        padding: '10px 0',
        borderBottom: isLast ? 'none' : `1px solid ${color.border.subtle}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
          gap: 8,
        }}
      >
        <span
          className="sans"
          style={{ fontSize: 13, color: color.text.secondary }}
        >
          {t(`principle.${id}`)}
        </span>
        <span
          className="sans"
          style={{ fontSize: 12, color: color.text.muted }}
        >
          {realizedLabel}
          <span style={{ color: color.text.disabled }}> / {targetLabel}</span>
        </span>
      </div>
      <ProgressBar
        pct={ratio}
        height={5}
        fillColor={color.accent.primary}
      />
    </div>
  );
}

function PrincipiosSection() {
  const { data, error, loading } = usePrincipiosResumo();

  // Backend contract (app/principles/models.py :: PrincipleSummary):
  //   { month, denominator, breakdown: [{ principle, meta_pct, realizado_pct, ... }] }
  const rows = data?.breakdown || [];
  const byId = Object.fromEntries(rows.map((p) => [p.principle, p]));

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
        {t('resumo.principles.title')}
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
        PRINCIPLE_ORDER.map((id, i) => {
          const p = byId[id] || {};
          return (
            <PrincipleRow
              key={id}
              id={id}
              target={p.meta_pct}
              realized={p.realizado_pct}
              isLast={i === PRINCIPLE_ORDER.length - 1}
            />
          );
        })
      )}
    </div>
  );
}

export default PrincipiosSection;
