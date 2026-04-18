# ADR-001: PWA unificada para ingestão e visualização

**Status:** Accepted
**Date:** 2026-04
**Phase origin:** Fase 1 (Magic Import)
**Supersedes:** —
**Superseded by:** —

## Context

O projeto originalmente só fazia visualização (dashboard que lê hledger). O escopo novo (Magic Import) introduz ingestão inteligente de faturas e extratos. Tínhamos que decidir se isso vira um aplicativo separado compartilhando o mesmo `.journal` ou se integra à PWA existente.

## Decision

**PWA unificada**. A aba "Importar" vive no mesmo app que já tem Mês, Ano, Plano, Fluxo, Patrimônio e Transações.

Aba Importar é **responsiva**: tabela densa no desktop (≥900px), cards empilhados verticalmente no mobile (<900px). Mesmas ações em ambos os layouts.

## Consequences

### Positivas
- Um único ícone na tela inicial do celular / desktop.
- Autenticação única.
- Navegação coerente entre ingestão e consulta.
- Reutiliza toda a infra de deploy, Tailscale, service worker.

### Negativas
- Bundle do frontend cresce (aceitável para uso local-first).
- Aba Importar precisa de dois layouts responsivos (mais trabalho de UI).

## Alternatives considered

- **Apps separados compartilhando journal**: mais isolamento, mas exige duas autenticações, dois deploys, dois ícones, duplicação de componentes. Rejeitado.

## Related
- `docs/03-PRD-magic-import.md` §1 e §5
- ADR-002 (web-local no homelab)
