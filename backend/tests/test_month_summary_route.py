"""Integration tests for ``GET /api/month-summary``.

Uses a dedicated fixture journal at ``tests/data/month_summary.journal``
that exercises every bucketing path: salary income, debit-card expense,
credit-card expense under all three accepted prefixes (``cartão``,
``cartao``, ``credit-card``), an ADR-010 installment recorded as a
single full-amount transaction, and a card payment.
"""

from __future__ import annotations

import importlib
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

MONTH_SUMMARY_JOURNAL = Path(__file__).parent / "data" / "month_summary.journal"


@pytest.fixture(scope="module")
def month_summary_client():
    """Reload main with the month-summary fixture journal."""
    old_ledger = os.environ.get("LEDGER_FILE")
    os.environ["LEDGER_FILE"] = str(MONTH_SUMMARY_JOURNAL)

    from app.config import reset_settings

    reset_settings()
    import main as main_mod

    importlib.reload(main_mod)
    main_mod.LEDGER_FILE = str(MONTH_SUMMARY_JOURNAL)

    yield TestClient(main_mod.app)

    if old_ledger is not None:
        os.environ["LEDGER_FILE"] = old_ledger
    else:
        os.environ.pop("LEDGER_FILE", None)
    reset_settings()
    importlib.reload(main_mod)


def _get(client, month: str | None = "2026-04"):
    qs = f"?month={month}" if month else ""
    return client.get(f"/api/month-summary{qs}")


# ── shape & success paths ─────────────────────────────────────────────


def test_returns_200_with_full_payload(month_summary_client):
    r = _get(month_summary_client)
    assert r.status_code == 200
    body = r.json()
    expected_keys = {
        "month",
        "income",
        "expense",
        "expense_via_assets",
        "expense_via_credit_card",
        "credit_card_payment",
        "credit_card_debt_today",
        "debt_start_of_month",
        "debt_end_of_month",
        "leftover",
        "last_updated",
    }
    assert expected_keys <= set(body.keys())
    assert body["month"] == "2026-04"


def test_income_and_expense_match_fixture(month_summary_client):
    body = _get(month_summary_client).json()
    assert abs(body["income"] - 10000.0) < 0.01
    # 300 + 150 + 29.90 + 49.90 + 1200 = 1729.80
    assert abs(body["expense"] - 1729.80) < 0.01


def test_invariant_split_holds_with_real_journal(month_summary_client):
    """expense ~= expense_via_assets + expense_via_credit_card (±R$0.01)."""
    body = _get(month_summary_client).json()
    total = body["expense_via_assets"] + body["expense_via_credit_card"]
    assert abs(body["expense"] - total) <= 0.01


def test_card_split_aggregates_all_three_prefixes(month_summary_client):
    """Three different card spellings must roll up into the card bucket."""
    body = _get(month_summary_client).json()
    # 150 (cartão) + 29.90 (cartao) + 49.90 (credit-card) + 1200 (cartão)
    assert abs(body["expense_via_credit_card"] - 1429.80) < 0.01
    # Only the groceries (300) was paid by debit.
    assert abs(body["expense_via_assets"] - 300.0) < 0.01


def test_credit_card_payment_is_isolated(month_summary_client):
    """The R$500 fatura payment must show as payment, not expense."""
    body = _get(month_summary_client).json()
    assert abs(body["credit_card_payment"] - 500.0) < 0.01


def test_debt_start_and_end_match_balance_command(month_summary_client):
    """Debt boundaries must equal the independent --historical balance call."""
    body = _get(month_summary_client).json()
    assert abs(body["debt_start_of_month"] - 0.0) < 0.01
    # Card postings - payment: 150 + 29.90 + 49.90 + 1200 - 500 = 929.80
    assert abs(body["debt_end_of_month"] - 929.80) < 0.01


def test_installment_full_amount_lands_in_expense_via_credit_card(
    month_summary_client,
):
    """ADR-010 anti-regression: installment must be counted at full amount."""
    body = _get(month_summary_client).json()
    # The R$1200 installment is the dominant card expense in the fixture.
    # If ADR-010 regressed (e.g. only 1/10 = R$120 booked), this drops to
    # ~R$349.80 instead of R$1429.80.
    assert body["expense_via_credit_card"] > 1400.0


def test_leftover_signed(month_summary_client):
    """leftover = income - expense; positive in the fixture."""
    body = _get(month_summary_client).json()
    assert abs(body["leftover"] - (body["income"] - body["expense"])) <= 0.01
    assert body["leftover"] > 0


def test_last_updated_is_iso8601(month_summary_client):
    """``last_updated`` is the journal mtime as an ISO-8601 string."""
    from datetime import datetime

    body = _get(month_summary_client).json()
    assert body["last_updated"]
    # round-trip parse: must succeed.
    datetime.fromisoformat(body["last_updated"])


# ── edge cases ────────────────────────────────────────────────────────


def test_zero_activity_month(month_summary_client):
    """A month with no postings still returns 200 and zero numerics."""
    body = _get(month_summary_client, month="2024-01").json()
    assert body["income"] == 0
    assert body["expense"] == 0
    assert body["expense_via_assets"] == 0
    assert body["expense_via_credit_card"] == 0
    assert body["credit_card_payment"] == 0
    assert body["debt_start_of_month"] == 0
    assert body["debt_end_of_month"] == 0
    assert body["leftover"] == 0


def test_invalid_month_returns_422(month_summary_client):
    r = _get(month_summary_client, month="not-a-month")
    assert r.status_code == 422


def test_month_optional_defaults_to_today(month_summary_client):
    r = _get(month_summary_client, month=None)
    assert r.status_code == 200
