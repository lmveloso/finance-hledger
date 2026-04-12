"""Testes para GET /api/summary."""


def test_summary_returns_200(client):
    r = client.get("/api/summary?month=2026-01")
    assert r.status_code == 200


def test_summary_has_required_fields(client):
    r = client.get("/api/summary?month=2026-01")
    data = r.json()
    assert "month" in data
    assert "receitas" in data
    assert "despesas" in data
    assert "saldo" in data


def test_summary_field_types(client):
    r = client.get("/api/summary?month=2026-01")
    data = r.json()
    assert isinstance(data["receitas"], (int, float))
    assert isinstance(data["despesas"], (int, float))
    assert isinstance(data["saldo"], (int, float))
    assert isinstance(data["month"], str)


def test_summary_saldo_is_income_minus_expense(client):
    r = client.get("/api/summary?month=2026-01")
    data = r.json()
    expected = round(data["receitas"] - data["despesas"], 2)
    assert data["saldo"] == expected


def test_summary_month_matches_param(client):
    r = client.get("/api/summary?month=2026-02")
    data = r.json()
    assert data["month"] == "2026-02"


def test_summary_expenses_non_negative(client):
    r = client.get("/api/summary?month=2026-01")
    data = r.json()
    assert data["despesas"] >= 0


def test_summary_empty_month_still_returns(client):
    """Mês sem transações retorna zeros."""
    r = client.get("/api/summary?month=2025-01")
    data = r.json()
    assert data["month"] == "2025-01"
    assert data["receitas"] >= 0
    assert data["despesas"] >= 0
