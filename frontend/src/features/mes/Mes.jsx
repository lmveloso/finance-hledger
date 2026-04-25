// Mes — the Mês tab (PR-F1-3 destructive rebuild + post-craft revision).
//
// Layout (vertical column, max content 720px):
//   1. Sobrou no mês  — anchor (toggleable; closes when Receita opens).
//   2. Receita        — peer (toggleable, accordion).
//   3. Despesa        — peer, ALWAYS OPEN (no accordion). Top-5 categorias
//                       with reveal toggle, then maiores gastos, then CTA.
//   4. Cartões        — peer, ALWAYS OPEN. Restored CreditCardSection with
//                       per-card list → inline drill-down (saldo devedor +
//                       maiores compras + category breakdown).
//   Footer            — last-updated stamp.
//
// User feedback after the craft round drove the always-open shape on
// Despesa and Cartões: the disclosure pattern was swallowing inner clicks
// (categoria drill-down, per-card row), and the user wanted more density,
// not less. Mutual-exclusion now lives only between the anchor and Receita.
//
// Data: a single useResumoMes() call lives here so SobraAncora, Receita,
// and Despesa read from one response. Receita owns useReceitas; Despesa
// owns CategoriasSection + MaioresGastosSection (both with their own
// fetches); CreditCardSection owns useCreditCards (per-card N+2 fetch
// preserved for the rich list-with-drill view; PR-F1-2's
// /api/credit-cards endpoint stays available for a future cleanup that
// would extend it with category breakdowns).

import React, { useState } from 'react';
import ErrorBox from '../../components/ErrorBox.jsx';
import { useResumoMes } from './hooks/useResumoMes.js';
import SobraAncora from './sections/SobraAncora.jsx';
import Receita from './sections/Receita.jsx';
import Despesa from './sections/Despesa.jsx';
import CreditCardSection from './sections/CreditCardSection.jsx';
import Rodape from './sections/Rodape.jsx';

function Mes() {
  const { summary, error, loading } = useResumoMes();

  const [anchorOpen, setAnchorOpen] = useState(true);
  const [receitaOpen, setReceitaOpen] = useState(false);

  const toggleReceita = () => {
    setReceitaOpen((prev) => {
      const next = !prev;
      // Opening Receita auto-closes the anchor (PRD-08 §5.1 mutual
      // exclusion, scoped now to the only toggleable peer).
      if (next) setAnchorOpen(false);
      return next;
    });
  };

  const toggleAnchor = () => setAnchorOpen((prev) => !prev);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14, // spacing.gap-md between cards
        maxWidth: 720,
        margin: '0 auto',
        width: '100%',
      }}
    >
      {error && <ErrorBox msg={error} />}

      <SobraAncora
        summary={summary}
        loading={loading}
        open={anchorOpen}
        onToggle={toggleAnchor}
      />

      <Receita
        summary={summary}
        summaryLoading={loading}
        open={receitaOpen}
        onToggle={toggleReceita}
      />

      <Despesa summary={summary} summaryLoading={loading} />

      <CreditCardSection />

      <div style={{ marginTop: 6 /* gap-lg minus stack gap = 20 - 14 */ }}>
        <Rodape summary={summary} />
      </div>
    </div>
  );
}

export default Mes;
