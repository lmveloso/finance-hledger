"""Budget endpoint — planned vs actual."""

import re
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.formatting import format_category
from app.hledger.helpers import month_bounds

router = APIRouter()


def _parse_budget_text(begin: str, end: str, month_label: str):
    """Fallback: parse hledger --budget -O text output with regex."""
    import main

    raw = main.hledger("balance", "expenses", "--budget",
                       "-b", begin, "-e", end, output_format="text")
    cats = []
    total_orcado = 0.0
    total_realizado = 0.0

    pat2 = re.compile(
        r'^(expenses:\S+)\s+\|\|\s+(?:(BRL\s*[\d.,]+)|\s*\d+\s+)\s+\[\s*(\d+)%\s+of\s+(BRL\s*[\d.,]+)\]'
    )
    for line in raw.split('\n'):
        m = pat2.match(line.strip())
        if m:
            name = m.group(1)
            realized_str = m.group(2) or "0"
            pct_val = int(m.group(3))
            budgeted_str = m.group(4)

            def parse_brl(s):
                s = s.replace("BRL", "").strip()
                return float(s.replace(".", "").replace(",", ".")) if s else 0.0

            realizado = parse_brl(realized_str)
            orcado = parse_brl(budgeted_str)
            display = format_category(name)

            cats.append({
                "nome": display,
                "conta": name,
                "orcado": round(orcado, 2),
                "realizado": round(realizado, 2),
                "percentual": pct_val,
            })
            total_orcado += orcado
            total_realizado += realizado

    return cats, total_orcado, total_realizado


@router.get("/api/budget")
def budget(
    month: Optional[str] = None,
    user: Optional[str] = Depends(get_current_user),
):
    """Orçamento vs realizado (requer ~ periodic transactions no journal)."""
    import main

    begin, end = month_bounds(month)
    data = main.hledger("balance", "expenses", "--budget", "-b", begin, "-e", end)

    mes_label = month or date.today().strftime("%Y-%m")
    cats = []
    total_orcado = 0.0
    total_realizado = 0.0

    if isinstance(data, dict):
        rows = data.get("prRows", [])
        for row in rows:
            name = row.get("prrName", "")
            amounts = row.get("prrAmounts", [])

            realizado = 0.0
            orcado = 0.0
            if isinstance(amounts, list) and amounts:
                period = amounts[0]
                if isinstance(period, list) and len(period) >= 2:
                    realized_list = period[0]
                    if isinstance(realized_list, list) and realized_list:
                        for a in realized_list:
                            if isinstance(a, dict):
                                realizado += abs(float(a.get("aquantity", {}).get("floatingPoint", 0)))
                    budgeted_list = period[1]
                    if isinstance(budgeted_list, list) and budgeted_list:
                        for a in budgeted_list:
                            if isinstance(a, dict):
                                orcado += abs(float(a.get("aquantity", {}).get("floatingPoint", 0)))

            if orcado <= 0:
                continue

            pct = round((realizado / orcado) * 100) if orcado > 0 else 0
            display = format_category(name)

            cats.append({
                "nome": display,
                "conta": name,
                "orcado": round(orcado, 2),
                "realizado": round(realizado, 2),
                "percentual": pct,
            })
            total_orcado += orcado
            total_realizado += realizado

        if not rows:
            cats, total_orcado, total_realizado = _parse_budget_text(begin, end, mes_label)
    else:
        cats, total_orcado, total_realizado = _parse_budget_text(begin, end, mes_label)

    total_pct = round((total_realizado / total_orcado) * 100) if total_orcado > 0 else 0
    cats.sort(key=lambda c: c["percentual"], reverse=True)

    return {
        "month": mes_label,
        "categorias": cats,
        "total": {
            "orcado": round(total_orcado, 2),
            "realizado": round(total_realizado, 2),
            "percentual": total_pct,
        },
    }
