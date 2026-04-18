"""Categories endpoints — aggregate expenses and subcategory drill-down."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.deps import get_current_user
from app.hledger.helpers import month_bounds

router = APIRouter()


from app.formatting import display_segment as _display_segment


def _parse_amount(raw) -> float:
    """Parse a single amount from hledger balance --layout=bare output."""
    from app.hledger.models import Amount
    return abs(Amount.sum_list(raw))


@router.get("/api/categories")
def categories(
    month: Optional[str] = None,
    depth: int = 2,
    tag: Optional[list[str]] = Query(None),
    user: Optional[str] = Depends(get_current_user),
):
    """Despesas agregadas por categoria (para o gráfico de pizza)."""
    import main

    begin, end = month_bounds(month)
    cmd_args = ["balance", "expenses", f"--depth={depth}", "-b", begin, "-e", end, "--layout=bare"]
    if tag:
        for t in tag:
            cmd_args.append(f"tag:{t}")
    data = main.hledger(*cmd_args)

    cats = []
    if isinstance(data, list) and len(data) >= 1:
        for row in data[0]:
            if isinstance(row, list) and len(row) >= 4:
                full = row[0] if isinstance(row[0], str) else ""
                segmento_raw = full.split(":")[-1] if full else ""
                amount = _parse_amount(row[3]) if isinstance(row[3], list) else 0
                if amount > 0:
                    cats.append({
                        "nome": _display_segment(segmento_raw),
                        "segmento_raw": segmento_raw,
                        "valor": round(amount, 2),
                    })

    cats.sort(key=lambda c: c["valor"], reverse=True)
    return {"month": month or date.today().strftime("%Y-%m"), "categorias": cats}


@router.get("/api/categories/{category}")
def category_detail(
    category: str,
    month: Optional[str] = None,
    user: Optional[str] = Depends(get_current_user),
):
    """Drill-down: subcategorias de uma categoria."""
    import main

    begin, end = month_bounds(month)
    data = main.hledger("balance", f"expenses:{category}", "--depth=3",
                        "-b", begin, "-e", end, "--layout=bare")

    subs = []
    if isinstance(data, list) and len(data) >= 1:
        for row in data[0]:
            if isinstance(row, list) and len(row) >= 4:
                full = row[0] if isinstance(row[0], str) else ""
                parts = full.split(":")
                if len(parts) >= 3:
                    amount = _parse_amount(row[3])
                    if amount > 0:
                        subs.append({"nome": _display_segment(parts[-1]), "valor": round(amount, 2)})

    return {"category": category, "subcategorias": subs}
