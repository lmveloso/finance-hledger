"""Installments endpoint — active credit-card parcelamentos.

Feeds the "Decaimento de dívida" view of the Plano tab (PR-D5). Relies on
periodic transactions declared per ADR-009:

    ~ monthly from 2026-05-01 to 2026-12-01
        expenses:moradia:equipamentos-novos   371.79  ; parcelamento: ELECTROLUX 3/10
        liabilities:cartão:nubank

Each such declaration expands to one posting per month; this endpoint groups
them by the first token after ``parcelamento:`` (the installment name) and
reports one aggregated row per active installment.
"""

from __future__ import annotations

import re
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.hledger.helpers import months_forward_bounds

router = APIRouter()

# Forecast window: 24 months ahead is enough to cover any reasonable
# credit-card installment plan (cards typically cap at 12x-18x).
FORECAST_MONTHS_AHEAD = 24

# Matches "NAME N/M" where N and M are positive integers. Accepts additional
# whitespace-separated tokens in the NAME portion (e.g. "GEL FRONTAL 2/6").
_TAG_RE = re.compile(r"^(?P<name>.+?)\s+(?P<n>\d+)/(?P<m>\d+)\s*$")


@router.get("/api/installments")
def installments(user: Optional[str] = Depends(get_current_user)):
    """Return active installments declared as periodic parcelamentos.

    An installment is "active" when today falls between its first and last
    scheduled occurrence — equivalently, ``paid < total``.
    """
    import main

    # Forecast window: from the earliest reasonable start up to N months ahead.
    # We use a far-past begin (journal epoch) so we count historical occurrences
    # too; the ``to`` clause in each periodic declaration bounds the top end.
    _, end_forward = months_forward_bounds(FORECAST_MONTHS_AHEAD)
    begin = "1900-01-01"

    data = main.hledger(
        "print", "--forecast", "tag:parcelamento", "-b", begin, "-e", end_forward
    )

    today_iso = date.today().isoformat()
    groups: dict[str, dict] = {}

    if isinstance(data, list):
        for tx in data:
            if not isinstance(tx, dict):
                continue
            _ingest_transaction(tx, groups)

    rows = [_finalize(group, today_iso) for group in groups.values()]
    active = [row for row in rows if row["paid"] < row["total"]]
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
    for posting in tx.get("tpostings", []) or []:
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
            },
        )
        # First occurrence wins for description/value/total; later forecast
        # postings just contribute their dates. Having the same NAME with
        # different totals would imply two separate declarations — rare, but
        # we keep the first seen to avoid silent data collisions.
        if tx_date:
            group["dates"].append(tx_date)


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
    """Return the public row for one group."""
    dates = sorted(group["dates"])
    total = group["total"]
    # paid = forecast occurrences up to and including today, capped at total.
    paid = min(sum(1 for d in dates if d <= today_iso), total)
    remaining = max(total - paid, 0)
    monthly = round(group["monthly_value"], 2)
    remaining_value = round(remaining * monthly, 2)
    end_date = dates[-1] if dates else ""

    return {
        "name": group["name"],
        "description": group["description"],
        "monthly_value": monthly,
        "paid": paid,
        "total": total,
        "remaining": remaining,
        "remaining_value": remaining_value,
        "end_date": end_date,
    }
