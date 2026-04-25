#!/usr/bin/env bash
# down.sh — stop the local dev environment started by up.sh.
#
# Reads PIDs from /tmp/finance-hledger-dev/pids and kills them (SIGTERM, then
# SIGKILL after a grace period). Falls back to lsof on :8080 / :5173 if the
# pid file is missing or stale, but only if the listening process matches
# uvicorn (backend) or vite/node (frontend) — never blindly kills strangers.

set -euo pipefail

STATE_DIR="/tmp/finance-hledger-dev"
PID_FILE="$STATE_DIR/pids"

say() { printf '\033[36m== %s\033[0m\n' "$*"; }
warn() { printf '\033[33mWARN: %s\033[0m\n' "$*" >&2; }

stop_pid() {
  local pid="$1" label="$2"
  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  say "stopping $label (PID $pid)"
  kill "$pid" 2>/dev/null || true
  for _ in {1..10}; do
    kill -0 "$pid" 2>/dev/null || return 0
    sleep 0.3
  done
  warn "$label (PID $pid) did not exit on SIGTERM — sending SIGKILL"
  kill -9 "$pid" 2>/dev/null || true
}

# --- From PID file ---------------------------------------------------------
if [[ -f "$PID_FILE" ]]; then
  mapfile -t PIDS < "$PID_FILE"
  stop_pid "${PIDS[0]:-}" "backend"
  stop_pid "${PIDS[1]:-}" "frontend"
  rm -f "$PID_FILE"
fi

# --- Fallback: anything still listening on the dev ports? ------------------
fallback_port() {
  local port="$1" expected_re="$2" label="$3"
  if ! command -v lsof >/dev/null 2>&1; then
    return 0
  fi
  local pid
  pid=$(lsof -ti ":$port" 2>/dev/null | head -1 || true)
  [[ -n "$pid" ]] || return 0
  local cmd
  cmd=$(ps -p "$pid" -o comm= 2>/dev/null || true)
  if [[ "$cmd" =~ $expected_re ]]; then
    say "found stray $label on :$port (PID $pid, cmd $cmd) — stopping"
    stop_pid "$pid" "$label (stray)"
  else
    warn "something else is on :$port (PID $pid, cmd $cmd) — leaving it alone"
  fi
}

fallback_port 8080 'uvicorn|python' 'backend'
fallback_port 5173 'node|vite|npm'  'frontend'

say "done"
