import React, { createContext, useContext, useCallback, useState } from 'react';

// Month-related state lifted out of App.jsx (formerly Dashboard.jsx) during PR-F3.
// Holds the selected YYYY-MM, compare-mode toggle, navigation helpers and
// a pass-through `refreshKey` used to force re-fetches from the pull-to-refresh
// gesture owned by App.
//
// Naming note: the field is called `selectedMonth` (preserved from the original
// inline implementation) rather than `currentMonth` — keeping the name avoids
// churning every tab that already destructures it. A future rename can happen
// in isolation once every consumer is in `features/`.

function getCurrentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function addMonth(ym, delta) {
  let [y, m] = ym.split('-').map(Number);
  m += delta;
  if (m > 12) { m = 1; y++; }
  if (m < 1) { m = 12; y--; }
  return `${y}-${String(m).padStart(2, '0')}`;
}

const MonthContext = createContext(null);

export function MonthProvider({ children, refreshKey = 0 }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [compareMode, setCompareMode] = useState(false);

  const goPrev = useCallback(() => setSelectedMonth(m => addMonth(m, -1)), []);
  const goNext = useCallback(() => setSelectedMonth(m => addMonth(m, 1)), []);
  const goToday = useCallback(() => setSelectedMonth(getCurrentMonth()), []);

  const isCurrentMonth = selectedMonth === getCurrentMonth();

  return (
    <MonthContext.Provider value={{
      selectedMonth, setSelectedMonth,
      compareMode, setCompareMode,
      goPrev, goNext, goToday, isCurrentMonth,
      refreshKey,
    }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  const ctx = useContext(MonthContext);
  if (ctx === null) {
    throw new Error('useMonth must be used inside <MonthProvider>');
  }
  return ctx;
}
