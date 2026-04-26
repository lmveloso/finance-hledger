import React, { useCallback, useEffect, useState } from 'react';
import { color } from '../../theme/tokens';
import { t } from '../../i18n';
import YearSelector from './components/YearSelector.jsx';
import ViewToggle from './components/ViewToggle.jsx';
import PrincipioMesView from './views/PrincipioMesView.jsx';
import HeatmapView from './views/HeatmapView.jsx';

// Ano tab (PRD §6). Year + view-mode selectors on top, active view below.
// Vista 3 (Grupo × Mês) and the heatmap toggle are deferred; stubbed as
// TODO in the plan so the architecture supports them without rework.
function Ano() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [view, setView] = useState('categoria'); // 'principio' | 'categoria'

  // Column drill-down: clicking a month header in the active view opens a
  // per-month card underneath the matrix. Resets whenever the user changes
  // year or view, so the drill-down never points at stale context.
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  
  useEffect(() => {
    const d = new Date();
    setSelectedMonth(`${year}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }, [year, view]);

  const handleMonthSelect = useCallback(
    (month) => setSelectedMonth((prev) => (prev === month ? null : month)),
    [],
  );

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
          {t('ano.header')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <ViewToggle value={view} onChange={setView} />
          <YearSelector year={year} onChange={setYear} />
        </div>
      </div>

      {view === 'principio' && (
        <PrincipioMesView
          year={year}
          selectedMonth={selectedMonth}
          onMonthSelect={handleMonthSelect}
        />
      )}
      {view === 'categoria' && (
        <HeatmapView
          year={year}
          selectedMonth={selectedMonth}
          onMonthSelect={handleMonthSelect}
        />
      )}
    </div>
  );
}

export default Ano;
