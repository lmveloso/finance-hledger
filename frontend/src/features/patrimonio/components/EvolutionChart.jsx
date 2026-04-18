import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { color } from '../../../theme/tokens';
import { t } from '../../../i18n';

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', {
  style: 'currency', currency: 'BRL', maximumFractionDigits: 0,
});

// Same short-month convention used across features (ano, plano, previsao).
const MONTH_LABELS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function monthLabel(ym) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTH_LABELS[idx] || ym} ${String(y).slice(-2)}`;
}

// EvolutionChart — monthly net worth evolution (PR-D7).
// Three lines: assets (positive feedback), liabilities (negative feedback),
// net (info color, thicker stroke). Respects the period selector from the
// SettingsPanel via `months` prop (already sliced by the parent).
//
// Props:
//   months: [{ mes: 'YYYY-MM', assets, liabilities, net }]
function EvolutionChart({ months = [] }) {
  const data = months.map(m => ({ ...m, label: monthLabel(m.mes) }));

  if (data.length === 0) {
    return (
      <div className="sans" style={{ color: color.text.muted, fontSize: 13, padding: '8px 0' }}>
        {t('patrimonio.evolution.empty')}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
        <Legend dot={color.feedback.positive} label={t('patrimonio.assets')} />
        <Legend dot={color.feedback.negative} label={t('patrimonio.liabilities')} />
        <Legend dot={color.feedback.info} label={t('patrimonio.net')} thick />
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={color.border.default} />
          <XAxis
            dataKey="label"
            tick={{ fill: color.text.muted, fontSize: 12, fontFamily: 'Inter, sans-serif' }}
            axisLine={{ stroke: color.border.default }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: color.text.muted, fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => BRL(v)}
            width={80}
          />
          <Tooltip
            contentStyle={{
              background: color.bg.page,
              border: `1px solid ${color.border.default}`,
              borderRadius: 2,
              fontFamily: 'Inter',
              fontSize: 12,
            }}
            formatter={(value, name) => [BRL(value), name]}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.mes || label}
          />
          <Line
            type="monotone"
            dataKey="assets"
            name={t('patrimonio.assets')}
            stroke={color.feedback.positive}
            strokeWidth={2}
            dot={{ r: 3, fill: color.feedback.positive }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="liabilities"
            name={t('patrimonio.liabilities')}
            stroke={color.feedback.negative}
            strokeWidth={2}
            dot={{ r: 3, fill: color.feedback.negative }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="net"
            name={t('patrimonio.net')}
            stroke={color.feedback.info}
            strokeWidth={3}
            dot={{ r: 4, fill: color.feedback.info }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function Legend({ dot, label, thick = false }) {
  return (
    <span
      className="sans"
      style={{ fontSize: 12, color: color.text.muted, display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <span
        style={{
          width: 18, height: thick ? 3 : 2, background: dot, display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}

export default EvolutionChart;
