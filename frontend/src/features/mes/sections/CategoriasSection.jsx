// Despesas por categoria — ported from features/resumo/sections/CategoriasSection.jsx
// during the Resumo + Mês merge (Fase UX-Polish #3). Now rendered inside
// the Despesa surface, alongside MaioresGastosSection.
//
// Each row shows:
//   - color dot + category name (left)
//   - percentage + BRL amount (right)
//   - thin progress bar below, colored by the row's chart slot
//
// At the TOP of the body sits a stacked mini proportion bar — one segment
// per category, widths proportional to their values. After the user
// feedback round it moved up from the bottom (where it read as a footer
// stripe disconnected from the list) so it sits visually right under the
// despesa total and gives a one-glance sense of composition before the
// reader scans the rows.
//
// Clicking a row opens an inline subcategoria drill-down (no modal). The
// drill-down state is HOISTED to the parent (Despesa.jsx) so a sibling
// MaioresGastosSection can filter its query to the drilled category;
// `selectedCategory`/`onSelectCategory` are the contract.

import React, { useState } from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useApi, fetchCategoryDetail } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';
import { formatBRL } from '../../../lib/formatBRL';
import { t } from '../../../i18n/index.js';
import CategoriaDrilldown from './CategoriaDrilldown.jsx';

const pctLabel = (n) => `${Math.round(n)}%`;

function CategoriaBar({ nome, pct, valor, dotColor, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        marginBottom: 18,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              background: dotColor,
              flexShrink: 0,
              display: 'inline-block',
            }}
          />
          <span
            className="sans"
            style={{
              fontSize: 13,
              color: color.text.secondary,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nome}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            whiteSpace: 'nowrap',
          }}
        >
          <span
            className="sans"
            style={{ fontSize: 11, color: color.text.muted }}
          >
            {pctLabel(pct)}
          </span>
          <span
            className="serif"
            style={{ fontSize: 14, color: color.text.primary }}
          >
            {formatBRL(valor)}
          </span>
        </div>
      </div>
      <div
        style={{
          height: 5,
          background: color.border.default,
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            transformOrigin: 'left center',
            transform: `scaleX(${Math.max(0, Math.min(100, pct)) / 100})`,
            background: dotColor,
            borderRadius: 999,
            transition: 'transform 0.4s ease',
            willChange: 'transform',
          }}
        />
      </div>
    </div>
  );
}

// Props:
//   - framing: 'card' | 'bare' — see file header.
//   - topLimit: number | null — cap visible rows; below the list, a
//     right-aligned "Mostrar mais (N)" / "Mostrar menos" toggle controls
//     the reveal. The stacked bar at the top always reflects ALL rows so
//     the proportion read stays honest while the list is collapsed.
//   - selectedCategory / onSelectCategory: optional hoisted state. When
//     provided, the parent owns the drill-down so a sibling section can
//     filter to it (e.g., MaioresGastosSection by category). When omitted,
//     the section keeps a local fallback for legacy callers.
function CategoriasSection({
  framing = 'card',
  topLimit = null,
  selectedCategory: selectedCategoryProp,
  onSelectCategory,
} = {}) {
  const { selectedMonth, refreshKey } = useMonth();
  const { data, error, loading } = useApi(
    `/api/categories?month=${selectedMonth}&depth=2`,
    [selectedMonth, refreshKey],
  );

  const isHoisted = typeof onSelectCategory === 'function';
  const [localSelected, setLocalSelected] = useState(null);
  const detalhe = isHoisted ? selectedCategoryProp : localSelected;
  const setDetalhe = isHoisted ? onSelectCategory : setLocalSelected;

  const [loadingDet, setLoadingDet] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (error) return <ErrorBox msg={error} />;

  const palette = color.chart.category;
  const categorias = (data?.categorias || []).map((c, i) => ({
    ...c,
    cor: palette[i % palette.length],
  }));
  const total = categorias.reduce((s, c) => s + (c.valor || 0), 0);
  const visibleCategorias =
    topLimit && !showAll ? categorias.slice(0, topLimit) : categorias;
  const hiddenCount = categorias.length - visibleCategorias.length;

  const openCat = async (cat) => {
    setLoadingDet(true);
    try {
      const r = await fetchCategoryDetail(
        cat.segmento_raw || cat.nome,
        selectedMonth,
      );
      setDetalhe({ ...cat, subcats: r.subcategorias || [] });
    } catch (e) {
      setDetalhe({ ...cat, subcats: [], error: e.message });
    } finally {
      setLoadingDet(false);
    }
  };

  const showDrilldown = detalhe !== null && detalhe !== undefined;
  const Wrapper = framing === 'card' ? 'div' : React.Fragment;
  const wrapperProps = framing === 'card' ? { className: 'card' } : {};

  return (
    <Wrapper {...wrapperProps}>
      {framing === 'card' && (
        <div
          className="sans"
          style={{
            fontSize: 11,
            letterSpacing: '0.15em',
            color: color.text.muted,
            textTransform: 'uppercase',
            marginBottom: 18,
          }}
        >
          {t('mes.expand.categories.title')}
        </div>
      )}

      {loading || loadingDet ? (
        <Spinner />
      ) : showDrilldown ? (
        <CategoriaDrilldown
          detalhe={detalhe}
          onBack={() => setDetalhe(null)}
        />
      ) : (
        <>
          {/* Stacked composition bar — moved to the TOP after user feedback.
              Always reflects ALL categories so the proportion read stays
              honest even while the row list is capped to topLimit. */}
          {categorias.length > 0 && (
            <div
              style={{
                marginBottom: 18,
                height: 8,
                borderRadius: 999,
                display: 'flex',
                overflow: 'hidden',
                gap: 1,
              }}
            >
              {categorias.map((c) => (
                <div
                  key={c.segmento_raw || c.nome}
                  title={c.nome}
                  style={{
                    flex: Math.max(c.valor || 0, 0.0001),
                    background: c.cor,
                    opacity: 0.85,
                  }}
                />
              ))}
            </div>
          )}

          {visibleCategorias.map((c) => {
            const pct = total > 0 ? (c.valor / total) * 100 : 0;
            return (
              <CategoriaBar
                key={c.segmento_raw || c.nome}
                nome={c.nome}
                pct={pct}
                valor={c.valor}
                dotColor={c.cor}
                onClick={(e) => {
                  e?.stopPropagation?.();
                  openCat(c);
                }}
              />
            );
          })}

          {hiddenCount > 0 && !showAll && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: -4 }}>
              <button
                type="button"
                data-stop
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAll(true);
                }}
                className="sans"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 0 8px',
                  color: color.accent.primary,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t('mes.expand.categories.showMore', { count: hiddenCount })}
              </button>
            </div>
          )}
          {showAll && topLimit && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: -4 }}>
              <button
                type="button"
                data-stop
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAll(false);
                }}
                className="sans"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 0 8px',
                  color: color.text.muted,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {t('mes.expand.categories.showLess')}
              </button>
            </div>
          )}
        </>
      )}
    </Wrapper>
  );
}

export default CategoriasSection;
