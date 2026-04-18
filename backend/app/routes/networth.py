"""Net worth, accounts, and balance history endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.hledger.helpers import month_bounds, months_back_bounds
from app.hledger.parsers import networth_from_balancesheet, parse_period_report

router = APIRouter()


@router.get("/api/networth")
def networth(
    months: int = 12,
    user: Optional[str] = Depends(get_current_user),
):
    """Patrimônio líquido mensal."""
    import main

    begin, end = months_back_bounds(months - 1)
    data = main.hledger("balancesheet", "-M", "-b", begin, "-e", end, "--historical")
    if isinstance(data, dict):
        return {"months": networth_from_balancesheet(data)}
    return {"months": []}


@router.get("/api/accounts")
def accounts(user: Optional[str] = Depends(get_current_user)):
    """Lista de contas com saldos."""
    import main

    begin, end = month_bounds()
    data = main.hledger("balance", "assets", "liabilities", "-e", end, "--historical", "--flat")
    result = []
    if isinstance(data, list) and len(data) >= 1:
        rows = data[0] if isinstance(data[0], list) else []
        for row in rows:
            if isinstance(row, list) and len(row) >= 4:
                name = row[0] if isinstance(row[0], str) else ""
                from app.hledger.models import Amount
                balance = Amount.sum_list(row[3])
                if abs(balance) > 0.01:
                    result.append({"conta": name, "saldo": round(balance, 2)})
    return {"accounts": sorted(result, key=lambda x: abs(x["saldo"]), reverse=True)}


@router.get("/api/accounts/{account_path:path}/balance-history")
def account_balance_history(
    account_path: str,
    months: int = 12,
    user: Optional[str] = Depends(get_current_user),
):
    """Saldo mensal de uma conta ao longo do tempo."""
    import main

    begin, end = months_back_bounds(months - 1)
    data = main.hledger("balance", account_path, "-M", "-b", begin, "-e", end, "--historical")
    if isinstance(data, dict):
        report = parse_period_report(data)
        result = []
        for date_range in report.dates:
            mes = date_range[0][:7] if date_range else ""
            idx = report.dates.index(date_range) if date_range in report.dates else -1
            val = 0.0
            for sub in report.subreports:
                for row in sub.rows:
                    if account_path in row.name and 0 <= idx < len(row.amounts):
                        val = row.amounts[idx]
                        break
            result.append({"mes": mes, "saldo": round(val, 2)})
        return {"account": account_path, "history": result}
    return {"account": account_path, "history": []}
