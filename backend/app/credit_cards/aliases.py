"""Parse ``account ... ; alias: <display>`` directives from the journal.

hledger does not expose ``account``-directive comment metadata via JSON,
so this module reads the raw journal file (and any ``include`` it pulls
in) to extract human-friendly card names. This is NOT a violation of
ADR-004 — the ADR forbids invoking the hledger binary outside
``app/hledger/client.py``, not reading the source file with
``pathlib``/``open``.

Convention (Q4 resolution):

    account liabilities:cartão:nubank   ; alias: Nubank Lucas

Tolerant of leading/trailing whitespace, missing comment, malformed
``alias:`` value. ``include`` directives are followed recursively up to
``MAX_INCLUDE_DEPTH``; at the limit we log a warning and stop.
"""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Optional

logger = logging.getLogger("finance-hledger")

# Match an ``account`` directive with an inline ``; alias: <name>`` comment.
# - Group ``acct``: the account path (no whitespace).
# - Group ``name``: the alias value, stripped downstream.
_ACCOUNT_ALIAS_RE = re.compile(
    r"^\s*account\s+(?P<acct>\S+)\s+;\s*alias\s*:\s*(?P<name>.+?)\s*$",
)
_INCLUDE_RE = re.compile(r"^\s*(?:!?include)\s+(?P<path>.+?)\s*$")

MAX_INCLUDE_DEPTH = 4


def parse_account_aliases(journal_path: Path) -> dict[str, str]:
    """Return a mapping ``account-path -> display alias``.

    Reads ``journal_path`` (and any ``include``d file recursively, up to
    :data:`MAX_INCLUDE_DEPTH`). Lines without a ``; alias:`` comment, or
    with a malformed alias value, are skipped silently.

    File I/O errors (missing include, permission denied) are logged at
    WARNING and the parser returns whatever it managed to extract so far.
    Callers fall back to the last-segment-title-cased name for entries
    that did not surface here.
    """
    out: dict[str, str] = {}
    visited: set[Path] = set()
    _scan(journal_path, out, visited, depth=0)
    return out


def last_segment_title(account: str) -> str:
    """Fallback display name: last segment of the account path, title-cased.

    ``liabilities:cartão:nubank`` -> ``Nubank``.
    Hyphens, underscores and spaces inside the segment are preserved as
    word boundaries (``credit-card`` -> ``Credit-Card``).
    """
    if not account:
        return ""
    leaf = account.rsplit(":", 1)[-1]
    # Title-case while keeping hyphens/underscores intact as separators.
    return re.sub(r"[A-Za-zÀ-ÿ]+", lambda m: m.group(0).capitalize(), leaf)


def display_name(account: str, aliases: dict[str, str]) -> str:
    """Pick the user-facing card name: alias if known, fallback otherwise."""
    alias = aliases.get(account)
    if alias:
        return alias
    return last_segment_title(account)


# ── internals ────────────────────────────────────────────────────────


def _scan(
    path: Path, out: dict[str, str], visited: set[Path], depth: int
) -> None:
    if depth > MAX_INCLUDE_DEPTH:
        logger.warning(
            "aliases.max_include_depth_reached path=%s depth=%d", path, depth
        )
        return
    try:
        resolved = path.resolve()
    except OSError as exc:
        logger.warning("aliases.resolve_failed path=%s error=%s", path, exc)
        return
    if resolved in visited:
        return
    visited.add(resolved)
    try:
        with resolved.open("r", encoding="utf-8") as fh:
            lines = fh.readlines()
    except (FileNotFoundError, PermissionError, OSError) as exc:
        logger.warning("aliases.io_error path=%s error=%s", resolved, exc)
        return

    base_dir = resolved.parent
    for raw in lines:
        # Strip trailing newline only — leading whitespace is meaningful
        # to the regex (we accept indented account directives).
        line = raw.rstrip("\n")
        if not line.strip() or line.lstrip().startswith(";"):
            continue
        m = _ACCOUNT_ALIAS_RE.match(line)
        if m is not None:
            acct = m.group("acct")
            name = m.group("name").strip()
            if acct and name:
                # First-seen wins so `include`s before the main file
                # cannot silently override.
                out.setdefault(acct, name)
            continue
        inc = _INCLUDE_RE.match(line)
        if inc is not None:
            include_path = _resolve_include(inc.group("path").strip(), base_dir)
            _scan(include_path, out, visited, depth + 1)


def _resolve_include(value: str, base_dir: Path) -> Path:
    """Resolve an ``include`` argument relative to the including file."""
    candidate = Path(value)
    if candidate.is_absolute():
        return candidate
    return (base_dir / candidate)


def safe_mtime_iso(path: Path) -> Optional[str]:
    """Return the journal mtime as an ISO-8601 string, or ``None`` on error.

    Helper kept here (not in service) so the route can stamp
    ``last_updated`` even when the alias map is empty. Pure stat call —
    no hledger involved.
    """
    from datetime import datetime, timezone

    try:
        ts = path.stat().st_mtime
    except OSError as exc:
        logger.warning("aliases.mtime_failed path=%s error=%s", path, exc)
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
