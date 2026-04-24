// PrincipiosCard — per-month "Targets by principle" block rendered inside
// the Ano drill-down. Mirrors the visual from features/resumo/sections/
// PrincipiosSection.jsx (compact list + ProgressBar) but receives `month`
// as a prop instead of reading from MonthContext, so the Ano drill-down
// can select any month in the year without mutating global state.

import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ProgressBar from '../../mes/components/ProgressBar.jsx';
import { useApi } from '../../../api.js';
import { t } from '../../../i18n/index.js';

// Canonical order (PRD §4.1). Backend enum uses `reserva-oportunidade`
// (no "de"); keep that id here so the `.find()` below matches.
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
      <ProgressBar pct={ratio} height={5} fillColor={color.accent.primary} />
    </div>
  );
}

function PrincipiosCard({ month }) {
  const { data, error, loading } = useApi(
    `/api/principles/summary?month=${month}`,
    [month],
  );

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div
        className="sans"
        style={{ fontSize: 13, color: color.text.muted, padding: '8px 0' }}
      >
        {t('mes.principles.unavailable')}
      </div>
    );
  }

  const rows = data?.breakdown || [];
  if (rows.length === 0) {
    return (
      <div
        className="sans"
        style={{ fontSize: 13, color: color.text.muted, padding: '8px 0' }}
      >
        {t('ano.drilldown.empty')}
      </div>
    );
  }

  const byId = Object.fromEntries(rows.map((p) => [p.principle, p]));

  return (
    <div>
      {PRINCIPLE_ORDER.map((id, i) => {
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
      })}
    </div>
  );
}

export default PrincipiosCard;
