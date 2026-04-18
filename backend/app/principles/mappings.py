"""Load and validate ``principles.json`` from disk.

The factory JSON ships at ``app/principles/principles.default.json`` and is
read at startup. Per ADR-008, user overrides live in SQLite (not yet
implemented); this module only handles the read-only factory file.

Also exposes :func:`extract_posting_tags` — a small helper that merges the
shape-specific tag representations emitted by ``hledger print -O json``
into a plain ``dict[str, str]`` the resolver can consume.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from app.principles.errors import (
    PrincipleFileNotFound,
    PrincipleMappingError,
)
from app.principles.models import VALID_PRINCIPLE_IDS, Principle, PrincipleMapping

# Matches "key: value" tag fragments in pcomment/tcomment when ptags/ttags
# is missing (defensive fallback — hledger 1.52 emits ptags reliably).
_TAG_RE = re.compile(r"([a-zA-Z_][a-zA-Z0-9_-]*)\s*:\s*([^;,\n]+)")


def load_mapping(path: Path) -> PrincipleMapping:
    """Load and validate a principles.json file.

    Raises:
        PrincipleFileNotFound: path does not exist or is not a file.
        PrincipleMappingError: JSON malformed, missing ``default``, or rule
            references an unknown principle id.
    """
    if not path.exists() or not path.is_file():
        raise PrincipleFileNotFound(f"principles file not found: {path}")

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise PrincipleMappingError(
            f"principles file is not valid JSON: {exc}"
        ) from exc

    if not isinstance(raw, dict):
        raise PrincipleMappingError("principles file must be a JSON object")

    default = raw.get("default")
    if not isinstance(default, str):
        raise PrincipleMappingError("principles file missing 'default' string field")
    if default not in VALID_PRINCIPLE_IDS:
        raise PrincipleMappingError(
            f"'default' must be one of {sorted(VALID_PRINCIPLE_IDS)}, got {default!r}"
        )

    principles_raw = raw.get("principles")
    if not isinstance(principles_raw, list) or not principles_raw:
        raise PrincipleMappingError("principles file missing 'principles' list")

    principles: list[Principle] = []
    seen_ids: set[str] = set()
    for item in principles_raw:
        if not isinstance(item, dict):
            raise PrincipleMappingError(f"principle entry must be an object: {item!r}")
        pid = item.get("id")
        if pid not in VALID_PRINCIPLE_IDS:
            raise PrincipleMappingError(f"unknown principle id: {pid!r}")
        if pid in seen_ids:
            raise PrincipleMappingError(f"duplicate principle id: {pid!r}")
        seen_ids.add(pid)
        principles.append(Principle(**item))

    rules_raw = raw.get("rules", {})
    if not isinstance(rules_raw, dict):
        raise PrincipleMappingError("'rules' must be an object")

    rules: dict[str, str] = {}
    for pattern, pid in rules_raw.items():
        if not isinstance(pattern, str) or not pattern:
            raise PrincipleMappingError(
                f"rule pattern must be non-empty string: {pattern!r}"
            )
        if pid not in VALID_PRINCIPLE_IDS:
            raise PrincipleMappingError(
                f"rule {pattern!r} points to unknown principle: {pid!r}"
            )
        rules[pattern] = pid

    return PrincipleMapping(rules=rules, default=default, principles=principles)


def extract_posting_tags(raw_posting: dict[str, Any]) -> dict[str, str]:
    """Return a plain dict of tags for one posting as emitted by ``hledger print``.

    hledger 1.52 emits ``ptags`` as a list of ``[key, value]`` pairs. Older
    shapes (dict, missing) are accepted defensively. If neither is present
    the ``pcomment`` text is scanned with a regex as a last resort.
    """
    out: dict[str, str] = {}
    ptags = raw_posting.get("ptags")
    if isinstance(ptags, list):
        for entry in ptags:
            if isinstance(entry, list) and len(entry) == 2:
                k, v = entry
                if isinstance(k, str) and isinstance(v, str):
                    out[k] = v.strip()
    elif isinstance(ptags, dict):
        for k, v in ptags.items():
            if isinstance(k, str) and isinstance(v, str):
                out[k] = v.strip()

    if not out:
        comment = raw_posting.get("pcomment") or ""
        if isinstance(comment, str) and comment:
            for k, v in _TAG_RE.findall(comment):
                out[k] = v.strip()
    return out


def extract_transaction_tags(raw_tx: dict[str, Any]) -> dict[str, str]:
    """Return a plain dict of tags for one transaction header."""
    out: dict[str, str] = {}
    ttags = raw_tx.get("ttags")
    if isinstance(ttags, list):
        for entry in ttags:
            if isinstance(entry, list) and len(entry) == 2:
                k, v = entry
                if isinstance(k, str) and isinstance(v, str):
                    out[k] = v.strip()
    elif isinstance(ttags, dict):
        for k, v in ttags.items():
            if isinstance(k, str) and isinstance(v, str):
                out[k] = v.strip()

    if not out:
        comment = raw_tx.get("tcomment") or ""
        if isinstance(comment, str) and comment:
            for k, v in _TAG_RE.findall(comment):
                out[k] = v.strip()
    return out
