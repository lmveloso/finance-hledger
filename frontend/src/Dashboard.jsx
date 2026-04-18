import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, AlertCircle, ChevronRight, ArrowLeft, PiggyBank, ChevronLeft, CalendarDays, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, ComposedChart, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend, Sankey, Layer, Rectangle } from 'recharts';
import { useApi, fetchCategoryDetail } from './api.js';
import { CONFIG } from './config.js';
import { usePullToRefresh } from './hooks/usePullToRefresh.js';
import { color } from './theme/tokens';
import Spinner from './components/Spinner.jsx';
import ErrorBox from './components/ErrorBox.jsx';
import KPI from './components/KPI.jsx';
import DeltaBadge from './components/DeltaBadge.jsx';
import TipoChip from './components/TipoChip.jsx';

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n) => `${Math.round(n)}%`;
const categoryColor = (i) => CONFIG.categoryColors[i % CONFIG.categoryColors.length];

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

// ── Resumo ──────────────────────────────────────────────────────────────
function Resumo() {
  const { selectedMonth, compareMode, refreshKey } = useMonth();
  const { goToTransactions } = useNav();

  const { data: summary, error: e1, loading: l1 } = useApi(`/api/summary?month=${selectedMonth}`, [selectedMonth, refreshKey]);
  const { data: cats, error: e2, loading: l2 } = useApi(`/api/categories?month=${selectedMonth}&depth=2`, [selectedMonth, refreshKey]);
  const { data: top, error: e3, loading: l3 } = useApi(`/api/top-expenses?month=${selectedMonth}&limit=5`, [selectedMonth, refreshKey]);
  const { data: goal, loading: l4 } = useApi(
    `/api/savings-goal?monthly_target=${CONFIG.savingsGoal.monthly}&annual_target=${CONFIG.savingsGoal.annual}`, [refreshKey]
  );
  const { data: flow } = useApi(`/api/flow?month=${selectedMonth}`, [selectedMonth, refreshKey]);

  const { data: alertasData } = useApi(`/api/alerts?month=${selectedMonth}`, [selectedMonth, refreshKey]);
  const alertas = alertasData?.alertas || [];

  // Comparison data (same month last year)
  const compMonth = lastYearMonth(selectedMonth);
  const { data: compSummary } = useApi(
    `/api/summary?month=${compMonth}`, [compMonth, refreshKey]
  );

  const [detalhe, setDetalhe] = useState(null);
  const [loadingDet, setLoadingDet] = useState(false);
  const [catTopExpenses, setCatTopExpenses] = useState(null);
  const [loadingCatTop, setLoadingCatTop] = useState(false);

  // Fetch top expenses filtered by drilled-down category
  useEffect(() => {
    if (!detalhe) { setCatTopExpenses(null); return; }
    let cancelled = false;
    setLoadingCatTop(true);
    const API = import.meta.env.VITE_API_URL || '';
    fetch(`${API}/api/top-expenses?month=${selectedMonth}&limit=20&category=${encodeURIComponent(detalhe.segmento_raw || detalhe.nome)}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { if (!cancelled) setCatTopExpenses(d); })
      .catch(() => { if (!cancelled) setCatTopExpenses(null); })
      .finally(() => { if (!cancelled) setLoadingCatTop(false); });
    return () => { cancelled = true; };
  }, [detalhe, selectedMonth, refreshKey]);

  const err = e1 || e2 || e3;
  if (err) return <ErrorBox msg={err} />;

  const categorias = (cats?.categorias || []).map((c, i) => ({ ...c, cor: categoryColor(i) }));

  const openCat = async (cat) => {
    setLoadingDet(true);
    try {
      const r = await fetchCategoryDetail(cat.segmento_raw || cat.nome, selectedMonth);
      setDetalhe({ ...cat, subcats: r.subcategorias || [] });
    } catch (e) {
      setDetalhe({ ...cat, subcats: [], error: e.message });
    } finally { setLoadingDet(false); }
  };

  return (
    <div className="grid">
      {alertas.length > 0 && (
        <div style={{ background: color.feedback.errorBg, border: `1px solid ${color.feedback.errorBorder}`, borderRadius: 4, padding: '16px 20px' }}>
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.1em', color: color.accent.secondary, textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} /> Alertas de gastos
          </div>
          {alertas.map((a, i) => (
            <div key={i} className="sans" style={{ fontSize: 13, color: color.text.primary, padding: '6px 0', borderTop: i > 0 ? `1px solid ${color.feedback.errorRule}` : 'none' }}>
              <strong>{a.categoria}</strong> está {Math.round(a.percentual_acima)}% acima da média (atual: {BRLc(a.atual)} vs média: {BRLc(a.media)})
            </div>
          ))}
        </div>
      )}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <KPI
          label="Receitas"
          valor={summary?.receitas}
          icon={<ArrowUpRight size={15} />}
          cor={color.feedback.positive}
          loading={l1}
          delta={compareMode && compSummary ? <DeltaBadge current={summary?.receitas} previous={compSummary?.receitas} /> : null}
        />
        <KPI
          label="Despesas"
          valor={summary?.despesas}
          icon={<ArrowDownRight size={15} />}
          cor={color.feedback.negative}
          loading={l1}
          delta={compareMode && compSummary ? <DeltaBadge current={summary?.despesas} previous={compSummary?.despesas} /> : null}
        />
        <KPI
          label="Saldo do mês"
          valor={summary?.saldo}
          icon={<Wallet size={15} />}
          cor={color.accent.warm}
          destaque
          loading={l1}
          delta={compareMode && compSummary ? <DeltaBadge current={summary?.saldo} previous={compSummary?.saldo} /> : null}
        />
      </div>

      {/* Reconciliação accrual × caixa: só aparece quando há movimento de cartão no mês */}
      {flow && (() => {
        const contasFlow = flow?.contas || [];
        const ativos = contasFlow.filter(c => c.tipo === 'ativo');
        const passivos = contasFlow.filter(c => c.tipo === 'passivo');
        const sumBy = (arr, k) => arr.reduce((s, c) => s + (c[k] || 0), 0);
        const economia = flow?.total_economia ?? 0;
        const caixaLiq = ativos.reduce((s, c) => s + ((c.saldo_final || 0) - (c.saldo_inicial || 0)), 0);
        const pagamentosFatura = sumBy(passivos, 'entradas_externas') + sumBy(passivos, 'transfers_in');
        const novosGastosCartao = sumBy(passivos, 'saidas_externas') + sumBy(passivos, 'transfers_out');
        const temCartao = passivos.length > 0 && (pagamentosFatura > 0 || novosGastosCartao > 0);
        if (!temCartao) return null;
        const steps = [
          { label: 'Economia contábil', value: economia, cor: color.accent.warm, bold: true },
          pagamentosFatura > 0 && { label: '− Pagto fatura antiga', value: pagamentosFatura, cor: color.feedback.negative },
          novosGastosCartao > 0 && { label: '+ Novos gastos cartão', value: novosGastosCartao, cor: color.feedback.positive },
          { label: 'Sobrou em caixa', value: caixaLiq, cor: caixaLiq >= 0 ? color.feedback.positive : color.feedback.negative, bold: true },
        ].filter(Boolean);
        return (
          <div className="card" style={{ borderLeft: `3px solid ${caixaLiq >= 0 ? color.feedback.positive : color.feedback.negative}` }}>
            <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Wallet size={14} style={{ color: color.accent.warm }} /> Economia contábil × Caixa real
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(150px, 1fr))`, gap: 16 }}>
              {steps.map((s, i) => (
                <div key={i}>
                  <div className="sans" style={{ fontSize: 10, color: color.text.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
                  <div className="serif" style={{ fontSize: s.bold ? 24 : 20, color: s.cor, fontWeight: 600, letterSpacing: '-0.01em' }}>{BRL(s.value)}</div>
                </div>
              ))}
            </div>
            <div className="sans" style={{ fontSize: 12, color: color.text.muted, marginTop: 14, lineHeight: 1.6 }}>
              {pagamentosFatura > 0 && <>Pagou <strong style={{ color: color.text.secondary }}>{BRL(pagamentosFatura)}</strong> de fatura de meses anteriores. </>}
              {novosGastosCartao > 0 && <>Novos <strong style={{ color: color.text.secondary }}>{BRL(novosGastosCartao)}</strong> em gastos no cartão vão sair da conta nos próximos meses. </>}
              {caixaLiq >= 0
                ? <>De fato, sobraram <strong style={{ color: color.feedback.positive }}>{BRL(caixaLiq)}</strong> em caixa.</>
                : <>Na prática, consumiu <strong style={{ color: color.feedback.negative }}>{BRL(Math.abs(caixaLiq))}</strong> da reserva.</>}
            </div>
          </div>
        );
      })()}

      {/* Meta de economia */}
      {goal && !l4 && (() => {
        const pm = (goal.monthly.actual / goal.monthly.target) * 100;
        const pa = (goal.annual.actual / goal.annual.target) * 100;
        const ok = pm >= 100;
        return (
          <div className="card" style={{ borderLeft: `3px solid ${ok ? color.feedback.positive : color.accent.warm}` }}>
            <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <PiggyBank size={14} style={{ color: ok ? color.feedback.positive : color.accent.warm }} /> Meta de economia
            </div>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              <div>
                <div className="sans" style={{ fontSize: 11, color: color.text.muted, marginBottom: 4 }}>Este mês</div>
                <div className="serif" style={{ fontSize: 28, color: ok ? color.feedback.positive : color.text.primary, fontWeight: 600 }}>{BRL(goal.monthly.actual)}</div>
                <div className="sans" style={{ fontSize: 12, color: ok ? color.feedback.positive : color.feedback.negative, marginTop: 2 }}>
                  {ok ? '✓' : '↓'} meta {BRL(goal.monthly.target)} ({pct(pm)})
                </div>
              </div>
              <div>
                <div className="sans" style={{ fontSize: 11, color: color.text.muted, marginBottom: 4 }}>Acumulado {new Date().getFullYear()}</div>
                <div className="serif" style={{ fontSize: 28, color: color.text.primary, fontWeight: 600 }}>{BRL(goal.annual.actual)}</div>
                <div className="sans" style={{ fontSize: 12, color: color.text.muted, marginTop: 2 }}>meta anual {BRL(goal.annual.target)} ({pct(pa)})</div>
                <div style={{ height: 4, background: color.border.default, marginTop: 8, width: 180 }}>
                  <div style={{ height: '100%', width: `${Math.min(Math.max(pa, 0), 100)}%`, background: color.accent.warm }} />
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
              <button onClick={() => setDetalhe(null)} className="sans" style={{ background: 'none', border: 'none', color: color.accent.warm, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 20 }}>
                <ArrowLeft size={14} /> Voltar
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <span style={{ width: 14, height: 14, background: detalhe.cor, display: 'inline-block' }} />
                <span className="serif" style={{ fontSize: 26, fontWeight: 600 }}>{detalhe.nome}</span>
                <span className="serif" style={{ fontSize: 26, color: color.text.muted }}>{BRL(detalhe.valor)}</span>
              </div>
              {detalhe.subcats.length === 0 ? (
                <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>Sem subcategorias registradas neste mês.</div>
              ) : detalhe.subcats.map((s, i) => {
                const p = (s.valor / detalhe.valor) * 100;
                return (
                  <div key={i} style={{ marginBottom: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span className="sans" style={{ fontSize: 14, color: color.text.secondary }}>{s.nome}</span>
                      <span className="sans" style={{ fontSize: 14 }}>{BRLc(s.valor)} <span style={{ color: color.text.muted, fontSize: 12 }}>({pct(p)})</span></span>
                    </div>
                    <div style={{ height: 4, background: color.border.default }}>
                      <div style={{ height: '100%', width: `${p}%`, background: detalhe.cor, opacity: 0.8 }} />
                    </div>
                  </div>
                );
              })}
            </>
          ) : l2 || loadingDet ? <Spinner /> : (
            <>
              <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 16 }}>
                Despesas por categoria
              </div>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={categorias} dataKey="valor" nameKey="nome" cx="40%" cy="50%" innerRadius={52} outerRadius={85} paddingAngle={2} style={{ cursor: 'pointer', outline: 'none' }}
                    onClick={(_, idx) => openCat(categorias[idx])}>
                    {categorias.map((c, i) => <Cell key={i} fill={c.cor} stroke={color.bg.card} strokeWidth={2} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: color.bg.page, border: `1px solid ${color.border.default}`, borderRadius: 2, fontFamily: 'Inter', fontSize: 12 }} formatter={(v) => BRLc(v)} />
                </PieChart>
              </ResponsiveContainer>
              {categorias.map(c => (
                <div key={c.nome} className="crow" onClick={() => openCat(c)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 10, height: 10, background: c.cor, flexShrink: 0 }} />
                    <span className="sans" style={{ fontSize: 14, color: color.text.secondary }}>{c.nome}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="serif" style={{ fontSize: 15 }}>{BRL(c.valor)}</span>
                    <ChevronRight size={14} style={{ color: color.text.disabled }} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card">
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 16 }}>
            {detalhe ? `Maiores gastos · ${detalhe.nome}` : 'Maiores gastos'}
          </div>
          {(() => {
            const isLoading = detalhe ? loadingCatTop : l3;
            const transactions = detalhe
              ? (catTopExpenses?.transacoes || [])
              : (top?.transacoes || []);
            const displayed = transactions.slice(0, 5);
            const hasMore = transactions.length > 5;
            if (isLoading) return <Spinner />;
            return (
              <>
                {displayed.map((g, i, arr) => (
                  <div key={i} style={{ padding: '14px 0', borderBottom: i < arr.length - 1 ? `1px solid ${color.border.default}` : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <span className="serif" style={{ fontSize: 15 }}>{g.descricao}</span>
                      <span className="serif" style={{ fontSize: 16, color: color.accent.warm, whiteSpace: 'nowrap' }}>{BRL(g.valor)}</span>
                    </div>
                    <div className="sans" style={{ fontSize: 11, color: color.text.muted, marginTop: 2 }}>{g.categoria} · {g.data}</div>
                  </div>
                ))}
                {hasMore && (
                  <button
                    onClick={() => goToTransactions(detalhe ? (detalhe.segmento_raw || detalhe.nome) : null)}
                    className="sans"
                    style={{
                      background: 'none',
                      border: `1px solid ${color.border.default}`,
                      borderRadius: 3,
                      color: color.accent.warm,
                      cursor: 'pointer',
                      fontSize: 12,
                      padding: '8px 12px',
                      width: '100%',
                      marginTop: 12,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = color.bg.hover}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    Ver todas ({transactions.length}) <ChevronRight size={14} />
                  </button>
                )}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ── Fluxo ───────────────────────────────────────────────────────────────
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

function SankeyNode({ x, y, width, height, payload }) {
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

function buildSankey(data) {
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

function FluxoDetail({ month, onClose }) {
  const { data, error, loading } = useApi(`/api/flow?month=${month}`, [month]);
  if (loading) return <div style={{ marginTop: 20 }}><Spinner /></div>;
  if (error) return <ErrorBox msg={error} />;
  const sankey = buildSankey(data || { contas: [], transferencias: [] });
  // Accrual × cash reconciliation: Economia contábil = Δ ativos + Δ passivos.
  // Breaking out passivo inflows/outflows as "fatura paga" / "novo gasto no cartão"
  // lets the user see why a headline "economia" doesn't match actual cash saved.
  const contas = data?.contas || [];
  const ativos = contas.filter(c => c.tipo === 'ativo');
  const passivos = contas.filter(c => c.tipo === 'passivo');
  const sumBy = (arr, k) => arr.reduce((s, c) => s + (c[k] || 0), 0);
  const economia = data?.total_economia ?? 0;
  const caixaLiq = ativos.reduce((s, c) => s + (c.saldo_final - c.saldo_inicial), 0);
  const pagamentosFatura = sumBy(passivos, 'entradas_externas') + sumBy(passivos, 'transfers_in');
  const novosGastosCartao = sumBy(passivos, 'saidas_externas') + sumBy(passivos, 'transfers_out');
  const deltaDividaReduzida = pagamentosFatura - novosGastosCartao;
  const temCartao = passivos.length > 0 && (pagamentosFatura > 0 || novosGastosCartao > 0);
  const thStyleFluxo = { textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.text.muted, borderBottom: `1px solid ${color.border.default}`, fontWeight: 500 };
  const tdStyleFluxo = { padding: '10px', fontSize: 13, borderBottom: `1px solid ${color.border.subtle}`, color: color.text.secondary };
  const kpis = [
    { label: 'Receitas', value: data?.total_entradas ?? 0, cor: color.feedback.positive },
    { label: 'Despesas', value: data?.total_saidas ?? 0, cor: color.feedback.negative },
    { label: 'Economia contábil', value: economia, cor: economia >= 0 ? color.accent.warm : color.feedback.negative, emphasis: true, hint: 'Rec − Desp' },
    { label: 'Fluxo caixa líquido', value: caixaLiq, cor: caixaLiq >= 0 ? color.feedback.positive : color.feedback.negative, hint: 'Δ ativos' },
  ];
  if (temCartao) {
    kpis.push({
      label: 'Δ Dívida',
      value: deltaDividaReduzida,
      cor: deltaDividaReduzida > 0 ? color.feedback.positive : deltaDividaReduzida < 0 ? color.feedback.negative : color.text.muted,
      hint: deltaDividaReduzida > 0 ? 'pagou' : deltaDividaReduzida < 0 ? 'cresceu' : '',
    });
  }
  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${color.border.default}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.accent.warm, textTransform: 'uppercase' }}>
          Detalhe · {formatMonthBR(month)}
        </div>
        <button onClick={onClose} className="sans" style={{ ...navBtnStyle, fontSize: 11 }}>Fechar</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ padding: '10px 12px', border: `1px solid ${color.border.subtle}`, borderRadius: 3, background: k.emphasis ? color.overlay.accentWarmSoft : 'transparent' }}>
            <div className="sans" style={{ fontSize: 10, letterSpacing: '0.1em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: k.cor, fontFamily: "'Fraunces', Georgia, serif" }}>
              {BRL(k.value)}
            </div>
            {k.hint && <div className="sans" style={{ fontSize: 10, color: color.text.disabled, marginTop: 2 }}>{k.hint}</div>}
          </div>
        ))}
      </div>
      {sankey ? (
        <ResponsiveContainer width="100%" height={Math.max(420, 64 * sankey.nodes.length)}>
          <Sankey
            data={sankey}
            nodeWidth={12}
            nodePadding={28}
            linkCurvature={0.5}
            iterations={64}
            margin={{ top: 16, right: 160, bottom: 16, left: 90 }}
            link={{ stroke: color.feedback.info, strokeOpacity: 0.2, fill: color.feedback.info, fillOpacity: 0.3 }}
            node={<SankeyNode />}
          >
            <Tooltip
              contentStyle={{ background: color.bg.page, border: `1px solid ${color.border.default}`, borderRadius: 2, fontFamily: 'Inter', fontSize: 12, color: color.text.primary }}
              formatter={(value) => BRL(value)}
            />
          </Sankey>
        </ResponsiveContainer>
      ) : (
        <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>Sem movimentação para exibir fluxograma.</div>
      )}
      <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', margin: '24px 0 12px' }}>
        Por conta
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyleFluxo}>Conta</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Saldo inicial</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Entradas</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Saídas</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Transf. +</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Transf. −</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Saldo final</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Δ Saldo</th>
            </tr>
          </thead>
          <tbody>
            {(data?.contas || []).map(c => {
              const delta = c.saldo_final - c.saldo_inicial;
              return (
                <tr key={c.conta}>
                  <td style={tdStyleFluxo}>{c.nome}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', fontFamily: 'Fraunces, Georgia, serif' }}>{BRLc(c.saldo_inicial)}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', color: c.entradas_externas > 0 ? color.feedback.positive : 'inherit', fontFamily: 'Fraunces, Georgia, serif' }}>{c.entradas_externas > 0 ? BRLc(c.entradas_externas) : '—'}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', color: c.saidas_externas > 0 ? color.feedback.negative : 'inherit', fontFamily: 'Fraunces, Georgia, serif' }}>{c.saidas_externas > 0 ? BRLc(c.saidas_externas) : '—'}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', color: c.transfers_in > 0 ? color.feedback.info : 'inherit', fontFamily: 'Fraunces, Georgia, serif' }}>{c.transfers_in > 0 ? BRLc(c.transfers_in) : '—'}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', color: c.transfers_out > 0 ? color.feedback.info : 'inherit', fontFamily: 'Fraunces, Georgia, serif' }}>{c.transfers_out > 0 ? BRLc(c.transfers_out) : '—'}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, color: delta > 0 ? color.feedback.positive : delta < 0 ? color.feedback.negative : color.text.secondary }}>{BRLc(c.saldo_final)}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, color: delta > 0 ? color.feedback.positive : delta < 0 ? color.feedback.negative : color.text.muted }}>{delta === 0 ? '—' : BRLc(delta)}</td>
                </tr>
              );
            })}
          </tbody>
          {(data?.contas || []).length > 0 && (() => {
            const contas = data.contas;
            const sum = (k) => contas.reduce((s, c) => s + (c[k] || 0), 0);
            const totInicial = sum('saldo_inicial');
            const totFinal = sum('saldo_final');
            const totDelta = totFinal - totInicial;
            const tfCell = { ...tdStyleFluxo, textAlign: 'right', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, borderTop: `1px solid ${color.border.default}`, borderBottom: 'none', color: color.text.primary };
            return (
              <tfoot>
                <tr>
                  <td style={{ ...tdStyleFluxo, borderTop: `1px solid ${color.border.default}`, borderBottom: 'none', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.text.muted, fontWeight: 500 }} className="sans">Total</td>
                  <td style={tfCell}>{BRLc(totInicial)}</td>
                  <td style={{ ...tfCell, color: color.feedback.positive }}>{BRLc(sum('entradas_externas'))}</td>
                  <td style={{ ...tfCell, color: color.feedback.negative }}>{BRLc(sum('saidas_externas'))}</td>
                  <td style={{ ...tfCell, color: color.feedback.info }}>{BRLc(sum('transfers_in'))}</td>
                  <td style={{ ...tfCell, color: color.feedback.info }}>{BRLc(sum('transfers_out'))}</td>
                  <td style={tfCell}>{BRLc(totFinal)}</td>
                  <td style={{ ...tfCell, color: totDelta > 0 ? color.feedback.positive : totDelta < 0 ? color.feedback.negative : color.text.primary }}>{BRLc(totDelta)}</td>
                </tr>
              </tfoot>
            );
          })()}
        </table>
      </div>

      {temCartao && (() => {
        const rows = [
          { label: 'Receitas', sign: '+', value: data?.total_entradas ?? 0, cor: color.feedback.positive },
          { label: 'Despesas do mês (inclui gastos no cartão)', sign: '−', value: data?.total_saidas ?? 0, cor: color.feedback.negative },
          { label: 'Economia contábil', sign: '=', value: economia, cor: color.accent.warm, divider: true, bold: true },
          { label: 'Pagamento de faturas antigas', sign: '−', value: pagamentosFatura, cor: color.feedback.negative, hide: pagamentosFatura === 0 },
          { label: 'Novos gastos no cartão (a pagar depois)', sign: '+', value: novosGastosCartao, cor: color.feedback.positive, hide: novosGastosCartao === 0 },
          { label: 'Mudou em caixa (ativos líquidos)', sign: '=', value: caixaLiq, cor: caixaLiq >= 0 ? color.feedback.positive : color.feedback.negative, divider: true, bold: true, strong: true },
        ].filter(r => !r.hide);
        return (
          <>
            <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', margin: '24px 0 12px' }}>
              Reconciliação · contábil × caixa
            </div>
            <div style={{ border: `1px solid ${color.border.subtle}`, borderRadius: 3, padding: '4px 16px', background: color.overlay.pageScrim }}>
              {rows.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '10px 0',
                  borderTop: r.divider ? `1px solid ${color.border.default}` : 'none',
                }}>
                  <span className="sans" style={{ fontSize: r.strong ? 13 : 12, color: r.strong ? color.text.primary : color.text.secondary }}>
                    {r.label}
                  </span>
                  <span style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: r.strong ? 16 : 14,
                    fontWeight: r.bold ? 600 : 400,
                    color: r.cor,
                  }}>
                    <span style={{ color: color.text.disabled, marginRight: 8 }}>{r.sign}</span>{BRLc(r.value)}
                  </span>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {(data?.transferencias || []).length > 0 && (
        <>
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', margin: '24px 0 12px' }}>
            Transferências entre contas
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyleFluxo}>De</th>
                  <th style={thStyleFluxo}>Para</th>
                  <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.transferencias.map((t, i) => (
                  <tr key={i}>
                    <td style={tdStyleFluxo}>{t.from_nome}</td>
                    <td style={tdStyleFluxo}>{t.to_nome}</td>
                    <td style={{ ...tdStyleFluxo, textAlign: 'right', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, color: color.feedback.info }}>{BRLc(t.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="sans" style={{ fontSize: 12, color: color.text.muted, marginTop: 16, lineHeight: 1.6 }}>
        {caixaLiq >= 0
          ? <>Sobrou <strong style={{ color: color.text.secondary }}>{BRL(caixaLiq)}</strong> em caixa neste mês.</>
          : <>Faltou <strong style={{ color: color.feedback.negative }}>{BRL(Math.abs(caixaLiq))}</strong> em caixa neste mês (consumiu reserva).</>}
        {temCartao && deltaDividaReduzida > 0 && <> Você reduziu dívida em <strong style={{ color: color.feedback.positive }}>{BRL(deltaDividaReduzida)}</strong>.</>}
        {temCartao && deltaDividaReduzida < 0 && <> Dívida cresceu em <strong style={{ color: color.feedback.negative }}>{BRL(Math.abs(deltaDividaReduzida))}</strong> — a pagar em meses futuros.</>}
      </div>
    </div>
  );
}

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

// ── Navigation context (for cross-tab navigation) ───────────────────────
const NavContext = createContext();

function useNav() {
  return useContext(NavContext);
}

// ── Main ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [aba, setAba] = useState('resumo');
  const [refreshKey, setRefreshKey] = useState(0);
  const [navCategory, setNavCategory] = useState(null);

  const doRefresh = useCallback(() => {
    return new Promise(resolve => {
      // Small delay so the API has time to re-fetch and the indicator is visible
      setRefreshKey(k => k + 1);
      setTimeout(resolve, 600);
    });
  }, []);

  const goToTransactions = useCallback((category) => {
    setNavCategory(category || null);
    setAba('transações');
  }, []);

  const { pullDistance, pullState } = usePullToRefresh(doRefresh, 80);

  return (
    <MonthProvider refreshKey={refreshKey}>
      <NavContext.Provider value={{ goToTransactions, navCategory, setNavCategory }}>
        <PullIndicator pullState={pullState} pullDistance={pullDistance} />
        <DashboardInner aba={aba} setAba={setAba} />
      </NavContext.Provider>
    </MonthProvider>
  );
}

function DashboardInner({ aba, setAba }) {
  const { selectedMonth } = useMonth();
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
          {['resumo', 'fluxo', 'orçamento', 'previsão', 'contas', 'transações'].map(t => (
            <button key={t} className={`tab ${aba === t ? 'active' : ''}`} onClick={() => setAba(t)}>{t}</button>
          ))}
        </nav>

        {aba === 'resumo' && <Resumo />}
        {aba === 'fluxo' && <Fluxo />}
        {aba === 'orçamento' && <Orcamento />}
        {aba === 'previsão' && <Previsao />}
        {aba === 'contas' && <Contas />}
        {aba === 'transações' && <Transacoes />}

        <footer className="sans" style={{ marginTop: 48, paddingTop: 20, borderTop: `1px solid ${color.border.default}`, fontSize: 11, color: color.text.disabled, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          hledger · via Tailscale
        </footer>
      </div>
    </div>
  );
}
