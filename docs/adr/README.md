# Architecture Decision Records

Cada ADR documenta uma decisão arquitetural do projeto — contexto, decisão tomada, consequências, alternativas consideradas.

## Regras

1. **ADRs são imutáveis.** Uma decisão, uma vez tomada, não se edita. Se mudar de ideia, escreve novo ADR que **supersedes** o anterior.
2. **Nunca desvie de um ADR silenciosamente.** Se o código contradiz um ADR, ou o ADR está errado (atualize) ou o código está errado (conserte).
3. **Subagentes devem ler o ADR relevante antes de implementar.** Especialmente o `backend-dev` e o `frontend-dev`.

## Índice

| # | Título | Status | Fase origem |
|---|--------|--------|-------------|
| [001](./001-pwa-unificada.md) | PWA unificada para ingestão e visualização | Accepted | Fase 1 |
| [002](./002-web-local-homelab.md) | Web-local no homelab (FastAPI + React), não desktop nativo | Accepted | Fase 1 |
| [003](./003-rag-journal.md) | RAG sobre journal histórico como contexto do LLM | Accepted | Fase 1 |
| [004](./004-hledger-client-python.md) | Interface com hledger via módulo Python interno | Accepted | Fase 0 / Fase 1 |
| [005](./005-transferencias-heuristica.md) | Transferências entre contas detectadas por heurística automática | Accepted | Fase 1 |
| [006](./006-multi-moeda-simples.md) | Multi-moeda simples no MVP | Accepted | Fase 1 |
| [007](./007-git-auto-commit.md) | Git commit automático após cada lote aprovado | Accepted | Fase 1 |
| [008](./008-principio-via-mapping.md) | Princípio sugerido via mapping categoria → princípio | Accepted | Fase D / Fase 1 |
| [009](./009-parcelamento-monthly.md) | Parcelamentos detectados geram `~ monthly` no journal | Accepted | Fase 1 |

## Formato de novos ADRs

```markdown
# ADR-NNN: Título curto e afirmativo

**Status:** Proposed | Accepted | Superseded by ADR-XXX | Deprecated
**Date:** YYYY-MM
**Phase origin:** Fase X
**Supersedes:** ADR-YYY (se aplicável)

## Context
Problema, opções, pressão.

## Decision
A escolha, em 1-2 parágrafos.

## Consequences
### Positivas
### Negativas

## Alternatives considered
Por que não as outras.

## Related
Links para PRDs, outros ADRs.
```
