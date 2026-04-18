// Thin wrapper around the shared KPI atom.
//
// The atom (`components/KPI.jsx`) already renders label + icon + large BRL
// value + optional delta badge. This wrapper exists so the Mes feature can
// pick a good default emphasis policy and to keep the section file under
// 200 lines. If consumer needs diverge from the atom, extend the wrapper —
// do not branch the atom.

import React from 'react';
import KPI from '../../../components/KPI.jsx';

function KpiCard({ label, value, icon, color: kpiColor, emphasized, loading }) {
  return (
    <KPI
      label={label}
      valor={value}
      icon={icon}
      cor={kpiColor}
      destaque={emphasized}
      loading={loading}
    />
  );
}

export default KpiCard;
