// Resumo — Section 2: Despesas por categoria.
//
// Visual layout ported from docs/design/fase-u/project/src/tab-resumo.jsx
// (lines 19-49). Each row shows:
//   - color dot + category name (left)
//   - percentage + BRL amount (right)
//   - thin progress bar below, colored by the row's chart slot
//
// Bottom of the card has a stacked mini proportion bar — one segment per
// category, widths proportional to their values. This gives the reader a
// one-glance sense of composition without a separate chart.
//
// Clicking a row opens an inline subcategoria drill-down (no modal), which
// lives in `CategoriaDrilldown.jsx`. Pattern matches FluxoDetail /
// AccountDetail.

import React, { useState } from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useApi, fetchCategoryDetail } from '../../../api.js';
import { useMonth } from '../../../contexts/MonthContext.jsx';
import { t } from '../../../i18n/index.js';
import CategoriaDrilldown from './CategoriaDrilldown.jsx';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
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
            {BRL(valor)}
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
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: dotColor,
            borderRadius: 999,
            transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  );
}

function CategoriasSection() {
  const { selectedMonth, refreshKey } = useMonth();
  const { data, error, loading } = useApi(
    `/api/categories?month=${selectedMonth}&depth=2`,
    [selectedMonth, refreshKey],
  );

  const [detalhe, setDetalhe] = useState(null);
  const [loadingDet, setLoadingDet] = useState(false);

  if (error) return <ErrorBox msg={error} />;

  const palette = color.chart.category;
  const categorias = (data?.categorias || []).map((c, i) => ({
    ...c,
    cor: palette[i % palette.length],
  }));
  const total = categorias.reduce((s, c) => s + (c.valor || 0), 0);

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

  const showDrilldown = detalhe !== null;

  return (
    <div className="card">
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
        {t('resumo.categories.title')}
      </div>

      {loading || loadingDet ? (
        <Spinner />
      ) : showDrilldown ? (
        <CategoriaDrilldown
          detalhe={detalhe}
          onBack={() => setDetalhe(null)}
        />
      ) : (
        <>
          {categorias.map((c) => {
            const pct = total > 0 ? (c.valor / total) * 100 : 0;
            return (
              <CategoriaBar
                key={c.segmento_raw || c.nome}
                nome={c.nome}
                pct={pct}
                valor={c.valor}
                dotColor={c.cor}
                onClick={() => openCat(c)}
              />
            );
          })}
          {/* Stacked mini proportion bar — composition at a glance. */}
          {categorias.length > 0 && (
            <div
              style={{
                marginTop: 4,
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
        </>
      )}
    </div>
  );
}

export default CategoriasSection;
