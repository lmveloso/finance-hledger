"""Deterministic principle resolution (ADR-008).

Given an account (``expenses:alimentação:restaurantes``) and a tag dict
for one posting, return the principle id. Resolution order:

1. Explicit tag override — ``tags["principio"]`` must be a valid principle id.
   Invalid values are ignored (defensive) and a warning is logged.
2. Exact match in ``mapping.rules`` — keys that do NOT end with ``:*``.
3. Prefix wildcard match — ``expenses:lazer:*`` matches any descendant.
   The longest (most-specific) prefix wins.
4. Fallback to ``mapping.default``; the caller gets ``is_default_fallback=True``
   so the service can surface uncovered categories in the summary.

This function is pure: no I/O, no subprocess, no side effects besides a
log line for invalid tag overrides.
"""

from __future__ import annotations

import logging

from app.principles.models import VALID_PRINCIPLE_IDS, PrincipleId, PrincipleMapping

logger = logging.getLogger("finance-hledger")


def resolve_principle(
    account: str,
    tags: dict[str, str] | None,
    mapping: PrincipleMapping,
) -> tuple[PrincipleId, bool]:
    """Resolve the principle for one posting.

    Args:
        account: Full hledger account name, e.g. ``expenses:moradia:água``.
        tags: Tag dict for that posting, merged with transaction-header tags
            by the caller (posting tag wins). May be ``None``.
        mapping: Loaded :class:`PrincipleMapping`.

    Returns:
        ``(principle_id, is_default_fallback)`` — ``is_default_fallback`` is
        ``True`` only when resolution fell through to ``mapping.default``.
    """
    # 1. Tag override — only trust known ids.
    if tags:
        raw = tags.get("principio") or tags.get("principle")
        if raw is not None:
            value = raw.strip().lower()
            if value in VALID_PRINCIPLE_IDS:
                return value, False  # type: ignore[return-value]
            logger.warning(
                "principle.invalid_tag",
                extra={"account": account, "value": raw},
            )

    # 2. Exact match.
    rules = mapping.rules
    exact = rules.get(account)
    if exact is not None:
        return exact, False

    # 3. Wildcard — longest prefix wins.
    best_pattern: str | None = None
    best_principle: PrincipleId | None = None
    for pattern, pid in rules.items():
        if not pattern.endswith(":*"):
            continue
        prefix = pattern[:-2]  # strip trailing ':*'
        if account == prefix or account.startswith(prefix + ":"):
            if best_pattern is None or len(prefix) > len(best_pattern):
                best_pattern = prefix
                best_principle = pid

    if best_principle is not None:
        return best_principle, False

    # 4. Fallback.
    return mapping.default, True
