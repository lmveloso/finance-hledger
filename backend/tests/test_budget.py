"""Testes para GET /api/budget."""


def test_budget_returns_200(client):
    r = client.get("/api/budget?month=2026-01")
    assert r.status_code == 200


def test_budget_has_required_fields(client):
    r = client.get("/api/budget?month=2026-01")
    data = r.json()
    assert "month" in data
    assert "categorias" in data
    assert "total" in data


def test_budget_category_structure(client):
    r = client.get("/api/budget?month=2026-01")
    data = r.json()
    if data["categorias"]:
        cat = data["categorias"][0]
        assert "nome" in cat
        assert "orcado" in cat
        assert "realizado" in cat
        assert "percentual" in cat
        assert isinstance(cat["orcado"], (int, float))
        assert isinstance(cat["realizado"], (int, float))
        assert isinstance(cat["percentual"], (int, float))


def test_budget_total_structure(client):
    r = client.get("/api/budget?month=2026-01")
    data = r.json()
    total = data["total"]
    assert "orcado" in total
    assert "realizado" in total
    assert "percentual" in total


def test_budget_categories_sorted_by_percentual(client):
    """Categorias ordenadas por percentual decrescente."""
    r = client.get("/api/budget?month=2026-01")
    data = r.json()
    pcts = [c["percentual"] for c in data["categorias"]]
    assert pcts == sorted(pcts, reverse=True)


def test_budget_only_positive_budgeted(client):
    """Apenas categorias com orçado > 0."""
    r = client.get("/api/budget?month=2026-01")
    data = r.json()
    for cat in data["categorias"]:
        assert cat["orcado"] > 0


def test_budget_month_matches(client):
    r = client.get("/api/budget?month=2026-02")
    data = r.json()
    assert data["month"] == "2026-02"
