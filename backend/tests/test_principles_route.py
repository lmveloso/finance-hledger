"""Integration tests for the /api/principles/* endpoints.

Uses a dedicated fixture journal (``tests/data/principles.journal``) that
covers the four resolution paths: exact match, wildcard match, explicit
tag override, and fallback to the default. The ``principles_client``
fixture lives in ``tests/conftest_principles.py`` to keep this file
focused on assertions.
"""

from __future__ import annotations

import importlib
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

PRINCIPLES_JOURNAL = Path(__file__).parent / "data" / "principles.journal"
ALL_PRINCIPLE_IDS = {
    "custos-fixos",
    "conforto",
    "metas",
    "prazeres",
    "liberdade-financeira",
    "aumentar-renda",
    "reserva-oportunidade",
}


@pytest.fixture(scope="module")
def principles_client():
    """Reload main with the principles-specific journal."""
    old_ledger = os.environ.get("LEDGER_FILE")
    os.environ["LEDGER_FILE"] = str(PRINCIPLES_JOURNAL)

    from app.config import reset_settings

    reset_settings()
    import main as main_mod

    importlib.reload(main_mod)
    main_mod.LEDGER_FILE = str(PRINCIPLES_JOURNAL)

    yield TestClient(main_mod.app)

    if old_ledger is not None:
        os.environ["LEDGER_FILE"] = old_ledger
    else:
        os.environ.pop("LEDGER_FILE", None)
    reset_settings()
    importlib.reload(main_mod)


def _summary(client, month: str = "2026-04"):
    return client.get(f"/api/principles/summary?month={month}").json()


def _by_id(data: dict) -> dict:
    return {row["principle"]: row for row in data["breakdown"]}


# ── /api/principles/summary ──────────────────────────────────────────


def test_summary_returns_200(principles_client):
    r = principles_client.get("/api/principles/summary?month=2026-04")
    assert r.status_code == 200


def test_summary_shape(principles_client):
    data = _summary(principles_client)
    assert data["month"] == "2026-04"
    assert "denominator" in data
    assert "breakdown" in data
    assert "uncovered_categories" in data
    assert isinstance(data["breakdown"], list)


def test_summary_breakdown_has_seven_principles(principles_client):
    """One row per configured principle — always 7 for the factory mapping."""
    data = _summary(principles_client)
    assert len(data["breakdown"]) == 7
    assert {r["principle"] for r in data["breakdown"]} == ALL_PRINCIPLE_IDS


def test_summary_breakdown_fields(principles_client):
    data = _summary(principles_client)
    for row in data["breakdown"]:
        assert set(row.keys()) >= {
            "principle",
            "display_key",
            "valor",
            "meta_pct",
            "realizado_pct",
            "delta_pct",
            "uncovered",
        }
        assert row["display_key"].startswith("principle.")


def test_summary_denominator_is_revenue(principles_client):
    """Denominator should equal the R$ 10.000 income in the fixture."""
    data = _summary(principles_client)
    assert abs(data["denominator"] - 10000.0) < 0.01


def test_summary_valor_sum_matches_expenses_total(principles_client):
    """Zero leakage: sum of breakdown.valor == total expenses from /api/summary."""
    data = _summary(principles_client)
    r_s = principles_client.get("/api/summary?month=2026-04").json()
    total_principles = sum(row["valor"] for row in data["breakdown"])
    assert abs(total_principles - r_s["despesas"]) < 0.01


def test_summary_tag_override_shifts_value(principles_client):
    """``principio: metas`` on the restaurante posting credits metas (280)."""
    by_id = _by_id(_summary(principles_client))
    assert abs(by_id["metas"]["valor"] - 280.0) < 0.01


def test_summary_wildcard_match(principles_client):
    """Cinema 60,00 resolves via expenses:lazer:* -> prazeres."""
    by_id = _by_id(_summary(principles_client))
    assert abs(by_id["prazeres"]["valor"] - 60.0) < 0.01


def test_summary_custos_fixos_bucket_is_correct(principles_client):
    """supermercado (500) + água (150) + uncovered 40 = custos-fixos 690."""
    by_id = _by_id(_summary(principles_client))
    assert abs(by_id["custos-fixos"]["valor"] - 690.0) < 0.01


def test_summary_uncovered_surfaces(principles_client):
    data = _summary(principles_client)
    assert "expenses:nova-categoria:teste" in data["uncovered_categories"]
    assert _by_id(data)["custos-fixos"]["uncovered"] is True


def test_summary_realizado_pct_consistent(principles_client):
    """realizado_pct = 100 * valor / denominator (within rounding)."""
    data = _summary(principles_client)
    denom = data["denominator"]
    for row in data["breakdown"]:
        expected = 0.0 if denom == 0 else round(100.0 * row["valor"] / denom, 2)
        assert abs(row["realizado_pct"] - expected) <= 0.02
        delta = row["realizado_pct"] - row["meta_pct"]
        assert abs(row["delta_pct"] - delta) <= 0.02


def test_summary_empty_month(principles_client):
    """Month without transactions: breakdown all zero, status 200."""
    r = principles_client.get("/api/principles/summary?month=2025-01")
    assert r.status_code == 200
    data = r.json()
    assert data["denominator"] == 0
    for row in data["breakdown"]:
        assert row["valor"] == 0
        assert row["realizado_pct"] == 0


def test_summary_invalid_month_returns_422(principles_client):
    r = principles_client.get("/api/principles/summary?month=not-a-month")
    assert r.status_code == 422


def test_summary_month_optional(principles_client):
    """Omitting ?month= should still return 200 (defaults to current month)."""
    r = principles_client.get("/api/principles/summary")
    assert r.status_code == 200


# ── /api/principles/mapping ──────────────────────────────────────────


def test_mapping_endpoint_returns_seven_principles(principles_client):
    r = principles_client.get("/api/principles/mapping")
    assert r.status_code == 200
    data = r.json()
    assert data["default"] in ALL_PRINCIPLE_IDS
    assert len(data["principles"]) == 7
    assert any(
        p["id"] == "custos-fixos" and p["target_pct"] == 40 for p in data["principles"]
    )


def test_mapping_endpoint_exposes_factory_rules(principles_client):
    rules = principles_client.get("/api/principles/mapping").json()["rules"]
    assert rules.get("expenses:lazer:*") == "prazeres"
    assert rules.get("expenses:moradia:água") == "custos-fixos"
    assert rules.get("expenses:alimentação:restaurantes") == "prazeres"
