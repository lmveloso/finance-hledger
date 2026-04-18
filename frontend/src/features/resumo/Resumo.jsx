import React, { useState, useEffect } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  PiggyBank,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApi, fetchCategoryDetail } from '../../api.js';
import { CONFIG } from '../../config.js';
import { color } from '../../theme/tokens';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import KPI from '../../components/KPI.jsx';
import DeltaBadge from '../../components/DeltaBadge.jsx';
import { useMonth } from '../../contexts/MonthContext.jsx';
import { useNav } from '../../contexts/NavContext.jsx';

// Local formatters — duplicated from Dashboard.jsx so this feature stays
// self-contained. A shared formatters module will likely land with the
// i18n/currency decoupling noted in docs §6.2.
const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n) => `${Math.round(n)}%`;

// Category color lookup — Resumo is currently the only caller.
const categoryColor = (i) => CONFIG.categoryColors[i % CONFIG.categoryColors.length];

// Same month last year — used only by Resumo for year-over-year comparison.
function lastYearMonth(ym) {
  const [y, m] = ym.split('-');
  return `${parseInt(y) - 1}-${m}`;
}

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

export default Resumo;
