// Section 5 — Top 10 biggest transactions of the month.
//
// Straight pass-through of /api/top-expenses?limit=10. Useful for spotting
// "what went off the rails this month" per PRD §5.5.

import React from 'react';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import { useTransacoes } from '../hooks/useTransacoes.js';
import { t } from '../../../i18n/index.js';
import TransacaoRow from '../components/TransacaoRow.jsx';

function TopTransacoesSection() {
  const { data, error, loading } = useTransacoes(10);

  if (error) return <ErrorBox msg={error} />;

  const transacoes = data?.transacoes || [];

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
        {t('mes.topTransactions.title')}
      </div>

      {loading ? (
        <Spinner />
      ) : transacoes.length === 0 ? (
        <div
          className="sans"
          style={{ fontSize: 13, color: color.text.muted, padding: '8px 0' }}
        >
          {t('mes.topTransactions.empty')}
        </div>
      ) : (
        transacoes.map((tx, i) => (
          <TransacaoRow
            key={`${tx.data}-${tx.descricao}-${i}`}
            data={tx.data}
            descricao={tx.descricao}
            categoria={tx.categoria}
            valor={tx.valor}
            isLast={i === transacoes.length - 1}
          />
        ))
      )}
    </div>
  );
}

export default TopTransacoesSection;
