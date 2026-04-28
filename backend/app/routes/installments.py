"""Installments endpoint — active credit-card parcelamentos.

Feeds the "Decaimento de dívida" view of the Plano tab (PR-D5). Relies on
periodic transactions declared per ADR-011 (restores ADR-009):

    ~ monthly from 2026-05-01 to 2026-12-01
        expenses:moradia:equipamentos-novos   371.79  ; parcelamento: ELECTROLUX 3/10
        liabilities:cartão:nubank

Each such declaration expands to one posting per month; this endpoint groups
them by the NAME captured before ``N/M`` in the tag value, and reports one
aggregated row per active installment.
"""

from __future__ import annotations

import logging
import re
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends

from app.credit_cards import CARD_PREFIXES
from app.credit_cards.forecast import forecast_parcelamento_transactions
from app.deps import get_current_user

logger = logging.getLogger("finance-hledger")

router = APIRouter()

# Account paths that must NEVER be picked as the card leg even if no
# canonical-prefix posting is present. Expense and equity legs are the
# parcelamento's "what" and "opening", not the credit-card commitment.
_NON_CARD_PREFIXES: tuple[str, ...] = ("expenses:", "equity:")

# Matches "NAME N/M" where N and M are positive integers. Accepts additional
# whitespace-separated tokens in the NAME portion (e.g. "GEL FRONTAL 2/6").
_TAG_RE = re.compile(r"^(?P<name>.+?)\s+(?P<n>\d+)/(?P<m>\d+)\s*$")


@router.get("/api/installments")
def installments(user: Optional[str] = Depends(get_current_user)):
    """Return active installments declared as periodic parcelamentos.

    An installment is "active" iff it has at least one forecast occurrence
    strictly after today. Series whose only forecast rows are in the past
    are considered finished and excluded — even if ``paid < total`` (the
    "isolated past tail" edge case from ADR-011 §Errata 2026-04-28).

    ``remaining`` is the count of forecast occurrences with
    ``date > today``. ``remaining_value = remaining * monthly_value``. This
    matches the credit-card service semantics so per-card sums agree
    across endpoints (ADR-011 §Errata 2026-04-28 followup).
    """
    import main

    today = date.today()
    today_iso = today.isoformat()

    data = forecast_parcelamento_transactions(main._hledger_client, today=today)

    groups: dict[str, dict] = {}
    for tx in data:
        if not isinstance(tx, dict):
            continue
        _ingest_transaction(tx, groups)

    rows = [_finalize(group, today_iso) for group in groups.values()]
    # Active iff at least one forecast occurrence is strictly after today.
    active = [row for row in rows if row.pop("_has_future", False)]
    active.sort(key=lambda row: row["name"])

    total_monthly = round(sum(row["monthly_value"] for row in active), 2)
    total_remaining = round(sum(row["remaining_value"] for row in active), 2)

    return {
        "installments": active,
        "total_monthly": total_monthly,
        "total_remaining": total_remaining,
    }


def _ingest_transaction(tx: dict, groups: dict[str, dict]) -> None:
    """Aggregate a single forecast transaction into the groups dict."""
    tx_date = tx.get("tdate") or ""
    postings = tx.get("tpostings", []) or []
    account = _pick_card_account(postings)
    for posting in postings:
        if not isinstance(posting, dict):
            continue
        parsed = _extract_parcelamento_tag(posting)
        if parsed is None:
            continue
        name, total, raw_tag_value = parsed
        amount = abs(_posting_amount(posting))
        if amount == 0:
            continue

        group = groups.setdefault(
            name,
            {
                "name": name,
                "description": f"parcelamento: {raw_tag_value}",
                "monthly_value": amount,
                "total": total,
                "dates": [],
                "account": account,
            },
        )
        # First occurrence wins for description/value/total/account; later
        # forecast postings just contribute their dates. Having the same
        # NAME with different totals would imply two separate declarations
        # — rare, but we keep the first seen to avoid silent data
        # collisions.
        if tx_date:
            group["dates"].append(tx_date)
        if not group.get("account") and account:
            group["account"] = account


def _pick_card_account(postings: list) -> str:
    """Return the card-leg account for a parcelamento transaction.

    Decision rule (PR-mes-fluxo-installments-visibility):
    1. Prefer the leg whose ``paccount`` starts with one of
       :data:`app.credit_cards.CARD_PREFIXES`.
    2. Fall back to the first non-expense, non-equity leg and emit a
       WARNING — non-canonical card prefixes are tolerated so the row
       still carries an account, but the warning surfaces them.

    Returns ``""`` if no eligible posting is found.
    """
    fallback = ""
    for posting in postings:
        if not isinstance(posting, dict):
            continue
        acct = posting.get("paccount") or ""
        if not acct:
            continue
        if any(acct.startswith(prefix) for prefix in CARD_PREFIXES):
            return acct
        if not fallback and not any(
            acct.startswith(prefix) for prefix in _NON_CARD_PREFIXES
        ):
            fallback = acct
    if fallback:
        logger.warning(
            "installments.non_canonical_card_prefix account=%s", fallback
        )
    return fallback


def _extract_parcelamento_tag(posting: dict) -> Optional[tuple[str, int, str]]:
    """Return (name, total, raw_tag_value) or None if no parcelamento tag."""
    tags = posting.get("ptags") or []
    for tag in tags:
        if not isinstance(tag, (list, tuple)) or len(tag) < 2:
            continue
        key, value = tag[0], tag[1]
        if key != "parcelamento":
            continue
        match = _TAG_RE.match(str(value).strip())
        if not match:
            continue
        try:
            total = int(match.group("m"))
        except ValueError:
            continue
        name = match.group("name").strip()
        if not name or total <= 0:
            continue
        return name, total, str(value).strip()
    return None


def _posting_amount(posting: dict) -> float:
    """Extract the numeric posting amount; 0.0 when missing."""
    pamount = posting.get("pamount", [])
    if not isinstance(pamount, list) or not pamount:
        return 0.0
    first = pamount[0]
    if not isinstance(first, dict):
        return 0.0
    qty = first.get("aquantity", {})
    if not isinstance(qty, dict):
        return 0.0
    try:
        return float(qty.get("floatingPoint", 0))
    except (TypeError, ValueError):
        return 0.0


def _finalize(group: dict, today_iso: str) -> dict:
    """Return the public row for one group.

    Semantics (ADR-011 §Errata 2026-04-28 followup):
    ``remaining`` = forecast occurrences strictly after today (NOT
    ``total - paid`` — pre-journal parcels would inflate that). ``paid``
    keeps display context. ``next_parcel`` = ``total - remaining + 1``;
    for ended series we return ``total + 1`` as a sentinel (filtered out
    by the caller, never rendered). ``_has_future`` is internal-only;
    the caller filters by it and pops it before serialising.
    """
    dates = sorted(group["dates"])
    total = group["total"]
    future_count = sum(1 for d in dates if d > today_iso)
    paid = min(sum(1 for d in dates if d <= today_iso), total)
    remaining = future_count
    monthly = round(group["monthly_value"], 2)
    remaining_value = round(remaining * monthly, 2)
    end_date = dates[-1] if dates else ""
    has_future = future_count > 0
    next_parcel = total - future_count + 1 if has_future else total + 1

    return {
        "name": group["name"],
        "description": group["description"],
        "monthly_value": monthly,
        "paid": paid,
        "total": total,
        "remaining": remaining,
        "remaining_value": remaining_value,
        "next_parcel": next_parcel,
        "end_date": end_date,
        "account": group.get("account", ""),
        "_has_future": has_future,
    }
