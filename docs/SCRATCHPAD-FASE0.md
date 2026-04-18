# Fase 0 Estabilização — Scratchpad de Progresso

**Última atualização:** 2026-04-18
**Branch:** `feat/fase0-config-deps`
**Status geral:** Backend 100% (Ondas 1-2). Frontend 0%.

---

## Objetivo

Completar a **Fase 0 — Estabilização** conforme especificado em `docs/01-ESTABILIZACAO.md`.
Fase 0 é refatoração apenas — zero features novas visíveis ao usuário.
Pré-requisito para Fase D (Dashboard 2.0) e Fase 1 (Magic Import).

## Workflow (como este esforço é executado)

1. **Hermes (orquestrador)** — prepara branch, escreve prompt, lança Claude Code na VM, monitora via pgrep/git status, verifica resultados, commita.
2. **Claude Code (worker na VM)** — implementa código, escreve testes, resolve bugs. Roda em `10.0.0.110` via SSH nohup.
3. **Lucas (diretor)** — define tarefas, desbloqueia infra, aprova PRs.

**Padrão de ciclo para cada PR:**
1. Criar branch de feature a partir de `main`
2. Delegar implementação ao Claude Code na VM (prompt em `/tmp/task-prompt.txt`, launcher em `/tmp/run-*.sh`)
3. Monitorar: `pgrep -la claude` (rodando?), `git status --short` (modificou?), `git log --oneline -3` (commitou?)
4. Verificar: rodar testes (`pytest tests/ -q`), checar diff
5. Push e notificar no Telegram

**Detalhes técnicos da VM:**
- SSH: `lucas@10.0.0.110` (NÃO `debian@`)
- Node via mise: `export PATH="/home/lucas/.local/share/mise/installs/node/24.14.1/bin:$PATH"`
- hledger: versão 1.25 na VM (host tem 1.52)
- Claude Code: `~/go/bin/claude` ou `claude` no PATH
- Auth: `claude --dangerously-skip-permissions -p "$(cat /tmp/prompt.txt)"`
- Output bufferizado até exit — usar pgrep/git status para liveness, não tail -f

## O que já foi feito

### Dia 0 — Setup (completo antes desta sessão)
- Docs em `docs/` (00-DIAGNOSTICO, 01-ESTABILIZACAO, 02-PRD-dashboard-v2, 03-PRD-magic-import)
- 9 ADRs em `docs/adr/`
- CLAUDE.md atualizado com fases, ADRs, subagents
- 5 subagents em `.claude/agents/` (architect, backend-dev, frontend-dev, reviewer, spike-runner)

### Onda 0 — Spike (sessão 2026-04-17)
- Branch descartável `spike/hledger-client-design`
- Validou design HledgerClient + Pydantic models
- Veredicto: APPROVE
- Achado crítico: flag ordering `-f J SUBCMD -O json` (compat 1.25+1.52)

### Onda 1 — Fundação Backend (sessão 2026-04-17-18)
- **PR-1 (bbdddd9):** `app/config.py` (Pydantic Settings) + `app/deps.py` (get_current_user)
- **PR-2 (f03de25):** `app/hledger/client.py` (HledgerClient) + `app/hledger/errors.py` + fix flag ordering
  - Resultado: 105/0 (baseline era 39/66 — 66 falhas eram flag ordering)
- **PR-3 (897c079):** `app/hledger/models.py` (Pydantic) + `app/hledger/parsers.py` (unificado)
  - Migrado `/api/cashflow` para parser unificado

### Onda 2 — Modularização Backend (sessão 2026-04-17-18)
- **PR-4 (f22544a):** Todos os endpoints cbrSubreports migrados para parsers unificados
  - summary, networth, forecast, savings-goal, account_balance_history
  - Zero inline cbrSubreports parsing restante
- **PR-5 parcial (f2b52ae):** Primeira extração de routes (5 routers)
- **PR-5 completo (b9b61a1):** Claude Code completou — 17/17 endpoints em routers
  - main.py: 1277 → 98 linhas (wiring puro)

## Estado Atual

```
Testes:        105/105 passing
main.py:       98 linhas (wiring puro, zero endpoints)
Branch:        feat/fase0-config-deps (pushed)
Commits:       7 (bbdddd9..b9b61a1)
```

**Estrutura do backend:**
```
backend/
├── main.py                    (98 linhas — wiring)
├── app/
│   ├── config.py              (Pydantic Settings)
│   ├── deps.py                (get_current_user, _tokens)
│   ├── formatting.py          (display_segment, format_category, etc.)
│   ├── legacy.py              (_extract_one_amount, _amount — compat testes)
│   ├── hledger/
│   │   ├── client.py          (HledgerClient)
│   │   ├── models.py          (Pydantic: Amount, Transaction, PeriodReport, etc.)
│   │   ├── parsers.py         (parse_period_report, cashflow_from_*, networth_from_*)
│   │   ├── helpers.py         (month_bounds, months_back_bounds, etc.)
│   │   └── errors.py          (HledgerNotFound, HledgerTimeout, etc.)
│   └── routes/
│       ├── health.py          (/api/login, /api/health)
│       ├── summary.py         (/api/summary)
│       ├── cashflow.py        (/api/cashflow, /api/forecast)
│       ├── networth.py        (/api/networth, /api/accounts, /api/accounts/*/balance-history)
│       ├── savings.py         (/api/savings-goal, /api/alerts)
│       ├── categories.py      (/api/categories, /api/categories/{cat})
│       ├── flow.py            (/api/flow)
│       ├── budget.py          (/api/budget)
│       ├── transactions.py    (/api/transactions, /api/top-expenses)
│       ├── tags.py            (/api/tags)
│       └── seasonality.py     (/api/seasonality)
├── tests/                     (105 tests)
└── requirements.txt           (fastapi, uvicorn, pytest, httpx, pydantic-settings)
```

## Próximos Passos (ordem pelo plano §10)

### Imediato — PR-F1 (Onda 1)
Criar `frontend/src/theme/tokens.js` com a paleta atual como constantes.
Substituir literais de cor hardcoded (`#d4a574`, `#8a8275`, `#c97b5c`, `#8b9d7a`) nos componentes.
Mudança barata, zero impacto visual. Base para toda refatoração frontend.

### Depois — PR-F2 a F4 (Onda 2)
Extrair componentes puros de `Dashboard.jsx` (1833 linhas):
- `components/KPI.jsx`, `Spinner.jsx`, `ErrorBox.jsx`, `DeltaBadge.jsx`, `TipoChip.jsx`
- `contexts/MonthContext.jsx`, `NavContext.jsx`
- `features/resumo/Resumo.jsx`

### Depois — PR-F5 a F9 (Onda 3)
Extrair features restantes: fluxo, orcamento, previsao, contas, transacoes.
Renomear Dashboard.jsx → App.jsx.

### Depois — Onda 4
- PR-6: extrair auth para `app/auth/password.py`
- PR-7: `observability/logging.py` (structlog + request_id)
- PR-8: `app/auth/tailscale.py` + `auth_mode` em Settings

### Depois — Onda 5
- i18n mínimo
- InlineSettings por aba
- pyproject.toml + ruff

### Não esquecer
- hledger 1.25 na VM vs 1.52 no host — testes passam em 1.25, confirmar em 1.52 antes de merge final
- O branch `feat/fase0-config-deps` ainda não foi merged para main
- ADR-004 precisa de "Implementation notes" (register via print, flag ordering, decimalMantissa precision)
