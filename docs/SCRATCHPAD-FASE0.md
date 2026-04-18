# Fase 0 Estabilizacao — Scratchpad de Progresso

**Ultima atualizacao:** 2026-04-18
**Branch:** `feat/fase0-config-deps`
**Status geral:** Backend 100% (Ondas 1-2). Frontend: PR-F1 completo.

---

## O que ja foi feito

### Dia 0 — Setup (completo antes desta sessao)
- Docs em `docs/` (00-DIAGNOSTICO, 01-ESTABILIZACAO, 02-PRD-dashboard-v2, 03-PRD-magic-import)
- 9 ADRs em `docs/adr/`
- CLAUDE.md atualizado com fases, ADRs, subagents
- 5 subagents em `.claude/agents/` (architect, backend-dev, frontend-dev, reviewer, spike-runner)

### Onda 0 — Spike (sessao 2026-04-17)
- Branch descartavel `spike/hledger-client-design`
- Validou design HledgerClient + Pydantic models
- Veredicto: APPROVE
- Achado critico: flag ordering `-f J SUBCMD -O json` (compat 1.25+1.52)

### Onda 1 — Fundacao Backend (sessao 2026-04-17-18)
- **PR-1 (bbdddd9):** `app/config.py` (Pydantic Settings) + `app/deps.py` (get_current_user)
- **PR-2 (f03de25):** `app/hledger/client.py` (HledgerClient) + `app/hledger/errors.py` + fix flag ordering
- **PR-3 (897c079):** `app/hledger/models.py` (Pydantic) + `app/hledger/parsers.py` (unificado)

### Onda 2 — Modularizacao Backend (sessao 2026-04-17-18)
- **PR-4 (f22544a):** Todos os endpoints cbrSubreports migrados para parsers unificados
- **PR-5 completo (b9b61a1):** 17/17 endpoints em routers — main.py: 1277 -> 98 linhas

### Frontend — Onda 1 (PR-F1)
- **PR-F1 (228d587):** `frontend/src/theme/tokens.js` criado
  - Paleta centralizada: `warm`, `muted`, `secondary`, `positive`, `negative`
  - Cores hardcoded extraidas para constantes
  - Dashboard.jsx atualizado para importar do tokens.js

## Estado Atual

```
Backend:
  Testes:        105/105 passing
  main.py:       98 linhas (wiring puro, zero endpoints)

Frontend:
  tokens.js:     Criado e integrado
  Dashboard.jsx: Ainda monolitico (1833 linhas)

Branch:          feat/fase0-config-deps (pushed)
Commits:         8 (bbdddd9..228d587)
```

## Proximos Passos (ordem pelo plano §10)

### Imediato — PR-F2 (Onda 2)
Extrair componentes puros de `Dashboard.jsx`:
- `components/KPI.jsx`
- `components/Spinner.jsx`
- `components/ErrorBox.jsx`

Depois: PR-F3 (DeltaBadge, TipoChip), PR-F4 (contexts), PR-F5+ (features)

### Depois — Onda 3
- Extrair features: fluxo, orcamento, previsao, contas, transacoes
- Renomear Dashboard.jsx -> App.jsx

### Depois — Ondas 4-5
- PR-6 a PR-8: auth, logging, tailscale
- i18n, InlineSettings, pyproject.toml + ruff

### Nao esquecer
- hledger 1.25 na VM vs 1.52 no host — testes passam em 1.25
- Branch `feat/fase0-config-deps` ainda nao mergeado para main
- ADR-004 precisa de "Implementation notes"
