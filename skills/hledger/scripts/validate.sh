#!/usr/bin/env bash
# validate.sh — canonical hledger journal validation suite.
#
# Usage:
#   validate.sh [LEDGER_FILE]
#
# If LEDGER_FILE is omitted, the env var $LEDGER_FILE is used.
# Exits 0 if all checks pass, non-zero on first failure.
#
# Checks, in order:
#   1. hledger check -s        (parseable + balanced + accounts + commodities)
#   2. hledger check ordereddates  (per-file chronological order)
#   3. accounts used vs declared diff (must be empty)
#
# Optional checks (uniqueleafnames, payees, tags) are NOT run by default —
# they are opinionated and require explicit declaration of the universe.

set -euo pipefail

LEDGER="${1:-${LEDGER_FILE:-}}"
HLEDGER_BIN="${HLEDGER_PATH:-hledger}"

if [[ -z "$LEDGER" ]]; then
  echo "ERROR: no journal path provided. Pass as arg or set LEDGER_FILE." >&2
  exit 2
fi
if [[ ! -f "$LEDGER" ]]; then
  echo "ERROR: journal not found: $LEDGER" >&2
  exit 2
fi
if ! command -v "$HLEDGER_BIN" >/dev/null 2>&1; then
  echo "ERROR: hledger binary not found: $HLEDGER_BIN" >&2
  exit 2
fi

step() { printf '\n== %s ==\n' "$1"; }

step "hledger check -s (parseable, balanced, accounts, commodities)"
"$HLEDGER_BIN" -f "$LEDGER" check -s

step "hledger check ordereddates (chronological order per file)"
"$HLEDGER_BIN" -f "$LEDGER" check ordereddates

step "accounts used vs declared"
undeclared=$(
  diff \
    <("$HLEDGER_BIN" -f "$LEDGER" accounts --declared | sort) \
    <("$HLEDGER_BIN" -f "$LEDGER" accounts --used | sort) \
  | grep '^> ' | sed 's/^> //' || true
)
if [[ -n "$undeclared" ]]; then
  echo "FAIL: accounts used but not declared:" >&2
  echo "$undeclared" | sed 's/^/  /' >&2
  echo "" >&2
  echo "Add 'account <name>  ; description' lines to accounts.journal." >&2
  exit 1
fi
echo "OK"

printf '\nAll checks passed.\n'
