---
name: hledger-extrato
description: Importar extrato de conta bancaria (corrente, poupanca) para journal hledger. Cobre parsing de JSON/PDF/CSV, classificacao automatica de payees e reconciliacao de saldo.
triggers:
  - extrato
  - conta corrente
  - poupanca
  - saldo bancario
  - bank statement
  - conciliacao
---

# Importar Extrato Bancario

Depende do skill **hledger-base** para padroes de transacao, validacao e pitfalls.

## Inicializacao (OBRIGATORIO — primeira acao)

Antes de QUALQUER chamada MCP ou escrita de arquivo:

1. Executar no terminal: `echo $LEDGER_FILE`
2. Se vazio, **PERGUNTAR ao usuario** o path do main.journal
3. Usar o path absoluto resultante em todas as chamadas MCP

MCP tools NAO expandem `~` nem variaveis — passar sempre o path literal.

## Workflow

1. **Ler** o extrato (JSON, PDF, CSV, imagem)
2. **Parsear** transacoes (data, descricao, valor, sinal C/D)
3. **Verificar** soma: saldo anterior + creditos - debitos = saldo final do banco
4. **Classificar** cada transacao usando `skills/hledger-base/payee-categories.json`
5. **Perguntar** todos os itens ambiguos ao usuario de uma vez (batch)
6. **Escrever** arquivo journal
7. **Incluir** no main.journal (`include YYYY-MM-banco-conta.journal`)
8. **Validar** — rodar protocolo de validacao (ver hledger-base)

## Formatos de Input

### JSON — Caixa pessoal (corrente/poupanca)

Estrutura aninhada em `modelResponse`:

```json
{
  "modelResponse": {
    "extratoSaldoLancamentos": [
      {"identificadorSaldoLancamento": "SA", "saldoLancamento": "14,62"},
      {"identificadorSaldoLancamento": "SP", "saldoLancamento": "3.008,68"}
    ],
    "extratoLancamentos": [{
      "dataLancamento": "01/04/2026",
      "historicoLancamento": "PIX ENVIADO",
      "valorLancamento": "9,99",
      "sinalLancamento": "D",
      "complemento": {
        "nomeRazaoDestino": "Supermercado Master",
        "cpfCnpjDestino": "06.373.748/0001-16"
      }
    }]
  }
}
```

**Atencao**:
- `valorLancamento` eh **string com virgula** → converter: `float(val.replace('.', '').replace(',', '.'))`
- `sinalLancamento`: `D` = debito (saida), `C` = credito (entrada)
- Saldos: `SA` = saldo anterior, `SP` = saldo atual
- Ignorar lancamentos com valor 0.00 (marcadores "SALDO DIA")

### PDF texto

```bash
pdftotext fatura.pdf -
```

### PDF imagem (ex: app Caixa gera 4 paginas de imagem)

```bash
pdftoppm -r 150 extrato.pdf /tmp/pfx
# Gera PNGs → analisar via vision (uma pagina por vez)
```

### CSV

Ler direto. Colunas tipicas: data, descricao, valor, saldo.

## Classificacao

1. Carregar `skills/hledger-base/payee-categories.json`
2. Para cada transacao, buscar match case-insensitive do payee nos `patterns`
3. Se match encontrado e `ambiguous` nao eh `true` → usar `account` e `tag` do JSON
4. Se match encontrado e `ambiguous: true` → adicionar a lista de perguntas
5. Se nenhum match → adicionar a lista de perguntas
6. **Perguntar TODOS os itens ambiguos ao usuario de uma vez** antes de escrever

Consultar tambem a secao `rules` do JSON para regras contextuais (ex: Mercado Livre conserto vs item novo).

## Escrita do Arquivo Journal

### Naming

`YYYY-MM-banco-conta.journal` — ex: `2026-04-caixa-corrente.journal`

### Template

```hledger
; Extrato Caixa Corrente — Titular
; Periodo: 01/04/2026 a 30/04/2026
; Saldo anterior: R$ XXXX,XX
; Saldo final:    R$ XXXX,XX

; === CREDITOS ===

2026-04-05 Concat All Servicos  ; aporte empresa
    assets:banco:caixa:corrente           BRL 20000.00
    income:salario                        BRL -20000.00

; === TRANSFERENCIAS ENTRE CONTAS PROPRIAS ===

2026-04-05 Transferencia corrente => poupanca
    assets:banco:caixa:poupanca           BRL 10000.00
    assets:banco:caixa:corrente           BRL -10000.00

; === DESPESAS ===

2026-04-06 Supermercado Master
    expenses:alimentacao:supermercado     BRL    99.90  ; tipo: CUSTOS FIXOS
    assets:banco:caixa:corrente           BRL   -99.90
```

### Estrategia de escrita

- **Ate 10 transacoes**: preferir `hledger_add_transaction` (uma por vez, com validacao)
- **Mais de 10 transacoes**: escrever arquivo diretamente, seguido de `hledger_check` imediato

### Incluir no main.journal

Adicionar linha `include YYYY-MM-banco-conta.journal` ao main.journal.

## Transferencias

- **Saida para conta propria** (corrente → poupanca): registrar aqui (conta ORIGEM)
- **Entrada de conta propria** (poupanca → corrente): **PULAR** — ja registrado no journal da origem
- **Pagamento de fatura de cartao**: registrar aqui como saida para `liabilities:cartao:NOME`
- **Transferencia para XP** (pagamento fatura XP): registrar transferencia `caixa:corrente → xp:corrente`

## Rendimentos de Poupanca

Sempre categorizar como `income:rendimentos`:

```hledger
2026-04-01 Juros poupanca
    assets:banco:caixa:poupanca   BRL   41.37
    income:rendimentos            BRL  -41.37
```

## Reconciliacao

1. Calcular saldo esperado: saldo anterior + soma(creditos) - soma(debitos)
2. Comparar com saldo final do banco
3. Se diferenca existir e for pequena, adicionar ajuste:

```hledger
2026-04-30 Ajuste de conciliacao
    equity:saldo-inicial                  BRL    XX.XX
    assets:banco:caixa:corrente           BRL   -XX.XX
```

4. Se diferenca for grande, investigar transacoes faltantes antes de ajustar

### Saldo de abertura (mes sem journal anterior completo)

Se o journal do mes anterior esta incompleto:

```hledger
2026-04-01 Saldo abertura poupanca abr/2026
    assets:banco:caixa:poupanca           BRL 37446.56
    equity:saldo-inicial                  BRL -37446.56
```

Calcular: `saldo_final_banco - movimentacoes_do_mes`.

## Validacao

Rodar protocolo de validacao do hledger-base:

```
hledger_check(file="$LEDGER_FILE")
hledger_balance(file="$LEDGER_FILE", query="assets:banco:caixa:corrente")
```

O saldo deve bater com o saldo final do extrato bancario.
