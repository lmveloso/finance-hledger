"""Testes para GET /api/accounts — contrato consumido pela aba Patrimonio."""


def test_accounts_returns_200(client):
    r = client.get("/api/accounts")
    assert r.status_code == 200


def test_accounts_top_level_key_is_contas_list(client):
    r = client.get("/api/accounts")
    data = r.json()
    assert "contas" in data
    assert isinstance(data["contas"], list)


def test_accounts_item_has_expected_keys(client):
    r = client.get("/api/accounts")
    data = r.json()
    for item in data["contas"]:
        assert set(item.keys()) == {"nome", "caminho", "tipo", "saldo"}


def test_accounts_tipo_is_ativo_or_passivo(client):
    r = client.get("/api/accounts")
    data = r.json()
    for item in data["contas"]:
        assert item["tipo"] in {"ativo", "passivo"}


def test_accounts_saldo_is_numeric(client):
    r = client.get("/api/accounts")
    data = r.json()
    for item in data["contas"]:
        assert isinstance(item["saldo"], (int, float))


def test_accounts_has_at_least_one_ativo_with_matching_nome(client):
    """The fixture journal posts to assets:Banco:Nubank, so at least one
    ativo row must surface and its ``nome`` must equal the last colon segment
    of its ``caminho``."""
    r = client.get("/api/accounts")
    data = r.json()
    ativos = [c for c in data["contas"] if c["tipo"] == "ativo"]
    assert ativos, "expected at least one ativo row from fixture journal"
    for c in ativos:
        assert c["nome"] == c["caminho"].rsplit(":", 1)[-1]
