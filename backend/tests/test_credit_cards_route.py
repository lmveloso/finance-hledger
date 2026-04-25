"""Integration tests for ``GET /api/credit-cards``.

Reloads ``main`` with the credit-cards fixture journal so the real
HledgerClient runs against a known-shape file. ``today`` is injected
via a service-level override so installment liveness is deterministic.
"""

from __future__ import annotations

import importlib
import os
from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

CARDS_JOURNAL = Path(__file__).parent / "data" / "credit_cards.journal"
TEST_TODAY = date(2026, 4, 15)


@pytest.fixture(scope="module")
def cards_client():
    """Reload main with the credit-cards journal and pin today=2026-04-15."""
    old_ledger = os.environ.get("LEDGER_FILE")
    os.environ["LEDGER_FILE"] = str(CARDS_JOURNAL)

    from app.config import reset_settings

    reset_settings()
    import main as main_mod

    importlib.reload(main_mod)
    main_mod.LEDGER_FILE = str(CARDS_JOURNAL)

    # Override the credit-cards service factory so ``today`` is fixed.
    from app.credit_cards.service import CreditCardsService
    from app.deps import get_credit_cards_service
    from app.hledger.client import HledgerClient

    def _override():
        return CreditCardsService(
            client=HledgerClient(
                ledger_file=str(CARDS_JOURNAL), binary="hledger"
            ),
            journal_path=Path(CARDS_JOURNAL),
            today=TEST_TODAY,
        )

    main_mod.app.dependency_overrides[get_credit_cards_service] = _override

    yield TestClient(main_mod.app)

    main_mod.app.dependency_overrides.clear()
    if old_ledger is not None:
        os.environ["LEDGER_FILE"] = old_ledger
    else:
        os.environ.pop("LEDGER_FILE", None)
    reset_settings()
    importlib.reload(main_mod)


def _by_account(payload: dict) -> dict[str, dict]:
    return {c["account"]: c for c in payload["cards"]}


# ── happy paths ──────────────────────────────────────────────────


def test_returns_200_with_two_cards(cards_client):
    r = cards_client.get("/api/credit-cards?month=2026-04")
    assert r.status_code == 200
    data = r.json()
    assert data["month"] == "2026-04"
    accts = {c["account"] for c in data["cards"]}
    # Dormente must be excluded.
    assert accts == {
        "liabilities:cartão:nubank",
        "liabilities:credit-card:visa",
    }


def test_response_shape(cards_client):
    data = cards_client.get("/api/credit-cards?month=2026-04").json()
    assert set(data.keys()) >= {"month", "cards", "last_updated"}
    for card in data["cards"]:
        assert set(card.keys()) >= {
            "account",
            "name",
            "outstanding_debt",
            "spend_this_month",
            "live_installments",
        }


def test_alias_used_when_present(cards_client):
    by_acct = _by_account(cards_client.get("/api/credit-cards?month=2026-04").json())
    # Nubank has an alias declared in the fixture.
    assert by_acct["liabilities:cartão:nubank"]["name"] == "Nubank Lucas"
    # Visa has no alias → fallback to last-segment-title-cased.
    assert by_acct["liabilities:credit-card:visa"]["name"] == "Visa"


def test_outstanding_debt_matches_balance(cards_client):
    by_acct = _by_account(cards_client.get("/api/credit-cards?month=2026-04").json())
    # Nubank: 1800 (TV) + 900 (OLD) + 200 (super) - 50 (refund) = 2850
    assert by_acct["liabilities:cartão:nubank"]["outstanding_debt"] == 2850.0
    # Visa: 150 (dining) - 100 (payment) = 50
    assert by_acct["liabilities:credit-card:visa"]["outstanding_debt"] == 50.0


def test_spend_this_month_nets_refund(cards_client):
    by_acct = _by_account(cards_client.get("/api/credit-cards?month=2026-04").json())
    # Nubank April: 200 grocery - 50 refund = 150.
    assert by_acct["liabilities:cartão:nubank"]["spend_this_month"] == 150.0
    # Visa April: 150 dining; the payment is assets→liability and must NOT count.
    assert by_acct["liabilities:credit-card:visa"]["spend_this_month"] == 150.0


def test_installment_count_excludes_completed_schedules(cards_client):
    by_acct = _by_account(cards_client.get("/api/credit-cards?month=2026-04").json())
    # TV (6x from 2025-11-01) → live; OLD (6x from 2024-04-01) → done.
    assert by_acct["liabilities:cartão:nubank"]["live_installments"] == 1
    assert by_acct["liabilities:credit-card:visa"]["live_installments"] == 0


def test_dormant_card_excluded(cards_client):
    accts = {
        c["account"]
        for c in cards_client.get("/api/credit-cards?month=2026-04").json()["cards"]
    }
    assert "liabilities:cartão:dormente" not in accts


def test_sort_by_debt_desc(cards_client):
    cards = cards_client.get("/api/credit-cards?month=2026-04").json()["cards"]
    debts = [c["outstanding_debt"] for c in cards]
    assert debts == sorted(debts, reverse=True)


def test_last_updated_is_iso8601(cards_client):
    data = cards_client.get("/api/credit-cards?month=2026-04").json()
    assert "T" in data["last_updated"]
    # Should parse as a date prefix at minimum.
    assert data["last_updated"][:4].isdigit()


# ── error paths ──────────────────────────────────────────────────


def test_invalid_month_returns_422(cards_client):
    r = cards_client.get("/api/credit-cards?month=not-a-month")
    assert r.status_code == 422


def test_month_optional(cards_client):
    """Omitting ?month= should still return 200 (defaults to current month)."""
    r = cards_client.get("/api/credit-cards")
    assert r.status_code == 200


def test_does_not_break_other_endpoints(cards_client):
    """Smoke check: existing /api/accounts still works on the same fixture."""
    r = cards_client.get("/api/accounts")
    assert r.status_code == 200
