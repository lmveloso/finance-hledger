---
name: hledger-fatura
description: Importar fatura de cartao de credito para journal hledger — padrao fatura anterior, classificacao de compras, validacao de saldo do cartao.
---

# Importar Fatura de Cartao de Credito

Depende do skill **hledger-base** para inicializacao, padroes de transacao, classificacao, validacao e pitfalls.

## Inicializacao

Seguir hledger-base §Inicializacao antes de qualquer outra acao.

## Padrao "Fatura Anterior" (CRITICO)

Toda fatura tem **tres entradas de abertura** para bootstrap correto do saldo:

```hledger
; 1. Saldo da fatura anterior (divida que existia antes deste periodo)
2026-01-27 Saldo fatura anterior XP Visa
    liabilities:cartao:xp-visa   BRL -9635.39
    equity:saldo-inicial         BRL  9635.39

; 2. Pagamento da fatura anterior (saiu da conta bancaria)
2026-01-29 Pagamento fatura XP Visa
    liabilities:cartao:xp-visa   BRL  9635.39
    assets:banco:xp:corrente     BRL -9635.39

; 3. Compras individuais da fatura atual
2026-02-02 Supermercado Rincao
    expenses:alimentacao:supermercado   BRL  124.00  ; tipo: CUSTOS FIXOS
    liabilities:cartao:xp-visa          BRL -124.00
```

**Como funciona:**
- Entrada 1 + Entrada 2 = zero (divida anterior quitada)
- Compras individuais acumulam = total da fatura atual
- Saldo final do cartao = exatamente o valor da fatura
- Data da "fatura anterior" deve ser ANTES da primeira compra (ex: dia 27 do mes anterior)

**NAO colocar saldo do cartao em "Saldos iniciais" no main.journal** — isso causa dupla contagem.

## Workflow

1. **Extrair** dados da fatura (PDF, CSV, imagem)
2. **Verificar total**: somar todas as compras e confirmar com total declarado da fatura
3. **Coletar contexto** (em batch, antes do plano de lancamentos):
   - Qual conta bancaria pagou a fatura?
   - Valor da fatura anterior (se primeira fatura no journal)
   - Parcelamentos detectados: confirmar NOME da serie e N/M
4. **Classificar e confirmar** seguindo hledger-base §Categorizacao e §Plano de Lancamentos. O plano deve incluir as 3 entradas de abertura (saldo fatura anterior, pagamento, ajustes) e todas as compras com conta + tag + obs (parcela, retroativo). Exigir `OK` explicito antes de escrever.
5. **Escrever** arquivo journal
6. **Incluir** no main.journal (`include YYYY-MM-fatura-BANCO.journal`)
7. **Validar** — rodar protocolo de validacao (ver hledger-base)

## Parcelamentos (ADR-009)

Compras parceladas (`PARC N/M`, `parcela N/M`, `N de M`) seguem regra propria.

### Modelo

Mantemos os dois modelos em paralelo:

| Tipo | Onde vive | Como aparece |
|---|---|---|
| Parcelas **passadas** (≤ hoje) | One-off em cada fatura, com `; parcelamento: NOME N/M` | Realidade — entrada por entrada |
| Parcelas **futuras** (> hoje) | UMA declaração `~ monthly` em `parcelamentos.journal` | Forecast — geradas por `--forecast` |

O endpoint `/api/installments` agrega ambos por NOME, conta dates ≤ hoje como `paid`, e calcula `remaining = total - paid`.

### Tag obrigatoria

Cada parcela passada (one-off) precisa do tag exato no posting de despesa:

```hledger
2026-04-29 Anuidade Caixa Mastercard (titular)  ; tipo: CUSTOS FIXOS
    expenses:financeiro:taxas             BRL    17.25  ; parcelamento: Anuidade Caixa titular 8/12
    liabilities:cartao:caixa-mastercard   BRL   -17.25
```

Regra do tag: `parcelamento: <NOME> <N>/<M>` (regex backend: `^(?P<name>.+?)\s+(?P<n>\d+)/(?P<m>\d+)\s*$`).

- `<NOME>`: identificador estavel da serie (mesmo NOME em todas as parcelas e na declaração `~ monthly`).
- `<N>`: numero da parcela atual.
- `<M>`: total da serie.

### Declaração ~ monthly em parcelamentos.journal

Para parcelas com ocorrencias **futuras**:

```hledger
; --- Anuidade Caixa Mastercard (titular) — 12x ---
; Já pagas: 6, 7, 8. Futuras: 9..12.
~ monthly from 2026-05-01 to 2026-08-31
    expenses:financeiro:taxas            BRL  17.25  ; parcelamento: Anuidade Caixa titular 9/12
    liabilities:cartao:caixa-mastercard
```

- Período `from..to`: **inicio = primeiro mes futuro**, **fim = ultimo mes da serie**. Hledger gera 1 transacao no inicio de cada mes do intervalo.
- O posting da liability fica sem valor explicito (auto-balance).
- Comentario explicando quais parcelas ja foram pagas e quais sao futuras (auxilia debug humano).

### Quando criar / atualizar a declaração

1. **Detectou parcelamento** numa fatura sendo importada: cheque se ja existe declaração para esse NOME em `parcelamentos.journal`.
   - **Existe**: ok, a declaração ja cobre parcelas futuras. Apenas adicione o one-off da parcela atual com tag.
   - **Nao existe**: crie a declaração `~ monthly from <proximo_mes> to <ultimo_mes>`. Adicione o one-off.
2. **Quando todas as parcelas de uma serie virarem passado**, mover a declaração para `parcelamentos-arquivados.journal` (ou remover) — o backend ignora declarações sem ocorrencias futuras.

### Casos limite

- **Parcela final unica** (ex: `Havan PARC 4/4`, sem 1, 2, 3 no journal): nao cria `~ monthly` (nao ha futuro). Adiciona o one-off normalmente. Aceitavel que `/api/installments` reporte essa serie como ativa com `remaining=3` por nao ter dates pre-journal — usuario pode resolver com backfill ou mudando `M`.
- **Parcela 1/N nesta fatura**: cria one-off + `~ monthly from <proximo_mes> to <mes_final>` cobrindo 2..N.
- **Parcelas pre-journal**: se a serie comeca antes do journal, parcelas faltantes aparecem como "remaining" inflado. Backfill manual ou aceitar a aproximacao.

## Lançamentos retroativos (não parcelas)

Algumas faturas trazem lançamentos com data anterior ao período do arquivo (não parcelas, apenas atrasados). Manter a data **real** do evento — sortear o arquivo cronologicamente apos importar (ver hledger-base, seção "Ordem cronologica"). Não rebatizar para a data do fechamento da fatura.

## Detalhes por Cartao

### XP Visa

- **Fecha dia 24** de cada mes
- **Fluxo de pagamento**: Caixa corrente → PIX → XP corrente → debito fatura
- Registrar em dois passos:

```hledger
; No journal da conta corrente (extrato)
2026-03-03 Transferencia para XP corrente  ; pagamento fatura XP
    assets:banco:xp:corrente    BRL  8945.00
    assets:banco:caixa:corrente BRL -8945.00

; Neste journal da fatura (entrada 2 do padrao "fatura anterior")
2026-03-03 Pagamento fatura XP Visa
    liabilities:cartao:xp-visa  BRL  8944.81
    assets:banco:xp:corrente    BRL -8944.81
```

### Caixa Mastercard

- **Fecha dia 28** de cada mes
- **Dois titulares**: Lucas (final 6981) + Giovanna adicional (final 4035)
- Lancamentos de ambos vao na mesma liability (`liabilities:cartao:caixa-mastercard`)
- Anuidade parcelada para cada titular
- Pagamento direto da conta Caixa corrente

### BB Visa

- Cartao da esposa (Giovanna)
- Liability: `liabilities:cartao:bb-visa`
- Confirmar dia de fechamento com usuario

## Escrita do Arquivo Journal

### Naming

`YYYY-MM-fatura-BANCO.journal` — ex: `2026-04-fatura-xp.journal`

### Template

```hledger
; Fatura XP Visa
; Periodo: 25/03/2026 a 24/04/2026
; Total da fatura: R$ XXXX,XX
; Pagamento fatura anterior: R$ YYYY,YY (XP corrente, DD/MM)

; === FATURA ANTERIOR ===

2026-03-24 Saldo fatura anterior XP Visa
    liabilities:cartao:xp-visa            BRL -YYYY.YY
    equity:saldo-inicial                  BRL  YYYY.YY

2026-03-26 Pagamento fatura XP Visa
    liabilities:cartao:xp-visa            BRL  YYYY.YY
    assets:banco:xp:corrente             BRL -YYYY.YY

; === COMPRAS ===

2026-03-25 Supermercado Rincao
    expenses:alimentacao:supermercado     BRL   124.00  ; tipo: CUSTOS FIXOS
    liabilities:cartao:xp-visa            BRL  -124.00
```

### Estrategia de escrita

Faturas tipicamente tem 20-60 transacoes → escrever arquivo diretamente, seguido de `hledger_check` imediato. Usar `hledger_add_transaction` apenas para correcoes pontuais.

## Cobertura Equity

Se o pagamento da fatura anterior ocorreu ANTES da data de corte dos saldos iniciais do journal, adicionar entrada de cobertura (ver padrao completo no skill hledger-base).

## Validacao

Use o protocolo completo do skill hledger-base — nao basta `hledger_check` simples:

```bash
bash skills/hledger-base/scripts/validate.sh "$LEDGER_FILE"
hledger -f "$LEDGER_FILE" balance "liabilities:cartao:xp-visa"
```

O saldo deve ser **negativo** e igual ao total da fatura atual. Exemplo: fatura de R$ 8.500 → saldo `BRL -8500.00`.

Para conferir parcelamentos detectados: `curl -s http://127.0.0.1:8080/api/installments | jq` — todos os `parcelamento:` tags devem aparecer agrupados pelo NOME.
