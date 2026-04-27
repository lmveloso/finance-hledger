# Importar Extrato Bancario

Carregue depois de ler o `SKILL.md` base. Reaproveita: inicializacao, MCP tools, padroes de transacao, categorizacao, plano de lancamentos e validacao definidos la.

## Workflow

1. **Ler** o extrato (JSON, PDF, CSV, imagem)
2. **Parsear** transacoes (data, descricao, valor, sinal C/D)
3. **Verificar** soma: saldo anterior + creditos - debitos = saldo final do banco
4. **Classificar e confirmar** seguindo SKILL.md §Categorizacao e §Plano de Lancamentos (apresentar lista numerada com auto + resolvidos, exigir `OK` explicito antes de qualquer escrita)
5. **Escrever** arquivo journal
6. **Incluir** no main.journal (`include YYYY-MM-banco-conta.journal`)
7. **Validar** — rodar protocolo de validacao (ver SKILL.md)

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

## Classificacao e confirmacao

Ver SKILL.md §Categorizacao e §Plano de Lancamentos. NAO escrever no journal sem `OK` explicito sobre a lista numerada completa (auto-classificados inclusos).

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
3. Se houver qualquer diferenca, **investigar antes de ajustar** (lancamentos faltantes, sinal trocado, transferencia duplicada). NUNCA criar ajuste automatico sem confirmacao do usuario. Se o usuario autorizar o ajuste:

```hledger
2026-04-30 Ajuste de conciliacao
    equity:saldo-inicial                  BRL    XX.XX
    assets:banco:caixa:corrente           BRL   -XX.XX
```

### Saldo de abertura (mes sem journal anterior completo)

Se o journal do mes anterior esta incompleto:

```hledger
2026-04-01 Saldo abertura poupanca abr/2026
    assets:banco:caixa:poupanca           BRL 37446.56
    equity:saldo-inicial                  BRL -37446.56
```

Calcular: `saldo_final_banco - movimentacoes_do_mes`.

## Validacao

Rodar protocolo canonico do SKILL.md:

```bash
bash skills/hledger/scripts/validate.sh "$LEDGER_FILE"
hledger -f "$LEDGER_FILE" balance "assets:banco:caixa:corrente"
```

O saldo deve bater com o saldo final do extrato bancario.
