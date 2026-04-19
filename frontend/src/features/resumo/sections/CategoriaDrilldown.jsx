// Inline subcategoria drill-down used by CategoriasSection. Rendered in place
// of the category bars (no modal, per frontend-dev rules).

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { color } from '../../../theme/tokens';
import { t } from '../../../i18n/index.js';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
const BRLc = (n) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pctLabel = (n) => `${Math.round(n)}%`;

function CategoriaDrilldown({ detalhe, onBack }) {
  return (
    <>
      <button
        onClick={onBack}
        className="sans"
        style={{
          background: 'none',
          border: 'none',
          color: color.accent.primary,
          cursor: 'pointer',
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: 0,
          marginBottom: 20,
        }}
      >
        <ArrowLeft size={14} /> {t('resumo.drilldown.back')}
      </button>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            background: detalhe.cor,
            display: 'inline-block',
            borderRadius: 2,
          }}
        />
        <span className="serif" style={{ fontSize: 22, fontWeight: 600 }}>
          {detalhe.nome}
        </span>
        <span className="serif" style={{ fontSize: 22, color: color.text.muted }}>
          {BRL(detalhe.valor)}
        </span>
      </div>
      {detalhe.subcats.length === 0 ? (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted }}
        >
          {t('resumo.drilldown.empty')}
        </div>
      ) : (
        detalhe.subcats.map((s, i) => {
          const p = detalhe.valor > 0 ? (s.valor / detalhe.valor) * 100 : 0;
          return (
            <div key={i} style={{ marginBottom: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 5,
                }}
              >
                <span
                  className="sans"
                  style={{ fontSize: 14, color: color.text.secondary }}
                >
                  {s.nome}
                </span>
                <span className="sans" style={{ fontSize: 14 }}>
                  {BRLc(s.valor)}{' '}
                  <span style={{ color: color.text.muted, fontSize: 12 }}>
                    ({pctLabel(p)})
                  </span>
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: color.border.default,
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${Math.max(0, Math.min(100, p))}%`,
                    background: detalhe.cor,
                    opacity: 0.85,
                  }}
                />
              </div>
            </div>
          );
        })
      )}
    </>
  );
}

export default CategoriaDrilldown;
