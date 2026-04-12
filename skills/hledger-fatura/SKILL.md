---
name: hledger-fatura
description: Importar fatura de cartao de credito para journal hledger — padrao fatura anterior, classificacao de compras, validacao de saldo do cartao.
triggers:
  - fatura
  - cartao de credito
  - credit card
  - invoice
  - fatura XP
  - fatura Caixa
---

# Importar Fatura de Cartao de Credito

Depende do skill **hledger-base** para padroes de transacao, validacao e pitfalls.

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
3. **Classificar** compras usando `skills/hledger-base/payee-categories.json`
4. **Perguntar ao usuario** (em batch, antes de escrever):
   - Comercios desconhecidos / ambiguos
   - Qual conta bancaria pagou a fatura?
   - Valor da fatura anterior (se primeira fatura no journal)
   - Parcelamentos: qual numero da parcela?
5. **Escrever** arquivo journal
6. **Incluir** no main.journal (`include YYYY-MM-fatura-BANCO.journal`)
7. **Validar** — rodar protocolo de validacao (ver hledger-base)

## Classificacao

1. Carregar `skills/hledger-base/payee-categories.json`
2. Match case-insensitive do nome do comercio nos `patterns`
3. Se match e nao `ambiguous` → usar `account` e `tag`
4. Se `ambiguous: true` ou sem match → adicionar a lista de perguntas
5. Adicionar `; tipo: TAG` em cada posting de despesa
6. Para parcelas: registrar **valor da parcela** (nao total), comentar `; X de Y`

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

```
hledger_check(file="$LEDGER_FILE")
hledger_balance(file="$LEDGER_FILE", query="liabilities:cartao:xp-visa")
```

O saldo deve ser **negativo** e igual ao total da fatura atual. Exemplo: fatura de R$ 8.500 → saldo `BRL -8500.00`.
