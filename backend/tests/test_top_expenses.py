"""Testes para GET /api/top-expenses."""


def test_top_expenses_returns_200(client):
    r = client.get("/api/top-expenses?month=2026-01")
    assert r.status_code == 200


def test_top_expenses_has_required_fields(client):
    r = client.get("/api/top-expenses?month=2026-01")
    data = r.json()
    assert "month" in data
    assert "transacoes" in data
    assert isinstance(data["transacoes"], list)


def test_top_expenses_item_structure(client):
    r = client.get("/api/top-expenses?month=2026-01")
    data = r.json()
    if data["transacoes"]:
        tx = data["transacoes"][0]
        assert "data" in tx
        assert "descricao" in tx
        assert "categoria" in tx
        assert "valor" in tx
        assert isinstance(tx["valor"], (int, float))
        assert tx["valor"] >= 0


def test_top_expenses_sorted_descending_by_valor(client):
    r = client.get("/api/top-expenses?month=2026-01")
    data = r.json()
    vals = [t["valor"] for t in data["transacoes"]]
    assert vals == sorted(vals, reverse=True)


def test_top_expenses_respects_limit(client):
    r = client.get("/api/top-expenses?month=2026-01&limit=1")
    data = r.json()
    assert len(data["transacoes"]) <= 1


def test_top_expenses_default_limit(client):
    """Limite padrão de 10."""
    r = client.get("/api/top-expenses?month=2026-01")
    data = r.json()
    assert len(data["transacoes"]) <= 10


def test_top_expenses_date_format(client):
    """Datas no formato ISO (YYYY-MM-DD)."""
    r = client.get("/api/top-expenses?month=2026-01")
    data = r.json()
    for tx in data["transacoes"]:
        assert len(tx["data"]) == 10
        assert tx["data"][4] == "-"
        assert tx["data"][7] == "-"


def test_top_expenses_month_matches(client):
    r = client.get("/api/top-expenses?month=2026-03")
    data = r.json()
    assert data["month"] == "2026-03"
