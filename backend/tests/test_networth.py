"""Testes para GET /api/networth."""


def test_networth_returns_200(client):
    r = client.get("/api/networth?months=6")
    assert r.status_code == 200


def test_networth_has_months_field(client):
    r = client.get("/api/networth?months=6")
    data = r.json()
    assert "months" in data
    assert isinstance(data["months"], list)


def test_networth_item_structure(client):
    r = client.get("/api/networth?months=6")
    data = r.json()
    if data["months"]:
        item = data["months"][0]
        assert "mes" in item
        assert "assets" in item
        assert "liabilities" in item
        assert "net" in item
        assert isinstance(item["assets"], (int, float))
        assert isinstance(item["liabilities"], (int, float))
        assert isinstance(item["net"], (int, float))


def test_networth_net_equals_assets_minus_liabilities(client):
    r = client.get("/api/networth?months=3")
    data = r.json()
    for item in data["months"]:
        expected = round(item["assets"] - item["liabilities"], 2)
        assert item["net"] == expected


def test_networth_mes_format(client):
    r = client.get("/api/networth?months=3")
    data = r.json()
    for item in data["months"]:
        assert len(item["mes"]) == 7
        assert item["mes"][4] == "-"


def test_networth_default_months(client):
    r = client.get("/api/networth")
    assert r.status_code == 200


def test_networth_limited_months(client):
    r = client.get("/api/networth?months=1")
    data = r.json()
    assert len(data["months"]) <= 1
