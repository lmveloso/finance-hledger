# ADR-006: Multi-moeda simples no MVP (preserva moeda original)

**Status:** Accepted
**Date:** 2026-04
**Phase origin:** Fase 1 (Magic Import)
**Supersedes:** —
**Superseded by:** —

## Context

O usuário usa BRL no dia a dia mas eventualmente viaja e tem gastos em USD, EUR, ARS. hledger suporta multi-moeda nativamente com taxas de conversão. Precisávamos decidir o nível de ambição do MVP.

## Decision

**Multi-moeda simples**: no Magic Import, a transação preserva a **moeda original do extrato**. Conversão para BRL (moeda base) é feita manualmente pelo usuário se quiser. Dashboard assume moeda base BRL no Fluxo/Orçamento/Patrimônio; transações em outras moedas aparecem na aba Transações mas não nos totais agregados.

## Consequences

### Positivas
- Elimina complexidade de consultar taxas de câmbio, decidir data da conversão, armazenar histórico de taxas.
- Moeda original preservada no journal = auditoria limpa.
- Se demanda real aparecer (ex: usuário recebe em USD todo mês), promove-se para first-class na v2.

### Negativas
- Relatórios agregados ignoram multi-moeda (aceitável pelo perfil de uso "viagem ocasional").
- Usuário precisa converter manualmente se quiser ver tudo em BRL.

## Alternatives considered

- **Multi-moeda first-class desde o dia 1**: over-engineering para uso real eventual (viagens). Rejeitado.
- **Sem suporte a multi-moeda**: quebraria qualquer transação em moeda estrangeira vinda de extrato.

## Related
- `docs/03-PRD-magic-import.md` §11 (riscos R7)
