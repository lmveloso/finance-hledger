// DespesaExpanded — panel shown when the Despesa KPI card is expanded on
// the Mês tab (Fase UX-Polish #3).
//
// Reproduces the old Resumo two-column layout: CategoriasSection (with its
// inline subcategory drill-down) on the left and MaioresGastosSection (top
// 5 + "Ver todas" shortcut) on the right. On narrow viewports the columns
// stack (auto-fit minmax 360px).
//
// PrincipiosSection is intentionally NOT included — issue #4 of Fase
// UX-Polish moved "Metas por Princípio" out of the Mês tab to the Ano
// drill-down, where it has a yearly context to sit in.

import React from 'react';
import CategoriasSection from './CategoriasSection.jsx';
import MaioresGastosSection from './MaioresGastosSection.jsx';

function DespesaExpanded() {
  return (
    <div
      className="grid"
      style={{
        gap: 20,
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
      }}
    >
      <CategoriasSection />
      <MaioresGastosSection />
    </div>
  );
}

export default DespesaExpanded;
