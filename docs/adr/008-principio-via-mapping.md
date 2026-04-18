# ADR-008: Princípio sugerido via mapping categoria → princípio (não via LLM)

**Status:** Accepted
**Date:** 2026-04
**Phase origin:** Fase D (Dashboard 2.0), relevante para Fase 1 (Magic Import)
**Supersedes:** —
**Superseded by:** —

## Context

A planilha usada há anos pelo casal tem **dupla taxonomia** em cada despesa:
1. Categoria funcional (ex: `Moradia - Energia elétrica`)
2. Princípio (ex: `CUSTOS FIXOS`, `CONFORTO`, `PRAZERES`)

Os 7 princípios vêm de um curso de finanças (metodologia DSOP): Custos Fixos (40%), Conforto (20%), Metas (5%), Prazeres (5%), Liberdade Financeira (25%), Aumentar Renda (5%), Reserva de Oportunidade (0%).

Na planilha, **44% das transações ficam sem princípio** porque o custo cognitivo de classificar duas vezes é alto. Precisávamos decidir como introduzir Princípio no dashboard sem herdar essa fricção.

## Decision

**Princípio é função determinística da categoria** no caso geral, via um arquivo de mapping (`backend/app/config/principles.json`). Override explícito por tag no hledger (`; principio: X`) apenas quando um caso específico foge do default.

**Resolução em runtime:**
1. Se a transação tem tag `principio:X`, usa X.
2. Senão, busca match mais específico no mapping (ex: `expenses:alimentação:restaurantes` → `prazeres`).
3. Se não achar, usa `default` do arquivo (hoje: `custos-fixos`) e sinaliza visualmente "princípio não definido".

**LLM não inventa princípio.** No Magic Import, o sistema primeiro categoriza (LLM + RAG), depois resolve o princípio via mapping (determinístico).

## Consequences

### Positivas
- **Zero fricção no caso geral**: usuário só pensa em categoria; princípio é derivado.
- Override é explícito e visível (tag no journal).
- Princípio é consistente entre transações (mesma categoria → mesmo princípio, a menos que o usuário diga o contrário).
- Sem aleatoriedade do LLM: princípio é estrutural.

### Negativas
- Mapping inicial precisa ser feito à mão (mitigado: mapping inicial derivado do diagnóstico da planilha já cobre ~90% do histórico real).
- Quando aparece categoria nova sem mapping, dashboard mostra warning visual — usuário precisa atualizar o mapping.

## Alternatives considered

- **LLM sugere princípio junto com categoria**: adiciona aleatoriedade sem ganho. Rejeitado.
- **Princípio só como metadata manual**: recria a fricção da planilha (44% ficam sem).
- **Sub-contas no hledger (`expenses:custos-fixos:...`)**: duplica a hierarquia, força reestruturação do chart of accounts.

## Implementation notes

- Mapping vive em `backend/app/config/principles.json`.
- Resolver em `backend/app/principles/resolver.py`.
- Override do mapping persistido em SQLite local (Settings inline), não edita o JSON de fábrica.
- Metas percentuais (40/20/5/5/25/5/0) são globais do casal, editáveis nas Settings inline.

## Related
- `docs/02-PRD-dashboard-v2.md` §4 (especificação completa)
- `docs/03-PRD-magic-import.md` §7 (RF-3.5 — Enrich resolve princípio)
- `docs/00-DIAGNOSTICO-planilha.md` §1.2 (origem da decisão)
