"""Testes para GET /api/cashflow."""


def test_cashflow_returns_200(client):
    r = client.get("/api/cashflow?months=6")
    assert r.status_code == 200


def test_cashflow_has_months_field(client):
    r = client.get("/api/cashflow?months=6")
    data = r.json()
    assert "months" in data
    assert isinstance(data["months"], list)


def test_cashflow_item_structure(client):
    r = client.get("/api/cashflow?months=6")
    data = r.json()
    if data["months"]:
        item = data["months"][0]
        assert "mes" in item
        assert "receitas" in item
        assert "despesas" in item
        assert isinstance(item["receitas"], (int, float))
        assert isinstance(item["despesas"], (int, float))


def test_cashflow_mes_format(client):
    """Cada mês tem formato YYYY-MM."""
    r = client.get("/api/cashflow?months=3")
    data = r.json()
    for item in data["months"]:
        assert len(item["mes"]) == 7
        assert item["mes"][4] == "-"


def test_cashflow_values_non_negative(client):
    r = client.get("/api/cashflow?months=3")
    data = r.json()
    for item in data["months"]:
        assert item["receitas"] >= 0
        assert item["despesas"] >= 0


def test_cashflow_default_months(client):
    """Parâmetro padrão de months deve funcionar."""
    r = client.get("/api/cashflow")
    assert r.status_code == 200


def test_cashflow_limited_months(client):
    r = client.get("/api/cashflow?months=1")
    data = r.json()
    assert len(data["months"]) <= 1
