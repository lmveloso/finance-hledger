"""
Account formatting and display helpers.

Used by route modules for display name resolution and category formatting.
"""

import json
import logging
from pathlib import Path

logger = logging.getLogger("finance-hledger")

# Load display names
_DISPLAY_NAMES_PATH = Path(__file__).parent.parent / "account_display_names.json"
try:
    _DISPLAY_NAMES = json.loads(_DISPLAY_NAMES_PATH.read_text()).get("segments", {})
except (FileNotFoundError, json.JSONDecodeError) as e:
    logger.warning("account_display_names.json não carregado: %s", e)
    _DISPLAY_NAMES = {}


def display_segment(segment: str) -> str:
    """Lookup display name for a segment."""
    return _DISPLAY_NAMES.get(segment, segment)


def format_category(account: str) -> str:
    """Format an account path to a human-readable category name."""
    parts = account.split(":")
    if len(parts) >= 2:
        return _DISPLAY_NAMES.get(parts[-1], parts[-1])
    return account


def format_account_name(account: str) -> str:
    """Format an account name for display."""
    parts = account.split(":")
    if len(parts) >= 3:
        # assets:Banco:Nubank -> "Nubank (Banco)"
        return f"{_DISPLAY_NAMES.get(parts[-1], parts[-1])} ({_DISPLAY_NAMES.get(parts[-2], parts[-2])})"
    elif len(parts) == 2:
        return _DISPLAY_NAMES.get(parts[-1], parts[-1])
    return account


def category_spending(month: str) -> dict[str, float]:
    """Get expense spending by category for a given month (YYYY-MM)."""
    import main

    begin, end = main.month_bounds(month) if hasattr(main, 'month_bounds') else (f"{month}-01", f"{month}-28")
    from app.hledger.helpers import month_bounds
    begin, end = month_bounds(month)

    data = main.hledger("balance", "expenses", "--depth=2",
                        "-b", begin, "-e", end, "--layout=bare")
    cats = {}
    if isinstance(data, list) and len(data) >= 1:
        for row in data[0]:
            if isinstance(row, list) and len(row) >= 4:
                full = row[0] if isinstance(row[0], str) else ""
                name = full.split(":")[-1] if full else ""
                from app.hledger.models import Amount
                amount = abs(Amount.sum_list(row[3])) if isinstance(row[3], list) else 0
                if name and amount > 0:
                    cats[name.lower()] = amount
    return cats
