"""Tags endpoint — period-scoped."""

from typing import Optional

from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.hledger.helpers import month_bounds

router = APIRouter()


@router.get("/api/tags")
def tags(
    month: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    user: Optional[str] = Depends(get_current_user),
):
    """List unique tags with transaction counts, scoped to a period.

    Precedence mirrors /api/transactions:
      1. If both ``start`` and ``end`` are provided, use them.
      2. Otherwise, if ``month`` (YYYY-MM) is provided, use ``month_bounds(month)``.
      3. Otherwise default to the current month.

    Each transaction contributes at most ``1`` to the count of any given tag,
    even if the same tag appears on multiple postings of that transaction.
    Tag names are harvested from both transaction-level (``ttags``) and
    posting-level (``ptags``) fields in the ``hledger print -O json`` output.

    Response shape (unchanged):
        {"tags": [{"tag": str, "count": int}, ...]}

    Ordered by ``count`` desc, then by ``tag`` asc for stable tie-breaking.
    """
    import main

    if start and end:
        begin, period_end = start, end
    elif month:
        begin, period_end = month_bounds(month)
    else:
        begin, period_end = month_bounds()

    data = main.hledger("print", "-b", begin, "-e", period_end)

    counts: dict[str, int] = {}
    if isinstance(data, list):
        for tx in data:
            if not isinstance(tx, dict):
                continue
            tx_tags: set[str] = set()
            for pair in tx.get("ttags", []) or []:
                name = _tag_name(pair)
                if name:
                    tx_tags.add(name)
            for posting in tx.get("tpostings", []) or []:
                if not isinstance(posting, dict):
                    continue
                for pair in posting.get("ptags", []) or []:
                    name = _tag_name(pair)
                    if name:
                        tx_tags.add(name)
            for name in tx_tags:
                counts[name] = counts.get(name, 0) + 1

    result = [{"tag": name, "count": c} for name, c in counts.items()]
    result.sort(key=lambda t: (-t["count"], t["tag"]))
    return {"tags": result}


def _tag_name(pair) -> Optional[str]:
    """Extract the tag name from an hledger JSON tag entry.

    Tag entries look like ``["tagname", "tagvalue"]``. Empty names are skipped.
    """
    if isinstance(pair, (list, tuple)) and pair:
        name = pair[0]
        if isinstance(name, str) and name:
            return name
    return None
