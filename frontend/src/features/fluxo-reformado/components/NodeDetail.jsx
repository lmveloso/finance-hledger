import React from 'react';
import { color } from '../../../theme/tokens';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

// Inline expansion shown below the grafo when a node is selected.
// No modal — the card lives in the document flow (tokens + inline styles).
//
// Props:
//   conta: selected account row from /api/flow
//   transferencias: full list of transfer edges; filtered here by conta.conta
//   onClose: () => void
function NodeDetail({ conta, transferencias, onClose }) {
  const outs = transferencias.filter((t) => t.from === conta.conta);
  const ins = transferencias.filter((t) => t.to === conta.conta);

  return (
    <div
      className="card"
      style={{ borderLeft: `3px solid ${color.accent.warm}`, padding: 18 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <div
          className="sans"
          style={{
            fontSize: 11,
            letterSpacing: '0.15em',
            color: color.accent.warm,
            textTransform: 'uppercase',
          }}
        >
          {conta.nome}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="sans"
          style={{
            background: 'transparent',
            border: `1px solid ${color.border.default}`,
            color: color.text.muted,
            fontSize: 11,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            padding: '4px 10px',
            borderRadius: 3,
            cursor: 'pointer',
          }}
        >
          Fechar
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        }}
      >
        <Block title="Entradas externas" value={conta.entradas_externas} cor={color.feedback.positive} />
        <Block title="Saídas externas" value={conta.saidas_externas} cor={color.feedback.negative} />
        <Block
          title="Transferências recebidas"
          value={conta.transfers_in}
          cor={color.feedback.info}
          list={ins.map((t) => ({ label: t.from_nome, value: t.valor }))}
        />
        <Block
          title="Transferências enviadas"
          value={conta.transfers_out}
          cor={color.feedback.info}
          list={outs.map((t) => ({ label: t.to_nome, value: t.valor }))}
        />
      </div>
    </div>
  );
}

function Block({ title, value, cor, list }) {
  return (
    <div>
      <div
        className="sans"
        style={{
          fontSize: 10,
          letterSpacing: '0.1em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div
        className="serif"
        style={{ fontSize: 18, fontWeight: 600, color: cor, marginBottom: 6 }}
      >
        {BRL(value)}
      </div>
      {list && list.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {list.map((it, i) => (
            <li
              key={i}
              className="sans"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: color.text.secondary,
                padding: '4px 0',
                borderBottom: `1px solid ${color.border.subtle}`,
              }}
            >
              <span>{it.label}</span>
              <span style={{ color: color.text.primary }}>{BRL(it.value)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NodeDetail;
