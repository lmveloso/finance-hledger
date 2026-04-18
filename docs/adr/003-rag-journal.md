# ADR-003: RAG sobre journal histórico como contexto do LLM

**Status:** Accepted
**Date:** 2026-04
**Phase origin:** Fase 1 (Magic Import)
**Supersedes:** —
**Superseded by:** —

## Context

A meta do Magic Import é ≥85% de acerto na categorização automática de transações extraídas de faturas e extratos. Essa meta é inatingível se o LLM opera em zero-shot. Precisávamos decidir como injetar contexto do domínio do usuário no modelo.

## Decision

**RAG (Retrieval-Augmented Generation) sobre o journal histórico do próprio usuário**. O journal é indexado em um vector store local (FAISS ou sqlite-vec com `nomic-embed-text` via Ollama). Para cada nova transação a categorizar, o sistema busca transações parecidas do histórico e passa como few-shot examples no prompt.

## Consequences

### Positivas
- Zero dados do usuário saem da máquina. Soberania preservada.
- A qualidade melhora com o uso (mais journal indexado = melhor contexto).
- Respeita o vocabulário do usuário (ex: `expenses:alimentação:supermercado` em PT).
- Journal já existe e é versionado com git — custo marginal de uso baixo.

### Negativas
- Cold start: usuário sem histórico tem qualidade menor inicialmente.
- Requer indexação periódica (incremental após cada importação aprovada).
- Qualidade do RAG depende de o journal ter categorias consistentes (garbage in, garbage out).

## Alternatives considered

- **LLM zero-shot**: qualidade insuficiente, LLM não conhece o chart of accounts do usuário.
- **Regras manuais apenas**: exige o usuário escrever regex/regras — é exatamente o que se quer evitar.
- **Fine-tuning**: custo operacional alto, não necessário quando RAG resolve.

## Related
- `docs/03-PRD-magic-import.md` §4 (Enrich)
- ADR-008 (princípio via mapping, complementa o RAG)
