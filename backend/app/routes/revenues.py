"""Revenues endpoint — list income postings for a month.

Feeds the "Mes" tab of Dashboard 2.0 (PRD Fase D §3), where revenues sit
at the top as the anchor for the monthly view.
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.deps import get_current_user
from app.hledger.helpers import month_bounds

router = APIRouter()

# Matches YYYY-MM with a valid month 01-12. Anything else yields 422 via
# FastAPI's built-in query validation (no custom handler required).
MONTH_PATTERN = r"^\d{4}-(0[1-9]|1[0-2])$"


@router.get("/api/revenues")
def revenues(
    month: Optional[str] = Query(default=None, pattern=MONTH_PATTERN),
    user: Optional[str] = Depends(get_current_user),
):
    """List revenue postings (one row per income posting) for a given month.

    Revenue postings are identified by accounts starting with ``income:`` or
    exactly ``income``. In hledger journals these postings typically carry a
    negative amount (credit to income); we surface the absolute value as the
    positive revenue amount, matching the convention used by /api/summary
    and /api/transactions.
    """
    import main

    begin, end = month_bounds(month)
    data = main.hledger("print", "income", "-b", begin, "-e", end)

    rows: list[dict] = []
    if isinstance(data, list):
        for tx in data:
            if not isinstance(tx, dict):
                continue
            tx_date = tx.get("tdate", "")
            tx_desc = tx.get("tdescription", "")
            for posting in tx.get("tpostings", []) or []:
                if not isinstance(posting, dict):
                    continue
                acct = posting.get("paccount", "")
                if not _is_income_account(acct):
                    continue
                amount = _posting_amount(posting)
                # Skip non-revenue entries (e.g. refunds posted as positive
                # values on the income side) — revenues are credits, i.e.
                # negative in the journal. abs() below normalizes to positive.
                if amount >= 0:
                    continue
                rows.append(
                    {
                        "date": tx_date,
                        "description": tx_desc,
                        "amount": round(abs(amount), 2),
                    }
                )

    rows.sort(key=lambda r: r["date"])
    total = round(sum(r["amount"] for r in rows), 2)

    return {
        "month": month or date.today().strftime("%Y-%m"),
        "revenues": rows,
        "total": total,
    }


def _is_income_account(account: str) -> bool:
    """True when `account` is under the `income` tree."""
    return account == "income" or account.startswith("income:")


def _posting_amount(posting: dict) -> float:
    """Extract the numeric posting amount, defaulting to 0.0."""
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
