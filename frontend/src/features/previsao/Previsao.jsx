import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useApi } from '../../api.js';
import { color } from '../../theme/tokens';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import { useMonth } from '../../contexts/MonthContext.jsx';

// Local formatters — duplicated from Dashboard.jsx so this feature stays
// self-contained. A shared formatters module will likely land with the
// i18n/currency decoupling noted in docs §6.2.
const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Month label helpers — only used by Previsao for the forecast chart x-axis
// and the seasonality heatmap column headers.
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabel(ym) {
  const m = parseInt(ym.split('-')[1], 10);
  return MONTH_LABELS[m - 1] || ym;
}

function Previsao() {
  const { refreshKey } = useMonth();
  const { data: forecastData, error: e1, loading: l1 } = useApi('/api/forecast?months=12', [refreshKey]);
  const { data: seasonData, error: e2, loading: l2 } = useApi('/api/seasonality?months=12', [refreshKey]);

  if (l1 || l2) return <Spinner />;
  if (e1) return <ErrorBox msg={e1} />;
  if (e2) return <ErrorBox msg={e2} />;

  const months = forecastData?.months || [];

  // Compute projected balance for next 6 months
  const projectedMonths = months.filter(m => m.forecast).slice(0, 6);
  const projectedSaldo = projectedMonths.reduce((sum, m) => sum + (m.saldo ?? 0), 0);

  const chartData = months.map(m => ({
    ...m,
    label: monthLabel(m.mes),
  }));

  // Seasonality heatmap data
  const categorias = seasonData?.categorias || [];
  const seasonMeses = seasonData?.meses || [];

  // Compute max per row for opacity
  const rowMax = {};
  categorias.forEach(cat => {
    rowMax[cat] = 0;
    seasonMeses.forEach(m => {
      const v = m.categorias?.[cat] ?? 0;
      if (v > rowMax[cat]) rowMax[cat] = v;
    });
  });

  return (
    <div className="grid">
      {/* Forecast chart */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase' }}>
            Previsão de fluxo · 12 meses
          </div>
          <span className="sans" style={{ fontSize: 12, color: color.accent.warm, background: color.bg.hover, border: `1px solid ${color.border.default}`, borderRadius: 3, padding: '3px 8px' }}>
            Saldo projetado 6 meses: {BRL(projectedSaldo)}
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
            <span style={{ width: 18, height: 2, background: color.feedback.info, display: 'inline-block' }} /> Saldo
          </span>
          <span className="sans" style={{ fontSize: 12, color: color.text.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 18, height: 0, borderTop: `2px dashed ${color.border.default}`, display: 'inline-block', opacity: 0.5 }} /> Previsão
          </span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={color.border.default} />
            <XAxis dataKey="label" tick={{ fill: color.text.muted, fontSize: 12, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: color.border.default }} tickLine={false} />
            <YAxis tick={{ fill: color.text.muted, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => BRL(v)} width={72} />
            <Tooltip
              contentStyle={{ background: color.bg.page, border: `1px solid ${color.border.default}`, borderRadius: 2, fontFamily: 'Inter', fontSize: 12 }}
              formatter={(value, name) => [BRL(value), name]}
              labelFormatter={(label, payload) => {
                const item = payload?.[0]?.payload;
                return item?.mes || label;
              }}
            />
            <Line type="monotone" dataKey="receitas" stroke={color.feedback.positive} strokeWidth={2} dot={{ r: 3, fill: color.feedback.positive }} activeDot={{ r: 5 }} name="Receitas" strokeDasharray="" />
            <Line type="monotone" dataKey="despesas" stroke={color.feedback.negative} strokeWidth={2} dot={{ r: 3, fill: color.feedback.negative }} activeDot={{ r: 5 }} name="Despesas" />
            <Line type="monotone" dataKey="saldo" stroke={color.feedback.info} strokeWidth={2} dot={{ r: 3, fill: color.feedback.info }} activeDot={{ r: 5 }} name="Saldo" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Seasonality heatmap */}
      {categorias.length > 0 && seasonMeses.length > 0 && (
        <div className="card">
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 16 }}>
            Sazonalidade · Despesas por categoria
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '8px 10px', color: color.text.muted, borderBottom: `1px solid ${color.border.default}`, fontWeight: 500, whiteSpace: 'nowrap' }}>Categoria</th>
                  {seasonMeses.map(m => (
                    <th key={m.mes} style={{ textAlign: 'right', padding: '8px 8px', color: color.text.muted, borderBottom: `1px solid ${color.border.default}`, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {monthLabel(m.mes)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categorias.map(cat => (
                  <tr key={cat}>
                    <td style={{ padding: '6px 10px', borderBottom: `1px solid ${color.border.subtle}`, color: color.text.secondary, whiteSpace: 'nowrap' }} className="sans">
                      {cat}
                    </td>
                    {seasonMeses.map(m => {
                      const val = m.categorias?.[cat] ?? 0;
                      const max = rowMax[cat] || 1;
                      const opacity = Math.min(val / max, 1);
                      return (
                        <td
                          key={m.mes}
                          title={`${cat} · ${monthLabel(m.mes)}: ${BRLc(val)}`}
                          style={{
                            textAlign: 'right',
                            padding: '6px 8px',
                            borderBottom: `1px solid ${color.border.subtle}`,
                            fontFamily: "'Fraunces', Georgia, serif",
                            fontSize: 12,
                            color: color.text.primary,
                            // Heat-map fill: data-driven alpha over color.accent.warm (#d4a574 = rgb(212,165,116))
                            background: val > 0 ? `rgba(212, 165, 116, ${opacity * 0.4})` : 'transparent',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {val > 0 ? BRL(val) : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default Previsao;
