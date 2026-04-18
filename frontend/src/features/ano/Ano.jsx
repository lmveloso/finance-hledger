import React, { useState } from 'react';
import { color } from '../../theme/tokens';
import YearSelector from './components/YearSelector.jsx';
import ViewToggle from './components/ViewToggle.jsx';
import PrincipioMesView from './views/PrincipioMesView.jsx';
import CategoriaMesView from './views/CategoriaMesView.jsx';

// Ano tab (PRD §6). Year + view-mode selectors on top, active view below.
// Vista 3 (Grupo × Mês) and the heatmap toggle are deferred; stubbed as
// TODO in the plan so the architecture supports them without rework.
function Ano() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState('principio'); // 'principio' | 'categoria'

  return (
    <div className="grid">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          paddingBottom: 4,
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
          Visão anual
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <YearSelector year={year} onChange={setYear} />
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {view === 'principio' && <PrincipioMesView year={year} />}
      {view === 'categoria' && <CategoriaMesView year={year} />}
    </div>
  );
}

export default Ano;
