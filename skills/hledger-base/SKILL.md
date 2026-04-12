---
name: hledger-base
description: Referencia para gerenciamento de journals hledger — MCP tools, estrutura de journal, padroes de transacao, validacao e pitfalls. Base para os skills hledger-extrato e hledger-fatura.
triggers:
  - hledger
  - journal
  - balance report
  - chart of accounts
  - hledger-mcp
---

# hledger — Referencia Base

## Visao geral

- **hledger 1.52** — plain-text double-entry accounting CLI
- **hledger-mcp** — MCP server que expoe comandos hledger como tools
- **Moeda**: BRL (Brazilian Real)
- **Journal**: caminho definido pela variavel de ambiente `$LEDGER_FILE` ou configuracao MCP

> Antes do primeiro uso, confirme o caminho do journal com o usuario ou verifique a configuracao MCP.

## MCP Tools — usar SEMPRE

O hledger-mcp expoe estas tools. **Sempre usar MCP em vez de editar arquivos diretamente.**

| Tool | Descricao |
|---|---|
| `hledger_balance` | Saldos por conta |
| `hledger_register` | Registro de transacoes (historico) |
| `hledger_print` | Listar entradas do journal |
| `hledger_check` | Validar integridade do journal |
| `hledger_add_transaction` | **Adicionar transacao** (metodo preferido de escrita) |
| `hledger_accounts` | Listar contas |
| `hledger_payees` | Listar favorecidos |
| `hledger_incomestatement` | Demonstracao receitas/despesas |
| `hledger_balancesheet` | Balanco patrimonial |
| `hledger_cashflow` | Fluxo de caixa |
| `hledger_import` | Importar de arquivos de dados |
| `hledger_find_entry` | Buscar transacoes por query |
| `hledger_files` | Listar arquivos do journal |

**CRITICO**: o parametro `file` requer **path absoluto** (ex: `/home/user/finance/main.journal`). Paths relativos falham silenciosamente.

### Quando escrever arquivo diretamente

Usar `hledger_add_transaction` para adicionar transacoes individuais. Para lotes grandes (>10 transacoes, ex: fatura de cartao com 50 itens), escrever o arquivo journal diretamente eh aceitavel — mas **DEVE** ser seguido imediatamente por `hledger_check`.

## Estrutura do Journal

```
main.journal                         ; entry point — inclui todos os journals
accounts.journal                      ; chart of accounts
YYYY-MM-banco-conta.journal           ; extrato conta bancaria (um por mes)
YYYY-MM-fatura-BANCO.journal          ; fatura cartao de credito (um por ciclo)
```

### main.journal

```hledger
include accounts.journal
include 2026-03-caixa-corrente.journal
include 2026-03-fatura-xp.journal
; ... demais includes

; Saldos iniciais (uma unica vez, na data de corte)
2026-02-28 Saldos iniciais
    assets:banco:caixa:corrente     BRL -275.52
    assets:banco:caixa:poupanca     BRL 27759.99
    ; ... demais contas
    equity:saldo-inicial
```

**NAO colocar saldos de cartao de credito nos Saldos iniciais.** Cartoes usam o padrao "fatura anterior" no proprio journal da fatura (ver skill hledger-fatura).

### Transacoes periodicas (budget)

```hledger
~ monthly
    expenses:alimentacao:supermercado  BRL 2500.00
    expenses:moradia:agua              BRL 400.00
    ; ... demais categorias
    assets:banco:caixa:corrente       BRL -23508.00
```

Contrapartida DEVE ter valor explicito (nao auto-balance) quando ha muitos postings.

## Padroes de Transacao

### Formato padrao de despesa

```hledger
2026-04-01 Supermercado Master
    expenses:alimentacao:supermercado  BRL   99.90  ; tipo: CUSTOS FIXOS
    assets:banco:caixa:corrente        BRL  -99.90
```

### Tags de tipo orcamentario

Toda despesa pessoal deve ter tag `; tipo:` com um destes valores:
- `CUSTOS FIXOS` — despesas essenciais/fixas
- `CONFORTO` — conforto/discricionario
- `PRAZERES` — lazer/experiencias
- `LIBERDADE FINANCEIRA` — investimentos/previdencia
- `AUMENTAR RENDA` — educacao/ferramentas profissionais

### Transferencia entre contas proprias

Registrar **uma vez so**, no journal da conta de **ORIGEM**:

```hledger
2026-04-01 Transferencia poupanca => corrente
    assets:banco:caixa:corrente    BRL  5000.00
    assets:banco:caixa:poupanca    BRL -5000.00
```

Se a mesma transferencia aparece nos dois extratos, **NAO registrar duas vezes**. Quem debita registra; quem credita ignora.

### Rendimentos de poupanca

```hledger
2026-04-01 Juros poupanca
    assets:banco:caixa:poupanca   BRL   41.37
    income:rendimentos            BRL  -41.37
```

### Cobertura equity (pagamento pre-corte)

Quando um pagamento ocorreu ANTES da data do saldo inicial, ele ja esta embutido no balanco de abertura. Registrar cobertura para nao duplicar:

```hledger
; O pagamento ja estava incluso no saldo inicial
2026-02-09 Pagamento fatura Caixa Mastercard
    liabilities:cartao:caixa-mastercard   BRL   164.66
    assets:banco:caixa:corrente           BRL  -164.66

; Reverter o impacto na conta corrente (ja contado no saldo inicial)
2026-02-09 Cobertura saldo inicial
    assets:banco:caixa:corrente           BRL   164.66
    equity:saldo-inicial                  BRL  -164.66
```

## Protocolo de Validacao

Apos **qualquer** escrita no journal, executar na ordem:

1. **`hledger_check`** — valida sintaxe e balanceamento
2. **`hledger_balance`** — verificar saldo da conta afetada
3. **Comparar** o saldo com o valor real do banco/extrato

```
hledger_check(file="<JOURNAL_DIR>/main.journal")
hledger_balance(file="<JOURNAL_DIR>/main.journal", query="<conta-afetada>")
```

Se o saldo nao bater, investigar antes de adicionar ajuste.

## Categorizacao

O mapeamento payee→conta vive em `skills/data/payee-categories.json` no repositorio finance-hledger. Ver skills hledger-extrato e hledger-fatura para instrucoes de uso.

## hledger 1.52 — JSON Format

### incomestatement / balancesheet (`-O json`)

```json
{
  "cbrDates": [[{"contents": "2026-01-01", "tag": "Exact"}, {"contents": "2026-02-01", "tag": "Exact"}]],
  "cbrSubreports": [
    ["Revenues", {"prRows": [...], "prTotals": {...}}],
    ["Expenses", {"prRows": [...], "prTotals": {...}}]
  ]
}
```

- `cbrSubreports` eh lista de tuplas `[title, report]` (nao dicts)
- Row: `prrAmounts[period_idx][0].aquantity.floatingPoint` → valor numerico
- Totais: `prTotals.prrAmounts[period_idx][0].aquantity.floatingPoint`
- Chave eh **`prTotals`** (NAO `prrTotals`)

### register (`-O json`)

```json
[
  ["2026-04-01", null, "Descricao",
    {"paccount": "expenses:familia", "pamount": [{"aquantity": {"floatingPoint": 4000}}]},
    [{"aquantity": {"floatingPoint": -4000}}]
  ]
]
```

- `t[0]` = data, `t[2]` = descricao, `t[3]` = posting (account + amount), `t[4]` = running balance

### balance (`-O json`)

```json
[[["expenses:familia", "expenses:familia", 0, [{"aquantity": {"floatingPoint": 6500}}]]]]
```

- `row[0]` = short name, `row[1]` = full name, `row[3][0].aquantity.floatingPoint` = valor

## Pitfalls

### Formatacao
- **2 espacos obrigatorios** entre nome da conta e valor. Um espaco causa erro "unbalanced":
  ```
  ; ERRADO
  expenses:alimentacao BRL 100.00
  ; CERTO
  expenses:alimentacao  BRL 100.00
  ```

### Moeda
- Cuidado com **BRL vs BHL** — `hledger check` NAO detecta moeda desconhecida. Verificar com grep apos escrita.

### Periodos
- Usar `-b YYYY-MM-DD -e YYYY-MM-DD`. NAO usar `--period 2026-01/2026-02` (erro de parse).

### Flags nao suportadas no hledger 1.52
- `--newest N`, `--date-format`, `--reverse` no register/print
- `--csv` → usar `-O csv`

### Duplicacao
- **Transferencias**: registrar so na conta ORIGEM
- **Cartao de credito**: saldo NAO vai em "Saldos iniciais" do main.journal — usar padrao "fatura anterior"

### Escrita de arquivos
- Usar path absoluto para MCP (`/home/...`, nunca `~/...`)
- NAO usar heredoc (`cat << EOF`) no terminal — pode poluir arquivo
