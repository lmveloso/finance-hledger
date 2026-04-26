import React, { useEffect, useState, useCallback } from 'react';
import { color } from '../../theme/tokens';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import { useMonth } from '../../contexts/MonthContext.jsx';
import { t } from '../../i18n/index.js';
import { useFlowWithCategories } from './hooks/useFlowWithCategories.js';
import FlowKpiCards from './components/FlowKpiCards.jsx';
import WaterfallView from './views/WaterfallView.jsx';
import AccountCards from './components/AccountCards.jsx';
import MovimentosTable from './components/MovimentosTable.jsx';
import AccountDetailPanel from './components/AccountDetailPanel.jsx';

// Fluxo — reformed tab (PR-U5).
// Stack top-to-bottom: KPI row → waterfall (receita → categorias → saldo) →
// per-account cards → per-account movimentos table. The node-graph view from
// PR-D6 is retired in this PR; transferências are still returned by the API
// but no longer surfaced visually here (deferred to per-account detail flows).
function Fluxo() {
  const { selectedMonth } = useMonth();
  const { flow, categories, loading, error } =
    useFlowWithCategories(selectedMonth);

  const [selectedAccountId, setSelectedAccountId] = useState(null);

  const handleSelect = useCallback((conta) => {
    setSelectedAccountId((current) =>
      current === conta.conta ? null : conta.conta,
    );
  }, []);
  const handleClose = useCallback(() => setSelectedAccountId(null), []);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const contas = flow?.contas || [];
  const selectedAccount = contas.find((c) => c.conta === selectedAccountId) || null;

  // If the month changes and the previously selected account is gone, drop it.
  // Effect-free: derived from current render — handled by the find above.

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, width: '100%' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div
          className="sans"
          style={{
            fontSize: 11,
            letterSpacing: '0.2em',
            color: color.text.muted,
            textTransform: 'uppercase',
          }}
        >
          {t('fluxo.header')} · {contas.length}{' '}
          {contas.length === 1
            ? t('fluxo.conta_singular')
            : t('fluxo.conta_plural')}
        </div>
      </div>

      <FlowKpiCards data={flow} />

      <WaterfallView flow={flow} categories={categories} />

      {contas.length > 0 && (
        <>
          <AccountCards
            contas={contas}
            onSelect={handleSelect}
            selectedAccountId={selectedAccountId}
          />

          <div className="card" style={{ padding: 18 }}>
            <div
              className="sans"
              style={{
                fontSize: 11,
                letterSpacing: '0.15em',
                color: color.text.muted,
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              {t('fluxo.movimentos.title')}
            </div>
            <MovimentosTable
              contas={contas}
              onSelect={handleSelect}
              selectedAccountId={selectedAccountId}
            />
          </div>
        </>
      )}

      <AccountDetailPanel
        conta={selectedAccount}
        month={selectedMonth}
        onClose={handleClose}
      />
    </div>
  );
}

export default Fluxo;
