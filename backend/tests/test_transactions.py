"""Testes para GET /api/transactions."""


def test_transactions_returns_200(client):
    r = client.get("/api/transactions?month=2026-01")
    assert r.status_code == 200


def test_transactions_has_required_fields(client):
    r = client.get("/api/transactions?month=2026-01")
    data = r.json()
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert "transactions" in data
    assert isinstance(data["transactions"], list)
    assert isinstance(data["total"], int)
    assert isinstance(data["limit"], int)
    assert isinstance(data["offset"], int)


def test_transactions_item_structure(client):
    r = client.get("/api/transactions?month=2026-01")
    data = r.json()
    if data["transactions"]:
        tx = data["transactions"][0]
        assert "data" in tx
        assert "descricao" in tx
        assert "conta" in tx
        assert "categoria" in tx
        assert "valor" in tx
        assert isinstance(tx["valor"], (int, float))
        assert tx["valor"] >= 0


def test_transactions_date_format(client):
    r = client.get("/api/transactions?month=2026-01")
    data = r.json()
    for tx in data["transactions"]:
        assert len(tx["data"]) == 10
        assert tx["data"][4] == "-"
        assert tx["data"][7] == "-"


def test_transactions_respects_limit(client):
    r = client.get("/api/transactions?month=2026-01&limit=1")
    data = r.json()
    assert len(data["transactions"]) <= 1
    assert data["limit"] == 1


def test_transactions_default_limit(client):
    r = client.get("/api/transactions?month=2026-01")
    data = r.json()
    assert data["limit"] == 50
    assert len(data["transactions"]) <= 50


def test_transactions_pagination_offset(client):
    r1 = client.get("/api/transactions?month=2026-01&limit=1&offset=0")
    r2 = client.get("/api/transactions?month=2026-01&limit=1&offset=1")
    d1 = r1.json()
    d2 = r2.json()
    # Different pages should give different transactions (if total > 1)
    if d1["total"] > 1:
        assert d1["transactions"][0]["data"] != d2["transactions"][0]["data"] or \
               d1["transactions"][0]["descricao"] != d2["transactions"][0]["descricao"]


def test_transactions_filter_by_category(client):
    r = client.get("/api/transactions?month=2026-01&category=Alimentacao")
    data = r.json()
    for tx in data["transactions"]:
        assert tx["categoria"].lower() == "alimentacao" or "alimentacao" in tx["conta"].lower()


def test_transactions_search(client):
    r = client.get("/api/transactions?month=2026-01&search=supermercado")
    data = r.json()
    for tx in data["transactions"]:
        assert "supermercado" in tx["descricao"].lower()


def test_transactions_search_case_insensitive(client):
    r = client.get("/api/transactions?month=2026-01&search=SUPERMERCADO")
    data = r.json()
    assert len(data["transactions"]) > 0
    for tx in data["transactions"]:
        assert "supermercado" in tx["descricao"].lower()


def test_transactions_search_no_results(client):
    r = client.get("/api/transactions?month=2026-01&search=xyznonexistent")
    data = r.json()
    assert data["total"] == 0
    assert data["transactions"] == []


def test_transactions_sort_by_date_desc(client):
    r = client.get("/api/transactions?month=2026-01&sort=date&order=desc")
    data = r.json()
    dates = [tx["data"] for tx in data["transactions"]]
    assert dates == sorted(dates, reverse=True)


def test_transactions_sort_by_date_asc(client):
    r = client.get("/api/transactions?month=2026-01&sort=date&order=asc")
    data = r.json()
    dates = [tx["data"] for tx in data["transactions"]]
    assert dates == sorted(dates)


def test_transactions_sort_by_amount(client):
    r = client.get("/api/transactions?month=2026-01&sort=amount&order=desc")
    data = r.json()
    amounts = [tx["valor"] for tx in data["transactions"]]
    assert amounts == sorted(amounts, reverse=True)


def test_transactions_date_range(client):
    r = client.get("/api/transactions?start=2026-01-01&end=2026-02-01")
    data = r.json()
    assert r.status_code == 200
    assert "transactions" in data
    # Should include transactions from January
    for tx in data["transactions"]:
        assert tx["data"] >= "2026-01-01"
        assert tx["data"] < "2026-02-01"


def test_transactions_date_range_with_category(client):
    r = client.get("/api/transactions?start=2026-01-01&end=2026-03-01&category=Alimentacao")
    data = r.json()
    assert r.status_code == 200
    for tx in data["transactions"]:
        assert "alimentacao" in tx["conta"].lower()


def test_transactions_total_consistent(client):
    r = client.get("/api/transactions?month=2026-01&limit=10&offset=0")
    data = r.json()
    total = data["total"]
    # If we request offset near the end, we should get fewer results
    if total > 2:
        r2 = client.get(f"/api/transactions?month=2026-01&limit=10&offset={total - 1}")
        data2 = r2.json()
        assert len(data2["transactions"]) <= 1


def test_transactions_empty_month(client):
    r = client.get("/api/transactions?month=2025-01")
    data = r.json()
    assert data["total"] == 0
    assert data["transactions"] == []
