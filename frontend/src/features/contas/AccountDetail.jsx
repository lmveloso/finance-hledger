import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApi } from '../../api.js';
import { color } from '../../theme/tokens';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import TipoChip from '../../components/TipoChip.jsx';

// Local formatters — duplicated from Dashboard.jsx so this feature stays
// self-contained. A shared formatters module will likely land with the
// i18n/currency decoupling noted in docs §6.2.
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Duplicated from Dashboard.jsx — local copy keeps the feature self-contained;
// a shared components/MonthPicker extraction (PR-F*) will consolidate this.
const navBtnStyle = {
  background: color.bg.card,
  border: `1px solid ${color.border.default}`,
  borderRadius: 3,
  color: color.accent.warm,
  cursor: 'pointer',
  padding: '4px 6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.12s',
};

function round2(n) { return Math.round(n * 100) / 100; }

function AccountDetail({ account, onBack, rangeStart, setRangeStart, rangeEnd, setRangeEnd, showStatement, setShowStatement, refreshKey }) {
  // Recent transactions (last 20)
  const { data: txData, loading: txLoading, error: txError } = useApi(
    `/api/transactions?account=${encodeURIComponent(account.caminho)}&limit=20&order=desc`,
    [account.caminho, refreshKey]
  );

  // Statement transactions (date range)
  const statementPath = showStatement && rangeStart && rangeEnd
    ? `/api/transactions?account=${encodeURIComponent(account.caminho)}&start=${rangeStart}&end=${rangeEnd}&limit=500&order=asc`
    : null;
  const { data: stmtData, loading: stmtLoading, error: stmtError } = useApi(
    statementPath || '_skip',
    [statementPath, refreshKey]
  );

  const saldoColor = account.saldo < 0 ? color.feedback.negative : color.feedback.positive;

  const thStyle = {
    textAlign: 'left', padding: '10px 8px', fontSize: 11, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: color.text.muted, borderBottom: `1px solid ${color.border.default}`,
  };
  const tdStyle = {
    padding: '12px 8px', fontSize: 13, borderBottom: `1px solid ${color.border.default}`, color: color.text.secondary,
  };
  const inputStyle = {
    background: color.bg.page, border: `1px solid ${color.border.default}`, borderRadius: 3, color: color.text.primary,
    padding: '8px 12px', fontSize: 13, fontFamily: 'Inter, sans-serif', outline: 'none',
  };

  // Compute running balance for statement
  const stmtTxs = stmtData?.transactions || [];
  let runningBalance = 0;
  // For liabilities, amounts in register are usually positive for charges
  // We compute running balance from 0 based on the amounts shown
  const stmtWithBalance = stmtTxs.map(tx => {
    // Determine if this is a debit or credit based on the account type
    // For assets: positive amount = money in, negative = money out
    // For liabilities: it's inverted
    runningBalance += tx.valor;
    return { ...tx, runningBalance: round2(runningBalance) };
  });

  return (
    <div className="card">
      {/* Header */}
      <button onClick={onBack} className="sans" style={{
        background: 'none', border: 'none', color: color.accent.warm, cursor: 'pointer',
        fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 20,
      }}>
        <ArrowLeft size={14} /> Voltar para contas
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: account.tipo === 'ativo' ? color.feedback.positive : color.feedback.negative,
        }} />
        <span className="serif" style={{ fontSize: 26, fontWeight: 600 }}>{account.nome}</span>
        <span className="serif" style={{ fontSize: 26, color: saldoColor, fontWeight: 600 }}>{BRLc(account.saldo)}</span>
        <span className="sans" style={{ fontSize: 11, color: color.text.disabled, marginLeft: 8 }}>{account.caminho}</span>
      </div>

      {/* Date range picker for statement */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="sans" style={{ fontSize: 11, color: color.text.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Extrato:
        </div>
        <input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} style={inputStyle} />
        <span className="sans" style={{ color: color.text.muted, fontSize: 13 }}>até</span>
        <input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} style={inputStyle} />
        <button
          className="sans"
          onClick={() => setShowStatement(true)}
          disabled={!rangeStart || !rangeEnd}
          style={{
            ...navBtnStyle,
            fontSize: 12,
            padding: '8px 14px',
            opacity: (!rangeStart || !rangeEnd) ? 0.4 : 1,
          }}
        >
          Buscar
        </button>
        {showStatement && (
          <button
            className="sans"
            onClick={() => { setShowStatement(false); setRangeStart(''); setRangeEnd(''); }}
            style={{
              background: 'none', border: 'none', color: color.accent.secondary, cursor: 'pointer',
              fontSize: 12, padding: '8px 8px',
            }}
          >
            Limpar
          </button>
        )}
      </div>

      {/* Statement view */}
      {showStatement ? (
        <>
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 16 }}>
            Extrato · {rangeStart} a {rangeEnd}
          </div>
          {stmtLoading ? <Spinner /> : stmtError ? <ErrorBox msg={stmtError} /> : stmtTxs.length === 0 ? (
            <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>Nenhuma transação no período selecionado.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Descrição</th>
                    <th style={thStyle}>Categoria</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Tipo</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {stmtWithBalance.map((tx, i) => {
                    const isOpening = tx.tipo_movimento === 'saldo_inicial';
                    return (
                      <tr key={i}
                        onMouseEnter={e => e.currentTarget.style.background = color.bg.hover}
                        onMouseLeave={e => e.currentTarget.style.background = isOpening ? color.bg.opening : 'transparent'}
                        style={isOpening ? { background: color.bg.opening, fontStyle: 'italic' } : {}}
                      >
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: color.text.muted, fontSize: 12 }}>{tx.data}</td>
                        <td style={tdStyle}>{tx.descricao}</td>
                        <td style={{ ...tdStyle, color: color.text.muted, fontSize: 12 }}>{tx.categoria}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}><TipoChip tipo={tx.tipo_movimento} /></td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, color: tx.valor > 0 ? color.feedback.positive : tx.valor < 0 ? color.feedback.negative : 'inherit' }}>
                          {BRLc(tx.valor)}
                        </td>
                        <td style={{
                          ...tdStyle, textAlign: 'right', fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600,
                          color: tx.runningBalance < 0 ? color.feedback.negative : color.feedback.positive,
                        }}>
                          {BRLc(tx.runningBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="sans" style={{ fontSize: 12, color: color.text.muted, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${color.border.default}` }}>
                {stmtTxs.length} transações · Saldo final: <span className="serif" style={{ fontWeight: 600, color: stmtWithBalance[stmtWithBalance.length - 1]?.runningBalance < 0 ? color.feedback.negative : color.feedback.positive }}>
                  {BRLc(stmtWithBalance[stmtWithBalance.length - 1]?.runningBalance || 0)}
                </span>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Recent transactions */
        <>
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 16 }}>
            Últimas transações
          </div>
          {txLoading ? <Spinner /> : txError ? <ErrorBox msg={txError} /> : (txData?.transactions || []).length === 0 ? (
            <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>Nenhuma transação encontrada para esta conta.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Data</th>
                    <th style={thStyle}>Descrição</th>
                    <th style={thStyle}>Categoria</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Tipo</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {(txData?.transactions || []).map((tx, i) => {
                    const isOpening = tx.tipo_movimento === 'saldo_inicial';
                    return (
                      <tr key={i}
                        onMouseEnter={e => e.currentTarget.style.background = color.bg.hover}
                        onMouseLeave={e => e.currentTarget.style.background = isOpening ? color.bg.opening : 'transparent'}
                        style={isOpening ? { background: color.bg.opening, fontStyle: 'italic' } : {}}
                      >
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap', color: color.text.muted, fontSize: 12 }}>{tx.data}</td>
                        <td style={tdStyle}>{tx.descricao}</td>
                        <td style={{ ...tdStyle, color: color.text.muted, fontSize: 12 }}>{tx.categoria}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}><TipoChip tipo={tx.tipo_movimento} /></td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, color: tx.valor > 0 ? color.feedback.positive : tx.valor < 0 ? color.feedback.negative : 'inherit' }}>
                          {BRLc(tx.valor)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AccountDetail;
