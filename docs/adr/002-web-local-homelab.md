# ADR-002: Web-local no homelab (FastAPI + React), não desktop nativo

**Status:** Accepted
**Date:** 2026-04
**Phase origin:** Fase 1 (Magic Import)
**Supersedes:** —
**Superseded by:** —

## Context

Para o Magic Import era necessário decidir a plataforma: desktop nativo (Tauri/Electron), CLI puro, ou a mesma stack web-local (FastAPI + React) que o dashboard já usa.

## Decision

**Web-local no homelab**, usando FastAPI + React, servido via Tailscale. Ollama roda na mesma máquina.

## Consequences

### Positivas
- Zero dependência nova de toolchain (Tauri/Electron traria Node/Rust).
- Reutiliza stack já dominada pela equipe (1 dev).
- Reutiliza acesso Tailscale existente, sem abrir portas.
- Ollama pode servir via HTTP local diretamente pro backend, sem IPC especial.

### Negativas
- Requer um homelab sempre ligado. (Aceitável: o usuário já opera homelab 24/7.)
- Acesso offline em dispositivos remotos depende de Tailscale.

## Alternatives considered

- **Desktop nativo (Tauri/Electron)**: melhor para quem quer instalador standalone; traz complexidade de empacotamento, assinatura, auto-update. Desnecessário aqui.
- **CLI puro**: mais leve, mas inviável para a esposa usar. Rejeitado.

## Related
- `docs/03-PRD-magic-import.md` §1
- ADR-001 (PWA unificada)
