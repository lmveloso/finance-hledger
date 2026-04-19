import React, { useMemo } from 'react';
import { color, radius } from '../../../theme/tokens';
import { t } from '../../../i18n/index.js';

const BRL = (n) =>
  (n ?? 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });

/**
 * Per-account cards grid for the Fluxo tab.
 *
 * One card per account with:
 *   - nome (account display name)
 *   - tipo (uppercased, muted) — 'ativo' or 'passivo'
 *   - signed delta = saldo_final - saldo_inicial
 *       Color interpretation flips for passivo (growing debt is bad).
 *   - Entradas  = entradas_externas + transfers_in
 *   - Saídas    = saidas_externas  + transfers_out
 *   - Footer with saldo_final.
 *
 * Order: ativos first (desc saldo_final), then passivos (desc |delta|).
 * Uses CSS Grid `repeat(auto-fit, minmax(220px, 1fr))` for responsive wrap.
 */
function AccountCards({ contas }) {
  const sorted = useMemo(() => sortAccounts(contas || []), [contas]);

  if (sorted.length === 0) return null;

  return (
    <div>
      <div
        className="sans"
        style={{
          fontSize: 11,
          letterSpacing: '0.15em',
          color: color.text.muted,
          textTransform: 'uppercase',
          marginBottom: 12,
        }}
      >
        {t('fluxo.contas.title')}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}
      >
        {sorted.map((c) => (
          <AccountCard key={c.conta} conta={c} />
        ))}
      </div>
    </div>
  );
}

function sortAccounts(contas) {
  const ativos = contas
    .filter((c) => c.tipo === 'ativo')
    .slice()
    .sort((a, b) => (b.saldo_final ?? 0) - (a.saldo_final ?? 0));
  const passivos = contas
    .filter((c) => c.tipo === 'passivo')
    .slice()
    .sort(
      (a, b) =>
        Math.abs((b.saldo_final ?? 0) - (b.saldo_inicial ?? 0)) -
        Math.abs((a.saldo_final ?? 0) - (a.saldo_inicial ?? 0)),
    );
  return [...ativos, ...passivos];
}

function AccountCard({ conta }) {
  const saldoInicial = conta.saldo_inicial ?? 0;
  const saldoFinal = conta.saldo_final ?? 0;
  const delta = saldoFinal - saldoInicial;

  // For a liability, a positive delta means debt grew → render as negative.
  const direction =
    conta.tipo === 'passivo' ? (delta >= 0 ? 'bad' : 'good') :
    delta > 0 ? 'good' : delta < 0 ? 'bad' : 'neutral';

  const deltaColor =
    direction === 'good'
      ? color.feedback.positive
      : direction === 'bad'
      ? color.feedback.negative
      : color.text.muted;

  const entradas = (conta.entradas_externas ?? 0) + (conta.transfers_in ?? 0);
  const saidas = (conta.saidas_externas ?? 0) + (conta.transfers_out ?? 0);

  const tipoLabel =
    conta.tipo === 'ativo'
      ? t('fluxo.contas.tipo_ativo')
      : t('fluxo.contas.tipo_passivo');

  return (
    <div
      style={{
        background: color.bg.card,
        border: `1px solid ${color.border.default}`,
        borderRadius: radius.rounded.md,
        padding: 18,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 14,
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            className="sans"
            style={{
              fontSize: 13,
              color: color.text.primary,
              fontWeight: 500,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {conta.nome}
          </div>
          <div
            className="sans"
            style={{
              fontSize: 10,
              color: color.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginTop: 3,
            }}
          >
            {tipoLabel}
          </div>
        </div>
        <div
          className="serif"
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: deltaColor,
            whiteSpace: 'nowrap',
          }}
          title={t('fluxo.contas.delta')}
        >
          {formatSigned(delta)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <div
            className="sans"
            style={{
              fontSize: 9,
              color: color.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 3,
            }}
          >
            {t('fluxo.contas.entradas')}
          </div>
          <div
            className="sans"
            style={{ fontSize: 13, color: color.feedback.positive }}
          >
            {BRL(entradas)}
          </div>
        </div>
        <div>
          <div
            className="sans"
            style={{
              fontSize: 9,
              color: color.text.muted,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: 3,
            }}
          >
            {t('fluxo.contas.saidas')}
          </div>
          <div
            className="sans"
            style={{ fontSize: 13, color: color.feedback.negative }}
          >
            {BRL(saidas)}
          </div>
        </div>
      </div>

      <div
        className="sans"
        style={{
          marginTop: 12,
          paddingTop: 10,
          borderTop: `1px solid ${color.border.subtle}`,
          fontSize: 11,
          color: color.text.muted,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span>{t('fluxo.contas.saldo_final')}</span>
        <strong style={{ color: color.text.primary, fontWeight: 600 }}>
          {BRL(saldoFinal)}
        </strong>
      </div>
    </div>
  );
}

function formatSigned(v) {
  if (v < 0) return `−${BRL(Math.abs(v))}`;
  if (v > 0) return `+${BRL(v)}`;
  return BRL(0);
}

export default AccountCards;
