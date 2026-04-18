"""Flow endpoint — per-account movement breakdown and transfer matrix."""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.hledger.helpers import month_bounds
from app.hledger.models import Amount

router = APIRouter()


from app.formatting import format_account_name as _format_account_name


@router.get("/api/flow")
def flow(
    month: Optional[str] = None,
    user: Optional[str] = Depends(get_current_user),
):
    """Detalha movimentacao do mes: por conta + matriz de transferencias."""
    import main

    begin, end = month_bounds(month)

    # 1) Opening balances
    opening_raw = main.hledger("balance", "assets", "liabilities",
                               "-e", begin, "--historical", "--flat")
    opening = {}
    rows = opening_raw[0] if isinstance(opening_raw, list) and opening_raw and isinstance(opening_raw[0], list) else []
    for row in rows:
        if isinstance(row, list) and len(row) >= 4 and isinstance(row[0], str):
            opening[row[0]] = Amount.sum_list(row[3]) if isinstance(row[3], list) else 0.0

    # 2) All transactions in month
    tx_data = main.hledger("print", "-b", begin, "-e", end)

    per_account: dict[str, dict] = {}
    transfers: dict[tuple, float] = {}

    def bucket(acct: str) -> dict:
        if acct not in per_account:
            per_account[acct] = {
                "conta": acct, "nome": _format_account_name(acct),
                "saldo_inicial": round(opening.get(acct, 0.0), 2),
                "entradas_externas": 0.0, "saidas_externas": 0.0,
                "transfers_in": 0.0, "transfers_out": 0.0,
                "saldo_inicial_postings": 0.0,
            }
        return per_account[acct]

    if isinstance(tx_data, list):
        for t in tx_data:
            if not isinstance(t, dict):
                continue
            postings = t.get("tpostings", [])
            pairs = []
            for p in postings:
                acct = p.get("paccount", "")
                val = Amount.sum_list(p.get("pamount", []))
                pairs.append((acct, val))

            own = [(a, v) for (a, v) in pairs if a.startswith("assets:") or a.startswith("liabilities:")]
            expense = [(a, v) for (a, v) in pairs if a.startswith("expenses:")]
            income = [(a, v) for (a, v) in pairs if a.startswith("income:")]
            equity = [(a, v) for (a, v) in pairs if a == "equity:saldo-inicial"]

            if equity:
                for (a, v) in own:
                    bucket(a)["saldo_inicial_postings"] += v
                continue

            if expense and own:
                for (a, v) in own:
                    if v < 0:
                        bucket(a)["saidas_externas"] += abs(v)
                    else:
                        bucket(a)["entradas_externas"] += v
                continue

            if income and own:
                for (a, v) in own:
                    if v > 0:
                        bucket(a)["entradas_externas"] += v
                    else:
                        bucket(a)["saidas_externas"] += abs(v)
                continue

            if len(own) >= 2 and not expense and not income:
                senders = [(a, v) for (a, v) in own if v < 0]
                receivers = [(a, v) for (a, v) in own if v > 0]
                for (sa, sv) in senders:
                    remaining = abs(sv)
                    for (ra, rv) in receivers:
                        if remaining <= 0:
                            break
                        amount = min(remaining, rv)
                        if amount <= 0:
                            continue
                        transfers[(sa, ra)] = transfers.get((sa, ra), 0.0) + amount
                        bucket(sa)["transfers_out"] += amount
                        bucket(ra)["transfers_in"] += amount
                        remaining -= amount

    contas = []
    for acct, b in per_account.items():
        entradas = round(b["entradas_externas"], 2)
        saidas = round(b["saidas_externas"], 2)
        tin = round(b["transfers_in"], 2)
        tout = round(b["transfers_out"], 2)
        saldo_final = round(b["saldo_inicial"] + entradas - saidas + tin - tout + b["saldo_inicial_postings"], 2)
        contas.append({
            "conta": acct, "nome": b["nome"],
            "tipo": "ativo" if acct.startswith("assets") else "passivo",
            "saldo_inicial": b["saldo_inicial"],
            "entradas_externas": entradas, "saidas_externas": saidas,
            "transfers_in": tin, "transfers_out": tout,
            "saldo_final": saldo_final,
        })
    contas.sort(key=lambda c: (0 if c["tipo"] == "ativo" else 1, c["conta"]))

    transfer_list = [
        {"from": sa, "from_nome": _format_account_name(sa),
         "to": ra, "to_nome": _format_account_name(ra),
         "valor": round(v, 2)}
        for (sa, ra), v in transfers.items() if v > 0
    ]
    transfer_list.sort(key=lambda t: t["valor"], reverse=True)

    total_entradas = round(sum(c["entradas_externas"] for c in contas), 2)
    total_saidas = round(sum(c["saidas_externas"] for c in contas), 2)

    return {
        "month": month or date.today().strftime("%Y-%m"),
        "total_entradas": total_entradas, "total_saidas": total_saidas,
        "total_economia": round(total_entradas - total_saidas, 2),
        "contas": contas, "transferencias": transfer_list,
    }
