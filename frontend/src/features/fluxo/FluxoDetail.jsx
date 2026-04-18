import React from 'react';
import {
  Sankey,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useApi } from '../../api.js';
import { color } from '../../theme/tokens';
import Spinner from '../../components/Spinner.jsx';
import ErrorBox from '../../components/ErrorBox.jsx';
import { SankeyNode, buildSankey } from './Sankey.jsx';

// Local formatters — duplicated from Dashboard.jsx so this feature stays
// self-contained. A shared formatters module will likely land with the
// i18n/currency decoupling noted in docs §6.2.
const BRL = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const BRLc = (n) => (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function formatMonthBR(ym) {
  const [y, m] = ym.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  const str = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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

function FluxoDetail({ month, onClose }) {
  const { data, error, loading } = useApi(`/api/flow?month=${month}`, [month]);
  if (loading) return <div style={{ marginTop: 20 }}><Spinner /></div>;
  if (error) return <ErrorBox msg={error} />;
  const sankey = buildSankey(data || { contas: [], transferencias: [] });
  // Accrual × cash reconciliation: Economia contábil = Δ ativos + Δ passivos.
  // Breaking out passivo inflows/outflows as "fatura paga" / "novo gasto no cartão"
  // lets the user see why a headline "economia" doesn't match actual cash saved.
  const contas = data?.contas || [];
  const ativos = contas.filter(c => c.tipo === 'ativo');
  const passivos = contas.filter(c => c.tipo === 'passivo');
  const sumBy = (arr, k) => arr.reduce((s, c) => s + (c[k] || 0), 0);
  const economia = data?.total_economia ?? 0;
  const caixaLiq = ativos.reduce((s, c) => s + (c.saldo_final - c.saldo_inicial), 0);
  const pagamentosFatura = sumBy(passivos, 'entradas_externas') + sumBy(passivos, 'transfers_in');
  const novosGastosCartao = sumBy(passivos, 'saidas_externas') + sumBy(passivos, 'transfers_out');
  const deltaDividaReduzida = pagamentosFatura - novosGastosCartao;
  const temCartao = passivos.length > 0 && (pagamentosFatura > 0 || novosGastosCartao > 0);
  const thStyleFluxo = { textAlign: 'left', padding: '8px 10px', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.text.muted, borderBottom: `1px solid ${color.border.default}`, fontWeight: 500 };
  const tdStyleFluxo = { padding: '10px', fontSize: 13, borderBottom: `1px solid ${color.border.subtle}`, color: color.text.secondary };
  const kpis = [
    { label: 'Receitas', value: data?.total_entradas ?? 0, cor: color.feedback.positive },
    { label: 'Despesas', value: data?.total_saidas ?? 0, cor: color.feedback.negative },
    { label: 'Economia contábil', value: economia, cor: economia >= 0 ? color.accent.warm : color.feedback.negative, emphasis: true, hint: 'Rec − Desp' },
    { label: 'Fluxo caixa líquido', value: caixaLiq, cor: caixaLiq >= 0 ? color.feedback.positive : color.feedback.negative, hint: 'Δ ativos' },
  ];
  if (temCartao) {
    kpis.push({
      label: 'Δ Dívida',
      value: deltaDividaReduzida,
      cor: deltaDividaReduzida > 0 ? color.feedback.positive : deltaDividaReduzida < 0 ? color.feedback.negative : color.text.muted,
      hint: deltaDividaReduzida > 0 ? 'pagou' : deltaDividaReduzida < 0 ? 'cresceu' : '',
    });
  }
  return (
    <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${color.border.default}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.accent.warm, textTransform: 'uppercase' }}>
          Detalhe · {formatMonthBR(month)}
        </div>
        <button onClick={onClose} className="sans" style={{ ...navBtnStyle, fontSize: 11 }}>Fechar</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 20 }}>
        {kpis.map((k, i) => (
          <div key={i} style={{ padding: '10px 12px', border: `1px solid ${color.border.subtle}`, borderRadius: 3, background: k.emphasis ? color.overlay.accentWarmSoft : 'transparent' }}>
            <div className="sans" style={{ fontSize: 10, letterSpacing: '0.1em', color: color.text.muted, textTransform: 'uppercase', marginBottom: 4 }}>{k.label}</div>
            <div style={{ fontSize: 18, fontWeight: 600, color: k.cor, fontFamily: "'Fraunces', Georgia, serif" }}>
              {BRL(k.value)}
            </div>
            {k.hint && <div className="sans" style={{ fontSize: 10, color: color.text.disabled, marginTop: 2 }}>{k.hint}</div>}
          </div>
        ))}
      </div>
      {sankey ? (
        <ResponsiveContainer width="100%" height={Math.max(420, 64 * sankey.nodes.length)}>
          <Sankey
            data={sankey}
            nodeWidth={12}
            nodePadding={28}
            linkCurvature={0.5}
            iterations={64}
            margin={{ top: 16, right: 160, bottom: 16, left: 90 }}
            link={{ stroke: color.feedback.info, strokeOpacity: 0.2, fill: color.feedback.info, fillOpacity: 0.3 }}
            node={<SankeyNode />}
          >
            <Tooltip
              contentStyle={{ background: color.bg.page, border: `1px solid ${color.border.default}`, borderRadius: 2, fontFamily: 'Inter', fontSize: 12, color: color.text.primary }}
              formatter={(value) => BRL(value)}
            />
          </Sankey>
        </ResponsiveContainer>
      ) : (
        <div className="sans" style={{ fontSize: 13, color: color.text.muted }}>Sem movimentação para exibir fluxograma.</div>
      )}
      <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', margin: '24px 0 12px' }}>
        Por conta
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={thStyleFluxo}>Conta</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Saldo inicial</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Entradas</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Saídas</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Transf. +</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Transf. −</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Saldo final</th>
              <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Δ Saldo</th>
            </tr>
          </thead>
          <tbody>
            {(data?.contas || []).map(c => {
              const delta = c.saldo_final - c.saldo_inicial;
              return (
                <tr key={c.conta}>
                  <td style={tdStyleFluxo}>{c.nome}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', fontFamily: 'Fraunces, Georgia, serif' }}>{BRLc(c.saldo_inicial)}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', color: c.entradas_externas > 0 ? color.feedback.positive : 'inherit', fontFamily: 'Fraunces, Georgia, serif' }}>{c.entradas_externas > 0 ? BRLc(c.entradas_externas) : '—'}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', color: c.saidas_externas > 0 ? color.feedback.negative : 'inherit', fontFamily: 'Fraunces, Georgia, serif' }}>{c.saidas_externas > 0 ? BRLc(c.saidas_externas) : '—'}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', color: c.transfers_in > 0 ? color.feedback.info : 'inherit', fontFamily: 'Fraunces, Georgia, serif' }}>{c.transfers_in > 0 ? BRLc(c.transfers_in) : '—'}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', color: c.transfers_out > 0 ? color.feedback.info : 'inherit', fontFamily: 'Fraunces, Georgia, serif' }}>{c.transfers_out > 0 ? BRLc(c.transfers_out) : '—'}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, color: delta > 0 ? color.feedback.positive : delta < 0 ? color.feedback.negative : color.text.secondary }}>{BRLc(c.saldo_final)}</td>
                  <td style={{ ...tdStyleFluxo, textAlign: 'right', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, color: delta > 0 ? color.feedback.positive : delta < 0 ? color.feedback.negative : color.text.muted }}>{delta === 0 ? '—' : BRLc(delta)}</td>
                </tr>
              );
            })}
          </tbody>
          {(data?.contas || []).length > 0 && (() => {
            const contas = data.contas;
            const sum = (k) => contas.reduce((s, c) => s + (c[k] || 0), 0);
            const totInicial = sum('saldo_inicial');
            const totFinal = sum('saldo_final');
            const totDelta = totFinal - totInicial;
            const tfCell = { ...tdStyleFluxo, textAlign: 'right', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, borderTop: `1px solid ${color.border.default}`, borderBottom: 'none', color: color.text.primary };
            return (
              <tfoot>
                <tr>
                  <td style={{ ...tdStyleFluxo, borderTop: `1px solid ${color.border.default}`, borderBottom: 'none', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: color.text.muted, fontWeight: 500 }} className="sans">Total</td>
                  <td style={tfCell}>{BRLc(totInicial)}</td>
                  <td style={{ ...tfCell, color: color.feedback.positive }}>{BRLc(sum('entradas_externas'))}</td>
                  <td style={{ ...tfCell, color: color.feedback.negative }}>{BRLc(sum('saidas_externas'))}</td>
                  <td style={{ ...tfCell, color: color.feedback.info }}>{BRLc(sum('transfers_in'))}</td>
                  <td style={{ ...tfCell, color: color.feedback.info }}>{BRLc(sum('transfers_out'))}</td>
                  <td style={tfCell}>{BRLc(totFinal)}</td>
                  <td style={{ ...tfCell, color: totDelta > 0 ? color.feedback.positive : totDelta < 0 ? color.feedback.negative : color.text.primary }}>{BRLc(totDelta)}</td>
                </tr>
              </tfoot>
            );
          })()}
        </table>
      </div>

      {temCartao && (() => {
        const rows = [
          { label: 'Receitas', sign: '+', value: data?.total_entradas ?? 0, cor: color.feedback.positive },
          { label: 'Despesas do mês (inclui gastos no cartão)', sign: '−', value: data?.total_saidas ?? 0, cor: color.feedback.negative },
          { label: 'Economia contábil', sign: '=', value: economia, cor: color.accent.warm, divider: true, bold: true },
          { label: 'Pagamento de faturas antigas', sign: '−', value: pagamentosFatura, cor: color.feedback.negative, hide: pagamentosFatura === 0 },
          { label: 'Novos gastos no cartão (a pagar depois)', sign: '+', value: novosGastosCartao, cor: color.feedback.positive, hide: novosGastosCartao === 0 },
          { label: 'Mudou em caixa (ativos líquidos)', sign: '=', value: caixaLiq, cor: caixaLiq >= 0 ? color.feedback.positive : color.feedback.negative, divider: true, bold: true, strong: true },
        ].filter(r => !r.hide);
        return (
          <>
            <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', margin: '24px 0 12px' }}>
              Reconciliação · contábil × caixa
            </div>
            <div style={{ border: `1px solid ${color.border.subtle}`, borderRadius: 3, padding: '4px 16px', background: color.overlay.pageScrim }}>
              {rows.map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  padding: '10px 0',
                  borderTop: r.divider ? `1px solid ${color.border.default}` : 'none',
                }}>
                  <span className="sans" style={{ fontSize: r.strong ? 13 : 12, color: r.strong ? color.text.primary : color.text.secondary }}>
                    {r.label}
                  </span>
                  <span style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: r.strong ? 16 : 14,
                    fontWeight: r.bold ? 600 : 400,
                    color: r.cor,
                  }}>
                    <span style={{ color: color.text.disabled, marginRight: 8 }}>{r.sign}</span>{BRLc(r.value)}
                  </span>
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {(data?.transferencias || []).length > 0 && (
        <>
          <div className="sans" style={{ fontSize: 11, letterSpacing: '0.15em', color: color.text.muted, textTransform: 'uppercase', margin: '24px 0 12px' }}>
            Transferências entre contas
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyleFluxo}>De</th>
                  <th style={thStyleFluxo}>Para</th>
                  <th style={{ ...thStyleFluxo, textAlign: 'right' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {data.transferencias.map((t, i) => (
                  <tr key={i}>
                    <td style={tdStyleFluxo}>{t.from_nome}</td>
                    <td style={tdStyleFluxo}>{t.to_nome}</td>
                    <td style={{ ...tdStyleFluxo, textAlign: 'right', fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600, color: color.feedback.info }}>{BRLc(t.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="sans" style={{ fontSize: 12, color: color.text.muted, marginTop: 16, lineHeight: 1.6 }}>
        {caixaLiq >= 0
          ? <>Sobrou <strong style={{ color: color.text.secondary }}>{BRL(caixaLiq)}</strong> em caixa neste mês.</>
          : <>Faltou <strong style={{ color: color.feedback.negative }}>{BRL(Math.abs(caixaLiq))}</strong> em caixa neste mês (consumiu reserva).</>}
        {temCartao && deltaDividaReduzida > 0 && <> Você reduziu dívida em <strong style={{ color: color.feedback.positive }}>{BRL(deltaDividaReduzida)}</strong>.</>}
        {temCartao && deltaDividaReduzida < 0 && <> Dívida cresceu em <strong style={{ color: color.feedback.negative }}>{BRL(Math.abs(deltaDividaReduzida))}</strong> — a pagar em meses futuros.</>}
      </div>
    </div>
  );
}

export default FluxoDetail;
