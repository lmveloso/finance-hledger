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
        "end_date",
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
    """remaining == total - paid and remaining_value == remaining * monthly."""
    data = installments_client.get("/api/installments").json()
    for row in data["installments"]:
        assert row["remaining"] == row["total"] - row["paid"]
        assert row["paid"] < row["total"]  # active-only filter
        expected_rv = round(row["remaining"] * row["monthly_value"], 2)
        assert row["remaining_value"] == expected_rv


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
