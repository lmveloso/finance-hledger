import React from 'react';
import { Layer, Rectangle } from 'recharts';
import { color } from '../../theme/tokens';

// Custom Recharts Sankey node renderer used by FluxoDetail.
// Endpoint nodes ("Entradas" / "Saídas") render their label on the outside;
// liability accounts (passivo) fade slightly so assets read as the primary
// flow through the graph.
export function SankeyNode({ x, y, width, height, payload }) {
  const isEndpoint = payload.name === 'Entradas' || payload.name === 'Saídas';
  const fill = payload.name === 'Entradas' ? color.feedback.positive
             : payload.name === 'Saídas'  ? color.feedback.negative
             : payload.isLiability         ? color.text.disabled
                                           : color.accent.warm;
  const fillOpacity = payload.isLiability ? 0.55 : 0.9;
  const textColor = payload.isLiability ? color.text.muted : color.text.secondary;
  return (
    <Layer>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity={fillOpacity} />
      <text
        x={x + (isEndpoint ? -6 : width + 6)}
        y={y + height / 2}
        textAnchor={isEndpoint ? 'end' : 'start'}
        alignmentBaseline="middle"
        fill={textColor}
        fontSize={12}
        fontFamily="Inter, sans-serif"
      >
        {payload.name}
      </text>
    </Layer>
  );
}

// Build the { nodes, links } structure that <Sankey> expects from the
// /api/flow response. Returns null when there is nothing to draw.
export function buildSankey(data) {
  // Recharts <Sankey> requires a DAG. Opposing transfers (A→B and B→A in the
  // same month — e.g. a top-up corrected by a sweep) form a 2-cycle and crash
  // the layout with a stack overflow, so we collapse them to the net direction.
  const nodes = [{ name: 'Entradas' }, { name: 'Saídas' }];
  const idx = { 'Entradas': 0, 'Saídas': 1 };
  (data.contas || []).forEach(c => {
    idx[c.conta] = nodes.length;
    nodes.push({ name: c.nome, isAccount: true, isLiability: c.tipo === 'passivo' });
  });
  const links = [];
  (data.contas || []).forEach(c => {
    if (c.entradas_externas > 0) {
      links.push({ source: idx['Entradas'], target: idx[c.conta], value: c.entradas_externas });
    }
    if (c.saidas_externas > 0) {
      links.push({ source: idx[c.conta], target: idx['Saídas'], value: c.saidas_externas });
    }
  });

  const pair = new Map();
  (data.transferencias || []).forEach(t => {
    if (idx[t.from] == null || idx[t.to] == null || !(t.valor > 0)) return;
    const key = `${t.from}|${t.to}`;
    pair.set(key, (pair.get(key) || 0) + t.valor);
  });
  const consumed = new Set();
  for (const [key, val] of pair) {
    if (consumed.has(key)) continue;
    const [from, to] = key.split('|');
    const revKey = `${to}|${from}`;
    const rev = pair.get(revKey) || 0;
    consumed.add(key);
    consumed.add(revKey);
    const net = val - rev;
    if (net > 0) links.push({ source: idx[from], target: idx[to], value: net });
    else if (net < 0) links.push({ source: idx[to], target: idx[from], value: -net });
  }

  if (links.length === 0) return null;
  return { nodes, links };
}
