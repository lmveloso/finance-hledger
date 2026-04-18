"""
finance-hledger — Backend FastAPI
Serve /api/* (JSON do hledger) e / (SPA React buildada).

All endpoints live in app/routes/*.py. This file is pure wiring.
"""

import json
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.hledger.client import HledgerClient
from app.hledger.errors import HledgerCallError, HledgerNotFound, HledgerTimeout
from app.observability import RequestIdMiddleware, configure_logging, get_logger

# ── Config ──────────────────────────────────────────────────────────────────
settings = get_settings()
LEDGER_FILE = str(settings.ledger_file)
HLEDGER = settings.hledger_path
FRONTEND_DIST = Path(__file__).parent.parent / "frontend" / "dist"

# ── Logging ─────────────────────────────────────────────────────────────────
configure_logging(level=settings.log_level, fmt=settings.log_format)
logger = get_logger("finance-hledger")

_DISPLAY_NAMES_PATH = Path(__file__).parent / "account_display_names.json"
try:
    _DISPLAY_NAMES = json.loads(_DISPLAY_NAMES_PATH.read_text()).get("segments", {})
except (FileNotFoundError, json.JSONDecodeError) as e:
    logger.warning("display_names_load_failed", error=str(e))
    _DISPLAY_NAMES = {}


# ── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(title="finance-hledger", version="1.0.0")

# RequestIdMiddleware must be added BEFORE CORSMiddleware so it wraps the
# entire request lifecycle including CORS preflight handling.
app.add_middleware(RequestIdMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ── HledgerClient ───────────────────────────────────────────────────────────
_hledger_client = HledgerClient(ledger_file=LEDGER_FILE, binary=HLEDGER)


def hledger(*args: str, output_format: str = "json",
            expected_type: Optional[type] = None):
    """Execute hledger CLI via HledgerClient. Maps typed exceptions to HTTP."""
    try:
        return _hledger_client.run(
            *args, output_format=output_format, expected_type=expected_type
        )
    except HledgerNotFound:
        raise HTTPException(503, f"hledger não encontrado em '{HLEDGER}'")
    except HledgerTimeout:
        raise HTTPException(504, "hledger demorou demais")
    except HledgerCallError as e:
        raise HTTPException(500, f"hledger: {e}")


# ── Routes ──────────────────────────────────────────────────────────────────
from app.routes.auth import router as auth_router
from app.routes.budget import router as budget_router
from app.routes.cashflow import router as cashflow_router
from app.routes.categories import router as categories_router
from app.routes.flow import router as flow_router
from app.routes.health import router as health_router
from app.routes.networth import router as networth_router
from app.routes.revenues import router as revenues_router
from app.routes.savings import router as savings_router
from app.routes.seasonality import router as seasonality_router
from app.routes.summary import router as summary_router
from app.routes.tags import router as tags_router
from app.routes.transactions import router as transactions_router

app.include_router(auth_router)
app.include_router(health_router)
app.include_router(summary_router)
app.include_router(revenues_router)
app.include_router(cashflow_router)
app.include_router(networth_router)
app.include_router(savings_router)
app.include_router(categories_router)
app.include_router(flow_router)
app.include_router(budget_router)
app.include_router(transactions_router)
app.include_router(tags_router)
app.include_router(seasonality_router)

# ── Servir frontend buildado ─────────────────────────────────────────────
# Se existir frontend/dist, serve o SPA. Senão, só a API.
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    # PWA files served explicitly before the catch-all so they don't return index.html
