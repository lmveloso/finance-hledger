import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ChevronRight,
} from 'lucide-react';
import { useApi } from '../../api.js';
import { color } from '../../theme/tokens';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import KPI from '../../components/KPI.jsx';
import { useMonth } from '../../contexts/MonthContext.jsx';
import AccountDetail from './AccountDetail.jsx';

// Local formatters — duplicated from App.jsx so this feature stays
// self-contained. A shared formatters module will likely land with the
// i18n/currency decoupling noted in docs §6.2.
const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

export default Contas;
