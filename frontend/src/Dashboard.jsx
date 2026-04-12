import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, AlertCircle, ChevronRight, ArrowLeft, PiggyBank, Loader2 } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { useApi, fetchCategoryDetail } from './api.js';
import { CONFIG } from './config.js';

const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n) => `${Math.round(n)}%`;
const color = (i) => CONFIG.categoryColors[i % CONFIG.categoryColors.length];

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

function KPI({ label, valor, icon, cor, destaque, loading }) {
  return (
    <div className="card" style={{ borderLeft: destaque ? `3px solid ${cor}` : '1px solid #3a3632' }}>
      <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#8a8275', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: cor }}>{icon}</span> {label}
      </div>
      <div className="serif" style={{ fontSize: destaque ? 38 : 30, fontWeight: 600, color: destaque ? cor : '#e8e2d5', letterSpacing: '-0.02em', lineHeight: 1 }}>
        {loading ? '···' : BRL(valor)}
      </div>
    </div>
  );
}

// ── Resumo ──────────────────────────────────────────────────────────────
function Resumo() {
  const { data: summary, error: e1, loading: l1 } = useApi('/api/summary', []);
  const { data: cats, error: e2, loading: l2 } = useApi('/api/categories?depth=2', []);
  const { data: top, error: e3, loading: l3 } = useApi('/api/top-expenses?limit=5', []);
  const { data: goal, loading: l4 } = useApi(
    `/api/savings-goal?monthly_target=${CONFIG.savingsGoal.monthly}&annual_target=${CONFIG.savingsGoal.annual}`, []
  );

  const [detalhe, setDetalhe] = useState(null);
  const [loadingDet, setLoadingDet] = useState(false);

  const err = e1 || e2 || e3;
  if (err) return <ErrorBox msg={err} />;

  const categorias = (cats?.categorias || []).map((c, i) => ({ ...c, cor: color(i) }));

  const openCat = async (cat) => {
    setLoadingDet(true);
    try {
      const r = await fetchCategoryDetail(cat.nome);
      setDetalhe({ ...cat, subcats: r.subcategorias || [] });
    } catch (e) {
      setDetalhe({ ...cat, subcats: [], error: e.message });
    } finally { setLoadingDet(false); }
  };

  return (
    <div className="grid">
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <KPI label="Receitas" valor={summary?.receitas} icon={<ArrowUpRight size={15} />} cor="#8b9d7a" loading={l1} />
        <KPI label="Despesas" valor={summary?.despesas} icon={<ArrowDownRight size={15} />} cor="#c97b5c" loading={l1} />
        <KPI label="Saldo do mês" valor={summary?.saldo} icon={<Wallet size={15} />} cor="#d4a574" destaque loading={l1} />
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
  const { data, error, loading } = useApi('/api/cashflow?months=12', []);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const meses = (data?.months || []).map(m => ({
    ...m,
    label: m.mes.slice(2), // "26-01"
  }));

  return (
    <div className="card">
      <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#8a8275', textTransform: 'uppercase', marginBottom: 20 }}>Fluxo 12 meses</div>
      <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
        <span className="sans" style={{ fontSize: 12, color: '#8a8275', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: '#8b9d7a', display: 'inline-block' }} /> Receitas
        </span>
        <span className="sans" style={{ fontSize: 12, color: '#8a8275', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, background: '#c97b5c', display: 'inline-block' }} /> Despesas
        </span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={meses} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#3a3632" />
          <XAxis dataKey="label" tick={{ fill: '#8a8275', fontSize: 12, fontFamily: 'Inter, sans-serif' }} axisLine={{ stroke: '#3a3632' }} tickLine={false} />
          <YAxis tick={{ fill: '#8a8275', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => BRL(v)} width={72} />
          <Tooltip contentStyle={{ background: '#1a1815', border: '1px solid #3a3632', borderRadius: 2, fontFamily: 'Inter', fontSize: 12 }} formatter={(v) => BRL(v)} />
          <Bar dataKey="receitas" fill="#8b9d7a" radius={[2, 2, 0, 0]} name="Receitas" />
          <Bar dataKey="despesas" fill="#c97b5c" radius={[2, 2, 0, 0]} name="Despesas" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Orçamento ───────────────────────────────────────────────────────────
function Orcamento() {
  const { data, error, loading } = useApi('/api/budget', []);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;
  return (
    <div className="card">
      <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: '#8a8275', textTransform: 'uppercase', marginBottom: 20 }}>Orçamento vs realizado</div>
      <div className="sans" style={{ color: '#8a8275', fontSize: 13, marginBottom: 16 }}>
        Saída bruta do <code style={{ color: '#d4a574' }}>hledger --budget</code>.
        Defina transações periódicas (<code>~ monthly</code>) no seu .journal.
      </div>
      <pre style={{ color: '#c4bcab', fontFamily: 'ui-monospace, monospace', fontSize: 12, overflowX: 'auto', whiteSpace: 'pre', margin: 0 }}>{data?.raw || '(sem dados)'}</pre>
    </div>
  );
}

// ── Main ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [aba, setAba] = useState('resumo');
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
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.2em', color: '#8a8275', textTransform: 'uppercase', marginBottom: 8 }}>
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} · Visão familiar
          </div>
          <h1 className="serif" style={{ fontSize: 'clamp(34px, 6vw, 58px)', fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>
            Finanças <em style={{ fontWeight: 400, color: '#d4a574' }}>Pessoais</em>
          </h1>
        </header>

        <nav style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid #3a3632', overflowX: 'auto' }}>
          {['resumo', 'fluxo', 'orçamento'].map(t => (
            <button key={t} className={`tab ${aba === t ? 'active' : ''}`} onClick={() => setAba(t)}>{t}</button>
          ))}
        </nav>

        {aba === 'resumo' && <Resumo />}
        {aba === 'fluxo' && <Fluxo />}
        {aba === 'orçamento' && <Orcamento />}

        <footer className="sans" style={{ marginTop: 48, paddingTop: 20, borderTop: '1px solid #3a3632', fontSize: 11, color: '#6a6258', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          hledger · via Tailscale
        </footer>
      </div>
    </div>
  );
}
