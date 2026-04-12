"""Testes para GET /api/health."""


def test_health_returns_200(client):
    r = client.get("/api/health")
    assert r.status_code == 200


def test_health_has_required_fields(client):
    r = client.get("/api/health")
    data = r.json()
    assert data["status"] == "ok"
    assert "hledger_version" in data
    assert "journal" in data
    assert "journal_exists" in data


def test_health_journal_exists(client, journal_file):
    r = client.get("/api/health")
    data = r.json()
    assert data["journal_exists"] is True
    assert data["journal"] == journal_file


def test_health_hledger_version_is_string(client):
    r = client.get("/api/health")
    data = r.json()
    assert isinstance(data["hledger_version"], str)
    assert len(data["hledger_version"]) > 0
