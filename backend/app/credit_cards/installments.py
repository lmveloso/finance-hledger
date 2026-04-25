"""Parsers for the ``parcelamento:`` tag (ADR-010).

A purchase paid in N installments is recorded as a single transaction on
the original purchase date, tagged ``parcelamento: NAME Nx``. Subsequent
invoice lines for the same purchase do NOT generate new transactions —
they're just the schedule of an already-recorded debt.

This module owns the tag parser plus the today-vs-completion comparison
that decides whether a parcelamento is still "live" for a given card.
The comparison is a pure function of the transaction date, the parsed N,
and the contra-posting account — no I/O, no hledger calls.
"""

from __future__ import annotations

import logging
import re
from datetime import date
from typing import Any, Iterable, Optional

logger = logging.getLogger("finance-hledger")

# ``parcelamento: NAME Nx`` — accepts uppercase or lowercase ``x``,
# optional whitespace between N and x, and any leading/trailing spaces.
# Capture groups: (name, n).
_TAG_RE = re.compile(
    r"^\s*(?P<name>.+?)\s+(?P<n>\d+)\s*[xX]\s*$",
)


def parse_parcelamento_tag(value: str) -> Optional[tuple[str, int]]:
    """Parse a ``parcelamento`` tag value into (NAME, N).

    Examples
    --------
    >>> parse_parcelamento_tag("ELECTROLUX 10x")
    ('ELECTROLUX', 10)
    >>> parse_parcelamento_tag("VIAGEM 5X")
    ('VIAGEM', 5)
    >>> parse_parcelamento_tag("  IPHONE  12 x  ")
    ('IPHONE', 12)
    >>> parse_parcelamento_tag("only-a-name") is None
    True
    >>> parse_parcelamento_tag("NAME 0x") is None
    True

    Returns ``None`` on malformed input and logs a warning so importers
    can be debugged without raising on every odd line. The function is
    pure — call it from anywhere.
    """
    if not isinstance(value, str) or not value.strip():
        logger.warning("parcelamento.empty_tag")
        return None
    match = _TAG_RE.match(value)
    if not match:
        logger.warning("parcelamento.malformed_tag value=%r", value)
        return None
    name = match.group("name").strip()
    try:
        n = int(match.group("n"))
    except ValueError:
        logger.warning("parcelamento.invalid_n value=%r", value)
        return None
    if not name or n <= 0:
        logger.warning("parcelamento.invalid_value value=%r", value)
        return None
    return name, n


def add_months(start: date, months: int) -> date:
    """Return ``start + months`` clamped to the target month's last day.

    Used to compute ``expected_completion = purchase_date + N months``.
    Day clamping handles purchases on the 31st where the target month is
    shorter (e.g. Jan 31 + 1 month → Feb 28).
    """
    total = start.month - 1 + months
    new_year = start.year + total // 12
    new_month = total % 12 + 1
    # Clamp the day to the new month's length without importing calendar.
    for day in (start.day, 30, 29, 28):
        try:
            return date(new_year, new_month, day)
        except ValueError:
            continue
    # Should never happen — Feb has at least 28 days.
    return date(new_year, new_month, 1)


def is_live(purchase_date: date, n_installments: int, today: date) -> bool:
    """True when ``purchase_date + N months >= today`` (Q2 resolution (b))."""
    return add_months(purchase_date, n_installments) >= today


def count_live_for_card(
    transactions: Iterable[dict[str, Any]],
    card_account: str,
    today: Optional[date] = None,
) -> int:
    """Count live ``parcelamento:`` transactions whose contra-posting is ``card_account``.

    A transaction is counted when **all** of the following hold:
    1. It carries a ``parcelamento:`` tag with a parsable ``NAME Nx`` value.
    2. One of its postings is exactly ``card_account``.
    3. ``add_months(purchase_date, N) >= today``.

    The tag is inspected on the **transaction** level (``ttags``) because
    ADR-010 records it on the purchase header. We also accept it on a
    posting (``ptags``) for robustness — some legacy importers attach it
    to the expense leg.

    Pure function. ``today`` defaults to ``date.today()`` so callers can
    inject a fixed clock in tests.
    """
    if today is None:
        today = date.today()
    count = 0
    for tx in transactions:
        if not isinstance(tx, dict):
            continue
        if not _touches_account(tx, card_account):
            continue
        parsed = _extract_parcelamento(tx)
        if parsed is None:
            continue
        name, n = parsed
        purchase_date = _parse_iso_date(tx.get("tdate"))
        if purchase_date is None:
            continue
        if is_live(purchase_date, n, today):
            count += 1
    return count


def _touches_account(tx: dict[str, Any], account: str) -> bool:
    for posting in tx.get("tpostings") or []:
        if isinstance(posting, dict) and posting.get("paccount") == account:
            return True
    return False


def _extract_parcelamento(tx: dict[str, Any]) -> Optional[tuple[str, int]]:
    """Look for ``parcelamento`` in transaction tags, then in posting tags."""
    for entry in tx.get("ttags") or []:
        parsed = _try_pair(entry)
        if parsed is not None:
            return parsed
    for posting in tx.get("tpostings") or []:
        if not isinstance(posting, dict):
            continue
        for entry in posting.get("ptags") or []:
            parsed = _try_pair(entry)
            if parsed is not None:
                return parsed
    return None


def _try_pair(entry: Any) -> Optional[tuple[str, int]]:
    if not isinstance(entry, (list, tuple)) or len(entry) < 2:
        return None
    key, value = entry[0], entry[1]
    if key != "parcelamento" or not isinstance(value, str):
        return None
    return parse_parcelamento_tag(value)


def _parse_iso_date(value: Any) -> Optional[date]:
    if not isinstance(value, str) or not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        return None
