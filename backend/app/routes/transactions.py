"""Transactions, top expenses, and related endpoints."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.deps import get_current_user
from app.formatting import format_category
from app.hledger.helpers import month_bounds
from app.hledger.models import Amount

router = APIRouter()


@router.get("/api/top-expenses")
def top_expenses(
    month: Optional[str] = None,
    limit: int = 10,
    category: Optional[str] = None,
    user: Optional[str] = Depends(get_current_user),
):
    """Maiores gastos individuais do mês."""
    import main

    begin, end = month_bounds(month)
    query = f"expenses:{category}" if category else "expenses"
    data = main.hledger("register", query, "-b", begin, "-e", end)

    txs = []
    if isinstance(data, list):
        for t in data:
            if isinstance(t, list) and len(t) >= 4:
                tx_date = t[0] if isinstance(t[0], str) else ""
                tx_desc = t[2] if isinstance(t[2], str) else ""
                posting = t[3] if isinstance(t[3], dict) else {}
                account = posting.get("paccount", "")
                pamount = posting.get("pamount", [])
                amount = 0.0
                if isinstance(pamount, list) and pamount:
                    a = pamount[0]
                    if isinstance(a, dict):
                        amount = abs(float(a.get("aquantity", {}).get("floatingPoint", 0)))
                txs.append({
                    "data": tx_date,
                    "descricao": tx_desc,
                    "categoria": format_category(account),
                    "conta_raw": account,
                    "valor": round(amount, 2),
                })

    txs.sort(key=lambda x: x["valor"], reverse=True)
    return {"month": month or date.today().strftime("%Y-%m"), "transacoes": txs[:limit]}


def _transactions_for_account(account: str, begin: str, end: str) -> list[dict]:
    """Lista transações tocando uma conta específica com contra-posting."""
    import main

    data = main.hledger("print", f"acct:^{account}$", "-b", begin, "-e", end)
    txs = []
    if not isinstance(data, list):
        return txs
    for t in data:
        if not isinstance(t, dict):
            continue
        tx_date = t.get("tdate", "")
        tx_desc = t.get("tdescription", "")
        postings = t.get("tpostings", [])
        own = None
        contra = None
        for p in postings:
            pacct = p.get("paccount", "")
            if pacct == account and own is None:
                own = p
            elif pacct != account and contra is None:
                contra = p
        if own is None:
            continue

        pamount = own.get("pamount", [])
        valor = 0.0
        if isinstance(pamount, list) and pamount:
            a = pamount[0]
            if isinstance(a, dict):
                valor = float(a.get("aquantity", {}).get("floatingPoint", 0))

        contra_acct = contra.get("paccount", "") if contra else ""

        if contra_acct == "equity:saldo-inicial":
            tipo = "saldo_inicial"
        elif contra_acct.startswith("assets:") or contra_acct.startswith("liabilities:"):
            tipo = "transferencia"
        elif valor >= 0:
            tipo = "credito"
        else:
            tipo = "debito"

        txs.append({
            "data": tx_date,
            "descricao": tx_desc,
            "conta": account,
            "valor": round(valor, 2),
            "contra_conta": contra_acct,
            "categoria": format_category(contra_acct) if contra_acct else "",
            "tipo_movimento": tipo,
        })
    return txs


@router.get("/api/transactions")
def transactions(
    month: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    category: Optional[str] = None,
    account: Optional[str] = None,
    search: Optional[str] = None,
    tag: Optional[list[str]] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    sort: str = "date",
    order: str = "desc",
    user: Optional[str] = Depends(get_current_user),
):
    """Lista paginada de transações com filtros por categoria, conta, busca, tag e range."""
    import main

    if start and end:
        begin, period_end = start, end
    elif month:
        begin, period_end = month_bounds(month)
    else:
        begin, period_end = month_bounds()

    if account:
        txs = _transactions_for_account(account, begin, period_end)
        if search:
            txs = [tx for tx in txs if search.lower() in tx["descricao"].lower()]
        reverse = order.lower() == "desc"
        if sort == "amount":
            txs.sort(key=lambda x: x["valor"], reverse=reverse)
        else:
            txs.sort(key=lambda x: x["data"], reverse=reverse)
        total = len(txs)
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "transactions": txs[offset:offset + limit],
        }

    cmd_args = ["register"]
    if category:
        cmd_args.append(f"expenses:{category}")
    else:
        cmd_args.append("expenses")

    cmd_args.extend(["-b", begin, "-e", period_end])

    if tag:
        for t in tag:
            cmd_args.append(f"tag:{t}")

    data = main.hledger(*cmd_args)

    txs = []
    if isinstance(data, list):
        for t in data:
            if not (isinstance(t, list) and len(t) >= 4):
                continue
            tx_date = t[0] if isinstance(t[0], str) else ""
            tx_desc = t[2] if isinstance(t[2], str) else ""

            if search and search.lower() not in tx_desc.lower():
                continue

            posting = t[3] if isinstance(t[3], dict) else {}
            acct = posting.get("paccount", "")
            pamount = posting.get("pamount", [])
            amount = 0.0
            if isinstance(pamount, list) and pamount:
                a = pamount[0]
                if isinstance(a, dict):
                    amount = abs(float(a.get("aquantity", {}).get("floatingPoint", 0)))

            txs.append({
                "data": tx_date,
                "descricao": tx_desc,
                "conta": acct,
                "categoria": format_category(acct),
                "conta_raw": acct,
                "valor": round(amount, 2),
            })

    reverse = order.lower() == "desc"
    if sort == "amount":
        txs.sort(key=lambda x: x["valor"], reverse=reverse)
    else:
        txs.sort(key=lambda x: x["data"], reverse=reverse)

    total = len(txs)
    paginated = txs[offset:offset + limit]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "transactions": paginated,
    }
