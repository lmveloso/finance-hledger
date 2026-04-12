# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Personal/family finance dashboard that reads from an [hledger](https://hledger.org/) journal file. FastAPI backend wraps the `hledger` CLI and exposes JSON endpoints; React+Vite frontend consumes them. A single FastAPI process serves both the API (`/api/*`) and the built SPA in production — designed to run in a homelab accessible via Tailscale. User-facing strings are in Portuguese (BRL).

## Commands

### Backend (`backend/`)
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export LEDGER_FILE=~/finances/2026.journal   # required
uvicorn main:app --reload --port 8080
```
Env vars: `LEDGER_FILE` (path to `.journal`), `HLEDGER_PATH` (default `hledger`), `CORS_ORIGINS` (default `*`).

### Frontend (`frontend/`)
```bash
npm install
npm run dev      # Vite on :5173, proxies /api to :8080
npm run build    # outputs to frontend/dist/ — FastAPI auto-serves it
```
Dev proxy target is overridable via `VITE_API_URL`.

### Docker
`docker compose up --build` — mounts `${LEDGER_PATH:-~/finances}` read-only to `/data`.

No test suite or linter is configured in this repo.

## Architecture

### Single-process deploy model
`backend/main.py` mounts `frontend/dist/` as static assets and adds a catch-all `/{full_path:path}` route that returns `index.html` for SPA routing. The catch-all is only registered if `frontend/dist` exists, so the backend runs API-only until the frontend is built. API routes are declared before the catch-all, and the catch-all explicitly 404s anything starting with `api/` to avoid shadowing.

### hledger wrapper
All endpoints call a single helper `hledger(*args, output_format="json")` in `backend/main.py` that shells out to the `hledger` CLI with `-f $LEDGER_FILE` and (by default) `-O json`. It raises `HTTPException` for missing binary (503), timeout (504), or non-zero exit (500). No journal data is cached — every request re-invokes the CLI.

### JSON parsing is version-sensitive
The repo was adapted for **hledger 1.52**, whose JSON output shape differs from earlier versions (see commit `5beb651`). The `_amount()` helper in `main.py` handles multiple shapes:
- `prrAmounts` / `prrTotal` dicts from `balancesheet` / `incomestatement` `prTotals`
- `amount` / `tamount` / `ebalance` lists from `balance` / `register`
- Nested `aquantity.floatingPoint` for the actual number

Some endpoints (`/api/categories`, `/api/top-expenses`) parse positional tuples from `hledger balance --layout=bare` and `hledger register` respectively — these are fragile to hledger version changes. When upgrading hledger, re-verify these endpoints first.

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

`month_bounds()` and `months_back_bounds()` produce ISO `begin`/`end` strings passed as `-b`/`-e` to hledger.

### Frontend structure (`frontend/src/`)
Flat layout — four files only: `main.jsx` (entry), `Dashboard.jsx` (the whole UI), `api.js` (a `useApi` hook + `fetchCategoryDetail`), `config.js` (savings goals, fallback budget, chart palette). Charts use Recharts, icons use lucide-react. The `useApi` hook builds URLs as `${VITE_API_URL}${path}` — empty in prod (same-origin), proxied by Vite in dev.

### Budget configuration
Budgets live in the `.journal` file as hledger `~ monthly` periodic transactions (see README for example). The `/api/budget` endpoint surfaces these. `frontend/src/config.js` has a `fallbackBudget` array used only if the journal has no periodic transactions configured yet. Savings targets are frontend-side in `config.js` by default but can also be passed as query params to `/api/savings-goal`.

## AI Agent Skills

This repo includes skills for AI agents to manage hledger journals in `skills/`:
- `hledger-base` — MCP tools, journal structure, validation protocol, pitfalls
- `hledger-extrato` — Import bank statements (extrato de conta corrente/poupanca)
- `hledger-fatura` — Import credit card invoices (fatura de cartao)

Payee-to-account categorization data: `skills/data/payee-categories.json`

Full setup guide: `docs/onboarding.md`
