// Receita — peer card on the Mês tab.
//
// Compact: "RECEITA" eyebrow + total (Display 30px, text.primary).
// Expanded (PRD-08 §4.2): grouped-by-type list — uses useReceitas + the
// pure groupReceitas helper. Inline list, no external routing (the brief
// resolves Open Q4: no `?type=income`, no cross-tab handoff for income
// rows).

import React from 'react';
import { color } from '../../../theme/tokens';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { formatBRL } from '../../../lib/formatBRL';
import { t } from '../../../i18n/index.js';
import ExpandableCard from '../components/ExpandableCard.jsx';
import SectionSubtitle from '../../../components/SectionSubtitle.jsx';
import { useReceitas } from '../hooks/useReceitas.js';
import { groupReceitas } from '../lib/groupReceitas.js';

const PANEL_ID = 'mes-receita-panel';

function Receita({ summary, summaryLoading, open, onToggle }) {
  const { data, error, loading } = useReceitas();
  const total = summary?.income;

  const header = (
    <>
      <SectionSubtitle style={{ marginBottom: 10 }}>
        {t('mes.row.income.label')}
      </SectionSubtitle>
      <div
        className="serif"
        style={{
          fontSize: 30,
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: color.feedback.positive,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {summaryLoading || total == null ? '···' : formatBRL(total)}
      </div>
    </>
  );

  const renderBody = () => {
    if (error) return <ErrorBox msg={error} />;
    if (loading) {
      return (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted }}
        >
          ···
        </div>
      );
    }
    const groups = groupReceitas(data?.revenues || []);
    if (groups.length === 0) {
      return (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted }}
        >
          {t('mes.row.income.empty')}
        </div>
      );
    }
    return (
      <div>
        {groups.map((g, i) => (
          <div
            key={g.type}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              gap: 12,
              padding: '12px 0',
              borderBottom:
                i < groups.length - 1
                  ? `1px solid ${color.border.subtle}`
                  : 'none',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                minWidth: 0,
                flex: 1,
              }}
            >
              <span
                className="sans"
                style={{
                  fontSize: 13,
                  color: color.text.primary,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {g.type}
              </span>
              {g.count > 1 && (
                <span
                  className="sans"
                  style={{ fontSize: 11, color: color.text.muted }}
                >
                  {t('mes.expand.revenue.count', { count: g.count })}
                </span>
              )}
            </div>
            <span
              className="sans"
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: color.text.primary,
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              {formatBRL(g.total)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ExpandableCard
      open={open}
      onToggle={onToggle}
      panelId={PANEL_ID}
      header={header}
    >
      {renderBody()}
    </ExpandableCard>
  );
}

export default Receita;
