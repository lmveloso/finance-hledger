# ADR-011: Parcelamentos voltam ao modelo `~ monthly` (restaura ADR-009)

**Status:** Accepted
**Date:** 2026-04
**Phase origin:** Fase 1 (visão mensal do dashboard) + uso real do journal
**Supersedes:** ADR-010
**Superseded by:** —

## Context

ADR-009 estabeleceu que parcelamentos seriam representados por declarações `~ monthly from X to Y` com tag `parcelamento: NOME N/M`. ADR-010 substituiu esse modelo por uma transação única na data da compra com tag `parcelamento: NOME Nx`, motivado pelo PRD `07-PRD-dashboard-cartao-credito.md` §2.2 (visualizar o compromisso total no momento da compra).

Após uso prático do journal e revisão do modelo mental do usuário, identificamos que o modelo do ADR-010 não corresponde a como o usuário pensa sobre suas finanças mensais. Para o usuário:

- **Parcela é despesa do mês em que cai na fatura.** Uma compra de R$ 5.000 em 10× não é uma despesa de R$ 5.000 num mês só — são dez despesas mensais de R$ 500.
- **Provisão é fundamental.** O usuário precisa ver, no Plano e na Previsão, exatamente quanto já está comprometido para os próximos meses por parcelas em curso. Sem isso, a previsão de fluxo de caixa subestima as saídas.
- **Picos artificiais distorcem a leitura mensal.** Lançar R$ 5.000 num único mês infla a despesa daquele mês de uma forma que não reflete o impacto real no orçamento.

A inspeção do journal real (em 2026-04) confirmou:

- Todas as séries ativas estão no formato `N/M` (ADR-009). Não houve adoção do formato `Nx` (ADR-010).
- O arquivo `parcelamentos.journal` cobre integralmente o futuro de cada série ativa via `~ monthly`.
- Os endpoints já consomem o modelo 009 (`/api/installments` usa `print --forecast tag:parcelamento`).

A inconsistência estava entre os ADRs (que apontavam para 010) e a realidade do journal + parte do código (que continuou em 009). Este ADR restaura coerência.

## Decision

**Restaurar o modelo do ADR-009 para parcelamentos de cartão de crédito.**

Cada parcela é representada como uma transação no mês em que cai na fatura. Parcelas futuras vivem como declarações `~ monthly from <início> to <fim>` em `parcelamentos.journal`. Parcelas já pagas vivem como entradas one-off nos arquivos de fatura correspondentes. Todas carregam a tag `parcelamento: NOME N/M`.

```hledger
; Em 2026-04-fatura-bb.journal — parcela já paga
2026-04-09 Decathlon
    expenses:lazer:esportes      BRL 237.47  ; parcelamento: Decathlon 2/4
    liabilities:cartao:bb-visa   BRL -237.47

; Em parcelamentos.journal — parcelas futuras (3/4 e 4/4)
~ monthly from 2026-05-01 to 2026-06-30
    expenses:lazer:esportes      BRL 237.47  ; parcelamento: Decathlon 3/4
    liabilities:cartao:bb-visa
```

### Tag

Formato canônico: `parcelamento: <NOME> <N>/<M>` (regex backend: `^(?P<name>.+?)\s+(?P<n>\d+)/(?P<m>\d+)\s*$`).

- `<NOME>` é estável entre todas as parcelas da série e na declaração `~ monthly`.
- `<N>` é o número da parcela específica (na declaração `~ monthly`, costuma-se colocar o N da primeira parcela futura — é texto fixo replicado em cada ocorrência gerada pelo forecast).
- `<M>` é o total da série.

### Detecção pelo Magic Import

Quando uma fatura traz `PARC N/M` ou similar:

1. Lançar a parcela atual como one-off na própria fatura (com a tag).
2. Verificar se já existe declaração `~ monthly` para a série em `parcelamentos.journal`.
   - Se sim: nada a fazer (a declaração já cobre o futuro).
   - Se não: criar `~ monthly from <próximo_mês> to <último_mês_da_série>` cobrindo as parcelas futuras.
3. Quando a última parcela cair (todos os N/M virarem passado), mover/remover a declaração para `parcelamentos-arquivados.journal`.

### Visualização no dashboard

- **Aba Mês**: a parcela do mês corrente aparece como qualquer outra despesa.
- **Aba Plano (decaimento de dívida)**: lista cada série ativa com `paid`, `remaining`, `monthly_value`, `end_date`. Fonte: `/api/installments` (forecast).
- **Aba Previsão / Fluxo**: as parcelas futuras entram naturalmente nas projeções porque `--forecast` é aplicado à query.

## Consequences

### Positivas

- **Modelo alinhado com a leitura mensal do usuário** — cada mês mostra exatamente o que vai sair da conta naquele mês.
- **Provisão automática** de parcelas futuras em qualquer relatório que rode com `--forecast`.
- **Sem picos artificiais** na despesa mensal por compras grandes parceladas.
- **Coerência restaurada** entre journal, endpoints existentes e ADRs.
- **Sem migração necessária** — o journal já está nesse formato.

### Negativas

- **Compromisso total não fica visível como saldo do passivo** no momento da compra. Mitigado: a aba Plano agrega o `remaining_value` por série e mostra o total comprometido — a informação está disponível, só não vive como saldo do passivo.
- **Parcelas pré-journal podem inflar `remaining`** quando a série começou antes do journal (ex: parcela 6/12 sendo a primeira no journal). Backend conta `paid` pelas one-offs ≤ hoje. Trade-off aceito: backfill manual ou ajuste de M, conforme o caso de uso.
- **Edge case "parcela final isolada"**: se só a última parcela aparece no journal (ex: `Havan 4/4` sem 1..3), backend reportará `paid=1, remaining=3`. Trade-off aceito; documentado no skill `hledger-fatura`.

## Alternatives considered

- **Manter ADR-010 (compra única + tag `Nx`)**: rejeitado pelos motivos no §Context — não corresponde ao modelo mental do usuário e inflama a despesa do mês da compra.
- **Modelo híbrido (compra total + cronograma de pagamentos)**: descartado no ADR-010 por duplicar representação; continua não sendo desejável.
- **Banco de dados externo com cronograma**: descartado no ADR-009 por duplicar a fonte de verdade.

## Implementation notes

### Backend

- `app/credit_cards/installments.py`:
  - Regex muda de `^\s*(?P<name>.+?)\s+(?P<n>\d+)\s*[xX]\s*$` para `^\s*(?P<name>.+?)\s+(?P<n>\d+)/(?P<m>\d+)\s*$`.
  - `parse_parcelamento_tag` retorna `(name, n, m)`.
  - `count_live_for_card` deixa de usar `purchase_date + N months`. Passa a contar séries ativas usando `print --forecast tag:parcelamento` filtrado por conta — uma série é "live" enquanto tiver alguma ocorrência futura projetada.
- `app/credit_cards/service.py`: `_live_installments` consome a nova lógica.
- Funções helper `add_months`/`is_live` baseadas em `purchase_date` deixam de ser necessárias para parcelamentos.
- Testes (`tests/unit/test_installments_parser.py`, `tests/unit/test_credit_cards_service.py`) reescritos para o novo formato e nova definição de "live".

### Skills

- `skills/hledger-fatura/SKILL.md`: substituir referências a "ADR-009" por "ADR-011 (restaura ADR-009)". Conteúdo do workflow não muda — já estava no modelo 009.
- `skills/hledger-base/SKILL.md`: nada a alterar (já neutro quanto ao modelo).

### Documentação

- `CLAUDE.md`: substituir bullet do ADR-010 pelo do ADR-011.
- `docs/adr/README.md`: atualizar tabela.
- `docs/adr/009-parcelamento-monthly.md`: status passa a `Superseded by ADR-011` (preserva linearidade histórica).
- `docs/adr/010-parcelamento-transacao-unica.md`: status passa a `Superseded by ADR-011`.
- `docs/07-PRD-dashboard-cartao-credito.md` §2.2: nota de errata apontando que a leitura prática do usuário convergiu para o modelo 009; ADR-011 documenta a reversão.

### Saúde do journal (verificada em 2026-04-26)

- 11 séries ativas, todas com cobertura futura completa em `parcelamentos.journal`.
- 2 séries encerradas (Dr Tales, Porto Rico Aqua Park) — mover para `parcelamentos-arquivados.journal` quando conveniente.
- 1 edge case (Havan Umuarama 4/4 isolada) — aceitar reporte aproximado ou backfill manual.

**Surface placement during Fase 1.** The Plano tab remains hidden in Fase U/Fase 1 (see `docs/04-PRD-ui-ux.md` §4.1). Until Plano is reactivated, the comprometido summary surfaces in two places: (1) the Mês card-detail tile shows `Dívida Total = fatura + comprometido` with a "PARCELAS FUTURAS" section listing the active series for that card, and (2) the Fluxo passivo detail panel exposes a "COMPROMISSO FUTURO" section listing upcoming installments per card. The data source remains `/api/installments`; ADR remains structurally accurate. When Plano is reactivated, these surfaces continue to work — they are additive views, not the canonical home.

**Errata 2026-04-28.** The §Negativas "edge case parcela final isolada" trade-off (accepting that series with only an isolated past one-off would be reported as active) is reversed. After deployment, real-world journal data showed phantom series locking comprometido that didn't exist (e.g. `Havan Umuarama 4/4` in 2025-12, no forward declaration). The active filter now requires at least one forecast occurrence with `date > today` — series with only past dates are excluded regardless of `paid < total`. The §Negativas paragraph stands as historical context but is no longer the active behaviour.

**Errata 2026-04-28 (followup).** The §Negativas "parcelas pré-journal podem inflar `remaining`" trade-off is also reversed. The active-series semantic now treats `remaining` as the count of forecast occurrences with `date > today`, identical to the credit-card service. Pre-journal parcels declared in the tag `M` but never lançadas as one-offs no longer inflate `remaining_value` or push the chip's `next_parcel` off-by-N. The route and service are now backed by the same `forecast_parcelamento_transactions` helper to guarantee semantic alignment.

## Related

- `docs/adr/009-parcelamento-monthly.md` — modelo original, agora restaurado por este ADR
- `docs/adr/010-parcelamento-transacao-unica.md` — substituído por este ADR
- `docs/07-PRD-dashboard-cartao-credito.md` §2.2 — argumento original que motivou ADR-010, revisado neste ADR
- `skills/hledger-fatura/SKILL.md` §Parcelamentos — workflow operacional do modelo
