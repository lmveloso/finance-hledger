// Inline expansion body for a credit card row. Not a modal.
//
// Top region: category legend (colored square + name + BRL + %). 2-col grid on
// desktop, 1-col on mobile.
// Bottom region: up to 10 purchases via TransacaoRow.

import React from 'react';
import { color } from '../../../theme/tokens';
import TransacaoRow from './TransacaoRow.jsx';
import { t } from '../../../i18n/index.js';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

function LegendItem({ nome, valor, pct, hue }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 10,
        padding: '6px 0',
        borderBottom: `1px solid ${color.border.subtle}`,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span
          style={{
            width: 10,
            height: 10,
            background: hue,
            borderRadius: 2,
            flexShrink: 0,
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
      </span>
      <span
        className="sans"
        style={{
          fontSize: 12,
          color: color.text.primary,
          display: 'flex',
          gap: 8,
          alignItems: 'baseline',
          whiteSpace: 'nowrap',
        }}
      >
        <span className="serif" style={{ fontSize: 13 }}>{BRL(valor)}</span>
        <span style={{ color: color.text.muted }}>{`${Math.round(pct)}%`}</span>
      </span>
    </div>
  );
}

function CreditCardExpanded({ categories, transactions, isDesktop }) {
  const legend = (categories || []).filter((c) => c.valor > 0);
  const txs = transactions || [];

  return (
    <div
      style={{
        padding: '12px 0 16px',
        borderTop: `1px solid ${color.border.subtle}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {legend.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isDesktop ? 'repeat(2, 1fr)' : '1fr',
            columnGap: 24,
          }}
        >
          {legend.map((c) => (
            <LegendItem
              key={c.raw}
              nome={c.nome}
              valor={c.valor}
              pct={c.pct}
              hue={c.color}
            />
          ))}
        </div>
      )}

      <div>
        <div
          className="sans"
          style={{
            fontSize: 10,
            letterSpacing: '0.15em',
            color: color.text.muted,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          {t('mes.creditCards.transactions')}
        </div>
        {txs.length === 0 ? (
          <div
            className="sans"
            style={{ fontSize: 12, color: color.text.muted, padding: '8px 0' }}
          >
            {t('mes.creditCards.transactionsEmpty')}
          </div>
        ) : (
          txs.map((tx, i) => (
            <TransacaoRow
              key={`${tx.data}-${tx.descricao}-${i}`}
              data={tx.data}
              descricao={tx.descricao}
              categoria={tx.categoria}
              valor={tx.valor}
              isLast={i === txs.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default CreditCardExpanded;
