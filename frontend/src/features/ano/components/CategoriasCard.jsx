// CategoriasCard — per-month "Expenses by category" block for the Ano
// drill-down. Visual mirrors features/resumo/sections/CategoriasSection.jsx
// (dot + name + pct + BRL + thin bar) minus the subcategoria drill, which is
// out of scope for the column drill-down.

import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useApi } from '../../../api.js';
import { t } from '../../../i18n/index.js';
import { formatBRL } from '../../../lib/formatBRL';

const BRL = (n) => formatBRL(n, { fractionDigits: 0 });
const pctLabel = (n) => `${Math.round(n)}%`;

function CategoriaBar({ nome, pct, valor, dotColor }) {
  return (
    <div style={{ marginBottom: 16 }}>
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

function CategoriasCard({ month }) {
  const { data, error, loading } = useApi(
    `/api/categories?month=${month}&depth=2`,
    [month],
  );

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const palette = color.chart.category;
  const categorias = (data?.categorias || []).map((c, i) => ({
    ...c,
    cor: palette[i % palette.length],
  }));
  const total = categorias.reduce((s, c) => s + (c.valor || 0), 0);

  if (categorias.length === 0) {
    return (
      <div
        className="sans"
        style={{ fontSize: 13, color: color.text.muted, padding: '8px 0' }}
      >
        {t('ano.drilldown.empty')}
      </div>
    );
  }

  return (
    <div>
      {categorias.map((c) => {
        const pct = total > 0 ? (c.valor / total) * 100 : 0;
        return (
          <CategoriaBar
            key={c.segmento_raw || c.nome}
            nome={c.nome}
            pct={pct}
            valor={c.valor}
            dotColor={c.cor}
          />
        );
      })}
    </div>
  );
}

export default CategoriasCard;
