"""Integration tests for GET /api/principles/yearly.

Uses a dedicated fixture journal (``tests/data/principles_yearly.journal``)
spread across several months of 2026, with two intentionally empty months
to exercise the zero-total path.
"""

from __future__ import annotations

import importlib
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

YEARLY_JOURNAL = Path(__file__).parent / "data" / "principles_yearly.journal"
ALL_PRINCIPLE_IDS = {
    "custos-fixos",
    "conforto",
    "metas",
    "prazeres",
    "liberdade-financeira",
    "aumentar-renda",
    "reserva-oportunidade",
}
PCT_SUM_EPSILON = 0.01  # tolerance for float comparison after rebalancing


@pytest.fixture(scope="module")
def yearly_client():
    """Reload main with the yearly fixture journal."""
    old_ledger = os.environ.get("LEDGER_FILE")
    os.environ["LEDGER_FILE"] = str(YEARLY_JOURNAL)

    from app.config import reset_settings

    reset_settings()
    import main as main_mod

    importlib.reload(main_mod)
    main_mod.LEDGER_FILE = str(YEARLY_JOURNAL)

    yield TestClient(main_mod.app)

    if old_ledger is not None:
        os.environ["LEDGER_FILE"] = old_ledger
    else:
        os.environ.pop("LEDGER_FILE", None)
    reset_settings()
    importlib.reload(main_mod)


def _yearly(client, year: int = 2026):
    return client.get(f"/api/principles/yearly?year={year}").json()


# ── shape ────────────────────────────────────────────────────────────


def test_yearly_returns_200(yearly_client):
    r = yearly_client.get("/api/principles/yearly?year=2026")
    assert r.status_code == 200


def test_yearly_shape(yearly_client):
    data = _yearly(yearly_client)
    assert data["year"] == 2026
    assert "months" in data
    assert "principles" in data
    assert "monthly_totals" in data


def test_yearly_has_12_months(yearly_client):
    data = _yearly(yearly_client)
    assert data["months"] == [f"2026-{m:02d}" for m in range(1, 13)]
    assert len(data["monthly_totals"]) == 12
    for row in data["principles"]:
        assert len(row["monthly"]) == 12


def test_yearly_has_7_principles(yearly_client):
    data = _yearly(yearly_client)
    assert len(data["principles"]) == 7
    assert {r["principle"] for r in data["principles"]} == ALL_PRINCIPLE_IDS


def test_yearly_row_fields(yearly_client):
    data = _yearly(yearly_client)
    for row in data["principles"]:
        assert row["display_key"].startswith("principle.")
        assert row["target_pct"] >= 0
        for cell in row["monthly"]:
            assert set(cell.keys()) == {"month", "value", "pct"}


# ── business rules ───────────────────────────────────────────────────


def test_yearly_monthly_pct_sums_to_100(yearly_client):
    """Critical invariant: pct across the 7 principles sums to 100 per month.

    Empty months (no expenses) sum to 0 — not 100 — since there is nothing
    to split. That is the only allowed deviation.
    """
    data = _yearly(yearly_client)
    totals_by_month = {t["month"]: t["value"] for t in data["monthly_totals"]}
    by_month: dict[str, float] = {m: 0.0 for m in data["months"]}
    for row in data["principles"]:
        for cell in row["monthly"]:
            by_month[cell["month"]] += cell["pct"]
    for month, total in by_month.items():
        expected = 100.0 if totals_by_month[month] > 0 else 0.0
        assert abs(total - expected) < PCT_SUM_EPSILON, (
            f"{month}: pct sum {total} != {expected}"
        )


def test_yearly_empty_months_have_zero(yearly_client):
    """Months without expenses: value=0 and pct=0 for every principle."""
    data = _yearly(yearly_client)
    empty = {t["month"] for t in data["monthly_totals"] if t["value"] == 0}
    # 2026-07 and 2026-08 are empty in the fixture.
    assert {"2026-07", "2026-08"} <= empty
    for row in data["principles"]:
        for cell in row["monthly"]:
            if cell["month"] in empty:
                assert cell["value"] == 0
                assert cell["pct"] == 0


def test_yearly_monthly_totals_match_principles_sum(yearly_client):
    """Sum of value across principles == monthly_totals.value for each month."""
    data = _yearly(yearly_client)
    expected = {t["month"]: t["value"] for t in data["monthly_totals"]}
    actual: dict[str, float] = {m: 0.0 for m in data["months"]}
    for row in data["principles"]:
        for cell in row["monthly"]:
            actual[cell["month"]] += cell["value"]
    for month, total in actual.items():
        assert abs(total - expected[month]) < 0.01


def test_yearly_tag_override_shifts_to_metas(yearly_client):
    """The tagged restaurante (280 in 2026-04) lands in the metas row."""
    data = _yearly(yearly_client)
    metas = next(r for r in data["principles"] if r["principle"] == "metas")
    cell_apr = next(c for c in metas["monthly"] if c["month"] == "2026-04")
    assert abs(cell_apr["value"] - 280.0) < 0.01


def test_yearly_defaults_to_current_year(yearly_client):
    """Omitting ?year= should return 200 and echo the current calendar year."""
    from datetime import date

    r = yearly_client.get("/api/principles/yearly")
    assert r.status_code == 200
    assert r.json()["year"] == date.today().year


def test_yearly_invalid_year_422(yearly_client):
    """Non-numeric / out-of-range year returns 422."""
    assert yearly_client.get("/api/principles/yearly?year=abc").status_code == 422
    assert yearly_client.get("/api/principles/yearly?year=1800").status_code == 422
    assert yearly_client.get("/api/principles/yearly?year=3001").status_code == 422
