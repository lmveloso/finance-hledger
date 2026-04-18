# ADR-007: Git commit automático após cada lote aprovado

**Status:** Accepted
**Date:** 2026-04
**Phase origin:** Fase 1 (Magic Import)
**Supersedes:** —
**Superseded by:** —

## Context

O journal do usuário já é versionado com git. Após um lote de transações ser aprovado na staging e escrito no journal, existiam três opções:
1. Git commit automático com mensagem descritiva.
2. Commit manual — usuário decide quando commitar.
3. Sem git no escopo do MVP.

## Decision

**Git commit automático após cada lote aprovado**, com mensagem no formato:
```
import: <arquivo_origem> (<N> tx em <YYYY-MM-DD>)
```

Se o repo estiver sujo (mudanças não-relacionadas pendentes), o commit pula a parte limpa e loga warning — não tenta fazer stash nem nada invasivo.

## Consequences

### Positivas
- Audit trail gratuito: cada importação vira um commit identificável.
- Reversibilidade via `git revert <hash>` — desfaz o lote inteiro se algo deu errado, sem precisar editar journal à mão.
- Zero fricção: usuário aprova o lote e o rastro está lá.

### Negativas
- Cria commits automáticos que podem poluir o log se o usuário for muito exigente com histórico limpo. Aceitável.
- Se o repo já tem mudanças pendentes, o commit automático pode misturar se não tratar cuidadosamente (mitigado pela lógica de detecção de repo sujo).

## Alternatives considered

- **Commit manual**: atrito desnecessário; usuário sempre vai querer commitar no final.
- **Sem git no MVP**: perde a reversibilidade que é a maior vantagem de ter o journal versionado.

## Related
- `docs/03-PRD-magic-import.md` §7 (RF-5.4, RF-5.5)
