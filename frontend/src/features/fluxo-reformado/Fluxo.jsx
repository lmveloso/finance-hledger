import React from 'react';
import { color } from '../../theme/tokens';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import { useMonth } from '../../contexts/MonthContext.jsx';
import { useFlow } from './hooks/useFlow.js';
import FlowKpiCards from './components/FlowKpiCards.jsx';
import GrafoView from './views/GrafoView.jsx';
import MovimentosTable from './components/MovimentosTable.jsx';

// Fluxo — reformed tab (PR-D6).
// Replaces the previous 12-month bar+sankey implementation with a
// single-month view centered on per-account deltas. The data model maps
// to /api/flow?month=YYYY-MM.
function Fluxo() {
  const { selectedMonth } = useMonth();
  const { data, loading, error } = useFlow(selectedMonth);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const contas = data?.contas || [];
  const transferencias = data?.transferencias || [];

  return (
    <div className="grid" style={{ gap: 20 }}>
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
          Fluxo · {contas.length} {contas.length === 1 ? 'conta' : 'contas'}
        </div>
      </div>

      <FlowKpiCards data={data} />

      {contas.length === 0 ? (
        <div
          className="card sans"
          style={{ color: color.text.muted, fontSize: 13 }}
        >
          Sem movimento neste mês.
        </div>
      ) : (
        <>
          <GrafoView contas={contas} transferencias={transferencias} />
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
              Movimentos por conta
            </div>
            <MovimentosTable contas={contas} />
          </div>
        </>
      )}
    </div>
  );
}

export default Fluxo;
