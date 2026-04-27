---
name: dev-run
description: Start (or restart) the local development environment — FastAPI backend on :8080 and Vite frontend on :5173. Handles first-run setup (Python venv, npm install, hledger binary check) and the env-var gotchas that make uvicorn fail silently.
triggers:
  - start dev
  - run dev
  - run the project
  - start backend
  - start frontend
  - dev environment
  - uvicorn vite
  - localhost 8080
  - localhost 5173
---

# Local development — backend + frontend

The project is a FastAPI backend that wraps the `hledger` CLI plus a Vite/React frontend. In dev they run as two separate processes; in production the backend serves the built SPA from `frontend/dist/`.

## Quickstart

```bash
bash skills/dev-run/scripts/up.sh
# tail logs
tail -f /tmp/finance-hledger-dev/backend.log
tail -f /tmp/finance-hledger-dev/frontend.log
# stop everything
bash skills/dev-run/scripts/down.sh
```

`up.sh` is idempotent: it does first-run setup (venv, npm install, .env scaffold), checks if the servers are already up, and restarts them if you re-run it. `down.sh` kills only the dev processes (backend + frontend), not anything else listening on those ports.

## Prerequisites — checked by the script, listed here for context

1. **`hledger` 1.52+** on PATH or pointed at by `$HLEDGER_PATH`. If missing, the script prints the install recipe (Arch AUR or static binary) and exits.
2. **Python 3.10+** and **Node 18+**. Standard.
3. **A journal file**. The script looks for `$LEDGER_FILE` first, then `backend/.env`. If neither is set, it bails — see below.

## First-run setup (handled automatically)

When `up.sh` runs the first time:

1. **`backend/.venv`** — created if absent; `pip install -r requirements.txt` runs.
2. **`frontend/node_modules`** — populated if absent.
3. **`backend/.env`** — copied from `.env.example` if absent; you'll be prompted to set `LEDGER_FILE` before re-running.

After the first run, subsequent invocations skip these steps unless dependency files (`requirements.txt`, `package.json`) are newer than the install markers.

## Env-var gotchas (the pitfalls we hit)

These are the issues that make uvicorn fail silently if you skip the script and run things by hand.

### 1. `CORS_ORIGINS=*` in `.env` breaks pydantic-settings

The settings field `cors_origins: list[str]` makes pydantic try to JSON-decode the env value. `*` is not valid JSON.

- **Fix**: omit the line entirely (the default is already `["*"]`), or use JSON: `CORS_ORIGINS=["*"]`.
- The bundled `.env.example` has the comma-separated form which won't parse — `up.sh` rewrites it to omit the line on first scaffold.

### 2. Uvicorn does not autoload `backend/.env`

Nothing in the codebase calls `load_dotenv()`. If you run `uvicorn main:app` with `.env` sitting next to it, the env vars are NOT picked up.

- **Fix**: `set -a; source backend/.env; set +a; uvicorn ...`. The script does this for you.

### 3. Comma-decimal amounts get parsed as 100x larger

If `accounts.journal` declares `commodity BRL 1000.00` (dot decimal) but a fatura file has `BRL 333,00` (Brazilian comma decimal), hledger reads the comma as a thousands separator and the amount becomes `33300`. API endpoints will return suspiciously-round-but-100x values.

- Not a server-startup issue, but if you see broken API output it's usually this.
- `bash skills/hledger/scripts/validate.sh` catches the resulting balance mismatches; conversion recipe is in `skills/hledger/SKILL.md` under "Commodity (CRITICO)".

### 4. `hledger` not on PATH

If installed to a non-standard location (e.g. `~/.local/bin/hledger` from the static release tarball), set `HLEDGER_PATH=/full/path/to/hledger` in `backend/.env`. The backend respects it.

## Manual workflow (when debugging the script)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
set -a && source .env && set +a   # note: NOT autoloaded
uvicorn main:app --reload --port 8080 --host 127.0.0.1

# Frontend (separate shell)
cd frontend
npm install
npm run dev -- --host 127.0.0.1
```

Smoke-test:

```bash
curl -s http://127.0.0.1:8080/api/health | jq
curl -sI http://127.0.0.1:5173/ | head -1
```

## Stopping cleanly

```bash
bash skills/dev-run/scripts/down.sh
```

The script reads PIDs from `/tmp/finance-hledger-dev/pids` and kills them. If the PIDs are stale (servers crashed, file is leftover), it falls back to killing whoever is listening on :8080 and :5173 — but only if that process is `uvicorn` or `vite` (it won't accidentally kill an unrelated server).

## State and log locations

```
/tmp/finance-hledger-dev/
├── pids              # backend_pid\nfrontend_pid
├── backend.log       # uvicorn stdout/stderr
└── frontend.log      # vite stdout/stderr
```

Wiped on machine reboot. If you need persistent logs, redirect manually.

## Production / non-dev modes

This skill is **dev only** — `--reload` is on, dev proxy from Vite to backend, no auth. For production deploy the project as a single FastAPI process serving `frontend/dist/`; see `docker compose up --build` and the project README. Do not use `up.sh` to start a production instance.
