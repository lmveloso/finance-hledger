"""Testes para GET /api/tags."""


def test_tags_returns_200(client):
    r = client.get("/api/tags")
    assert r.status_code == 200


def test_tags_has_required_fields(client):
    r = client.get("/api/tags")
    data = r.json()
    assert "tags" in data
    assert isinstance(data["tags"], list)


def test_tags_item_structure(client):
    r = client.get("/api/tags")
    data = r.json()
    for t in data["tags"]:
        assert "tag" in t
        assert "count" in t
        assert isinstance(t["tag"], str)
        assert isinstance(t["count"], int)
        assert t["count"] > 0


def test_tags_include_known_tags(client):
    r = client.get("/api/tags")
    data = r.json()
    tag_names = [t["tag"] for t in data["tags"]]
    assert "viagem-floripa" in tag_names
    assert "pet-luna" in tag_names


def test_tags_sorted_by_count_desc(client):
    r = client.get("/api/tags")
    data = r.json()
    counts = [t["count"] for t in data["tags"]]
    assert counts == sorted(counts, reverse=True)


def test_tags_viagem_floripa_count(client):
    r = client.get("/api/tags")
    data = r.json()
    viagem = next((t for t in data["tags"] if t["tag"] == "viagem-floripa"), None)
    assert viagem is not None
    assert viagem["count"] == 2
