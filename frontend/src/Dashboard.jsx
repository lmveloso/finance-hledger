import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, AlertCircle, ChevronRight, ArrowLeft, PiggyBank, Loader2, ChevronLeft, CalendarDays, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend } from 'recharts';
import { useApi, fetchCategoryDetail } from './api.js';
import { CONFIG } from './config.js';
import { usePullToRefresh } from './hooks/usePullToRefresh.js';

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n) => `${Math.round(n)}%`;
const color = (i) => CONFIG.categoryColors[i % CONFIG.categoryColors.length];

// ── Month context ──────────────────────────────────────────────────────
function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonthBR(ym) {
  const [y, m] = ym.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  // Capitalize first letter
  const str = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function addMonth(ym, delta) {
  let [y, m] = ym.split('-').map(Number);
  m += delta;
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

function lastYearMonth(ym) {
  const [y, m] = ym.split('-');
  return `${parseInt(y) - 1}-${m}`;
}

const MonthContext = createContext();

function MonthProvider({ children, refreshKey }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [compareMode, setCompareMode] = useState(false);

  const goPrev = useCallback(() => setSelectedMonth(m => addMonth(m, -1)), []);
  const goNext = useCallback(() => setSelectedMonth(m => addMonth(m, 1)), []);
  const goToday = useCallback(() => setSelectedMonth(getCurrentMonth()), []);

  const isCurrentMonth = selectedMonth === getCurrentMonth();

  return (
    <MonthContext.Provider value={{
      selectedMonth, setSelectedMonth,
      compareMode, setCompareMode,
      goPrev, goNext, goToday, isCurrentMonth,
      refreshKey,
    }}>
      {children}
    </MonthContext.Provider>
  );
}

function useMonth() {
  return useContext(MonthContext);
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
        <span className="serif" style={{ fontSize: 18, fontWeight: 600, minWidth: 160, textAlign: 'center', color: '#e8e2d5' }}>
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
        fontSize: 12, color: '#8a8275', marginLeft: 8,
      }}>
        <input
          type="checkbox"
          checked={compareMode}
          onChange={(e) => setCompareMode(e.target.checked)}
          style={{ accentColor: '#d4a574' }}
        />
        vs ano anterior
      </label>
    </div>
  );
}

const navBtnStyle = {
  background: '#252220',
  border: '1px solid #3a3632',
  borderRadius: 3,
  color: '#d4a574',
  cursor: 'pointer',
  padding: '4px 6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.12s',
};

// ── Delta badge ────────────────────────────────────────────────────────
function DeltaBadge({ current, previous }) {
  if (previous == null || previous === 0) return null;
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const isUp = delta >= 0;
  const color = isUp ? '#8b9d7a' : '#c97b5c';
  return (
    <span className="sans" style={{
      fontSize: 11, color, marginLeft: 6, whiteSpace: 'nowrap',
    }}>
      {isUp ? '+' : ''}{Math.round(delta)}%
    </span>
  );
}

// ── UI atoms ────────────────────────────────────────────────────────────
const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
    <Loader2 size={24} style={{ color: '#d4a574', animation: 'spin 1s linear infinite' }} />
  </div>
);

const ErrorBox = ({ msg }) => (
  <div className="card" style={{ borderLeft: '3px solid #c97b5c' }}>
    <div className="sans" style={{ color: '#c97b5c', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center' }}>
      <AlertCircle size={16} /> Erro ao carregar: {msg}
    </div>
    <div className="sans" style={{ color: '#8a8275', fontSize: 12, marginTop: 8 }}>
      Verifique se o backend está rodando e se LEDGER_FILE aponta pro journal correto.
    </div>
  </div>
);

function KPI({ label, valor, icon, cor, destaque, loading, delta }) {
  return (
    <div className="card" style={{ borderLeft: destaque ? `3px solid ${cor}` : '1px solid #3a3632' }}>
      <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#8a8275', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: cor }}>{icon}</span> {label}
      </div>
      <div className="serif" style={{ fontSize: destaque ? 38 : 30, fontWeight: 600, color: destaque ? cor : '#e8e2d5', letterSpacing: '-0.02em', lineHeight: 1, display: 'flex', alignItems: 'baseline', flexWrap: 'wrap' }}>
        {loading ? '···' : BRL(valor)}
        {delta}
      </div>
    </div>
  );
}

// ── Resumo ──────────────────────────────────────────────────────────────
function Resumo() {
  const { selectedMonth, compareMode, refreshKey } = useMonth();

  const { data: summary, error: e1, loading: l1 } = useApi(`/api/summary?month=${selectedMonth}`, [selectedMonth, refreshKey]);
  const { data: cats, error: e2, loading: l2 } = useApi(`/api/categories?month=${selectedMonth}&depth=2`, [selectedMonth, refreshKey]);
  const { data: top, error: e3, loading: l3 } = useApi(`/api/top-expenses?month=${selectedMonth}&limit=5`, [selectedMonth, refreshKey]);
  const { data: goal, loading: l4 } = useApi(
    `/api/savings-goal?monthly_target=${CONFIG.savingsGoal.monthly}&annual_target=${CONFIG.savingsGoal.annual}`, [refreshKey]
  );

  // Comparison data (same month last year)
  const compMonth = lastYearMonth(selectedMonth);
  const { data: compSummary } = useApi(
    `/api/summary?month=${compMonth}`, [compMonth, refreshKey]
  );

  const [detalhe, setDetalhe] = useState(null);
  const [loadingDet, setLoadingDet] = useState(false);

  const err = e1 || e2 || e3;
  if (err) return <ErrorBox msg={err} />;

  const categorias = (cats?.categorias || []).map((c, i) => ({ ...c, cor: color(i) }));

  const openCat = async (cat) => {
    setLoadingDet(true);
    try {
      const r = await fetchCategoryDetail(cat.nome, selectedMonth);
      setDetalhe({ ...cat, subcats: r.subcategorias || [] });
    } catch (e) {
      setDetalhe({ ...cat, subcats: [], error: e.message });
    } finally { setLoadingDet(false); }
  };

  return (
    <div className="grid">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <KPI
          label="Receitas"
          valor={summary?.receitas}
          icon={<ArrowUpRight size={15} />}
          cor="#8b9d7a"
          loading={l1}
          delta={compareMode && compSummary ? <DeltaBadge current={summary?.receitas} previous={compSummary?.receitas} /> : null}
        />
        <KPI
          label="Despesas"
          valor={summary?.despesas}
          icon={<ArrowDownRight size={15} />}
          cor="#c97b5c"
          loading={l1}
          delta={compareMode && compSummary ? <DeltaBadge current={summary?.despesas} previous={compSummary?.despesas} /> : null}
        />
        <KPI
          label="Saldo do mês"
          valor={summary?.saldo}
          icon={<Wallet size={15} />}
          cor="#d4a574"
          destaque
          loading={l1}
          delta={compareMode && compSummary ? <DeltaBadge current={summary?.saldo} previous={compSummary?.saldo} /> : null}
        />
      </div>

      {/* Meta de economia */}
      {goal && !l4 && (() => {
        const pm = (goal.monthly.actual / goal.monthly.target) * 100;
        const pa = (goal.annual.actual / goal.annual.target) * 100;
        const ok = pm >= 100;
        return (
          <div className="card" style={{ borderLeft: `3px solid ${ok ? '#8b9d7a' : '#d4a574'}` }}>
            <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#8a8275', textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PiggyBank size={14} style={{ color: ok ? '#8b9d7a' : '#d4a574' }} /> Meta de economia
            </div>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              <div>
                <div className="sans" style={{ fontSize: 11, color: '#8a8275', marginBottom: 4 }}>Este mês</div>
                <div className="serif" style={{ fontSize: 28, color: ok ? '#8b9d7a' : '#e8e2d5', fontWeight: 600 }}>{BRL(goal.monthly.actual)}</div>
                <div className="sans" style={{ fontSize: 12, color: ok ? '#8b9d7a' : '#c97b5c', marginTop: 2 }}>
                  {ok ? '✓' : '↓'} meta {BRL(goal.monthly.target)} ({pct(pm)})
                </div>
              </div>
              <div>
                <div className="sans" style={{ fontSize: 11, color: '#8a8275', marginBottom: 4 }}>Acumulado {new Date().getFullYear()}</div>
                <div className="serif" style={{ fontSize: 28, color: '#e8e2d5', fontWeight: 600 }}>{BRL(goal.annual.actual)}</div>
                <div className="sans" style={{ fontSize: 12, color: '#8a8275', marginTop: 2 }}>meta anual {BRL(goal.annual.target)} ({pct(pa)})</div>
                <div style={{ height: 4, background: '#3a3632', marginTop: 8, width: 180 }}>
                  <div style={{ height: '100%', width: `${Math.min(Math.max(pa, 0), 100)}%`, background: '#d4a574' }} />
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="grid g3">
        <div className="card">
          {detalhe ? (
            <>
              <button onClick={() => setDetalhe(null)} className="sans" style={{ background: 'none', border: 'none', color: '#d4a574', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 20 }}>
                <ArrowLeft size={14} /> Voltar
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <span style={{ width: 14, height: 14, background: detalhe.cor, display: 'inline-block' }} />
                <span className="serif" style={{ fontSize: 26, fontWeight: 600 }}>{detalhe.nome}</span>
                <span className="serif" style={{ fontSize: 26, color: '#8a8275' }}>{BRL(detalhe.valor)}</span>
              </div>
              {detalhe.subcats.length === 0 ? (
                <div className="sans" style={{ fontSize: 13, color: '#8a8275' }}>Sem subcategorias registradas neste mês.</div>
              ) : detalhe.subcats.map((s, i) => {
                const p = (s.valor / detalhe.valor) * 100;
                return (
                  <div key={i} style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span className="sans" style={{ fontSize: 14, color: '#c4bcab' }}>{s.nome}</span>
                      <span className="sans" style={{ fontSize: 14 }}>{BRLc(s.valor)} <span style={{ color: '#8a8275', fontSize: 12 }}>({pct(p)})</span></span>
                    </div>
                    <div style={{ height: 4, background: '#3a3632' }}>
                      <div style={{ height: '100%', width: `${p}%`, background: detalhe.cor, opacity: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </>
          ) : l2 || loadingDet ? <Spinner /> : (
            <>
              <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#8a8275', textTransform: 'uppercase', marginBottom: 16 }}>
                Despesas por categoria
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={categorias} dataKey="valor" nameKey="nome" cx="40%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={2} style={{ cursor: 'pointer', outline: 'none' }}
                    onClick={(_, idx) => openCat(categorias[idx])}>
                    {categorias.map((c, i) => <Cell key={i} fill={c.cor} stroke="#252220" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#1a1815', border: '1px solid #3a3632', borderRadius: 2, fontFamily: 'Inter', fontSize: 12 }} formatter={(v) => BRLc(v)} />
                </PieChart>
              </ResponsiveContainer>
              {categorias.map(c => (
                <div key={c.nome} className="crow" onClick={() => openCat(c)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, background: c.cor, flexShrink: 0 }} />
                    <span className="sans" style={{ fontSize: 14, color: '#c4bcab' }}>{c.nome}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="serif" style={{ fontSize: 15 }}>{BRL(c.valor)}</span>
                    <ChevronRight size={14} style={{ color: '#6a6258' }} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card">
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#8a8275', textTransform: 'uppercase', marginBottom: 16 }}>Maiores gastos</div>
          {l3 ? <Spinner /> : (top?.transacoes || []).map((g, i, arr) => (
            <div key={i} style={{ padding: '14px 0', borderBottom: i < arr.length - 1 ? '1px solid #3a3632' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <span className="serif" style={{ fontSize: 15 }}>{g.descricao}</span>
                <span className="serif" style={{ fontSize: 16, color: '#d4a574', whiteSpace: 'nowrap' }}>{BRL(g.valor)}</span>
              </div>
              <div className="sans" style={{ fontSize: 11, color: '#8a8275', marginTop: 2 }}>{g.categoria} · {g.data}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Fluxo ───────────────────────────────────────────────────────────────
function Fluxo() {
  const { refreshKey } = useMonth();
  const { data, error, loading } = useApi('/api/cashflow?months=12', [refreshKey]);
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
        <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#8a8275', textTransform: 'uppercase' }}>Fluxo 12 meses</div>
        <span className="sans" style={{ fontSize: 11, color: '#d4a574', background: '#2a2724', border: '1px solid #3a3632', borderRadius: 3, padding: '3px 8px', letterSpacing: '0.05em' }}>
          meta: {BRL(metaMensal)}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
        <span className="sans" style={{ fontSize: 12, color: '#8a8275', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: '#8b9d7a', display: 'inline-block' }} /> Receitas
        </span>
        <span className="sans" style={{ fontSize: 12, color: '#8a8275', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: '#c97b5c', display: 'inline-block' }} /> Despesas
        </span>
        <span className="sans" style={{ fontSize: 12, color: '#8a8275', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 18, height: 2, background: '#d4a574', display: 'inline-block' }} /> Economia
        </span>
        <span className="sans" style={{ fontSize: 12, color: '#8a8275', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 18, height: 0, borderTop: '2px dashed #6b8ca3', display: 'inline-block' }} /> Meta
        </span>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={meses} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3632" />
          <XAxis dataKey="label" tick={{ fill: '#8a8275', fontSize: 12, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#3a3632' }} tickLine={false} />
          <YAxis tick={{ fill: '#8a8275', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => BRL(v)} width={72} />
          <Tooltip
            contentStyle={{ background: '#1a1815', border: '1px solid #3a3632', borderRadius: 2, fontFamily: 'Inter', fontSize: 12 }}
            formatter={(value, name) => [BRL(value), name]}
          />
          <ReferenceLine y={metaMensal} stroke="#6b8ca3" strokeDasharray="6 4" strokeWidth={1.5} label={{ value: `Meta ${BRL(metaMensal)}`, position: 'insideTopRight', fill: '#6b8ca3', fontSize: 11, fontFamily: 'Inter' }} />
          <Bar dataKey="receitas" fill="#8b9d7a" radius={[2, 2, 0, 0]} name="Receitas" />
          <Bar dataKey="despesas" fill="#c97b5c" radius={[2, 2, 0, 0]} name="Despesas" />
          <Line type="monotone" dataKey="economia" stroke="#d4a574" strokeWidth={2} dot={{ r: 3, fill: '#d4a574', stroke: '#d4a574' }} activeDot={{ r: 5 }} name="Economia" />
          <Legend content={() => null} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Orçamento ───────────────────────────────────────────────────────────
function BudgetBar({ nome, orcado, realizado, percentual, isTotal }) {
  const fillPct = orcado > 0 ? Math.min((realizado / orcado) * 100, 100) : 0;
  const overBudget = percentual > 100;
  const barColor = overBudget ? '#c97b5c' : '#8b9d7a';
  const barBg = '#3a3632';

  return (
    <div style={{ marginBottom: isTotal ? 0 : 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
        <span className="sans" style={{
          fontSize: isTotal ? 14 : 13,
          color: isTotal ? '#e8e2d5' : '#c4bcab',
          fontWeight: isTotal ? 600 : 400,
        }}>
          {nome}
        </span>
        <span className="sans" style={{ fontSize: 13, color: '#8a8275', whiteSpace: 'nowrap', marginLeft: 12 }}>
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
      <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#8a8275', textTransform: 'uppercase', marginBottom: 20 }}>Orçamento vs realizado</div>

      {total && (
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid #3a3632' }}>
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
        <div className="sans" style={{ color: '#8a8275', fontSize: 13 }}>
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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  // Date range mode
  const [rangeMode, setRangeMode] = useState('month'); // 'month' | 'range'
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const limit = 50;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [selectedMonth, category, sortBy, sortOrder, rangeMode]);

  // Build API URL
  let path;
  if (rangeMode === 'range' && rangeStart && rangeEnd) {
    path = `/api/transactions?start=${rangeStart}&end=${rangeEnd}&limit=${limit}&offset=${page * limit}&sort=${sortBy}&order=${sortOrder}`;
  } else {
    path = `/api/transactions?month=${selectedMonth}&limit=${limit}&offset=${page * limit}&sort=${sortBy}&order=${sortOrder}`;
  }
  if (category) path += `&category=${encodeURIComponent(category)}`;
  if (debouncedSearch) path += `&search=${encodeURIComponent(debouncedSearch)}`;

  const { data, error, loading } = useApi(path, [path, refreshKey]);

  // Fetch categories for the filter dropdown
  const { data: catsData } = useApi(`/api/categories?month=${selectedMonth}&depth=2`, [selectedMonth, refreshKey]);
  const categories = (catsData?.categorias || []).map(c => c.nome);

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

  const thStyle = {
    textAlign: 'left', padding: '10px 8px', fontSize: 11, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: '#8a8275', borderBottom: '1px solid #3a3632',
    cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '12px 8px', fontSize: 13, borderBottom: '1px solid #3a3632', color: '#c4bcab',
  };
  const inputStyle = {
    background: '#1a1815', border: '1px solid #3a3632', borderRadius: 3, color: '#e8e2d5',
    padding: '8px 12px', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
    width: '100%',
  };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span style={{ color: '#4a4642', marginLeft: 4 }}>&#8693;</span>;
    return <span style={{ color: '#d4a574', marginLeft: 4 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="card">
      <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#8a8275', textTransform: 'uppercase', marginBottom: 20 }}>
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
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="sans"
            onClick={() => setRangeMode(rangeMode === 'month' ? 'range' : 'month')}
            style={{
              ...navBtnStyle, fontSize: 11, padding: '6px 10px',
              background: rangeMode === 'range' ? '#2a2724' : '#252220',
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
          <div className="sans" style={{ color: '#8a8275', fontSize: 13, display: 'flex', alignItems: 'center' }}>até</div>
          <div style={{ flex: '0 1 150px' }}>
            <input type="date" value={rangeEnd} onChange={e => { setRangeEnd(e.target.value); setPage(0); }} style={inputStyle} />
          </div>
        </div>
      )}

      {error && <ErrorBox msg={error} />}

      {loading ? <Spinner /> : txs.length === 0 ? (
        <div className="sans" style={{ color: '#8a8275', fontSize: 13, padding: '20px 0' }}>
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
                    onMouseEnter={e => e.currentTarget.style.background = '#2a2724'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: '#8a8275', fontSize: 12 }}>{tx.data}</td>
                    <td style={tdStyle}>{tx.descricao}</td>
                    <td style={{ ...tdStyle, color: '#8a8275', fontSize: 12 }}>{tx.categoria}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600 }}>
                      {BRLc(tx.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTop: '1px solid #3a3632' }}>
            <span className="sans" style={{ fontSize: 12, color: '#8a8275' }}>
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
      background: 'linear-gradient(to bottom, #252220 0%, transparent 100%)',
      color: pullState === 'ready' ? '#d4a574' : '#8a8275',
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
export default function Dashboard() {
  const [aba, setAba] = useState('resumo');
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
      <PullIndicator pullState={pullState} pullDistance={pullDistance} />
      <DashboardInner aba={aba} setAba={setAba} />
    </MonthProvider>
  );
}

function DashboardInner({ aba, setAba }) {
  const { selectedMonth } = useMonth();
  return (
    <div style={{ minHeight: '100vh', background: '#1a1815', color: '#e8e2d5', fontFamily: 'Georgia, serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500;600&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; margin: 0; }
        .serif { font-family: 'Fraunces', Georgia, serif; }
        .sans { font-family: 'Inter', system-ui, sans-serif; }
        .card { background: #252220; border: 1px solid #3a3632; border-radius: 4px; padding: 24px; }
        .tab { padding: 10px 16px; cursor: pointer; border: none; background: transparent; color: #8a8275; font-family: 'Inter', sans-serif; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 2px solid transparent; transition: all 0.15s; }
        .tab:hover { color: #c4bcab; }
        .tab.active { color: #d4a574; border-bottom-color: #d4a574; }
        .grid { display: grid; gap: 20px; }
        .crow { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; border-bottom: 1px solid #3a3632; cursor: pointer; transition: background 0.12s; }
        .crow:hover { background: #2a2724; margin: 0 -24px; padding: 14px 24px; }
        .crow:last-child { border-bottom: none; }
        @media (min-width: 900px) { .g3 { grid-template-columns: 2fr 1fr; } }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px' }}>
        <header style={{ marginBottom: 36, borderBottom: '1px solid #3a3632', paddingBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div className="sans" style={{ fontSize: 11, letterSpacing: '0.2em', color: '#8a8275', textTransform: 'uppercase', marginBottom: 8 }}>
                {formatMonthBR(selectedMonth)} · Visão familiar
              </div>
              <h1 className="serif" style={{ fontSize: 'clamp(34px, 6vw, 58px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>
                Finanças <em style={{ fontWeight: 400, color: '#d4a574' }}>Pessoais</em>
              </h1>
            </div>
            <MonthPicker />
          </div>
        </header>

        <nav style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid #3a3632', overflowX: 'auto' }}>
          {['resumo', 'fluxo', 'orçamento', 'transações'].map(t => (
            <button key={t} className={`tab ${aba === t ? 'active' : ''}`} onClick={() => setAba(t)}>{t}</button>
          ))}
        </nav>

        {aba === 'resumo' && <Resumo />}
        {aba === 'fluxo' && <Fluxo />}
        {aba === 'orçamento' && <Orcamento />}
        {aba === 'transações' && <Transacoes />}

        <footer className="sans" style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid #3a3632', fontSize: 11, color: '#6a6258', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          hledger · via Tailscale
        </footer>
      </div>
    </div>
  );
}
