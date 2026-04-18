import React, { useState } from 'react';
import {
  Line,
  Bar,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import { useApi } from '../../api.js';
import { CONFIG } from '../../config.js';
import { color } from '../../theme/tokens';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import { useMonth } from '../../contexts/MonthContext.jsx';
import FluxoDetail from './FluxoDetail.jsx';

// Local formatters — duplicated from Dashboard.jsx so this feature stays
// self-contained. A shared formatters module will likely land with the
// i18n/currency decoupling noted in docs §6.2.
const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function Fluxo() {
  const { refreshKey } = useMonth();
  const { data, error, loading } = useApi('/api/cashflow?months=12', [refreshKey]);
  const [detailMonth, setDetailMonth] = useState(null);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const metaMensal = CONFIG.savingsGoal.monthly;

  const meses = (data?.months || []).map(m => ({
    ...m,
    economia: (m.receitas ?? 0) - (m.despesas ?? 0),
    label: m.mes.slice(2), // "26-01"
    meta: metaMensal,
  }));

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase' }}>Fluxo 12 meses</div>
        <span className="sans" style={{ fontSize: 11, color: color.accent.warm, background: color.bg.hover, border: `1px solid ${color.border.default}`, borderRadius: 3, padding: '3px 8px', letterSpacing: '0.05em' }}>
          meta: {BRL(metaMensal)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
        <span className="sans" style={{ fontSize: 12, color: color.text.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: color.feedback.positive, display: 'inline-block' }} /> Receitas
        </span>
        <span className="sans" style={{ fontSize: 12, color: color.text.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: color.feedback.negative, display: 'inline-block' }} /> Despesas
        </span>
        <span className="sans" style={{ fontSize: 12, color: color.text.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 18, height: 2, background: color.accent.warm, display: 'inline-block' }} /> Economia
        </span>
        <span className="sans" style={{ fontSize: 12, color: color.text.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 18, height: 0, borderTop: `2px dashed ${color.feedback.info}`, display: 'inline-block' }} /> Meta
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={meses} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke={color.border.default} />
          <XAxis dataKey="label" tick={{ fill: color.text.muted, fontSize: 12, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: color.border.default }} tickLine={false} />
          <YAxis tick={{ fill: color.text.muted, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => BRL(v)} width={72} />
          <Tooltip
            contentStyle={{ background: color.bg.page, border: `1px solid ${color.border.default}`, borderRadius: 2, fontFamily: 'Inter', fontSize: 12 }}
            formatter={(value, name) => [BRL(value), name]}
          />
          <ReferenceLine y={metaMensal} stroke={color.feedback.info} strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `Meta ${BRL(metaMensal)}`, position: 'insideTopRight', fill: color.feedback.info, fontSize: 11, fontFamily: 'Inter' }} />
          <Bar dataKey="receitas" fill={color.feedback.positive} radius={[2, 2, 0, 0]} name="Receitas"
               style={{ cursor: 'pointer' }}
               onClick={(d) => d?.mes && setDetailMonth(d.mes)} />
          <Bar dataKey="despesas" fill={color.feedback.negative} radius={[2, 2, 0, 0]} name="Despesas"
               style={{ cursor: 'pointer' }}
               onClick={(d) => d?.mes && setDetailMonth(d.mes)} />
          <Line type="monotone" dataKey="economia" stroke={color.accent.warm} strokeWidth={2} dot={{ r: 3, fill: color.accent.warm, stroke: color.accent.warm }} activeDot={{ r: 5 }} name="Economia" />
          <Legend content={() => null} />
        </ComposedChart>
      </ResponsiveContainer>
      {detailMonth && (
        <FluxoDetail month={detailMonth} onClose={() => setDetailMonth(null)} />
      )}
    </div>
  );
}

export default Fluxo;
