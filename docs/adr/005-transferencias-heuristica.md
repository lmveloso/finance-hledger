# ADR-005: Transferências entre contas detectadas por heurística automática

**Status:** Accepted
**Date:** 2026-04
**Phase origin:** Fase 1 (Magic Import)
**Supersedes:** —
**Superseded by:** —

## Context

Ao importar extratos bancários, uma das armadilhas clássicas é: o Banco A mostra "TED para Banco B R$ 2.000", e o Banco B mostra "TED recebida R$ 2.000". Se o sistema lança cada um como transação independente, vira **duplicidade** no journal (uma saída e uma entrada para o que é na verdade uma única transferência interna).

Opções eram:
1. Tratar só manualmente: usuário decide na staging.
2. Heurística automática desde o dia 1.
3. Sem suporte a transferências no MVP.

## Decision

**Heurística automática no dia 1**. O sistema compara `(valor_absoluto, data ±2 dias, conta ≠)` entre itens do lote e entre o lote e o journal dos últimos 3 dias. Matches viram marcação visual "transferência sugerida" na staging, com ação rápida "confirmar par".

## Consequences

### Positivas
- Duplicidade é o pior bug possível aqui (distorce receitas, despesas, tudo). Atacar cedo é barato.
- Usuário tem solicitação explícita: "dinheiro sai de uma conta e tem que entrar em outra."
- UX melhor: ao importar os dois extratos, o sistema já sugere o pareamento.

### Negativas
- Heurística pode gerar falsos positivos (duas transações do mesmo valor em datas próximas que não são transferência). Mitigado com confirmação explícita do usuário.
- Exige lógica extra na fase Enrich do Magic Import.

## Alternatives considered

- **Só manual no MVP + heurística na v2**: perde a oportunidade de resolver cedo. Rejeitado.
- **Só manual sempre**: coloca toda a carga no usuário, o que contradiz a proposta do Magic Import.

## Related
- `docs/03-PRD-magic-import.md` §7 (RF-3.3, RF-3.4)
