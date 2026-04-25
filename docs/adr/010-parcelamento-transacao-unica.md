# ADR-010: Compras parceladas lançadas como transação única na data da compra

**Status:** Accepted
**Date:** 2026-04
**Phase origin:** Fase D (Dashboard 2.0), refina Fase 1 (Magic Import)
**Supersedes:** ADR-009
**Superseded by:** —

## Context

O ADR-009 estabeleceu que parcelamentos de cartão de crédito seriam representados via transações periódicas nativas do hledger (`~ monthly from X to Y`), com cada parcela gerando uma transação de despesa futura conforme cai no calendário.

Esse modelo resolveu bem a questão **mecânica** de como representar o cronograma no journal, mas foi adotado antes de uma reflexão mais profunda sobre o **modelo conceitual** subjacente — especificamente, sobre quando uma compra parcelada deve ser reconhecida como despesa.

Ao trabalhar o redesenho do dashboard (PRD `07-PRD-dashboard-cartao-credito.md`) e modelar explicitamente a dívida de cartão como passivo visível, identificamos que o modelo do ADR-009 entra em conflito com três objetivos do dashboard:

1. **Refletir o consumo no momento em que ele aconteceu** (regime de competência correto)
2. **Tornar visível o compromisso total assumido**, não apenas as parcelas que já caíram
3. **Mostrar o passivo do cartão como saldo significativo**, não como uma conta que oscila em equilíbrio mensal

Sob o modelo do ADR-009, uma compra de R$ 5.000 em 10x feita em janeiro distribui R$ 500 de despesa por dez meses. O dashboard de janeiro mostra apenas R$ 500 de consumo, e o passivo do cartão sobe e desce em equilíbrio mensal — mascarando o fato de que vocês assumiram R$ 5.000 de compromisso naquele mês.

Esse é exatamente o anti-padrão que o PRD `07-PRD-dashboard-cartao-credito.md` (§2.2) identifica como dor central a ser resolvida.

## Decision

**Lançar compras parceladas como uma única transação na data da compra original**, com o valor total da compra como despesa e como aumento do passivo do cartão.

```hledger
2026-01-15 ELECTROLUX
    expenses:moradia:equipamentos-novos      3717.90  ; parcelamento: ELECTROLUX 10x
    liabilities:cartão:nubank
```

As parcelas subsequentes que aparecem em faturas futuras (`PARCELADO 2/10`, `PARCELADO 3/10` etc.) **não geram lançamentos novos** — são apenas o cronograma de quitação da dívida já registrada. O Magic Import as detecta e pula explicitamente, conforme regra de auto-cura (PRD `07-PRD-dashboard-cartao-credito.md` §3.3.2).

A redução do passivo acontece via pagamento da fatura, que abate o saldo de `liabilities:cartão:*` no valor exato cobrado.

### Rastreabilidade do cronograma

A tag `parcelamento: DESCRIÇÃO Nx` (ex: `parcelamento: ELECTROLUX 10x`) é mantida na transação como metadata. O número de parcelas e o valor de cada uma podem ser derivados do total e do N. A aba Plano (Dashboard 2.0) usa essa tag combinada com o saldo do passivo para projetar o decaimento da dívida.

### Detecção pelo Magic Import

A detecção de padrão de parcelamento (`PARCELADO N/M`, `PARC NN/MM`, `N DE M`) continua válida, mas o tratamento muda:

| Linha detectada na fatura | Ação |
|---|---|
| `PARCELADO 1/N` (primeira parcela visível) | Verificar se a transação total já existe na data da compra; se não, lançar retroativamente o total |
| `PARCELADO X/N` com X > 1 | Verificar se a transação total já existe; se sim, pular; se não, lançar retroativamente o total |

A regra é uniforme: toda parcela representa uma compra com data, valor total e descrição. Se a compra já está no journal, pula. Se não está, lança retroativo.

## Consequences

### Positivas

- **Consumo é reconhecido no momento em que aconteceu**, refletindo o fato gerador da dívida
- **Compromisso total fica visível** no saldo do passivo, sem mascaramento
- **Dashboard responde corretamente** a perguntas como "quanto vocês devem hoje?" e "quanto cresceu a dívida esse mês?"
- **Auto-cura na importação**: parcelas de compras anteriores ao sistema (ou que escaparam) são reconstruídas retroativamente sem necessidade de migração manual
- **Modelo conceitualmente coerente**: alinha com como contadores tratam compras a prazo (despesa + passivo no fato gerador, amortização posterior)
- **Aba Plano simplifica**: o decaimento da dívida deriva do saldo do passivo + tag de parcelamento, sem depender do mecanismo `--forecast`

### Negativas

- **Meses com compras parceladas grandes mostram picos de despesa** que podem chocar visualmente. Mitigado: o dashboard tem visões separadas (despesa por competência, saída de caixa, variação de dívida) que contam a história inteira — o pico de despesa é correto e útil
- **Migração de declarações `~ monthly` existentes**: se houver declarações criadas sob o modelo do ADR-009, precisam ser convertidas (ver Implementation Notes)
- **Relatórios de meses passados podem mudar** quando uma fatura nova é processada e a auto-cura lança uma compra retroativamente. Mitigado: o dashboard exibe data da última atualização (PRD `07-PRD-dashboard-cartao-credito.md` §3.4 Adição 4)

## Alternatives considered

- **Manter o ADR-009 (parcela como despesa recorrente via `~ monthly`)**: rejeitado porque distribui o consumo ao longo do tempo em vez de reconhecê-lo no fato gerador, e mascara o compromisso total no passivo. Era a decisão anterior; este ADR a substitui.

- **Modelo híbrido (compra total + `~ monthly` para pagamentos)**: lançar a compra inteira na data + usar transações periódicas apenas para amortizações futuras do passivo. Tecnicamente possível, mas duplica representação do mesmo cronograma e introduz complexidade sem ganho real — o pagamento da fatura já abate o passivo automaticamente.

- **Lançar N transações reais (não periódicas) uma por vez**: rejeitado pelo ADR-009 por bons motivos que continuam válidos — perde-se a noção do cronograma total e editar exige N edições.

## Implementation notes

### Mudanças no Magic Import (`app/magic_import/`)

- `enrich.py`: a detecção de padrão de parcelamento (`PARCELADO N/M` etc.) continua, mas o output muda — em vez de propor uma declaração `~ monthly`, propõe uma transação única na data da compra com a tag `parcelamento: DESCRIÇÃO Nx`
- Adicionar a regra de auto-cura: ao processar uma linha de parcela, verificar primeiro se a transação total já existe no journal (match por data + valor total + descrição aproximada). Se sim, pular. Se não, lançar retroativamente
- Para match aproximado de descrição, considerar substring/fuzzy — faturas frequentemente truncam ou abreviam nomes
- Quando a confiança do match for baixa (descrição não bate, mas data e valor sim), levantar para confirmação humana via staging

### Mudanças no cliente hledger (`app/hledger/client.py`)

- Método `add_periodic_transaction` (introduzido pelo ADR-009) deixa de ser usado para parcelamentos; pode ser removido se não tiver outro uso
- Reforçar `add_transaction` para suportar a tag `parcelamento`

### Migração de declarações `~ monthly` existentes

Se existem declarações `~ monthly` no journal criadas sob o modelo do ADR-009, é necessária migração:

1. Para cada declaração `~ monthly from D1 to D2` com despesa E e passivo P:
   - Calcular o valor total: V_total = (número de meses entre D1 e D2) × V_mensal
   - Lançar uma transação única em D1 (ou na data da compra original, se conhecida) com V_total na despesa e no passivo, com tag `parcelamento: DESCRIÇÃO Nx`
   - Remover a declaração `~ monthly`
2. Validar que o saldo do passivo após migração é consistente (despesas totais lançadas − pagamentos de fatura registrados = saldo atual)

Se nenhuma declaração `~ monthly` para parcelamento estiver em uso ainda, a migração é trivial — apenas adotar o novo padrão a partir da próxima fatura.

### Aba Plano (Dashboard 2.0)

- Deixa de usar `hledger --forecast` para projetar parcelas
- Passa a derivar a projeção do **saldo atual do passivo** + tags `parcelamento` das transações originais, calculando o cronograma esperado de amortização
- A vista "decaimento de dívida" fica equivalente, mas a fonte de dados é mais simples (uma transação real por compra, em vez de N transações futuras geradas por forecast)

## Related

- `docs/07-PRD-dashboard-cartao-credito.md` — PRD que motivou esta revisão (especialmente §2.2, §3.2, §3.3)
- `docs/02-PRD-dashboard-v2.md` §7 (aba Plano) — implementação afetada por este ADR
- `docs/03-PRD-magic-import.md` §7 (RF-3.6, RF-4.7) — requisitos funcionais do Magic Import a serem revisados
- `docs/adr/009-parcelamento-monthly.md` — ADR substituído por este
