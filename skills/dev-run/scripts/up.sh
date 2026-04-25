#!/usr/bin/env bash
# up.sh — start the local dev environment (FastAPI :8080 + Vite :5173).
#
# Idempotent: re-running restarts the servers cleanly. Handles first-run
# setup (venv, npm install, .env scaffold) and the env-var gotchas
# documented in skills/dev-run/SKILL.md.
#
# Usage:
#   bash skills/dev-run/scripts/up.sh
#
# State / logs land in /tmp/finance-hledger-dev/.

set -euo pipefail

# --- Paths -----------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"
STATE_DIR="/tmp/finance-hledger-dev"
PID_FILE="$STATE_DIR/pids"
BACKEND_LOG="$STATE_DIR/backend.log"
FRONTEND_LOG="$STATE_DIR/frontend.log"

mkdir -p "$STATE_DIR"

# --- Helpers ---------------------------------------------------------------
say() { printf '\033[36m== %s\033[0m\n' "$*"; }
warn() { printf '\033[33mWARN: %s\033[0m\n' "$*" >&2; }
die() { printf '\033[31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }

# --- Sanity checks ---------------------------------------------------------
[[ -d "$BACKEND_DIR" ]] || die "backend/ not found under $REPO_ROOT"
[[ -d "$FRONTEND_DIR" ]] || die "frontend/ not found under $REPO_ROOT"

command -v python3 >/dev/null || die "python3 not on PATH"
command -v node >/dev/null || die "node not on PATH"
command -v npm >/dev/null || die "npm not on PATH"

HLEDGER_BIN="${HLEDGER_PATH:-hledger}"
if ! command -v "$HLEDGER_BIN" >/dev/null 2>&1; then
  cat >&2 <<EOF
ERROR: hledger binary not found ($HLEDGER_BIN).

Install one of:
  - Arch AUR:        yay -S hledger
  - Static release:  curl -sL https://github.com/simonmichael/hledger/releases/download/1.52/hledger-linux-x64.tar.gz | tar -xz -C /tmp && mv /tmp/hledger ~/.local/bin/

Then re-run, or set HLEDGER_PATH=/full/path/to/hledger in backend/.env.
EOF
  exit 1
fi

# --- Stop any prior instances we started -----------------------------------
if [[ -f "$PID_FILE" ]]; then
  while read -r pid; do
    [[ -n "$pid" ]] || continue
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
  # Give children a beat to release ports.
  sleep 1
fi

# --- backend/.env scaffold -------------------------------------------------
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  if [[ -f "$BACKEND_DIR/.env.example" ]]; then
    say "scaffolding backend/.env from .env.example"
    # Strip CORS_ORIGINS=* line (breaks pydantic-settings list[str]).
    grep -v '^CORS_ORIGINS=' "$BACKEND_DIR/.env.example" > "$BACKEND_DIR/.env"
    cat >&2 <<EOF

  Created $BACKEND_DIR/.env. Edit it to set:
    LEDGER_FILE=/absolute/path/to/your.journal
    HLEDGER_PATH=/path/to/hledger    (optional, if not on PATH)
    AUTH_MODE=none                   (for local dev)

  Then re-run this script.
EOF
    exit 2
  else
    die "backend/.env.example missing — cannot scaffold .env"
  fi
fi

# --- Resolve LEDGER_FILE ---------------------------------------------------
# Read .env vars without polluting our own shell beyond what we need.
set -a
# shellcheck disable=SC1091
source "$BACKEND_DIR/.env"
set +a

if [[ -z "${LEDGER_FILE:-}" ]]; then
  die "LEDGER_FILE not set (env or backend/.env)"
fi
if [[ ! -f "$LEDGER_FILE" ]]; then
  die "LEDGER_FILE points at a missing file: $LEDGER_FILE"
fi

# Quick smoke: hledger can read the journal.
if ! "$HLEDGER_BIN" -f "$LEDGER_FILE" stats >/dev/null 2>&1; then
  warn "hledger could not read $LEDGER_FILE — check it's a valid journal."
fi

# --- backend venv + deps ---------------------------------------------------
if [[ ! -x "$BACKEND_DIR/.venv/bin/uvicorn" ]]; then
  say "creating backend/.venv and installing requirements (first run)"
  python3 -m venv "$BACKEND_DIR/.venv"
  "$BACKEND_DIR/.venv/bin/pip" install -q --upgrade pip
  "$BACKEND_DIR/.venv/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"
elif [[ "$BACKEND_DIR/requirements.txt" -nt "$BACKEND_DIR/.venv/bin/uvicorn" ]]; then
  say "requirements.txt newer than venv — reinstalling"
  "$BACKEND_DIR/.venv/bin/pip" install -q -r "$BACKEND_DIR/requirements.txt"
fi

# --- frontend node_modules -------------------------------------------------
if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  say "installing frontend dependencies (first run)"
  (cd "$FRONTEND_DIR" && npm install --no-audit --no-fund)
elif [[ "$FRONTEND_DIR/package.json" -nt "$FRONTEND_DIR/node_modules/.package-lock.json" ]]; then
  say "package.json newer than node_modules — reinstalling"
  (cd "$FRONTEND_DIR" && npm install --no-audit --no-fund)
fi

# --- Start backend ---------------------------------------------------------
say "starting backend on http://127.0.0.1:8080"
(
  cd "$BACKEND_DIR"
  set -a
  # shellcheck disable=SC1091
  source ./.env
  set +a
  exec ./.venv/bin/uvicorn main:app --reload --port 8080 --host 127.0.0.1
) >"$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!

# --- Start frontend --------------------------------------------------------
say "starting frontend on http://127.0.0.1:5173"
(
  cd "$FRONTEND_DIR"
  exec npm run dev -- --host 127.0.0.1
) >"$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!

# --- Persist PIDs ----------------------------------------------------------
printf '%s\n%s\n' "$BACKEND_PID" "$FRONTEND_PID" > "$PID_FILE"

# --- Wait for backend to be ready ------------------------------------------
say "waiting for backend health (max 15s)"
for i in {1..30}; do
  if curl -sf http://127.0.0.1:8080/api/health >/dev/null 2>&1; then
    say "backend ready"
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    cat >&2 "$BACKEND_LOG"
    die "backend died during startup — see $BACKEND_LOG above"
  fi
  sleep 0.5
done

if ! curl -sf http://127.0.0.1:8080/api/health >/dev/null 2>&1; then
  warn "backend did not become healthy in time — tail $BACKEND_LOG"
fi

# --- Wait for frontend port to bind ----------------------------------------
for i in {1..30}; do
  if curl -sf -o /dev/null http://127.0.0.1:5173/ 2>/dev/null; then
    say "frontend ready"
    break
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    cat >&2 "$FRONTEND_LOG"
    die "frontend died during startup — see $FRONTEND_LOG above"
  fi
  sleep 0.5
done

# --- Summary ---------------------------------------------------------------
cat <<EOF

  Backend:  http://127.0.0.1:8080  (PID $BACKEND_PID, log $BACKEND_LOG)
  Frontend: http://127.0.0.1:5173  (PID $FRONTEND_PID, log $FRONTEND_LOG)
  Journal:  $LEDGER_FILE

  Stop with: bash skills/dev-run/scripts/down.sh
EOF
