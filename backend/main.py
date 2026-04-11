"""
finance-hledger — Backend FastAPI
Serve /api/* (JSON do hledger) e / (SPA React buildada).
"""

import json
import subprocess
import os
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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


def hledger(*args: str, output_format: str = "json"):
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
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            return result.stdout.strip()
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


# ── Helpers pra extrair números do JSON do hledger ────────────────────────
def _amount(row) -> float:
    """Extrai valor numérico de uma row/account do hledger JSON."""
    try:
        amounts = row.get("amount") or row.get("tamount") or row.get("ebalance") or []
        if isinstance(amounts, list) and amounts:
            return float(amounts[0].get("aquantity", {}).get("floatingPoint", 0))
    except (AttributeError, TypeError, IndexError):
        pass
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
            total = abs(_amount({"amount": report.get("prrTotals", [])}))
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
    return {"months": months, "raw": data}


@app.get("/api/networth")
def networth(months: int = 12):
    """Patrimônio líquido ao longo do tempo."""
    begin, end = months_back_bounds(months - 1)
    data = hledger("balancesheet", "-M", "-b", begin, "-e", end, "--historical")
    return {"months": months, "raw": data}


@app.get("/api/budget")
def budget(month: Optional[str] = None):
    """Orçamento vs realizado (requer ~ periodic transactions no journal)."""
    begin, end = month_bounds(month)
    data = hledger("balance", "expenses", "--budget",
                   "-b", begin, "-e", end, output_format="text")
    return {"month": month or date.today().strftime("%Y-%m"), "raw": data}


@app.get("/api/top-expenses")
def top_expenses(month: Optional[str] = None, limit: int = 10):
    """Maiores gastos individuais do mês."""
    begin, end = month_bounds(month)
    data = hledger("register", "expenses", "-b", begin, "-e", end)

    txs = []
    if isinstance(data, list):
        for t in data:
            if isinstance(t, list) and len(t) >= 5:
                tx_data = t[4] if isinstance(t[4], dict) else {}
                amount = abs(_amount({"amount": t[3]}))
                txs.append({
                    "data": tx_data.get("tdate", ""),
                    "descricao": tx_data.get("tdescription", ""),
                    "categoria": t[2].split(":")[-1] if isinstance(t[2], str) else "",
                    "valor": round(amount, 2),
                })

    txs.sort(key=lambda x: x["valor"], reverse=True)
    return {"month": month or date.today().strftime("%Y-%m"),
            "transacoes": txs[:limit]}


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
            total = abs(_amount({"amount": report.get("prrTotals", [])}))
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
            total = abs(_amount({"amount": report.get("prrTotals", [])}))
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
