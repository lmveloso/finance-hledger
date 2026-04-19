import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useApi } from '../../../api.js';
import { color } from '../../../theme/tokens';
import Spinner from '../../../components/Spinner.jsx';
import ErrorBox from '../../../components/ErrorBox.jsx';
import AccountTransactionsTable from './AccountTransactionsTable.jsx';
import { t } from '../../../i18n';

// Local formatters — same pattern used across features (see docs §6.2).
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Duplicated from App.jsx — local copy keeps the feature self-contained;
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

const inputStyle = {
  background: color.bg.page, border: `1px solid ${color.border.default}`,
  borderRadius: 3, color: color.text.primary,
  padding: '8px 12px', fontSize: 13, fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", outline: 'none',
};

function round2(n) { return Math.round(n * 100) / 100; }

function AccountDetail({
  account, onBack, rangeStart, setRangeStart, rangeEnd, setRangeEnd,
  showStatement, setShowStatement, refreshKey,
}) {
  // Recent transactions (last 20)
  const { data: txData, loading: txLoading, error: txError } = useApi(
    `/api/transactions?account=${encodeURIComponent(account.caminho)}&limit=20&order=desc`,
    [account.caminho, refreshKey],
  );

  // Statement transactions (date range)
  const statementPath = showStatement && rangeStart && rangeEnd
    ? `/api/transactions?account=${encodeURIComponent(account.caminho)}&start=${rangeStart}&end=${rangeEnd}&limit=500&order=asc`
    : null;
  const { data: stmtData, loading: stmtLoading, error: stmtError } = useApi(
    statementPath || '_skip',
    [statementPath, refreshKey],
  );

  const saldoColor = account.saldo < 0 ? color.feedback.negative : color.feedback.positive;

  // Compute running balance for statement
  const stmtTxs = stmtData?.transactions || [];
  let runningBalance = 0;
  const stmtWithBalance = stmtTxs.map(tx => {
    runningBalance += tx.valor;
    return { ...tx, runningBalance: round2(runningBalance) };
  });
  const finalBalance = stmtWithBalance[stmtWithBalance.length - 1]?.runningBalance || 0;

  const recentTxs = txData?.transactions || [];

  return (
    <div className="card">
      <button
        onClick={onBack}
        className="sans"
        style={{
          background: 'none', border: 'none', color: color.accent.warm, cursor: 'pointer',
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 20,
        }}
      >
        <ArrowLeft size={14} /> {t('patrimonio.detail.back')}
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <span
          style={{
            width: 10, height: 10, borderRadius: '50%',
            background: account.tipo === 'ativo' ? color.feedback.positive : color.feedback.negative,
          }}
        />
        <span className="serif" style={{ fontSize: 26, fontWeight: 600 }}>{account.nome}</span>
        <span className="serif" style={{ fontSize: 26, color: saldoColor, fontWeight: 600 }}>
          {BRLc(account.saldo)}
        </span>
        <span className="sans" style={{ fontSize: 11, color: color.text.disabled, marginLeft: 8 }}>
          {account.caminho}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="sans" style={{ fontSize: 11, color: color.text.muted, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {t('patrimonio.detail.statement')}:
        </div>
        <input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} style={inputStyle} />
        <span className="sans" style={{ color: color.text.muted, fontSize: 13 }}>
          {t('patrimonio.detail.until')}
        </span>
        <input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} style={inputStyle} />
        <button
          className="sans"
          onClick={() => setShowStatement(true)}
          disabled={!rangeStart || !rangeEnd}
          style={{
            ...navBtnStyle, fontSize: 12, padding: '8px 14px',
            opacity: (!rangeStart || !rangeEnd) ? 0.4 : 1,
          }}
        >
          {t('patrimonio.detail.search')}
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
            {t('patrimonio.detail.clear')}
          </button>
        )}
      </div>

      {showStatement ? (
        <>
          <div
            className="sans"
            style={{
              fontSize: 11, letterSpacing: '0.15em', color: color.text.muted,
              textTransform: 'uppercase', marginBottom: 16,
            }}
          >
            {t('patrimonio.detail.statementRange', { start: rangeStart, end: rangeEnd })}
          </div>
          {stmtLoading ? <Spinner /> : stmtError ? <ErrorBox msg={stmtError} /> : stmtTxs.length === 0 ? (
            <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>
              {t('patrimonio.detail.emptyRange')}
            </div>
          ) : (
            <>
              <AccountTransactionsTable transactions={stmtWithBalance} withBalance />
              <div
                className="sans"
                style={{
                  fontSize: 12, color: color.text.muted, marginTop: 12, paddingTop: 12,
                  borderTop: `1px solid ${color.border.default}`,
                }}
              >
                {t('patrimonio.detail.count', { count: stmtTxs.length })} · {t('patrimonio.detail.final')}:{' '}
                <span
                  className="serif"
                  style={{
                    fontWeight: 600,
                    color: finalBalance < 0 ? color.feedback.negative : color.feedback.positive,
                  }}
                >
                  {BRLc(finalBalance)}
                </span>
              </div>
            </>
          )}
        </>
      ) : (
        <>
          <div
            className="sans"
            style={{
              fontSize: 11, letterSpacing: '0.15em', color: color.text.muted,
              textTransform: 'uppercase', marginBottom: 16,
            }}
          >
            {t('patrimonio.detail.recent')}
          </div>
          {txLoading ? <Spinner /> : txError ? <ErrorBox msg={txError} /> : recentTxs.length === 0 ? (
            <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>
              {t('patrimonio.detail.emptyRecent')}
            </div>
          ) : (
            <AccountTransactionsTable transactions={recentTxs} />
          )}
        </>
      )}
    </div>
  );
}

export default AccountDetail;
