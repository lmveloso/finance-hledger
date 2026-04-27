#!/usr/bin/env bash
# sort-file.sh — chronologically sort transactions within a single journal file.
#
# Usage:
#   sort-file.sh PATH/TO/file.journal
#
# Preserves the leading comment block (lines starting with `;` until the
# first non-comment line). Replaces the body with `hledger print --explicit`
# output, which is sorted by date and preserves transaction-line tags.
#
# Section headers like `; === COMPRAS ===` between transactions are LOST,
# because hledger print does not preserve them. Add them back manually if
# desired, but date order takes precedence.

set -euo pipefail

FILE="${1:-}"
HLEDGER_BIN="${HLEDGER_PATH:-hledger}"

if [[ -z "$FILE" ]]; then
  echo "Usage: sort-file.sh PATH/TO/file.journal" >&2
  exit 2
fi
if [[ ! -f "$FILE" ]]; then
  echo "ERROR: file not found: $FILE" >&2
  exit 2
fi
if ! command -v "$HLEDGER_BIN" >/dev/null 2>&1; then
  echo "ERROR: hledger binary not found: $HLEDGER_BIN" >&2
  exit 2
fi

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

# Capture leading comment block (consecutive lines starting with ; or blank).
awk '/^[^;[:space:]]/ { exit } { print }' "$FILE" > "$tmpdir/header"

# Sorted body via hledger print --explicit.
"$HLEDGER_BIN" -f "$FILE" print --explicit > "$tmpdir/body"

# Add a marker so the sort origin is traceable.
{
  cat "$tmpdir/header"
  echo "; (chronologically sorted via hledger print --explicit)"
  echo ""
  cat "$tmpdir/body"
} > "$FILE"

echo "Sorted: $FILE"
