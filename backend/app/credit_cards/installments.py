"""Parsers for the ``parcelamento:`` tag (ADR-011, restores ADR-009).

Each credit-card installment is a transaction in the month it falls on
the invoice. Past installments live as one-offs in fatura journals;
future installments are projected from ``~ monthly`` declarations in
``parcelamentos.journal`` via ``hledger print --forecast``.

Tag format on the expense posting: ``parcelamento: NAME N/M`` where
``NAME`` is stable across the whole series, ``N`` is the installment
number (text fixed in periodic declarations — same string repeats for
every forecast occurrence), and ``M`` is the series total.
"""

from __future__ import annotations

import logging
import re
from datetime import date
from typing import Any, Iterable, Optional

logger = logging.getLogger("finance-hledger")

# ``parcelamento: NAME N/M`` — NAME may contain spaces, N and M are
# positive integers. Capture groups: (name, n, m).
_TAG_RE = re.compile(
    r"^\s*(?P<name>.+?)\s+(?P<n>\d+)/(?P<m>\d+)\s*$",
)


def parse_parcelamento_tag(value: str) -> Optional[tuple[str, int, int]]:
    """Parse a ``parcelamento`` tag value into (NAME, N, M).

    Examples
    --------
    >>> parse_parcelamento_tag("Decathlon 2/4")
    ('Decathlon', 2, 4)
    >>> parse_parcelamento_tag("  Anuidade Caixa titular  6/12  ")
    ('Anuidade Caixa titular', 6, 12)
    >>> parse_parcelamento_tag("only-a-name") is None
    True
    >>> parse_parcelamento_tag("NAME 0/3") is None
    True

    Returns ``None`` on malformed input and logs a warning.
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
        m = int(match.group("m"))
    except ValueError:
        logger.warning("parcelamento.invalid_numbers value=%r", value)
        return None
    if not name or n <= 0 or m <= 0:
        logger.warning("parcelamento.invalid_value value=%r", value)
        return None
    return name, n, m


def count_live_for_card(
    transactions: Iterable[dict[str, Any]],
    card_account: str,
    today: Optional[date] = None,
) -> int:
    """Count distinct parcelamento series with at least one future occurrence on ``card_account``.

    Caller is expected to pass forecast-enabled output, typically:

        client.run("print", "--forecast", "tag:parcelamento")

    A series is "live" when at least one of its transactions touching
    ``card_account`` has a date strictly greater than ``today``. Past
    one-offs alone do not count — the dashboard's "live installments"
    metric is about commitments still owed.

    Pure function. ``today`` defaults to ``date.today()``.
    """
    if today is None:
        today = date.today()
    today_iso = today.isoformat()
    series_with_future: set[str] = set()
    for tx in transactions:
        if not isinstance(tx, dict):
            continue
        if not _touches_account(tx, card_account):
            continue
        parsed = _extract_parcelamento(tx)
        if parsed is None:
            continue
        name, _n, _m = parsed
        tx_date = tx.get("tdate") or ""
        if tx_date > today_iso:
            series_with_future.add(name)
    return len(series_with_future)


def _touches_account(tx: dict[str, Any], account: str) -> bool:
    for posting in tx.get("tpostings") or []:
        if isinstance(posting, dict) and posting.get("paccount") == account:
            return True
    return False


def _extract_parcelamento(tx: dict[str, Any]) -> Optional[tuple[str, int, int]]:
    """Look for ``parcelamento`` first on posting tags, then on transaction tags.

    ADR-011 puts the tag on the expense posting. We also accept it on
    the transaction header for robustness (some legacy/manual entries
    place it there).
    """
    for posting in tx.get("tpostings") or []:
        if not isinstance(posting, dict):
            continue
        for entry in posting.get("ptags") or []:
            parsed = _try_pair(entry)
            if parsed is not None:
                return parsed
    for entry in tx.get("ttags") or []:
        parsed = _try_pair(entry)
        if parsed is not None:
            return parsed
    return None


def _try_pair(entry: Any) -> Optional[tuple[str, int, int]]:
    if not isinstance(entry, (list, tuple)) or len(entry) < 2:
        return None
    key, value = entry[0], entry[1]
    if key != "parcelamento" or not isinstance(value, str):
        return None
    return parse_parcelamento_tag(value)
