# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal/family finance dashboard that reads from an [hledger](https://hledger.org/) journal file. FastAPI backend wraps the `hledger` CLI and exposes JSON endpoints; React+Vite frontend consumes them. A single FastAPI process serves both the API (`/api/*`) and the built SPA in production — designed to run in a homelab accessible via Tailscale.

## Language conventions

**Primary language:** English (official). Code, comments, commit messages, PR descriptions, ADRs, and PRDs are in English. User-facing strings go through `i18n` (see `frontend/src/i18n/`).

**Secondary language:** pt-BR (currently the only i18n dictionary implemented, but English is the source language — PT is a translation).

**Money:** BRL is the base currency. Multi-currency is simple-mode only (see ADR-006).

## Development phases

This project is executed in **three sequential phases**. Always check which phase is active before making architectural decisions. **Do not skip ahead.** Phase D assumes Phase 0 is complete. Phase 1 assumes Phase D is complete.

### Current phase

<!-- Edit the checkbox when a phase is completed, and set "← active" on the next one. -->

- [x] Fase 0 — Estabilização (see `docs/01-ESTABILIZACAO.md`) — COMPLETED
- [x] Fase D — Dashboard 2.0 (see `docs/02-PRD-dashboard-v2.md`) - COMPLETED
- [ ] Fase U — UI/UX (see `docs/04-PRD-ui-ux.md`) ← ACTIVE
- [ ] Fase 1 — Magic Import (see `docs/03-PRD-magic-import.md`)

### Phase boundaries

- **Fase 0:** refactoring only. No new user-visible features. Target structure in §3 (backend) and §4 (frontend) of the Estabilização doc.
- **Fase D:** dashboard rework inspired by the family's old spreadsheet (see `docs/00-DIAGNOSTICO-planilha.md`). Introduces the Principle dimension, new tab structure (Mês, Ano, Plano, Fluxo reformulado, Patrimônio, Transações). Magic Import tab is a placeholder.
- **Fase U:** UI/UX overhaul — indigo-violet dual-mode palette, new nav (sidebar + bottom tabs), redesigned visualizations per tab. Nine PRs (U0–U9). Plano/Previsão hidden from nav during this phase.
- **Fase 1:** Magic Import — AI-powered ingestion of bank statements and credit card invoices. Depends on the Principle dimension from Phase D.

## Architectural decisions

All major decisions are documented in `docs/adr/`. Before proposing any architectural change, check if an existing ADR applies. If contradicting an ADR, write a new ADR that supersedes it — **do not silently deviate**.

Key active ADRs to be aware of:
- **ADR-004**: hledger access via internal Python module `app/hledger/client.py`. NOT via MCP, NOT via direct file write outside the module.
- **ADR-008**: Principle is derived deterministically from category mapping. LLM does not infer Principle.
- **ADR-009**: Installments from credit card invoices are declared as `~ monthly from X to Y` in the journal.

See `docs/adr/README.md` for the full index.

## Subagents

Five subagents are defined in `.claude/agents/`. Use the right one for each role:

- **architect** — plans PRs, writes ADRs. Does NOT write code.
- **backend-dev** — implements Python under `backend/`. Reads ADRs before coding.
- **frontend-dev** — implements React under `frontend/src/`. No modals, inline + tokens styling.
- **reviewer** — reviews PRs. Checks ADR compliance, tests, scope.
- **spike-runner** — time-boxed experiments in throwaway branches. Produces findings reports.

Typical flow for a PR:
1. `architect` plans → PR scope document.
2. `backend-dev` or `frontend-dev` implements.
3. `reviewer` reviews before merge.

## Commands

### Backend (`backend/`)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export LEDGER_FILE=~/finances/2026.journal   # required
uvicorn main:app --reload --port 8080
```
Env vars: `LEDGER_FILE` (path to `.journal`), `HLEDGER_PATH` (default `hledger`), `CORS_ORIGINS` (default `*`).

Tests: `pytest`. (Linter: `ruff` planned for Fase 0.)

### Frontend (`frontend/`)
```bash
npm install
npm run dev      # Vite on :5173, proxies /api to :8080
npm run build    # outputs to frontend/dist/ — FastAPI auto-serves it
```
Dev proxy target is overridable via `VITE_API_URL`.

### Docker
`docker compose up --build` — mounts `${LEDGER_PATH:-~/finances}` read-only to `/data`.

## Architecture (current state — pre Fase 0)

> **Note:** this section describes the current monolithic state. Fase 0 splits it according to `docs/01-ESTABILIZACAO.md` §3 and §4.

### Single-process deploy model
`backend/main.py` mounts `frontend/dist/` as static assets and adds a catch-all `/{full_path:path}` route that returns `index.html` for SPA routing. The catch-all is only registered if `frontend/dist` exists, so the backend runs API-only until the frontend is built. API routes are declared before the catch-all, and the catch-all explicitly 404s anything starting with `api/` to avoid shadowing.

### hledger wrapper (current)
All endpoints call a single helper `hledger(*args, output_format="json")` in `backend/main.py` that shells out to the `hledger` CLI with `-f $LEDGER_FILE` and (by default) `-O json`. It raises `HTTPException` for missing binary (503), timeout (504), or non-zero exit (500). No journal data is cached — every request re-invokes the CLI.

**Fase 0 replaces this with `app/hledger/client.py` (HledgerClient class).** See ADR-004.

### JSON parsing is version-sensitive
The repo was adapted for **hledger 1.52**, whose JSON output shape differs from earlier versions. The `_amount()` helper in `main.py` handles multiple shapes:
- `prrAmounts` / `prrTotal` dicts from `balancesheet` / `incomestatement` `prTotals`
- `amount` / `tamount` / `ebalance` lists from `balance` / `register`
- Nested `aquantity.floatingPoint` for the actual number

Some endpoints (`/api/categories`, `/api/top-expenses`) parse positional tuples from `hledger balance --layout=bare` and `hledger register` respectively — these are fragile to hledger version changes. When upgrading hledger, re-verify these endpoints first.

**Fase 0 consolidates all of this into `app/hledger/parsers.py` with typed Pydantic models.**

### Endpoint map (`backend/main.py`)
- `/api/health` — hledger version + journal existence check
- `/api/summary?month=YYYY-MM` — income/expense/balance for a month (uses `incomestatement`)
- `/api/categories?month=&depth=2` — expenses grouped by category (`balance expenses --layout=bare`)
- `/api/categories/{category}` — subcategory drill-down
- `/api/cashflow?months=12` — monthly income/expense series (returns raw hledger JSON)
- `/api/networth?months=12` — `balancesheet -M --historical`
- `/api/budget?month=` — `balance expenses --budget` as **text** (requires `~ periodic` transactions in the journal); note this endpoint returns raw text, not JSON
- `/api/top-expenses?month=&limit=10` — ranked transactions from `register`
- `/api/savings-goal?monthly_target=&annual_target=` — progress vs. targets
- `/api/flow?month=` — account-level in/out/transfers
- `/api/networth`, `/api/forecast`, `/api/accounts`, `/api/alerts`, `/api/seasonality`, `/api/tags` — see main.py

`month_bounds()` and `months_back_bounds()` produce ISO `begin`/`end` strings passed as `-b`/`-e` to hledger.

### Frontend structure (current — pre Fase 0)
Flat layout — four files only: `main.jsx` (entry), `Dashboard.jsx` (the whole UI, 1833 lines), `api.js` (a `useApi` hook + `fetchCategoryDetail`), `config.js` (savings goals, fallback budget, chart palette). Charts use Recharts, icons use lucide-react. The `useApi` hook builds URLs as `${VITE_API_URL}${path}` — empty in prod (same-origin), proxied by Vite in dev.

**Fase 0 splits `Dashboard.jsx` into `features/<tab>/` folders.** See `docs/01-ESTABILIZACAO.md` §4.

### Budget configuration
Budgets live in the `.journal` file as hledger `~ monthly` periodic transactions. The `/api/budget` endpoint surfaces these. `frontend/src/config.js` has a `fallbackBudget` array used only if the journal has no periodic transactions configured yet. Savings targets are frontend-side in `config.js` by default but can also be passed as query params to `/api/savings-goal`.

## AI Agent Skills (different from subagents)

This repo also includes **skills** (separate from the Claude Code subagents above) for AI agents to manage hledger journals in `skills/`:
- `hledger-base` — MCP tools, journal structure, validation protocol, pitfalls
- `hledger-extrato` — Import bank statements (extrato de conta corrente/poupanca)
- `hledger-fatura` — Import credit card invoices (fatura de cartao)

These skills use `hledger-mcp` via Claude Code for **manual categorization work** — they are separate from the production backend (which uses `app/hledger/client.py` per ADR-004).

Payee-to-account categorization data: `skills/hledger-base/payee-categories.json`

Full setup guide: `docs/onboarding.md`

## Getting started with a new task

1. Check this file's "Current phase" section.
2. Read the phase's PRD (`docs/01-*`, `docs/02-*`, or `docs/03-*`).
3. Read relevant ADRs in `docs/adr/`.
4. Pick the right subagent (`architect` to plan, `backend-dev` or `frontend-dev` to implement, `reviewer` to review, `spike-runner` for exploratory work).
5. Follow the subagent's rules — each has its own preamble.
