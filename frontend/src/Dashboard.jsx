import React, { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, AlertCircle, ChevronRight, ArrowLeft, PiggyBank, ChevronLeft, CalendarDays, RefreshCw } from 'lucide-react';
import { useApi, fetchCategoryDetail } from './api.js';
import { CONFIG } from './config.js';
import { usePullToRefresh } from './hooks/usePullToRefresh.js';
import { color } from './theme/tokens';
import Spinner from './components/Spinner.jsx';
import ErrorBox from './components/ErrorBox.jsx';
import KPI from './components/KPI.jsx';
import DeltaBadge from './components/DeltaBadge.jsx';
import { MonthProvider, useMonth } from './contexts/MonthContext.jsx';
import { NavProvider, useNav } from './contexts/NavContext.jsx';
import Resumo from './features/resumo';
import Fluxo from './features/fluxo';
import Orcamento from './features/orcamento';
import Previsao from './features/previsao';
import Contas from './features/contas';

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
