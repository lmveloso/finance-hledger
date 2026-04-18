import React, { useState } from 'react';
import { color } from '../../../theme/tokens';
import ContaNode from '../components/ContaNode.jsx';
import NodeDetail from '../components/NodeDetail.jsx';

// GrafoView — two columns of account nodes. Assets left, liabilities right.
// Selecting a node toggles an inline detail strip below the grafo.
function GrafoView({ contas, transferencias }) {
  const [selected, setSelected] = useState(null);

  const ativos = contas.filter((c) => c.tipo === 'ativo');
  const passivos = contas.filter((c) => c.tipo === 'passivo');

  const toggle = (id) => setSelected((prev) => (prev === id ? null : id));
  const selectedConta = selected
    ? contas.find((c) => c.conta === selected)
    : null;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}
      >
        <Column
          title="Ativos"
          subtitle="Contas, poupanças e investimentos"
          contas={ativos}
          selected={selected}
          onSelect={toggle}
        />
        <Column
          title="Passivos"
          subtitle="Cartões e dívidas"
          contas={passivos}
          selected={selected}
          onSelect={toggle}
          empty="Sem dívidas no mês."
        />
      </div>

      {selectedConta && (
        <NodeDetail
          conta={selectedConta}
          transferencias={transferencias}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function Column({ title, subtitle, contas, selected, onSelect, empty }) {
  return (
    <div>
      <div
        className="sans"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        className="sans"
        style={{ fontSize: 11, color: color.text.faint, marginBottom: 10 }}
      >
        {subtitle}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        {contas.length === 0 ? (
          <div
            className="sans"
            style={{
              fontSize: 12,
              color: color.text.muted,
              border: `1px dashed ${color.border.default}`,
              borderRadius: 3,
              padding: 14,
            }}
          >
            {empty || 'Sem contas neste mês.'}
          </div>
        ) : (
          contas.map((c) => (
            <ContaNode
              key={c.conta}
              conta={c}
              selected={selected === c.conta}
              onClick={() => onSelect(c.conta)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default GrafoView;
