import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, AlertCircle, ChevronRight, ArrowLeft, PiggyBank, ChevronLeft, CalendarDays, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useApi, fetchCategoryDetail } from './api.js';
import { CONFIG } from './config.js';
import { usePullToRefresh } from './hooks/usePullToRefresh.js';
import { color } from './theme/tokens';
import Spinner from './components/Spinner.jsx';
import ErrorBox from './components/ErrorBox.jsx';
import KPI from './components/KPI.jsx';
import DeltaBadge from './components/DeltaBadge.jsx';
import TipoChip from './components/TipoChip.jsx';
import { MonthProvider, useMonth } from './contexts/MonthContext.jsx';
import { NavProvider, useNav } from './contexts/NavContext.jsx';
import Resumo from './features/resumo';
import Fluxo from './features/fluxo';

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n) => `${Math.round(n)}%`;

// ── Month helpers ──────────────────────────────────────────────────────
// `MonthProvider` / `useMonth` / month-navigation helpers live in
// contexts/MonthContext.jsx since PR-F3. `formatMonthBR` stays here because
// it is used by the header label (MonthPicker) and will migrate with the
// MonthPicker component in a later PR.

function formatMonthBR(ym) {
  const [y, m] = ym.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  // Capitalize first letter
  const str = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── MonthPicker ────────────────────────────────────────────────────────
function MonthPicker() {
  const { selectedMonth, compareMode, setCompareMode, goPrev, goNext, goToday, isCurrentMonth } = useMonth();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={goPrev}
          className="sans"
          style={navBtnStyle}
          title="Mês anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="serif" style={{ fontSize: 18, fontWeight: 600, minWidth: 160, textAlign: 'center', color: color.text.primary }}>
          {formatMonthBR(selectedMonth)}
        </span>
        <button
          onClick={goNext}
          className="sans"
          style={navBtnStyle}
          title="Próximo mês"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      {!isCurrentMonth && (
        <button
          onClick={goToday}
          className="sans"
          style={{
            ...navBtnStyle,
            fontSize: 11,
            padding: '4px 10px',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
          title="Voltar ao mês atual"
        >
          <CalendarDays size={12} style={{ marginRight: 4 }} /> Hoje
        </button>
      )}
      <label className="sans" style={{
        display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
        fontSize: 12, color: color.text.muted, marginLeft: 8,
      }}>
        <input
          type="checkbox"
          checked={compareMode}
          onChange={(e) => setCompareMode(e.target.checked)}
          style={{ accentColor: color.accent.warm }}
        />
        vs ano anterior
      </label>
    </div>
  );
}

const navBtnStyle = {
  background: color.bg.card,
  border: `1px solid ${color.border.default}`,
  borderRadius: 3,
  color: color.accent.warm,
  cursor: 'pointer',
  padding: '4px 6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.12s',
};

// ── Orçamento ───────────────────────────────────────────────────────────
function BudgetBar({ nome, orcado, realizado, percentual, isTotal }) {
  const fillPct = orcado > 0 ? Math.min((realizado / orcado) * 100, 100) : 0;
  const overBudget = percentual > 100;
  const barColor = overBudget ? color.feedback.negative : color.feedback.positive;
  const barBg = color.border.default;

  return (
    <div style={{ marginBottom: isTotal ? 0 : 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span className="sans" style={{
          fontSize: isTotal ? 14 : 13,
          color: isTotal ? color.text.primary : color.text.secondary,
          fontWeight: isTotal ? 600 : 400,
        }}>
          {nome}
        </span>
        <span className="sans" style={{ fontSize: 13, color: color.text.muted, whiteSpace: 'nowrap', marginLeft: 12 }}>
          {BRLc(realizado)} / {BRLc(orcado)}{' '}
          <span style={{ color: barColor, fontWeight: 600 }}>({pct(percentual)})</span>
        </span>
      </div>
      <div style={{
        height: isTotal ? 10 : 6,
        background: barBg,
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          width: `${fillPct}%`,
          background: barColor,
          borderRadius: 3,
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

function Orcamento() {
  const { selectedMonth, refreshKey } = useMonth();
  const { data, error, loading } = useApi(`/api/budget?month=${selectedMonth}`, [selectedMonth, refreshKey]);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const categorias = (data?.categorias || [])
    .filter(c => c.orcado > 0)
    .sort((a, b) => b.percentual - a.percentual);
  const total = data?.total;

  return (
    <div className="card">
      <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 20 }}>Orçamento vs realizado</div>

      {total && (
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${color.border.default}` }}>
          <BudgetBar
            nome="Total"
            orcado={total.orcado}
            realizado={total.realizado}
            percentual={total.percentual}
            isTotal
          />
        </div>
      )}

      {categorias.length === 0 ? (
        <div className="sans" style={{ color: color.text.muted, fontSize: 13 }}>
          Nenhuma categoria com orçamento definido. Adicione transações periódicas (~ monthly) no seu .journal.
        </div>
      ) : categorias.map((c, i) => (
        <BudgetBar
          key={c.conta || i}
          nome={c.nome}
          orcado={c.orcado}
          realizado={c.realizado}
          percentual={c.percentual}
        />
      ))}
    </div>
  );
}

// ── Transações ──────────────────────────────────────────────────────────
function Transacoes() {
  const { selectedMonth, refreshKey } = useMonth();
  const { navCategory, setNavCategory } = useNav();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  // Date range mode
  const [rangeMode, setRangeMode] = useState('month'); // 'month' | 'range'
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const limit = 50;

  // Apply navCategory from context when navigating from Resumo
  useEffect(() => {
    if (navCategory) {
      setCategory(navCategory);
      setNavCategory(null); // consume it
    }
  }, [navCategory, setNavCategory]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [selectedMonth, category, sortBy, sortOrder, rangeMode, selectedTags]);

  // Build API URL
  let path;
  if (rangeMode === 'range' && rangeStart && rangeEnd) {
    path = `/api/transactions?start=${rangeStart}&end=${rangeEnd}&limit=${limit}&offset=${page * limit}&sort=${sortBy}&order=${sortOrder}`;
  } else {
    path = `/api/transactions?month=${selectedMonth}&limit=${limit}&offset=${page * limit}&sort=${sortBy}&order=${sortOrder}`;
  }
  if (category) path += `&category=${encodeURIComponent(category)}`;
  if (debouncedSearch) path += `&search=${encodeURIComponent(debouncedSearch)}`;
  selectedTags.forEach(t => { path += `&tag=${encodeURIComponent(t)}`; });

  const { data, error, loading } = useApi(path, [path, refreshKey]);

  // Fetch categories for the filter dropdown
  const { data: catsData } = useApi(`/api/categories?month=${selectedMonth}&depth=2`, [selectedMonth, refreshKey]);
  const categories = catsData?.categorias || [];

  // Fetch tags
  const { data: tagsData } = useApi('/api/tags', [refreshKey]);
  const allTags = tagsData?.tags || [];

  const txs = data?.transactions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const startIdx = page * limit + 1;
  const endIdx = Math.min((page + 1) * limit, total);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const toggleTag = (tagName) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const thStyle = {
    textAlign: 'left', padding: '10px 8px', fontSize: 11, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: color.text.muted, borderBottom: `1px solid ${color.border.default}`,
    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '12px 8px', fontSize: 13, borderBottom: `1px solid ${color.border.default}`, color: color.text.secondary,
  };
  const inputStyle = {
    background: color.bg.page, border: `1px solid ${color.border.default}`, borderRadius: 3, color: color.text.primary,
    padding: '8px 12px', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
    width: '100%',
  };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span style={{ color: color.text.faint, marginLeft: 4 }}>&#8693;</span>;
    return <span style={{ color: color.accent.warm, marginLeft: 4 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="card">
      <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 20 }}>
        Transações
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 220px' }}>
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ flex: '0 1 180px' }}>
          <select value={category} onChange={e => { setCategory(e.target.value); setPage(0); }} style={selectStyle}>
            <option value="">Todas categorias</option>
            {categories.map(c => <option key={c.segmento_raw} value={c.segmento_raw}>{c.nome}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="sans"
            onClick={() => setRangeMode(rangeMode === 'month' ? 'range' : 'month')}
            style={{
              ...navBtnStyle, fontSize: 11, padding: '6px 10px',
              background: rangeMode === 'range' ? color.bg.hover : color.bg.card,
            }}
            title={rangeMode === 'month' ? 'Alternar para range de datas' : 'Voltar para mês único'}
          >
            {rangeMode === 'month' ? 'Mês' : 'Range'}
          </button>
        </div>
      </div>

      {/* Date range inputs */}
      {rangeMode === 'range' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: '0 1 150px' }}>
            <input type="date" value={rangeStart} onChange={e => { setRangeStart(e.target.value); setPage(0); }} style={inputStyle} />
          </div>
          <div className="sans" style={{ color: color.text.muted, fontSize: 13, display: 'flex', alignItems: 'center' }}>até</div>
          <div style={{ flex: '0 1 150px' }}>
            <input type="date" value={rangeEnd} onChange={e => { setRangeEnd(e.target.value); setPage(0); }} style={inputStyle} />
          </div>
        </div>
      )}

      {/* Tags filter */}
      {allTags.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div className="sans" style={{ fontSize: 11, color: color.text.muted, marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Tags
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {allTags.map(t => {
              const isActive = selectedTags.includes(t.tag);
              return (
                <button
                  key={t.tag}
                  onClick={() => toggleTag(t.tag)}
                  className="sans"
                  style={{
                    background: isActive ? color.border.default : color.bg.card,
                    border: `1px solid ${isActive ? color.accent.warm : color.border.default}`,
                    borderRadius: 12,
                    color: isActive ? color.accent.warm : color.text.secondary,
                    padding: '4px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                    transition: 'all 0.12s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {t.tag}
                  <span style={{
                    background: isActive ? color.accent.warm : color.border.default,
                    color: isActive ? color.bg.page : color.text.muted,
                    borderRadius: 8,
                    padding: '0 6px',
                    fontSize: 10,
                    fontWeight: 600,
                  }}>
                    {t.count}
                  </span>
                </button>
              );
            })}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="sans"
                style={{
                  background: 'none',
                  border: 'none',
                  color: color.feedback.negative,
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      )}

      {error && <ErrorBox msg={error} />}

      {loading ? <Spinner /> : txs.length === 0 ? (
        <div className="sans" style={{ color: color.text.muted, fontSize: 13, padding: '20px 0' }}>
          Nenhuma transação encontrada para os filtros selecionados.
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle} onClick={() => toggleSort('date')}>
                    Data <SortIcon field="date" />
                  </th>
                  <th style={thStyle}>Descrição</th>
                  <th style={thStyle}>Categoria</th>
                  <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('amount')}>
                    <SortIcon field="amount" /> Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {txs.map((tx, i) => (
                  <tr key={i} style={{ transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = color.bg.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: color.text.muted, fontSize: 12 }}>{tx.data}</td>
                    <td style={tdStyle}>{tx.descricao}</td>
                    <td style={{ ...tdStyle, color: color.text.muted, fontSize: 12 }}>{tx.categoria}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, color: tx.valor > 0 ? color.feedback.positive : tx.valor < 0 ? color.feedback.negative : 'inherit' }}>
                      {BRLc(tx.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: `1px solid ${color.border.default}` }}>
            <span className="sans" style={{ fontSize: 12, color: color.text.muted }}>
              {total > 0 ? `${startIdx}–${endIdx} de ${total}` : '0 resultados'}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="sans"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                style={{ ...navBtnStyle, opacity: page === 0 ? 0.3 : 1 }}
              >
                <ChevronLeft size={14} /> Anterior
              </button>
              <button
                className="sans"
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                style={{ ...navBtnStyle, opacity: page >= totalPages - 1 ? 0.3 : 1 }}
              >
                Próxima <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Previsão ───────────────────────────────────────────────────────────
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

// ── Contas (Individual Account View) ──────────────────────────────────
function Contas() {
  const { refreshKey } = useMonth();
  const { data, error, loading } = useApi('/api/accounts', [refreshKey]);
  const { data: nwHist } = useApi('/api/networth?months=2', [refreshKey]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [showStatement, setShowStatement] = useState(false);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const contas = data?.contas || [];
  const ativos = contas.filter(c => c.tipo === 'ativo');
  const passivos = contas.filter(c => c.tipo === 'passivo');

  // If an account is selected, show detail view
  if (selectedAccount) {
    return (
      <AccountDetail
        account={selectedAccount}
        onBack={() => { setSelectedAccount(null); setShowStatement(false); setRangeStart(''); setRangeEnd(''); }}
        rangeStart={rangeStart}
        setRangeStart={setRangeStart}
        rangeEnd={rangeEnd}
        setRangeEnd={setRangeEnd}
        showStatement={showStatement}
        setShowStatement={setShowStatement}
        refreshKey={refreshKey}
      />
    );
  }

  const AccountCard = ({ conta }) => {
    const isNeg = conta.saldo < 0;
    const saldoColor = conta.tipo === 'passivo' ? (isNeg ? color.feedback.negative : color.feedback.positive) : (isNeg ? color.feedback.negative : color.feedback.positive);
    return (
      <div
        className="crow"
        onClick={() => setSelectedAccount(conta)}
        style={{ cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: conta.tipo === 'ativo' ? color.feedback.positive : color.feedback.negative,
            flexShrink: 0,
          }} />
          <div>
            <div className="sans" style={{ fontSize: 14, color: color.text.secondary }}>{conta.nome}</div>
            <div className="sans" style={{ fontSize: 11, color: color.text.disabled, marginTop: 2 }}>{conta.caminho}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="serif" style={{ fontSize: 16, fontWeight: 600, color: saldoColor }}>
            {BRLc(conta.saldo)}
          </span>
          <ChevronRight size={14} style={{ color: color.text.disabled }} />
        </div>
      </div>
    );
  };

  const totalAtivos = ativos.reduce((s, c) => s + c.saldo, 0);
  const totalPassivos = passivos.reduce((s, c) => s + c.saldo, 0);
  // hledger devolve saldos de passivo com sinal do razão (negativo = você deve),
  // então somar já equivale a ativos − dívida.
  const patrimonioLiquido = totalAtivos + totalPassivos;
  const passivosOwed = Math.abs(totalPassivos);

  // Delta vs mês anterior: /api/networth?months=2 devolve [mês-1, mês-atual].
  const nwMonths = nwHist?.months || [];
  const plPrev = nwMonths.length >= 2 ? nwMonths[0] : null;
  const plCurr = nwMonths.length >= 1 ? nwMonths[nwMonths.length - 1] : null;
  const plDelta = plPrev && plCurr ? (plCurr.net - plPrev.net) : null;
  const plDeltaPct = plDelta != null && plPrev && plPrev.net !== 0 ? (plDelta / Math.abs(plPrev.net)) * 100 : null;
  const plDeltaCor = plDelta == null ? color.text.muted : plDelta >= 0 ? color.feedback.positive : color.feedback.negative;

  return (
    <div className="grid">
      {/* Summary cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <KPI
          label="Total Ativos"
          valor={totalAtivos}
          icon={<ArrowUpRight size={15} />}
          cor={color.feedback.positive}
        />
        <KPI
          label="Total Passivos"
          valor={passivosOwed}
          icon={<ArrowDownRight size={15} />}
          cor={color.feedback.negative}
        />
        {/* Patrimônio Líquido — card custom pra mostrar Δ vs mês anterior e o breakdown A − P */}
        <div className="card" style={{ borderLeft: `3px solid ${color.accent.warm}` }}>
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: color.accent.warm }}><Wallet size={15} /></span> Patrimônio Líquido
          </div>
          <div className="serif" style={{ fontSize: 38, fontWeight: 600, color: color.accent.warm, letterSpacing: '-0.02em', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            {BRL(patrimonioLiquido)}
            {plDelta != null && (
              <span className="sans" style={{ fontSize: 13, color: plDeltaCor, fontWeight: 500, whiteSpace: 'nowrap' }}>
                {plDelta >= 0 ? '+' : '−'}{BRL(Math.abs(plDelta))}
                {plDeltaPct != null && <span style={{ color: plDeltaCor, opacity: 0.75, marginLeft: 4 }}>({plDelta >= 0 ? '+' : ''}{plDeltaPct.toFixed(1)}%)</span>}
              </span>
            )}
          </div>
          <div className="sans" style={{ fontSize: 11, color: color.text.disabled, marginTop: 8, letterSpacing: '0.02em' }}>
            {BRL(totalAtivos)} <span style={{ color: color.text.faintAlt }}>(ativos)</span> − {BRL(passivosOwed)} <span style={{ color: color.text.faintAlt }}>(passivos)</span>
            {plPrev && <> · <span style={{ color: color.text.muted }}>Δ vs {plPrev.mes.slice(5)}/{plPrev.mes.slice(2, 4)}</span></>}
          </div>
        </div>
      </div>

      <div className="grid g3">
        {/* Assets */}
        <div className="card">
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 16 }}>
            Ativos
          </div>
          {ativos.length === 0 ? (
            <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>Nenhuma conta de ativo encontrada.</div>
          ) : ativos.map(c => <AccountCard key={c.caminho} conta={c} />)}
        </div>

        {/* Liabilities */}
        <div className="card">
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 16 }}>
            Passivos
          </div>
          {passivos.length === 0 ? (
            <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>Nenhuma conta de passivo encontrada.</div>
          ) : passivos.map(c => <AccountCard key={c.caminho} conta={c} />)}
        </div>
      </div>
    </div>
  );
}

function AccountDetail({ account, onBack, rangeStart, setRangeStart, rangeEnd, setRangeEnd, showStatement, setShowStatement, refreshKey }) {
  // Recent transactions (last 20)
  const { data: txData, loading: txLoading, error: txError } = useApi(
    `/api/transactions?account=${encodeURIComponent(account.caminho)}&limit=20&order=desc`,
    [account.caminho, refreshKey]
  );

  // Statement transactions (date range)
  const statementPath = showStatement && rangeStart && rangeEnd
    ? `/api/transactions?account=${encodeURIComponent(account.caminho)}&start=${rangeStart}&end=${rangeEnd}&limit=500&order=asc`
    : null;
  const { data: stmtData, loading: stmtLoading, error: stmtError } = useApi(
    statementPath || '_skip',
    [statementPath, refreshKey]
  );

  const saldoColor = account.saldo < 0 ? color.feedback.negative : color.feedback.positive;

  const thStyle = {
    textAlign: 'left', padding: '10px 8px', fontSize: 11, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: color.text.muted, borderBottom: `1px solid ${color.border.default}`,
  };
  const tdStyle = {
    padding: '12px 8px', fontSize: 13, borderBottom: `1px solid ${color.border.default}`, color: color.text.secondary,
  };
  const inputStyle = {
    background: color.bg.page, border: `1px solid ${color.border.default}`, borderRadius: 3, color: color.text.primary,
    padding: '8px 12px', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
  };

  // Compute running balance for statement
  const stmtTxs = stmtData?.transactions || [];
  let runningBalance = 0;
  // For liabilities, amounts in register are usually positive for charges
  // We compute running balance from 0 based on the amounts shown
  const stmtWithBalance = stmtTxs.map(tx => {
    // Determine if this is a debit or credit based on the account type
    // For assets: positive amount = money in, negative = money out
    // For liabilities: it's inverted
    runningBalance += tx.valor;
    return { ...tx, runningBalance: round2(runningBalance) };
  });
  function round2(n) { return Math.round(n * 100) / 100; }

  return (
    <div className="card">
      {/* Header */}
      <button onClick={onBack} className="sans" style={{
        background: 'none', border: 'none', color: color.accent.warm, cursor: 'pointer',
        fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 20,
      }}>
        <ArrowLeft size={14} /> Voltar para contas
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: account.tipo === 'ativo' ? color.feedback.positive : color.feedback.negative,
        }} />
        <span className="serif" style={{ fontSize: 26, fontWeight: 600 }}>{account.nome}</span>
        <span className="serif" style={{ fontSize: 26, color: saldoColor, fontWeight: 600 }}>{BRLc(account.saldo)}</span>
        <span className="sans" style={{ fontSize: 11, color: color.text.disabled, marginLeft: 8 }}>{account.caminho}</span>
      </div>

      {/* Date range picker for statement */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="sans" style={{ fontSize: 11, color: color.text.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Extrato:
        </div>
        <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} style={inputStyle} />
        <span className="sans" style={{ color: color.text.muted, fontSize: 13 }}>até</span>
        <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} style={inputStyle} />
        <button
          className="sans"
          onClick={() => setShowStatement(true)}
          disabled={!rangeStart || !rangeEnd}
          style={{
            ...navBtnStyle,
            fontSize: 12,
            padding: '8px 14px',
            opacity: (!rangeStart || !rangeEnd) ? 0.4 : 1,
          }}
        >
          Buscar
        </button>
        {showStatement && (
          <button
            className="sans"
            onClick={() => { setShowStatement(false); setRangeStart(''); setRangeEnd(''); }}
            style={{
              background: 'none', border: 'none', color: color.accent.secondary, cursor: 'pointer',
              fontSize: 12, padding: '8px 8px',
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Statement view */}
      {showStatement ? (
        <>
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 16 }}>
            Extrato · {rangeStart} a {rangeEnd}
          </div>
          {stmtLoading ? <Spinner /> : stmtError ? <ErrorBox msg={stmtError} /> : stmtTxs.length === 0 ? (
            <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>Nenhuma transação no período selecionado.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Descrição</th>
                    <th style={thStyle}>Categoria</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Tipo</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {stmtWithBalance.map((tx, i) => {
                    const isOpening = tx.tipo_movimento === 'saldo_inicial';
                    return (
                      <tr key={i}
                        onMouseEnter={e => e.currentTarget.style.background = color.bg.hover}
                        onMouseLeave={e => e.currentTarget.style.background = isOpening ? color.bg.opening : 'transparent'}
                        style={isOpening ? { background: color.bg.opening, fontStyle: 'italic' } : {}}
                      >
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: color.text.muted, fontSize: 12 }}>{tx.data}</td>
                        <td style={tdStyle}>{tx.descricao}</td>
                        <td style={{ ...tdStyle, color: color.text.muted, fontSize: 12 }}>{tx.categoria}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}><TipoChip tipo={tx.tipo_movimento} /></td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, color: tx.valor > 0 ? color.feedback.positive : tx.valor < 0 ? color.feedback.negative : 'inherit' }}>
                          {BRLc(tx.valor)}
                        </td>
                        <td style={{
                          ...tdStyle, textAlign: 'right', fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600,
                          color: tx.runningBalance < 0 ? color.feedback.negative : color.feedback.positive,
                        }}>
                          {BRLc(tx.runningBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="sans" style={{ fontSize: 12, color: color.text.muted, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color.border.default}` }}>
                {stmtTxs.length} transações · Saldo final: <span className="serif" style={{ fontWeight: 600, color: stmtWithBalance[stmtWithBalance.length - 1]?.runningBalance < 0 ? color.feedback.negative : color.feedback.positive }}>
                  {BRLc(stmtWithBalance[stmtWithBalance.length - 1]?.runningBalance || 0)}
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Recent transactions */
        <>
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 16 }}>
            Últimas transações
          </div>
          {txLoading ? <Spinner /> : txError ? <ErrorBox msg={txError} /> : (txData?.transactions || []).length === 0 ? (
            <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>Nenhuma transação encontrada para esta conta.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Descrição</th>
                    <th style={thStyle}>Categoria</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Tipo</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {(txData?.transactions || []).map((tx, i) => {
                    const isOpening = tx.tipo_movimento === 'saldo_inicial';
                    return (
                      <tr key={i}
                        onMouseEnter={e => e.currentTarget.style.background = color.bg.hover}
                        onMouseLeave={e => e.currentTarget.style.background = isOpening ? color.bg.opening : 'transparent'}
                        style={isOpening ? { background: color.bg.opening, fontStyle: 'italic' } : {}}
                      >
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: color.text.muted, fontSize: 12 }}>{tx.data}</td>
                        <td style={tdStyle}>{tx.descricao}</td>
                        <td style={{ ...tdStyle, color: color.text.muted, fontSize: 12 }}>{tx.categoria}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}><TipoChip tipo={tx.tipo_movimento} /></td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, color: tx.valor > 0 ? color.feedback.positive : tx.valor < 0 ? color.feedback.negative : 'inherit' }}>
                          {BRLc(tx.valor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Pull-to-refresh indicator ──────────────────────────────────────────
function PullIndicator({ pullState, pullDistance }) {
  if (pullState === 'idle') return null;

  const labels = {
    pulling: 'Puxe para atualizar...',
    ready: 'Solte para atualizar...',
    refreshing: 'Atualizando...',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: '10px 0',
      background: `linear-gradient(to bottom, ${color.bg.card} 0%, transparent 100%)`,
      color: pullState === 'ready' ? color.accent.warm : color.text.muted,
      fontSize: 13,
      fontFamily: 'Inter, system-ui, sans-serif',
      transform: `translateY(${pullState === 'refreshing' ? 0 : pullDistance - 40}px)`,
      opacity: pullState === 'refreshing' ? 1 : Math.min(pullDistance / 60, 1),
      transition: pullState === 'refreshing' ? 'transform 0.2s ease' : 'none',
      pointerEvents: 'none',
    }}>
      <RefreshCw
        size={16}
        style={{
          animation: pullState === 'refreshing' ? 'spin 1s linear infinite' : 'none',
          transform: pullState === 'ready' ? 'rotate(180deg)' : `rotate(${pullDistance * 2}deg)`,
          transition: pullState === 'ready' ? 'transform 0.15s ease' : 'none',
        }}
      />
      {labels[pullState]}
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────
// `NavProvider` / `useNav` moved to contexts/NavContext.jsx in PR-F3.
export default function Dashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  const doRefresh = useCallback(() => {
    return new Promise(resolve => {
      // Small delay so the API has time to re-fetch and the indicator is visible
      setRefreshKey(k => k + 1);
      setTimeout(resolve, 600);
    });
  }, []);

  const { pullDistance, pullState } = usePullToRefresh(doRefresh, 80);

  return (
    <MonthProvider refreshKey={refreshKey}>
      <NavProvider>
        <PullIndicator pullState={pullState} pullDistance={pullDistance} />
        <DashboardInner />
      </NavProvider>
    </MonthProvider>
  );
}

function DashboardInner() {
  const { selectedMonth } = useMonth();
  const { activeTab, setActiveTab, tabs } = useNav();
  return (
    <div style={{ minHeight: '100vh', background: color.bg.page, color: color.text.primary, fontFamily: 'Georgia, serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; }
        .serif { font-family: 'Fraunces', Georgia, serif; }
        .sans { font-family: 'Inter', system-ui, sans-serif; }
        .card { background: ${color.bg.card}; border: 1px solid ${color.border.default}; border-radius: 4px; padding: 24px; }
        .tab { padding: 10px 16px; cursor: pointer; border: none; background: transparent; color: ${color.text.muted}; font-family: 'Inter', sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 2px solid transparent; transition: all 0.15s; }
        .tab:hover { color: ${color.text.secondary}; }
        .tab.active { color: ${color.accent.warm}; border-bottom-color: ${color.accent.warm}; }
        .grid { display: grid; gap: 20px; }
        .crow { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid ${color.border.default}; cursor: pointer; transition: background 0.12s; }
        .crow:hover { background: ${color.bg.hover}; margin: 0 -24px; padding: 14px 24px; }
        .crow:last-child { border-bottom: none; }
        @media (min-width: 900px) { .g3 { grid-template-columns: 2fr 1fr; } }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        <header style={{ marginBottom: 36, borderBottom: `1px solid ${color.border.default}`, paddingBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="sans" style={{ fontSize: 11, letterSpacing: '0.2em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 8 }}>
                {formatMonthBR(selectedMonth)} · Visão familiar
              </div>
              <h1 className="serif" style={{ fontSize: 'clamp(34px, 6vw, 58px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>
                Finanças <em style={{ fontWeight: 400, color: color.accent.warm }}>Pessoais</em>
              </h1>
            </div>
            <MonthPicker />
          </div>
        </header>

        <nav style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: `1px solid ${color.border.default}`, overflowX: 'auto' }}>
          {tabs.map(t => (
            <button key={t} className={`tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
          ))}
        </nav>

        {activeTab === 'resumo' && <Resumo />}
        {activeTab === 'fluxo' && <Fluxo />}
        {activeTab === 'orçamento' && <Orcamento />}
        {activeTab === 'previsão' && <Previsao />}
        {activeTab === 'contas' && <Contas />}
        {activeTab === 'transações' && <Transacoes />}

        <footer className="sans" style={{ marginTop: 48, paddingTop: 20, borderTop: `1px solid ${color.border.default}`, fontSize: 11, color: color.text.disabled, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          hledger · via Tailscale
        </footer>
      </div>
    </div>
  );
}
