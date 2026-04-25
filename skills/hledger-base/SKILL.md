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

## Inicializacao (OBRIGATORIO — primeira acao)

Antes de QUALQUER chamada MCP ou escrita de arquivo, resolver o path do journal:

1. Executar no terminal: `echo $LEDGER_FILE`
2. Se o resultado for vazio ou inexistente, **PERGUNTAR ao usuario**
3. Usar o path resultante como `file` em **TODAS** as chamadas MCP

**NUNCA** assumir, adivinhar ou usar paths relativos.
MCP tools NAO expandem `~` nem variaveis de ambiente — passar sempre o path absoluto literal.

## Visao geral

- **hledger 1.52** — plain-text double-entry accounting CLI
- **hledger-mcp** — MCP server que expoe comandos hledger como tools
- **Moeda**: BRL (Brazilian Real)

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
accounts.journal                      ; chart of accounts + declaração de commodity
parcelamentos.journal                 ; declarações ~ monthly de parcelas ativas (ADR-009)
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

## Protocolo de Validacao (OBRIGATORIO apos qualquer escrita)

Executar **sempre na ordem**, parar no primeiro erro:

1. **`hledger check -s`** (strict) — sintaxe + balanceamento + **contas declaradas** + **commodities declaradas**
2. **`hledger check ordereddates`** — datas em ordem nao-decrescente dentro de cada arquivo
3. **`hledger_balance`** — saldo das contas afetadas vs banco/extrato real

```bash
hledger -f "$LEDGER_FILE" check -s
hledger -f "$LEDGER_FILE" check ordereddates
hledger -f "$LEDGER_FILE" balance "<conta-afetada>"
```

Se `check -s` falhar com "account ... has not been declared":
- **Pare e adicione a declaração em `accounts.journal`**, nao force a transação.

Se `check ordereddates` falhar:
- Reordene as transacoes no arquivo ofensor. Recurso pratico:
  ```bash
  hledger -f arquivo.journal print --explicit > /tmp/sorted.journal
  # preserve cabeçalho (linhas `;` no topo) + concatene /tmp/sorted.journal
  ```

Se o saldo nao bater, investigar antes de adicionar ajuste.

### Checks opcionais (uso pontual)

- `hledger check uniqueleafnames` — bloqueia leaf names repetidos. **Desabilitar** se houver multiplos `:corrente` (um por banco) — eh padrão e desejado.
- `hledger check payees` / `tags` — exigem declaração explicita de cada payee/tag. **Nao usar** sem antes declarar o universo fechado.

### Script de validacao

Existe um script canonico que roda toda a suite acima:

```bash
bash skills/hledger-base/scripts/validate.sh "$LEDGER_FILE"
```

## Categorizacao

O mapeamento payee→conta vive em `payee-categories.json` junto a este skill (`skills/hledger-base/payee-categories.json`). Ver skills hledger-extrato e hledger-fatura para instrucoes de uso.

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

### Commodity (CRITICO — declarar uma única vez)

`hledger check -s` exige diretiva `commodity` para todas as moedas usadas. Adicionar no topo de `accounts.journal`:

```hledger
; Base: BRL, ponto-decimal sem separador de milhar (formato hledger nativo).
commodity BRL 1000.00
```

**A diretiva define o formato de parsing.** Se voce declarar `1000.00` (ponto-decimal) e algum lançamento usar `BRL 333,00` (vírgula-decimal brasileiro), hledger interpreta a vírgula como separador de milhar e o valor vira `33300`. **Sintoma**: API retorna valores 100x maiores que o esperado.

Padronize TODOS os arquivos para o mesmo formato (recomendado: ponto-decimal). Para converter um arquivo brasileiro:

```bash
python3 -c "import re,sys; p=sys.argv[1]; s=open(p).read(); open(p,'w').write(re.sub(r'(BRL\s+-?\d+),(\d{2})\b', r'\1.\2', s))" arquivo.journal
```

### Moeda
- Cuidado com **BRL vs BHL** — agora `hledger check -s` detecta (vai recusar `BHL` se nao declarado), mas verificar tambem com grep apos escrita.

### Contas (DECLARAR ANTES DE USAR)

Toda conta usada em qualquer posting **deve** estar declarada em `accounts.journal`. Workflow ao introduzir conta nova:

1. Antes de escrever a transação, abra `accounts.journal` e adicione `account expenses:nova:categoria  ; descricao breve`.
2. Salve. Só então escreva a transação.
3. Rode `hledger check -s` — se passar, OK.

Para listar contas usadas mas nao declaradas em um journal existente:

```bash
diff <(hledger accounts --declared | sort) <(hledger accounts --used | sort) | grep '^> ' | sed 's/^> //'
```

### Ordem cronologica dentro de arquivos

Cada arquivo deve ter datas em ordem **não-decrescente** (extrato/fatura nao-cronologico = falha de `ordereddates`). Bancos as vezes emitem com lançamentos fora de ordem — sortear sempre apos importar.

**Recurso**: `hledger -f arquivo.journal print --explicit` emite os mesmos transactions ordenados por data, preservando tags. Concatenar com o cabeçalho original (linhas `;`):

```bash
awk '/^[^;]/ && !/^[[:space:]]*$/ { exit } { print }' arquivo.journal > /tmp/header
hledger -f arquivo.journal print --explicit > /tmp/body
cat /tmp/header /tmp/body > arquivo.journal
```

### Lançamentos retroativos (data anterior ao período do arquivo)

Faturas de cartão e extratos as vezes contém entradas com data **antes** do período do arquivo (parcelas, lançamentos atrasados). Manter a **data real** do evento (não rebatizar para o período do arquivo) — isso preserva a verdade economica para queries por mês. O arquivo continua identificavel pelo nome, não pelo conteúdo cronológico.

Para casos onde voce queira tanto a data fatura quanto a data compra, hledger suporta **data secundaria**:

```hledger
2026-04-05=2026-01-27 AM Presentes (filha)
    liabilities:cartao:bb-visa   BRL -167.40
    expenses:presentes            BRL  167.40
```

Primary date = lançamento na fatura. Secondary date (após `=`) = data real da compra. Queries com `--date2` usam a secundaria.

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

### Path hardcoded
NUNCA copiar o path do journal de memoria de sessao anterior. Sempre resolver
`$LEDGER_FILE` no inicio de cada sessao. O path pode mudar entre maquinas/usuarios.
