import React, { useState } from 'react';
import { useApi } from '../../api.js';
import { color } from '../../theme/tokens';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import { useMonth } from '../../contexts/MonthContext.jsx';
import { useNetworth } from './hooks/useNetworth.js';
import HeroSection from './components/HeroSection.jsx';
import EvolutionChart from './components/EvolutionChart.jsx';
import SettingsPanel from './components/SettingsPanel.jsx';
import AccountCard from './components/AccountCard.jsx';
import AccountDetail from './components/AccountDetail.jsx';
import { t } from '../../i18n';

// Patrimonio tab (PR-D7) — formerly "Contas". Adds the hero overview and
// historical evolution chart on top of the existing account list + drill-down.
//
// Data sources:
//   - /api/accounts    → ativos / passivos list (kept as-is from Contas)
//   - /api/networth?N  → monthly assets / liabilities / net history
//
// Chart period is user-controlled via SettingsPanel (inline, no modal).
// Always fetches a long horizon (36 months) so switching periods is a
// client-side slice without re-fetching.
const HISTORY_MAX = 36;

function Patrimonio() {
  const { refreshKey } = useMonth();
  const { data: accountsData, error, loading } = useApi('/api/accounts', [refreshKey]);
  const { data: nwData } = useNetworth(HISTORY_MAX);

  const [selectedAccount, setSelectedAccount] = useState(null);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [showStatement, setShowStatement] = useState(false);

  // Settings (inline)
  const [period, setPeriod] = useState(12); // 6 | 12 | 24 | 36 | 'all'
  const [hideZero, setHideZero] = useState(true);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const contas = accountsData?.contas || [];
  const ativosAll = contas.filter(c => c.tipo === 'ativo');
  const passivosAll = contas.filter(c => c.tipo === 'passivo');
  const ativos = hideZero ? ativosAll.filter(c => Math.abs(c.saldo) >= 0.01) : ativosAll;
  const passivos = hideZero ? passivosAll.filter(c => Math.abs(c.saldo) >= 0.01) : passivosAll;

  // Account selected → inline detail view replaces the list (no modal).
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

  const totalAtivos = ativosAll.reduce((s, c) => s + c.saldo, 0);
  const totalPassivos = passivosAll.reduce((s, c) => s + c.saldo, 0);
  // hledger keeps passivo balances negative (ledger sign); the absolute is
  // what we display in the "owed" column.
  const passivosOwed = Math.abs(totalPassivos);

  const allMonths = nwData?.months || [];
  const visibleMonths = period === 'all' ? allMonths : allMonths.slice(-Number(period));

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, paddingBottom: 4,
        }}
      >
        <div
          className="sans"
          style={{
            fontSize: 11, letterSpacing: '0.2em', color: color.text.muted,
            textTransform: 'uppercase',
          }}
        >
          {t('patrimonio.header')}
        </div>
        <SettingsPanel
          period={period}
          onPeriodChange={setPeriod}
          hideZero={hideZero}
          onHideZeroChange={setHideZero}
        />
      </div>

      <HeroSection
        months={allMonths.slice(-12)}
        totalAssets={totalAtivos}
        totalLiabilities={passivosOwed}
      />

      <div className="card">
        <div
          className="sans"
          style={{
            fontSize: 11, letterSpacing: '0.15em', color: color.text.muted,
            textTransform: 'uppercase', marginBottom: 16,
          }}
        >
          {t('patrimonio.evolution.title')}
        </div>
        <EvolutionChart months={visibleMonths} />
      </div>

      <div className="grid g3">
        <div className="card">
          <div
            className="sans"
            style={{
              fontSize: 11, letterSpacing: '0.15em', color: color.text.muted,
              textTransform: 'uppercase', marginBottom: 16,
            }}
          >
            {t('patrimonio.assets')}
          </div>
          {ativos.length === 0 ? (
            <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>
              {t('patrimonio.empty.assets')}
            </div>
          ) : ativos.map(c => (
            <AccountCard key={c.caminho} conta={c} onSelect={setSelectedAccount} />
          ))}
        </div>

        <div className="card">
          <div
            className="sans"
            style={{
              fontSize: 11, letterSpacing: '0.15em', color: color.text.muted,
              textTransform: 'uppercase', marginBottom: 16,
            }}
          >
            {t('patrimonio.liabilities')}
          </div>
          {passivos.length === 0 ? (
            <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>
              {t('patrimonio.empty.liabilities')}
            </div>
          ) : passivos.map(c => (
            <AccountCard key={c.caminho} conta={c} onSelect={setSelectedAccount} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default Patrimonio;
