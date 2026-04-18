import React, { useState } from 'react';
import { color } from '../../theme/tokens';
import ViewToggle from './components/ViewToggle.jsx';
import ForecastView from './views/ForecastView.jsx';
import DividaView from './views/DividaView.jsx';
import { t } from '../../i18n';

// Plano tab (PRD §7). Forward-looking planning.
// Two views exposed today:
//   - forecast: next-6-months income/expense/balance projection
//   - divida:   active credit-card installments decay
//
// Vista 3 ("Metas vs projeção") is deferred per the plan document
// (docs/plans/PR-D5-aba-plano.md §3).
function Plano() {
  const [view, setView] = useState('forecast'); // 'forecast' | 'divida'

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
          {t('plano.header')}
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {view === 'forecast' && <ForecastView />}
      {view === 'divida' && <DividaView />}
    </div>
  );
}

export default Plano;
