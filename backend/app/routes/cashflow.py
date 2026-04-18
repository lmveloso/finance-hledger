"""Cashflow and forecast endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.hledger.helpers import months_back_bounds, months_forward_bounds
from app.hledger.parsers import cashflow_from_incomestatement

router = APIRouter()


@router.get("/api/cashflow")
def cashflow(
    months: int = 12,
    user: Optional[str] = Depends(get_current_user),
):
    """Fluxo mensal (receitas/despesas)."""
    import main

    begin, end = months_back_bounds(months - 1)
    data = main.hledger("incomestatement", "-M", "-b", begin, "-e", end)
    if isinstance(data, dict):
        return {"months": cashflow_from_incomestatement(data)}
    return {"months": []}


@router.get("/api/forecast")
def forecast(
    months: int = 6,
    user: Optional[str] = Depends(get_current_user),
):
    """Projeção de saldo N meses à frente baseada em transações periódicas."""
    import main

    begin, end = months_forward_bounds(months)
    data = main.hledger("incomestatement", "-M", "--forecast", "-b", begin, "-e", end)
    if isinstance(data, dict):
        result = cashflow_from_incomestatement(data)
        for m in result:
            m["saldo"] = round(m["receitas"] - m["despesas"], 2)
        return {"months": result, "forecast": True}
    return {"months": [], "forecast": True}
