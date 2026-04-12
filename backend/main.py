"""
finance-hledger — Backend FastAPI
Serve /api/* (JSON do hledger) e / (SPA React buildada).
"""

import json
import logging
import subprocess
import os
from datetime import date, timedelta
from pathlib import Path
from typing import Optional, Union

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

logger = logging.getLogger("finance-hledger")

# ── Config ──────────────────────────────────────────────────────────────────
LEDGER_FILE = os.environ.get("LEDGER_FILE", os.path.expanduser("~/finances/2026.journal"))
HLEDGER = os.environ.get("HLEDGER_PATH", "hledger")
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

app = FastAPI(title="finance-hledger", version="1.0.0")

# CORS — permissivo por padrão (acesso via Tailscale).
# Se hospedar frontend separado no futuro, restrinja a origins específicas.
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["GET"],
    allow_headers=["*"],
)


def hledger(*args: str, output_format: str = "json",
            expected_type: Optional[type] = None):
    """Executa hledger CLI e retorna resultado parseado.

    Args:
        *args: Argumentos do hledger.
        output_format: "json" ou "text".
        expected_type: Se fornecido (dict ou list), emite warning se o
                       JSON retornado não for desse tipo.
    """
    cmd = [HLEDGER, "-f", LEDGER_FILE]
    if output_format == "json":
        cmd.extend(["-O", "json"])
    cmd.extend(args)

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    except FileNotFoundError:
        raise HTTPException(503, f"hledger não encontrado em '{HLEDGER}'")
    except subprocess.TimeoutExpired:
        raise HTTPException(504, "hledger demorou demais")

    if result.returncode != 0:
        raise HTTPException(500, f"hledger: {result.stderr.strip()}")

    if output_format == "json":
        try:
            parsed = json.loads(result.stdout)
        except json.JSONDecodeError:
            logger.warning("hledger retornou não-JSON para args=%s", args)
            return result.stdout.strip()

        if expected_type is not None and not isinstance(parsed, expected_type):
            logger.warning(
                "hledger schema: esperado %s, recebido %s para args=%s",
                expected_type.__name__, type(parsed).__name__, args,
            )
        return parsed
    return result.stdout.strip()


def month_bounds(month: Optional[str] = None) -> tuple[str, str]:
    """Retorna (begin, end) ISO pro mês dado (YYYY-MM) ou mês atual."""
    if month:
        y, m = map(int, month.split("-"))
    else:
        today = date.today()
        y, m = today.year, today.month
    begin = f"{y:04d}-{m:02d}-01"
    end = f"{y + 1:04d}-01-01" if m == 12 else f"{y:04d}-{m + 1:02d}-01"
    return begin, end


def months_back_bounds(n: int) -> tuple[str, str]:
    today = date.today().replace(day=1)
    for _ in range(n):
        today = (today - timedelta(days=1)).replace(day=1)
    begin = today.isoformat()
    end = date.today().replace(day=1)
    end = end.replace(year=end.year + 1, month=1) if end.month == 12 else end.replace(month=end.month + 1)
    return begin, end.isoformat()


# ── Helpers pra extrair números do JSON do hledger (1.52+) ───────────────
def _extract_one_amount(amount_obj) -> float:
    """Extrai um único float de um objeto de amount do hledger.

    Formatos suportados:
      - {"acommodity": "R$", "aquantity": {"floatingPoint": 123.45}}
      - {"acommodity": "R$", "aquantity": {"floatingPoint": 123.45, "display": ...}}
      - 123.45  (numérico puro, versões antigas)
    """
    if isinstance(amount_obj, (int, float)):
        return float(amount_obj)
    if not isinstance(amount_obj, dict):
        return 0.0
    aq = amount_obj.get("aquantity", {})
    if isinstance(aq, dict):
        val = aq.get("floatingPoint")
        if val is not None:
            return float(val)
    # Formatos ainda mais antigos: "aquantity" pode ser direto um número
    if isinstance(aq, (int, float)):
        return float(aq)
    return 0.0


def _parse_amount_list(raw) -> list[float]:
    """Normaliza qualquer formato de lista de amount para [float].

    Lida com:
      - lista de dicts: [{"acommodity", "aquantity": {floatingPoint}}]
      - lista de listas de dicts: [[{"acommodity", ...}]]
      - lista de números: [123.45]
      - valor único dict ou number
      - None / vazio
    """
    if raw is None:
        return []
    # Valor único (dict ou number) — embrulhar em lista
    if isinstance(raw, (dict, int, float)):
        return [_extract_one_amount(raw)]
    if not isinstance(raw, list):
        return []
    if not raw:
        return []
    # Lista de listas (formato prrAmounts com períodos): [[{...}, ...], ...]
    if isinstance(raw[0], list):
        flat = []
        for sub in raw:
            if isinstance(sub, list):
                for item in sub:
                    flat.append(_extract_one_amount(item))
        return flat
    # Lista de dicts ou números: [{...}, ...] ou [1.0, 2.0]
    return [_extract_one_amount(item) for item in raw]


def _amount(row) -> float:
    """Extrai valor numérico (soma absoluta) de uma row/account do hledger JSON.

    Suporta todos os formatos conhecidos do hledger (1.40+ até 1.52+):
      - prrAmounts / prrTotal (balancesheet/incomestatement prTotals)
      - amount / tamount / ebalance (balance/register)
      - Listas planas ou aninhadas
      - Valores numéricos puros (int/float)
    Retorna 0.0 com warning logado se o formato não for reconhecido.
    """
    if not isinstance(row, dict):
        logger.warning("_amount: recebido %s em vez de dict", type(row).__name__)
        return 0.0

    # Chaves conhecidas em ordem de prioridade
    candidate_keys = ("prrAmounts", "prrTotal", "amount", "tamount", "ebalance")

    for key in candidate_keys:
        raw = row.get(key)
        if raw is not None:
            values = _parse_amount_list(raw)
            if values:
                return sum(values)
            # Se a chave existe mas resultou em lista vazia, logar debug
            logger.debug("_amount: chave '%s' presente mas resultou em lista vazia (row keys=%s)",
                         key, list(row.keys()))
            return 0.0

    # Nenhuma chave reconhecida
    logger.warning("_amount: nenhuma chave de amount encontrada em row com keys=%s",
                    list(row.keys()))
    return 0.0


# ── Endpoints ─────────────────────────────────────────────────────────────
@app.get("/api/health")
def health():
    version = hledger("--version", output_format="text")
    return {
        "status": "ok",
        "hledger_version": version,
        "journal": LEDGER_FILE,
        "journal_exists": os.path.exists(LEDGER_FILE),
    }


@app.get("/api/summary")
def summary(month: Optional[str] = None):
    """Receitas, despesas e saldo do mês."""
    begin, end = month_bounds(month)
    data = hledger("incomestatement", "-b", begin, "-e", end)

    receitas = despesas = 0.0
    if isinstance(data, dict):
        # hledger incomestatement JSON tem estrutura com cbrSubreports
        for sub in data.get("cbrSubreports", []):
            title = (sub[0] if isinstance(sub, list) else sub.get("prrName", "")).lower()
            report = sub[1] if isinstance(sub, list) else sub
            total = abs(_amount(report.get("prTotals", {})))
            if "revenue" in title or "income" in title or "receita" in title:
                receitas = total
            elif "expense" in title or "despesa" in title:
                despesas = total

    return {
        "month": month or date.today().strftime("%Y-%m"),
        "receitas": round(receitas, 2),
        "despesas": round(despesas, 2),
        "saldo": round(receitas - despesas, 2),
    }


@app.get("/api/categories")
def categories(month: Optional[str] = None, depth: int = 2):
    """Despesas agregadas por categoria (para o gráfico de pizza)."""
    begin, end = month_bounds(month)
    data = hledger("balance", "expenses", f"--depth={depth}",
                   "-b", begin, "-e", end, "--layout=bare")

    cats = []
    if isinstance(data, list) and len(data) >= 1:
        for row in data[0]:
            if isinstance(row, list) and len(row) >= 4:
                name = row[0].split(":")[-1] if isinstance(row[0], str) else str(row[0])
                amount = abs(_amount({"amount": row[3]})) if isinstance(row[3], list) else 0
                if amount > 0:
                    cats.append({"nome": name.capitalize(), "valor": round(amount, 2)})

    cats.sort(key=lambda c: c["valor"], reverse=True)
    return {"month": month or date.today().strftime("%Y-%m"), "categorias": cats}


@app.get("/api/categories/{category}")
def category_detail(category: str, month: Optional[str] = None):
    """Drill-down: subcategorias de uma categoria."""
    begin, end = month_bounds(month)
    data = hledger("balance", f"expenses:{category}", "--depth=3",
                   "-b", begin, "-e", end, "--layout=bare")

    subs = []
    if isinstance(data, list) and len(data) >= 1:
        for row in data[0]:
            if isinstance(row, list) and len(row) >= 4:
                full = row[0] if isinstance(row[0], str) else ""
                parts = full.split(":")
                if len(parts) >= 3:  # expenses:category:subcategory
                    amount = abs(_amount({"amount": row[3]}))
                    if amount > 0:
                        subs.append({"nome": parts[-1].capitalize(), "valor": round(amount, 2)})

    return {"category": category, "subcategorias": subs}


@app.get("/api/cashflow")
def cashflow(months: int = 12):
    """Fluxo mensal (receitas/despesas) dos últimos N meses."""
    begin, end = months_back_bounds(months - 1)
    data = hledger("incomestatement", "-M", "-b", begin, "-e", end)

    result = []
    if isinstance(data, dict):
        cbr_dates = data.get("cbrDates", [])
        subreports = data.get("cbrSubreports", [])

        # Find Revenues and Expenses subreports
        revenues_report = None
        expenses_report = None
        for sub in subreports:
            title = (sub[0] if isinstance(sub, list) else "").lower()
            report = sub[1] if isinstance(sub, list) else {}
            if "revenue" in title or "income" in title:
                revenues_report = report
            elif "expense" in title:
                expenses_report = report

        # Iterate each period index
        for period_idx, date_range in enumerate(cbr_dates):
            # Extract YYYY-MM from first date in the range
            first_date = date_range[0] if isinstance(date_range, list) else date_range
            date_str = first_date.get("contents", "") if isinstance(first_date, dict) else str(first_date)
            mes = date_str[:7]  # "2026-01"

            receitas = 0.0
            if revenues_report and "prRows" in revenues_report:
                for row in revenues_report["prRows"]:
                    amounts = row.get("prrAmounts", [])
                    if period_idx < len(amounts) and amounts[period_idx]:
                        receitas += abs(float(amounts[period_idx][0].get("aquantity", {}).get("floatingPoint", 0)))

            despesas = 0.0
            if expenses_report and "prRows" in expenses_report:
                for row in expenses_report["prRows"]:
                    amounts = row.get("prrAmounts", [])
                    if period_idx < len(amounts) and amounts[period_idx]:
                        despesas += abs(float(amounts[period_idx][0].get("aquantity", {}).get("floatingPoint", 0)))

            result.append({
                "mes": mes,
                "receitas": round(receitas, 2),
                "despesas": round(despesas, 2),
            })

    return {"months": result}


@app.get("/api/networth")
def networth(months: int = 12):
    """Patrimônio líquido ao longo do tempo."""
    begin, end = months_back_bounds(months - 1)
    data = hledger("balancesheet", "-M", "-b", begin, "-e", end, "--historical")

    result = []
    if isinstance(data, dict):
        cbr_dates = data.get("cbrDates", [])
        subreports = data.get("cbrSubreports", [])

        # Find Assets and Liabilities subreports
        assets_report = None
        liabilities_report = None
        for sub in subreports:
            title = (sub[0] if isinstance(sub, list) else "").lower()
            report = sub[1] if isinstance(sub, list) else {}
            if "asset" in title:
                assets_report = report
            elif "liabilit" in title:
                liabilities_report = report

        # Iterate each period index
        for period_idx, date_range in enumerate(cbr_dates):
            first_date = date_range[0] if isinstance(date_range, list) else date_range
            date_str = first_date.get("contents", "") if isinstance(first_date, dict) else str(first_date)
            mes = date_str[:7]

            assets = 0.0
            if assets_report and "prRows" in assets_report:
                for row in assets_report["prRows"]:
                    amounts = row.get("prrAmounts", [])
                    if period_idx < len(amounts) and amounts[period_idx]:
                        assets += abs(float(amounts[period_idx][0].get("aquantity", {}).get("floatingPoint", 0)))

            liabilities = 0.0
            if liabilities_report and "prRows" in liabilities_report:
                for row in liabilities_report["prRows"]:
                    amounts = row.get("prrAmounts", [])
                    if period_idx < len(amounts) and amounts[period_idx]:
                        liabilities += abs(float(amounts[period_idx][0].get("aquantity", {}).get("floatingPoint", 0)))

            result.append({
                "mes": mes,
                "assets": round(assets, 2),
                "liabilities": round(liabilities, 2),
                "net": round(assets - liabilities, 2),
            })

    return {"months": result}


@app.get("/api/budget")
def budget(month: Optional[str] = None):
    """Orçamento vs realizado (requer ~ periodic transactions no journal)."""
    begin, end = month_bounds(month)
    data = hledger("balance", "expenses", "--budget",
                   "-b", begin, "-e", end)

    mes_label = month or date.today().strftime("%Y-%m")
    cats = []
    total_orcado = 0.0
    total_realizado = 0.0

    if isinstance(data, dict):
        rows = data.get("prRows", [])
        for row in rows:
            name = row.get("prrName", "")
            amounts = row.get("prrAmounts", [])

            # No budget JSON, prrAmounts[0] = realized, prrAmounts[1] = budgeted
            realizado = 0.0
            orcado = 0.0
            if isinstance(amounts, list) and len(amounts) >= 2:
                # amounts[0] = realized amounts (can be [] if nothing spent)
                realized_list = amounts[0]
                if isinstance(realized_list, list) and realized_list:
                    for a in realized_list:
                        if isinstance(a, dict):
                            realizado += abs(float(a.get("aquantity", {}).get("floatingPoint", 0)))
                # amounts[1] = budgeted amounts
                budgeted_list = amounts[1]
                if isinstance(budgeted_list, list) and budgeted_list:
                    for a in budgeted_list:
                        if isinstance(a, dict):
                            orcado += abs(float(a.get("aquantity", {}).get("floatingPoint", 0)))

            if orcado <= 0:
                continue

            pct = round((realizado / orcado) * 100) if orcado > 0 else 0
            # Extract display name: last part of "expenses:category:subcategory"
            parts = name.split(":")
            display = parts[-1].capitalize() if len(parts) > 1 else name.capitalize()

            cats.append({
                "nome": display,
                "conta": name,
                "orcado": round(orcado, 2),
                "realizado": round(realizado, 2),
                "percentual": pct,
            })
            total_orcado += orcado
            total_realizado += realizado

        # Fallback: if JSON parsing yielded no rows, try text parsing
        if not rows:
            cats, total_orcado, total_realizado = _parse_budget_text(begin, end, mes_label)
    else:
        # data is string (non-JSON), parse text
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


def _parse_budget_text(begin: str, end: str, month_label: str):
    """Fallback: parse hledger --budget -O text output with regex."""
    import re
    raw = hledger("balance", "expenses", "--budget",
                  "-b", begin, "-e", end, output_format="text")
    cats = []
    total_orcado = 0.0
    total_realizado = 0.0

    # Pattern: "expenses:category  ||  BRL 123.45 [ 85% of  BRL 200.00]"
    pat = re.compile(
        r'(expenses:\S+)\s*\|\|\s*(?:(?:BRL\s*([\d.,]+))|(?:\d+\s*\[))\s*\[\s*(\d+)%\s+of\s+BRL\s*([\d.,]+)\]'
    )
    # Simpler: capture account, realized, %, budgeted
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
            parts = name.split(":")
            display = parts[-1].capitalize() if len(parts) > 1 else name.capitalize()

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


@app.get("/api/top-expenses")
def top_expenses(month: Optional[str] = None, limit: int = 10):
    """Maiores gastos individuais do mês."""
    begin, end = month_bounds(month)
    data = hledger("register", "expenses", "-b", begin, "-e", end)

    txs = []
    if isinstance(data, list):
        for t in data:
            if isinstance(t, list) and len(t) >= 4:
                # hledger 1.52 register: [date, None, desc, posting_dict, balance_list]
                tx_date = t[0] if isinstance(t[0], str) else ""
                tx_desc = t[2] if isinstance(t[2], str) else ""
                posting = t[3] if isinstance(t[3], dict) else {}
                account = posting.get("paccount", "")
                pamount = posting.get("pamount", [])
                # Extrair valor do pamount
                amount = 0.0
                if isinstance(pamount, list) and pamount:
                    a = pamount[0]
                    if isinstance(a, dict):
                        amount = abs(float(a.get("aquantity", {}).get("floatingPoint", 0)))
                txs.append({
                    "data": tx_date,
                    "descricao": tx_desc,
                    "categoria": account.split(":")[-1] if account else "",
                    "valor": round(amount, 2),
                })

    txs.sort(key=lambda x: x["valor"], reverse=True)
    return {"month": month or date.today().strftime("%Y-%m"),
            "transacoes": txs[:limit]}


@app.get("/api/transactions")
def transactions(
    month: Optional[str] = None,
    start: Optional[str] = None,
    end: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    sort: str = "date",
    order: str = "desc",
):
    """Lista paginada de transações com filtros por categoria, busca e range."""
    # Determinar período
    if start and end:
        begin, period_end = start, end
    elif month:
        begin, period_end = month_bounds(month)
    else:
        begin, period_end = month_bounds()

    # Construir args do hledger register
    cmd_args = ["register"]

    # Filtro por categoria
    if category:
        cmd_args.append(f"expenses:{category}")
    else:
        cmd_args.append("expenses")

    cmd_args.extend(["-b", begin, "-e", period_end])

    # Usar output JSON
    data = hledger(*cmd_args)

    txs = []
    if isinstance(data, list):
        for t in data:
            if not (isinstance(t, list) and len(t) >= 4):
                continue
            tx_date = t[0] if isinstance(t[0], str) else ""
            tx_desc = t[2] if isinstance(t[2], str) else ""

            # Filtro de busca (case-insensitive na descrição)
            if search and search.lower() not in tx_desc.lower():
                continue

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
                "conta": account,
                "categoria": account.split(":")[-1] if account else "",
                "valor": round(amount, 2),
            })

    # Ordenação
    reverse = order.lower() == "desc"
    if sort == "amount":
        txs.sort(key=lambda x: x["valor"], reverse=reverse)
    else:  # default: date
        txs.sort(key=lambda x: x["data"], reverse=reverse)

    total = len(txs)
    paginated = txs[offset:offset + limit]

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "transactions": paginated,
    }


@app.get("/api/savings-goal")
def savings_goal(monthly_target: float = 5000, annual_target: float = 60000):
    """Progresso de meta de economia (mensal + anual)."""
    year = date.today().year
    # Mês atual
    mb, me = month_bounds()
    mes_data = hledger("incomestatement", "-b", mb, "-e", me)
    mes_receitas = mes_despesas = 0.0
    if isinstance(mes_data, dict):
        for sub in mes_data.get("cbrSubreports", []):
            title = (sub[0] if isinstance(sub, list) else "").lower()
            report = sub[1] if isinstance(sub, list) else {}
            total = abs(_amount(report.get("prTotals", {})))
            if "revenue" in title or "income" in title:
                mes_receitas = total
            elif "expense" in title:
                mes_despesas = total

    # Ano acumulado
    ano_data = hledger("incomestatement", "-b", f"{year}-01-01", "-e", f"{year + 1}-01-01")
    ano_receitas = ano_despesas = 0.0
    if isinstance(ano_data, dict):
        for sub in ano_data.get("cbrSubreports", []):
            title = (sub[0] if isinstance(sub, list) else "").lower()
            report = sub[1] if isinstance(sub, list) else {}
            total = abs(_amount(report.get("prTotals", {})))
            if "revenue" in title or "income" in title:
                ano_receitas = total
            elif "expense" in title:
                ano_despesas = total

    return {
        "monthly": {
            "target": monthly_target,
            "actual": round(mes_receitas - mes_despesas, 2),
        },
        "annual": {
            "target": annual_target,
            "actual": round(ano_receitas - ano_despesas, 2),
        },
    }


# ── Servir frontend buildado ─────────────────────────────────────────────
# Se existir frontend/dist, serve o SPA. Senão, só a API.
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        # API routes are handled above; qualquer outro path cai aqui.
        if full_path.startswith("api/"):
            raise HTTPException(404)
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(index)
        raise HTTPException(404, "Frontend não foi buildado. Rode `npm run build` em /frontend.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
