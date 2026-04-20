import React from 'react';
import { useApi } from '../../api.js';
import { color, radius, padding } from '../../theme/tokens';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import { useMonth } from '../../contexts/MonthContext.jsx';
import { t } from '../../i18n/index.js';
import TotalHeroCard from './components/TotalHeroCard.jsx';
import CategoryRow from './components/CategoryRow.jsx';

/**
 * Orçamento tab — PR-U6 redesign.
 *
 * Shell only: fetches /api/budget, renders the total hero card (donut +
 * progress bar) and a per-category list with colored rows. All visualisation
 * lives in ./components.
 *
 * Category color assignment is index-based against `color.chart.colors` —
 * post-sort order, so the "worst" overbudget category gets the first
 * palette color. Deterministic per-render; acceptable to shift between
 * months (matches the pattern other U-phase tabs follow).
 */
function Orcamento() {
  const { selectedMonth, refreshKey } = useMonth();
  const { data, error, loading } = useApi(
    `/api/budget?month=${selectedMonth}`,
    [selectedMonth, refreshKey],
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  // API already sorts by percentual desc; we keep that order and filter out
  // categories with no budget configured (0/undefined orçado).
  const categorias = (data?.categorias || []).filter((c) => c.orcado > 0);
  const total = data?.total;
  const palette = color.chart.colors || [];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {total && <TotalHeroCard total={total} />}

      <div
        style={{
          background: color.bg.card,
          border: `1px solid ${color.border.default}`,
          borderRadius: radius.rounded.md,
          padding: padding.rounded.card,
        }}
      >
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            fontSize: 11,
            letterSpacing: '0.15em',
            color: color.text.muted,
            textTransform: 'uppercase',
            marginBottom: 20,
          }}
        >
          {t('orcamento.categories.title')}
        </div>

        {categorias.length === 0 ? (
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              color: color.text.muted,
              fontSize: 13,
            }}
          >
            {t('orcamento.empty')}
          </div>
        ) : (
          categorias.map((c, i) => (
            <CategoryRow
              key={c.conta || c.nome || i}
              nome={c.nome}
              orcado={c.orcado}
              realizado={c.realizado}
              barColor={palette[i % (palette.length || 1)] || color.accent.primary}
              isLast={i === categorias.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default Orcamento;
