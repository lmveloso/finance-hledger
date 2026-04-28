"""Integration tests for GET /api/installments.

The endpoint lists active credit-card parcelamentos declared as periodic
transactions per ADR-009. Uses a dedicated fixture journal so it doesn't
perturb any of the shared ``conftest`` totals.
"""

from __future__ import annotations

import importlib
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

INSTALLMENTS_JOURNAL = Path(__file__).parent / "data" / "installments.journal"


@pytest.fixture(scope="module")
def installments_client():
    """Reload ``main`` with the installments fixture journal."""
    old_ledger = os.environ.get("LEDGER_FILE")
    os.environ["LEDGER_FILE"] = str(INSTALLMENTS_JOURNAL)

    from app.config import reset_settings

    reset_settings()
    import main as main_mod

    importlib.reload(main_mod)
    main_mod.LEDGER_FILE = str(INSTALLMENTS_JOURNAL)

    yield TestClient(main_mod.app)

    if old_ledger is not None:
        os.environ["LEDGER_FILE"] = old_ledger
    else:
        os.environ.pop("LEDGER_FILE", None)
    reset_settings()
    importlib.reload(main_mod)


# ── shape ────────────────────────────────────────────────────────────


def test_installments_returns_200(installments_client):
    r = installments_client.get("/api/installments")
    assert r.status_code == 200


def test_installments_has_required_fields(installments_client):
    data = installments_client.get("/api/installments").json()
    assert "installments" in data
    assert "total_monthly" in data
    assert "total_remaining" in data
    assert isinstance(data["installments"], list)
    assert isinstance(data["total_monthly"], (int, float))
    assert isinstance(data["total_remaining"], (int, float))


def test_installment_row_fields(installments_client):
    """Each row exposes the full Plano-tab contract."""
    data = installments_client.get("/api/installments").json()
    assert data["installments"], "expected at least one active installment"
    expected = {
        "name",
        "description",
        "monthly_value",
        "paid",
        "total",
        "remaining",
        "remaining_value",
        "next_parcel",
        "end_date",
        "account",
    }
    for row in data["installments"]:
        assert set(row.keys()) == expected


# ── business rules ───────────────────────────────────────────────────


def test_active_installment_is_present(installments_client):
    """FOO spans 2026-03..2026-07; it must appear as an active row."""
    data = installments_client.get("/api/installments").json()
    names = [row["name"] for row in data["installments"]]
    assert "FOO" in names


def test_finished_installment_is_filtered_out(installments_client):
    """OLDIE finished in 2020 (paid == total); must be excluded."""
    data = installments_client.get("/api/installments").json()
    names = [row["name"] for row in data["installments"]]
    assert "OLDIE" not in names


def test_installment_totals_are_consistent(installments_client):
    """total_monthly and total_remaining == sum across active rows."""
    data = installments_client.get("/api/installments").json()
    expected_monthly = round(
        sum(row["monthly_value"] for row in data["installments"]), 2
    )
    expected_remaining = round(
        sum(row["remaining_value"] for row in data["installments"]), 2
    )
    assert data["total_monthly"] == expected_monthly
    assert data["total_remaining"] == expected_remaining


def test_installment_remaining_arithmetic(installments_client):
    """remaining == future_count and remaining_value == remaining * monthly.

    Per ADR-011 §Errata 2026-04-28 followup, ``remaining`` is the count
    of forecast occurrences strictly after today — NOT ``total - paid``.
    The two coincide for series fully tracked in the journal, but
    diverge for pre-journal series (e.g. ESCOLA in this fixture).
    """
    data = installments_client.get("/api/installments").json()
    for row in data["installments"]:
        # Active-only: remaining must be > 0.
        assert row["remaining"] > 0
        # paid is capped at total (display-only field).
        assert row["paid"] <= row["total"]
        expected_rv = round(row["remaining"] * row["monthly_value"], 2)
        assert row["remaining_value"] == expected_rv
        # next_parcel = total - remaining + 1 for active series.
        assert row["next_parcel"] == row["total"] - row["remaining"] + 1


def test_installment_foo_values(installments_client):
    """Specific assertions for the FOO fixture:

    - monthly_value = 100.00
    - total = 5 (from tag ``FOO 2/5``)
    - end_date = 2026-07-01 (``from 2026-03-01 to 2026-08-01`` is exclusive)
    """
    data = installments_client.get("/api/installments").json()
    foo = next(row for row in data["installments"] if row["name"] == "FOO")
    assert foo["monthly_value"] == 100.0
    assert foo["total"] == 5
    assert foo["end_date"] == "2026-07-01"
    assert foo["description"] == "parcelamento: FOO 2/5"


def test_installments_route_matches_credit_cards_service_per_card(installments_client):
    """Route's per-card ``remaining_value`` sum equals service's per-card value.

    The whole point of the §Errata 2026-04-28 followup: route and
    service share ``forecast_parcelamento_transactions`` so the
    semantics align. This test asserts the alignment end-to-end through
    the fixture journal. If a future change makes them diverge again,
    this guard fires.
    """
    from datetime import date

    from app.credit_cards.service import CreditCardsService
    from app.hledger.client import HledgerClient

    route_data = installments_client.get("/api/installments").json()

    # Build a fresh service against the same fixture journal.
    client = HledgerClient(ledger_file=str(INSTALLMENTS_JOURNAL))
    service = CreditCardsService(
        client=client,
        journal_path=INSTALLMENTS_JOURNAL,
        today=date.today(),
    )
    cards = service.for_month(date.today().strftime("%Y-%m")).cards

    # Per-card route sum.
    by_card_route: dict[str, float] = {}
    for row in route_data["installments"]:
        by_card_route.setdefault(row["account"], 0.0)
        by_card_route[row["account"]] += row["remaining_value"]

    # Per-card service value. Service only lists cards with non-zero
    # outstanding/spend, so iterate cards seen there as the truth set.
    for card in cards:
        route_sum = round(by_card_route.get(card.account, 0.0), 2)
        assert route_sum == card.installments_remaining_value, (
            f"route/service mismatch for {card.account}: "
            f"route={route_sum}, service={card.installments_remaining_value}"
        )


def test_installments_pre_journal_inflation_reversed(installments_client):
    """ADR-011 §Errata 2026-04-28 followup: pre-journal parcels do not inflate.

    The ESCOLA fixture has ``total=10`` but only one past one-off (parcel 4)
    plus a ``~ monthly`` covering parcels 9..10 (two future occurrences).
    Under the OLD ``total - paid`` semantic, the route would have reported
    ``remaining=9`` (with ``remaining_value = 9 × monthly``), inflating the
    series with phantom pre-journal parcels (5..8) that were never lançadas
    in this journal.

    Under the NEW future-count semantic — symmetric with the credit-card
    service — ``remaining=2`` (the two future forecast occurrences),
    ``remaining_value = 2 × 237.50 = 475.00``, ``next_parcel=9`` (the
    next forecast occurrence's index in the series), ``paid=1``, and
    ``total=10``.
    """
    data = installments_client.get("/api/installments").json()
    escola = next(
        (row for row in data["installments"] if row["name"] == "ESCOLA"),
        None,
    )
    assert escola is not None, "ESCOLA pre-journal series must be active"
    assert escola["total"] == 10
    assert escola["paid"] == 1
    assert escola["remaining"] == 2
    assert escola["monthly_value"] == 237.50
    assert escola["remaining_value"] == 475.00
    assert escola["next_parcel"] == 9


# ── account exposure (PR-mes-fluxo-installments-visibility) ─────────


# Canonical prefixes mirrored from app.credit_cards.CARD_PREFIXES so the
# test does not import production code. Keeping them inline makes the
# expected contract explicit; if the source list grows, the test will
# fail loudly with the new prefix listed in the assertion.
_CARD_PREFIXES = (
    "liabilities:cartão:",
    "liabilities:cartao:",
    "liabilities:credit-card:",
)


def test_installments_row_includes_account(installments_client):
    """Every active row exposes a non-empty ``account`` matching a card prefix."""
    data = installments_client.get("/api/installments").json()
    assert data["installments"], "expected at least one active installment"
    for row in data["installments"]:
        assert row["account"], (
            f"row {row['name']!r} missing account: {row}"
        )
        assert any(row["account"].startswith(p) for p in _CARD_PREFIXES), (
            f"{row['account']!r} does not start with a canonical card prefix"
        )


def test_installments_two_cards_isolated(installments_client):
    """BB-VISA-LIVE on ``cartao:bb-visa``; FOO on ``cartao:nubank``."""
    data = installments_client.get("/api/installments").json()
    by_name = {row["name"]: row for row in data["installments"]}
    assert by_name["BB-VISA-LIVE"]["account"] == "liabilities:cartao:bb-visa"
    assert by_name["FOO"]["account"] == "liabilities:cartao:nubank"


def test_installments_isolated_tail_havan(installments_client):
    """ADR-011 §Errata 2026-04-28: isolated past tail is EXCLUDED.

    HAVAN 4/4 in the fixture has a single forecast occurrence dated
    before today (2026-04-01). Although the tag says ``total=4`` and
    ``paid=1`` would imply ``remaining=3`` under the old semantic, the
    series has no future occurrences and is no longer considered active.
    The errata reverses the §Negativas trade-off after real-world
    journal data showed phantom series locking comprometido (e.g.
    ``Havan Umuarama 4/4`` with no forward declaration).
    """
    data = installments_client.get("/api/installments").json()
    names = [row["name"] for row in data["installments"]]
    assert "HAVAN" not in names


def test_installments_only_past_dates_excluded(installments_client):
    """General case: a series with only past forecast dates is excluded.

    Captured by the ``OLDIE`` (finished long ago) and ``HAVAN`` (isolated
    past tail) fixtures — neither should appear. ``FOO`` and
    ``BB-VISA-LIVE`` straddle today and must remain active.
    """
    data = installments_client.get("/api/installments").json()
    names = {row["name"] for row in data["installments"]}
    assert "OLDIE" not in names
    assert "HAVAN" not in names
    assert "FOO" in names
    assert "BB-VISA-LIVE" in names


# ── empty-journal case ───────────────────────────────────────────────


@pytest.fixture()
def empty_installments_client(journal_file):
    """Rebuild a TestClient pointing at the shared minimal conftest journal.

    The shared ``client`` fixture cannot be used directly here because other
    module-scoped fixtures in this file reload ``main`` with the installments
    journal; by the time this test runs, the module-level ``main.hledger``
    client may still be pointing at the parcelamento fixture. We rebuild
    from scratch so this test is self-contained.
    """
    old_ledger = os.environ.get("LEDGER_FILE")
    os.environ["LEDGER_FILE"] = journal_file

    from app.config import reset_settings

    reset_settings()
    import main as main_mod

    importlib.reload(main_mod)
    main_mod.LEDGER_FILE = journal_file

    yield TestClient(main_mod.app)

    if old_ledger is not None:
        os.environ["LEDGER_FILE"] = old_ledger
    else:
        os.environ.pop("LEDGER_FILE", None)
    reset_settings()
    importlib.reload(main_mod)


def test_installments_empty_when_no_parcelamento(empty_installments_client):
    """Shared conftest journal has no ``parcelamento:`` tags → empty list."""
    r = empty_installments_client.get("/api/installments")
    assert r.status_code == 200
    data = r.json()
    assert data["installments"] == []
    assert data["total_monthly"] == 0
    assert data["total_remaining"] == 0
