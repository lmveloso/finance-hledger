import React from 'react';
import { useApi } from '../../api.js';
import { color } from '../../theme/tokens';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import { useMonth } from '../../contexts/MonthContext.jsx';
import BudgetBar from './BudgetBar.jsx';

function Orcamento() {
  const { selectedMonth, refreshKey } = useMonth();
  const { data, error, loading } = useApi(`/api/budget?month=${selectedMonth}`, [selectedMonth, refreshKey]);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox msg={error} />;

  const categorias = (data?.categorias || [])
    .filter(c => c.orcado > 0)
    .sort((a, b) => b.percentual - a.percentual);
  const total = data?.total;

  return (
    <div className="card">
      <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 20 }}>Orçamento vs realizado</div>

      {total && (
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${color.border.default}` }}>
          <BudgetBar
            nome="Total"
            orcado={total.orcado}
            realizado={total.realizado}
            percentual={total.percentual}
            isTotal
          />
        </div>
      )}

      {categorias.length === 0 ? (
        <div className="sans" style={{ color: color.text.muted, fontSize: 13 }}>
          Nenhuma categoria com orçamento definido. Adicione transações periódicas (~ monthly) no seu .journal.
        </div>
      ) : categorias.map((c, i) => (
        <BudgetBar
          key={c.conta || i}
          nome={c.nome}
          orcado={c.orcado}
          realizado={c.realizado}
          percentual={c.percentual}
        />
      ))}
    </div>
  );
}

export default Orcamento;
