import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import ForecastTable from '../components/ForecastTable.jsx';
import { useForecast } from '../hooks/useForecast.js';
import { t } from '../../../i18n';

// Vista 1 (PRD §7) — 6-month forecast table.
// Pulls from /api/forecast?months=6 and feeds ForecastTable.
function ForecastView() {
  const { data, loading, error } = useForecast(6);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const months = data?.months || [];

  if (!months.length) {
    return (
      <div className="sans" style={{ color: color.text.muted, fontSize: 13, padding: 24 }}>
        {t('plano.forecast.empty')}
      </div>
    );
  }

  return (
    <div className="card">
      <div
        className="sans"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 16,
        }}
      >
        {t('plano.forecast.title', { count: months.length })}
      </div>
      <ForecastTable months={months} />
      <div
        className="sans"
        style={{
          fontSize: 11,
          color: color.text.muted,
          marginTop: 12,
        }}
      >
        {t('plano.forecast.footnote')}
      </div>
    </div>
  );
}

export default ForecastView;
