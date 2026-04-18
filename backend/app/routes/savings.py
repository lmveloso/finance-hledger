"""Savings goal and alerts endpoints."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.hledger.helpers import month_bounds, add_month_str
from app.hledger.parsers import parse_income_statement

router = APIRouter()


@router.get("/api/savings-goal")
def savings_goal(
    monthly_target: float = 5000,
    annual_target: float = 60000,
    user: Optional[str] = Depends(get_current_user),
):
    """Progresso de meta de economia (mensal + anual)."""
    import main

    year = date.today().year
    mb, me = month_bounds()
    mes_data = main.hledger("incomestatement", "-b", mb, "-e", me)
    mes_receitas = mes_despesas = 0.0
    if isinstance(mes_data, dict):
        stmt = parse_income_statement(mes_data)
        mes_receitas = stmt.revenues
        mes_despesas = stmt.expenses

    ano_data = main.hledger("incomestatement", "-b", f"{year}-01-01", "-e", f"{year + 1}-01-01")
    ano_receitas = ano_despesas = 0.0
    if isinstance(ano_data, dict):
        stmt = parse_income_statement(ano_data)
        ano_receitas = stmt.revenues
        ano_despesas = stmt.expenses

    return {
        "monthly": {
            "target": monthly_target,
            "actual": round(mes_receitas - mes_despesas, 2),
            "pct": round((mes_receitas - mes_despesas) / monthly_target * 100, 1) if monthly_target else 0,
        },
        "annual": {
            "target": annual_target,
            "actual": round(ano_receitas - ano_despesas, 2),
            "pct": round((ano_receitas - ano_despesas) / annual_target * 100, 1) if annual_target else 0,
        },
    }


@router.get("/api/alerts")
def alerts(
    month: Optional[str] = None,
    user: Optional[str] = Depends(get_current_user),
):
    """Alertas: categorias com gasto >25% acima da media dos ultimos 3 meses."""
    import main

    target_month = month or date.today().strftime("%Y-%m")
    target_spending = main._category_spending(target_month)

    historical: dict[str, list[float]] = {}
    for i in range(1, 4):
        hist_month = add_month_str(target_month, -i)
        hist_spending = main._category_spending(hist_month)
        for cat, val in hist_spending.items():
            historical.setdefault(cat, []).append(val)

    alerts_list = []
    for cat, target_val in target_spending.items():
        hist_vals = historical.get(cat, [])
        if hist_vals:
            avg = sum(hist_vals) / len(hist_vals)
            if avg > 0 and target_val > avg * 1.25:
                alerts_list.append({
                    "categoria": cat,
                    "gasto": round(target_val, 2),
                    "media": round(avg, 2),
                    "pct_acima": round((target_val / avg - 1) * 100, 1),
                })

    return {"month": target_month, "alerts": sorted(alerts_list, key=lambda x: x["pct_acima"], reverse=True)}
