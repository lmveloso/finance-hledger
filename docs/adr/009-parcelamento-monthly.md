# ADR-009: Parcelamentos detectados geram `~ monthly from X to Y` no journal

**Status:** Accepted
**Date:** 2026-04
**Phase origin:** Fase 1 (Magic Import), alimenta Fase D (Dashboard 2.0)
**Supersedes:** —
**Superseded by:** —

## Context

Parcelamentos de cartão de crédito são uma categoria especial de despesa: uma compra gera N transações futuras previsíveis (ex: "ELECTROLUX 3/10" = parcela 3 de 10). A planilha atual rastreia isso à mão em uma aba separada. Precisávamos decidir como modelar no journal:
1. Lançar N transações uma por vez conforme acontecem.
2. Cadastrar metadata externa em SQLite com cronograma.
3. Usar mecanismo nativo do hledger para recorrência.

## Decision

**Usar transações periódicas nativas do hledger** via sintaxe `~ monthly from <data_início> to <data_fim>`:

```hledger
~ monthly from 2026-05-01 to 2026-12-01
    expenses:moradia:equipamentos-novos      371.79  ; parcelamento: ELECTROLUX 3/10
    liabilities:cartão:nubank
```

Quando o Magic Import detecta um padrão de parcelamento numa fatura (ex: `PARCELADO 3/10`, `PARC 03/10`), sugere na staging a criação dessa declaração periódica. Usuário aprova, ajusta ou rejeita.

## Consequences

### Positivas
- **Single source of truth**: o cronograma da parcela vive em um único lugar (no journal).
- **Aba Plano (Dashboard 2.0) alimentada automaticamente**: basta rodar `hledger --forecast` para ver as parcelas futuras.
- **Alterações são triviais**: adiantou a quitação? Edita a `to` da declaração. Pagou diferente? Edita o valor.
- Versionado com git, igual ao resto do journal.

### Negativas
- Usuário precisa entender (minimamente) a sintaxe `~ monthly` do hledger. Mitigado: a detecção e geração automática esconde isso na maioria dos casos.
- Se o Magic Import detectar errado (ex: achar parcela onde não é), polui o journal com periódica indevida. Mitigado: staging exige aprovação explícita.

## Alternatives considered

- **Lançar N transações uma por vez**: o usuário perde a noção do cronograma total; editar a parcela exige N edições.
- **Metadata externa em SQLite com cronograma**: fonte duplicada da verdade (journal + SQLite), dois lugares para manter.

## Implementation notes

- Detecção de parcelamento em `app/magic_import/enrich.py`: regex em descrição bruta da fatura (`PARCELADO N/M`, `PARC NN/MM`, `N DE M`).
- Geração da declaração `~ monthly` em `app/hledger/client.py` como método `add_periodic_transaction`.
- Tag `parcelamento: DESCRIÇÃO N/M` obrigatória para rastrear origem.
- Aba Plano (Dashboard 2.0) filtra transações futuras por essa tag para a vista "decaimento de dívida".

## Related
- `docs/02-PRD-dashboard-v2.md` §7 (aba Plano)
- `docs/03-PRD-magic-import.md` §7 (RF-3.6, RF-4.7)
