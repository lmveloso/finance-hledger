"""Summary endpoint — monthly income/expenses/balance."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.hledger.helpers import month_bounds
from app.hledger.parsers import parse_income_statement

router = APIRouter()


@router.get("/api/summary")
def summary(
    month: Optional[str] = None,
    user: Optional[str] = Depends(get_current_user),
):
    """Receitas, despesas e saldo do mês."""
    import main

    begin, end = month_bounds(month)
    data = main.hledger("incomestatement", "-b", begin, "-e", end)

    receitas = despesas = 0.0
    if isinstance(data, dict):
        stmt = parse_income_statement(data)
        receitas = stmt.revenues
        despesas = stmt.expenses

    return {
        "month": month or date.today().strftime("%Y-%m"),
        "receitas": round(receitas, 2),
        "despesas": round(despesas, 2),
        "saldo": round(receitas - despesas, 2),
    }
