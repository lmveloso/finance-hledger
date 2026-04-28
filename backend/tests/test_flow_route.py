"""Integration tests for ``GET /api/flow``.

Focused regression coverage for the "idle account visibility" fix: a
liability or asset that carried a non-zero opening balance into the queried
month must surface in ``contas`` even when no transaction touches it during
that month — otherwise an unpaid credit-card fatura silently disappears
from the Fluxo screen.
"""

from __future__ import annotations

import importlib
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

JOURNAL = Path(__file__).parent / "data" / "flow_idle_accounts.journal"


@pytest.fixture(scope="module")
def flow_client():
    old_ledger = os.environ.get("LEDGER_FILE")
    os.environ["LEDGER_FILE"] = str(JOURNAL)

    from app.config import reset_settings

    reset_settings()
    import main as main_mod

    importlib.reload(main_mod)
    main_mod.LEDGER_FILE = str(JOURNAL)

    yield TestClient(main_mod.app)

    if old_ledger is not None:
        os.environ["LEDGER_FILE"] = old_ledger
    else:
        os.environ.pop("LEDGER_FILE", None)
    reset_settings()
    importlib.reload(main_mod)


def _by_account(payload: dict) -> dict[str, dict]:
    return {c["conta"]: c for c in payload["contas"]}


def test_idle_liability_with_opening_balance_is_listed(flow_client):
    """BB Visa carries a 400.00 fatura from March into April with no April
    activity. It must still appear in April with all movement zero."""
    data = flow_client.get("/api/flow?month=2026-04").json()
    by_acct = _by_account(data)

    assert "liabilities:cartão:bb-visa" in by_acct
    bb = by_acct["liabilities:cartão:bb-visa"]
    assert bb["tipo"] == "passivo"
    assert bb["entradas_externas"] == 0.0
    assert bb["saidas_externas"] == 0.0
    assert bb["transfers_in"] == 0.0
    assert bb["transfers_out"] == 0.0
    # Opening = -400 (liability), final collapses to opening when zero movement.
    assert bb["saldo_inicial"] == bb["saldo_final"]
    assert bb["saldo_inicial"] != 0


def test_idle_asset_with_opening_balance_is_listed(flow_client):
    """Savings account untouched in April — must still appear with its
    historical balance."""
    data = flow_client.get("/api/flow?month=2026-04").json()
    by_acct = _by_account(data)

    assert "assets:savings" in by_acct
    sav = by_acct["assets:savings"]
    assert sav["tipo"] == "ativo"
    assert sav["entradas_externas"] == 0.0
    assert sav["saidas_externas"] == 0.0
    assert sav["saldo_final"] == sav["saldo_inicial"] == 1000.0


def test_active_account_path_unaffected(flow_client):
    """Sanity check: accounts with movement in the month behave as before."""
    data = flow_client.get("/api/flow?month=2026-04").json()
    by_acct = _by_account(data)

    nubank = by_acct["liabilities:cartão:nubank"]
    # 200 of grocery spend in April → saidas_externas; the 100 payment
    # from the bank is a transfer (assets ↔ liabilities).
    assert nubank["saidas_externas"] == 200.0
    assert nubank["transfers_in"] == 100.0
