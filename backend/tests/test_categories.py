"""Testes para GET /api/categories."""


def test_categories_returns_200(client):
    r = client.get("/api/categories?month=2026-01")
    assert r.status_code == 200


def test_categories_has_required_fields(client):
    r = client.get("/api/categories?month=2026-01")
    data = r.json()
    assert "month" in data
    assert "categorias" in data
    assert isinstance(data["categorias"], list)


def test_category_item_has_nome_and_valor(client):
    r = client.get("/api/categories?month=2026-01")
    data = r.json()
    if data["categorias"]:
        cat = data["categorias"][0]
        assert "nome" in cat
        assert "valor" in cat
        assert isinstance(cat["valor"], (int, float))


def test_categories_sorted_descending_by_valor(client):
    r = client.get("/api/categories?month=2026-01")
    data = r.json()
    vals = [c["valor"] for c in data["categorias"]]
    assert vals == sorted(vals, reverse=True)


def test_categories_only_positive_values(client):
    r = client.get("/api/categories?month=2026-01")
    data = r.json()
    for cat in data["categorias"]:
        assert cat["valor"] > 0


def test_categories_month_matches(client):
    r = client.get("/api/categories?month=2026-03")
    data = r.json()
    assert data["month"] == "2026-03"


def test_categories_with_depth_param(client):
    r = client.get("/api/categories?month=2026-01&depth=3")
    assert r.status_code == 200
    data = r.json()
    assert "categorias" in data
