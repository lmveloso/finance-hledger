import React, { useEffect, useMemo, useRef, useState } from 'react';
import { color, radius } from '../../../theme/tokens';
import { t } from '../../../i18n/index.js';
import { useAccountTransactions } from '../hooks/useAccountTransactions.js';

const BRL_FULL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  });
const BRL_INT = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
const dateBR = (iso) => {
  if (!iso || iso.length < 10) return iso || '';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y.slice(2)}`;
};

const PANEL_BREAKPOINT_PX = 1024;

/**
 * Side panel showing per-account detail for the Fluxo tab.
 * Desktop ≥1024px: drawer fixed on the right.
 * Mobile <1024px: bottom-sheet sliding up from the bottom.
 *
 * Not a modal — no backdrop, no focus trap. Esc closes; clicking another
 * account swaps the contents in place.
 *
 * Forecast is enabled for passivos (credit cards) so future installments
 * declared in parcelamentos.journal (ADR-011) appear as projected lines.
 */
function AccountDetailPanel({ conta, month, onClose }) {
  const isOpen = Boolean(conta);
  const isPassivo = conta?.tipo === 'passivo';
  const closeBtnRef = useRef(null);

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < PANEL_BREAKPOINT_PX,
  );
  useEffect(() => {
    const onResize = () =>
      setIsMobile(window.innerWidth < PANEL_BREAKPOINT_PX);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && closeBtnRef.current) {
      closeBtnRef.current.focus();
    }
  }, [isOpen, conta?.conta]);

  const { transactions, loading, error } = useAccountTransactions(
    conta?.conta,
    month,
    { forecast: isPassivo },
  );

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const baseStyle = {
    background: color.bg.card,
    borderLeft: isMobile ? 'none' : `1px solid ${color.border.default}`,
    borderTop: isMobile ? `1px solid ${color.border.default}` : 'none',
    boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    transition: 'transform 240ms ease',
    overflow: 'hidden',
  };

  const desktopStyle = {
    ...baseStyle,
    position: 'fixed',
    top: 0,
    right: 0,
    height: '100vh',
    width: 420,
    transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
  };

  const mobileStyle = {
    ...baseStyle,
    position: 'fixed',
    left: 0,
    right: 0,
    bottom: 0,
    height: '85vh',
    borderTopLeftRadius: radius.rounded.lg,
    borderTopRightRadius: radius.rounded.lg,
    transform: isOpen ? 'translateY(0)' : 'translateY(100%)',
  };

  return (
    <aside
      aria-label={t('fluxo.accountDetail.aria')}
      style={isMobile ? mobileStyle : desktopStyle}
    >
      {isMobile && (
        <div
          aria-hidden="true"
          style={{
            width: 36,
            height: 4,
            background: color.border.default,
            borderRadius: 2,
            margin: '8px auto 0',
            flexShrink: 0,
          }}
        />
      )}
      <Header conta={conta} onClose={onClose} closeBtnRef={closeBtnRef} />
      {conta && <Kpis conta={conta} />}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 18px 18px',
          minHeight: 0,
        }}
      >
        <SectionLabel>
          {t('fluxo.accountDetail.lancamentos')}
          {isPassivo && (
            <span style={{ marginLeft: 8, color: color.text.muted, fontSize: 9 }}>
              {t('fluxo.accountDetail.forecastNote')}
            </span>
          )}
        </SectionLabel>
        {loading && (
          <div style={{ color: color.text.muted, fontSize: 12, padding: '12px 0' }}>
            {t('fluxo.accountDetail.loading')}
          </div>
        )}
        {error && (
          <div style={{ color: color.feedback.negative, fontSize: 12, padding: '12px 0' }}>
            {error}
          </div>
        )}
        {!loading && !error && transactions.length === 0 && (
          <div style={{ color: color.text.muted, fontSize: 12, padding: '12px 0' }}>
            {t('fluxo.accountDetail.empty')}
          </div>
        )}
        {!loading && !error && transactions.length > 0 && (
          <TransactionList items={transactions} todayISO={todayISO} />
        )}
      </div>
      <Footer transactions={transactions} todayISO={todayISO} />
    </aside>
  );
}

function Header({ conta, onClose, closeBtnRef }) {
  const tipoLabel = conta
    ? conta.tipo === 'ativo'
      ? t('fluxo.contas.tipo_ativo')
      : t('fluxo.contas.tipo_passivo')
    : '';
  return (
    <div
      style={{
        padding: '18px 18px 12px',
        borderBottom: `1px solid ${color.border.subtle}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        flexShrink: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          className="sans"
          style={{
            fontSize: 10,
            color: color.text.muted,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          {tipoLabel}
        </div>
        <div
          className="serif"
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: color.text.primary,
            marginTop: 4,
            wordBreak: 'break-word',
          }}
        >
          {conta?.nome || ''}
        </div>
      </div>
      <button
        ref={closeBtnRef}
        type="button"
        onClick={onClose}
        aria-label={t('fluxo.accountDetail.close')}
        style={{
          background: 'transparent',
          border: 'none',
          color: color.text.muted,
          fontSize: 22,
          lineHeight: 1,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        ×
      </button>
    </div>
  );
}

function Kpis({ conta }) {
  const saldoInicial = conta.saldo_inicial ?? 0;
  const saldoFinal = conta.saldo_final ?? 0;
  const delta = saldoFinal - saldoInicial;
  const entradas = (conta.entradas_externas ?? 0) + (conta.transfers_in ?? 0);
  const saidas = (conta.saidas_externas ?? 0) + (conta.transfers_out ?? 0);
  const deltaColor =
    delta > 0
      ? color.feedback.positive
      : delta < 0
        ? color.feedback.negative
        : color.text.primary;
  const deltaText = `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${BRL_INT(Math.abs(delta))}`;

  return (
    <div
      style={{
        padding: '8px 18px 10px',
        borderBottom: `1px solid ${color.border.subtle}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        flexShrink: 0,
      }}
    >
      <div
        className="sans"
        style={{
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
          color: color.text.secondary,
          display: 'flex',
          alignItems: 'baseline',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        <KpiInline label={t('fluxo.accountDetail.saldoInicial')} value={BRL_INT(saldoInicial)} />
        <span style={{ color: color.text.muted }}>→</span>
        <KpiInline
          label={t('fluxo.contas.saldo_final')}
          value={BRL_INT(saldoFinal)}
          valueColor={color.text.primary}
          strong
        />
        <span
          style={{
            color: deltaColor,
            fontWeight: 600,
            marginLeft: 'auto',
          }}
        >
          {deltaText}
        </span>
      </div>
      <div
        className="sans"
        style={{
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
          color: color.text.secondary,
          display: 'flex',
          alignItems: 'baseline',
          gap: 12,
        }}
      >
        <KpiInline
          label={t('fluxo.contas.entradas')}
          value={BRL_INT(entradas)}
          valueColor={color.feedback.positive}
        />
        <KpiInline label={t('fluxo.contas.saidas')} value={BRL_INT(saidas)} />
      </div>
    </div>
  );
}

function KpiInline({ label, value, valueColor, strong }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
      <span
        style={{
          fontSize: 9,
          color: color.text.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: valueColor || color.text.primary,
          fontWeight: strong ? 600 : 500,
        }}
      >
        {value}
      </span>
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      className="sans"
      style={{
        fontSize: 10,
        color: color.text.muted,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        margin: '14px 0 8px',
      }}
    >
      {children}
    </div>
  );
}

function TransactionList({ items, todayISO }) {
  return (
    <ul
      style={{
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {items.map((tx, i) => (
        <TransactionRow key={`${tx.data}-${i}`} tx={tx} todayISO={todayISO} />
      ))}
    </ul>
  );
}

function TransactionRow({ tx, todayISO }) {
  const isFuture = tx.data > todayISO;
  const isCredit = tx.tipo_movimento === 'credito';
  const isDebit = tx.tipo_movimento === 'debito';
  const isTransfer = tx.tipo_movimento === 'transferencia';
  const isOpening = tx.tipo_movimento === 'saldo_inicial';

  const valorColor = isCredit
    ? color.feedback.positive
    : isTransfer
      ? color.feedback.info
      : isDebit
        ? color.text.primary
        : color.text.muted;

  const sign = tx.valor > 0 ? '+' : tx.valor < 0 ? '−' : '';
  const valorText = `${sign}${BRL_FULL(Math.abs(tx.valor))}`;

  return (
    <li
      style={{
        display: 'grid',
        gridTemplateColumns: '52px 1fr auto',
        columnGap: 10,
        alignItems: 'baseline',
        padding: '8px 0',
        borderBottom: `1px solid ${color.border.subtle}`,
        opacity: isFuture ? 0.7 : 1,
      }}
    >
      <span
        className="sans"
        style={{
          fontSize: 11,
          color: color.text.muted,
          fontVariantNumeric: 'tabular-nums',
        }}
        title={tx.data}
      >
        {dateBR(tx.data)}
      </span>
      <span style={{ minWidth: 0 }}>
        <div
          className="sans"
          style={{
            fontSize: 13,
            color: color.text.primary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {tx.descricao || (isOpening ? t('fluxo.accountDetail.saldoInicial') : '—')}
          {isFuture && (
            <span
              className="sans"
              style={{
                marginLeft: 6,
                fontSize: 9,
                color: color.text.muted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {t('fluxo.accountDetail.forecastTag')}
            </span>
          )}
        </div>
        <div
          className="sans"
          style={{
            fontSize: 11,
            color: color.text.muted,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {tx.categoria || tx.contra_conta}
        </div>
      </span>
      <span
        className="sans"
        style={{
          fontSize: 13,
          color: valorColor,
          fontWeight: 600,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
        }}
      >
        {valorText}
      </span>
    </li>
  );
}

function Footer({ transactions, todayISO }) {
  const past = transactions.filter((t) => t.data <= todayISO);
  const totalEntradas = past
    .filter((t) => t.valor > 0 && t.tipo_movimento !== 'saldo_inicial')
    .reduce((s, t) => s + t.valor, 0);
  const totalSaidas = past
    .filter((t) => t.valor < 0)
    .reduce((s, t) => s + t.valor, 0);

  return (
    <div
      style={{
        padding: '12px 18px',
        borderTop: `1px solid ${color.border.default}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        background: color.bg.cardAlt || color.bg.card,
      }}
    >
      <span
        className="sans"
        style={{
          fontSize: 10,
          color: color.text.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}
      >
        {t('fluxo.accountDetail.footerCount', { n: transactions.length })}
      </span>
      <span
        className="sans"
        style={{
          fontSize: 12,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{ color: color.feedback.positive }}>
          {BRL_INT(totalEntradas)}
        </span>
        {' / '}
        <span style={{ color: color.text.primary }}>
          {BRL_INT(Math.abs(totalSaidas))}
        </span>
      </span>
    </div>
  );
}

export default AccountDetailPanel;
