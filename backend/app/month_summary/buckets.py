"""Bucketing helpers for the expense split and credit-card payment scan.

Pulled out of :mod:`app.month_summary.service` to keep that module under the
200-line cap. These helpers are pure (no hledger I/O) — they walk the
``hledger print -O json`` shape.

Bucket vocabulary used by ``bucket_for``:
    "assets"  - contra posting is on assets:*
    "card"    - contra posting matches one of CARD_PREFIXES
    "other"   - anything else (e.g. equity:* opening). LOGGED once per
                transaction so the invariant test surfaces silent leaks.
"""

from __future__ import annotations

import logging
from typing import Any, Iterable

from app.hledger.models import Amount

logger = logging.getLogger("finance-hledger")


def classify_postings(postings: list[Any]) -> tuple[float, list[str]]:
    """Return ``(abs(expense_total), [contra_account, ...])`` for one tx."""
    expense_total = 0.0
    contras: list[str] = []
    for p in postings:
        if not isinstance(p, dict):
            continue
        account = p.get("paccount", "") or ""
        amount = Amount.sum_list(p.get("pamount", []))
        if account.startswith("expenses:") or account == "expenses":
            expense_total += abs(amount)
        else:
            contras.append(account)
    return expense_total, contras


def bucket_for(
    contras: Iterable[str],
    card_prefixes: tuple[str, ...],
    tx: dict,
) -> str:
    """Return ``"assets" | "card" | "other"`` from the contra accounts.

    A transaction is bucketed by its first matching contra. ``other`` also
    covers e.g. ``equity:*`` openings — those are logged once per
    transaction so the invariant test surfaces them.
    """
    contras_list = list(contras)
    for account in contras_list:
        if account.startswith("assets:") or account == "assets":
            return "assets"
        if any(account.startswith(p) for p in card_prefixes):
            return "card"
    logger.warning(
        "month_summary.expense_other_contra",
        extra={
            "tdate": tx.get("tdate", ""),
            "tdescription": tx.get("tdescription", ""),
            "contras": contras_list,
        },
    )
    return "other"


def is_card_payment(
    postings: list[Any], card_prefixes: tuple[str, ...]
) -> bool:
    """Detect an asset -> card-liability transaction (no expense leg).

    The two-leg shape is what skills/hledger-fatura emits for invoice
    payments. Mixed transactions (asset + card + expense) are NOT counted
    here so we don't double-book accruals.
    """
    accounts = [
        (p.get("paccount", "") or "")
        for p in postings
        if isinstance(p, dict)
    ]
    has_card = any(
        any(a.startswith(prefix) for prefix in card_prefixes) for a in accounts
    )
    has_asset = any(a.startswith("assets:") or a == "assets" for a in accounts)
    has_expense = any(a.startswith("expenses:") for a in accounts)
    return has_card and has_asset and not has_expense


def sum_card_side(
    postings: list[Any], card_prefixes: tuple[str, ...]
) -> float:
    """Sum |amount| of every posting touching a card-prefix account."""
    total = 0.0
    for p in postings:
        if not isinstance(p, dict):
            continue
        acct = p.get("paccount", "") or ""
        if any(acct.startswith(prefix) for prefix in card_prefixes):
            total += abs(Amount.sum_list(p.get("pamount", [])))
    return total
