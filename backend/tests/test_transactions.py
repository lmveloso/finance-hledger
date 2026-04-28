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


def test_transactions_filter_by_tag(client):
    r = client.get("/api/transactions?month=2026-03&tag=viagem-floripa")
    data = r.json()
    assert r.status_code == 200
    assert data["total"] == 2
    descriptions = [tx["descricao"].lower() for tx in data["transactions"]]
    assert any("passagem" in d for d in descriptions)
    assert any("hotel" in d for d in descriptions)


def test_transactions_filter_by_tag_no_results(client):
    r = client.get("/api/transactions?month=2026-03&tag=nonexistent-tag")
    data = r.json()
    assert data["total"] == 0
    assert data["transactions"] == []


def test_transactions_filter_by_multiple_tags(client):
    r = client.get("/api/transactions?month=2026-03&tag=viagem-floripa&tag=pet-luna")
    data = r.json()
    assert r.status_code == 200
    # AND logic: no transaction has both tags
    assert data["total"] == 0


def test_transactions_filter_by_tag_with_category(client):
    r = client.get("/api/transactions?month=2026-03&tag=viagem-floripa&category=Lazer")
    data = r.json()
    assert r.status_code == 200
    assert data["total"] == 1
    assert "passagem" in data["transactions"][0]["descricao"].lower()


def test_transactions_tag_and_search_combined(client):
    r = client.get("/api/transactions?month=2026-03&tag=viagem-floripa&search=hotel")
    data = r.json()
    assert data["total"] == 1
    assert "hotel" in data["transactions"][0]["descricao"].lower()


# ── account branch: tags surface from OWN posting's ptags ────────


import importlib  # noqa: E402
import os  # noqa: E402
import tempfile  # noqa: E402

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


_PTAGS_JOURNAL = """\
2026-04-10 * Compra com tag de posting
    expenses:Moradia:Equipamentos  300.00  ; parcelamento: TV 1/6
    liabilities:Cartao:Visa

2026-04-12 * Compra simples sem tags
    expenses:Alimentacao:Supermercado  85.00
    liabilities:Cartao:Visa

2026-04-14 * Multi tag posting
    expenses:Lazer:Streaming   55.90  ; categoria: streaming, parcelamento: NETFLIX 2/12
    liabilities:Cartao:Visa

2026-04-16 * Hotel viagem  ; viagem-floripa:
    expenses:Lazer:Viagens  1200.00
    liabilities:Cartao:Visa

2026-04-18 * Compra Orto Life
    expenses:Saude:Ortodontia  450.00  ; parcelamento: Orto Life Mateus 2/3
    liabilities:cartao:xp-visa

2026-04-20 * Tag duplicada nas duas pernas
    expenses:Outros  100.00  ; categoria: shared
    liabilities:Cartao:Visa  ; categoria: shared
"""


@pytest.fixture(scope="module")
def ptags_client():
    """Dedicated TestClient over a tiny journal with posting-level tags."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".journal", delete=False
    ) as f:
        f.write(_PTAGS_JOURNAL)
        f.flush()
        path = f.name

    old_ledger = os.environ.get("LEDGER_FILE")
    os.environ["LEDGER_FILE"] = path

    from app.config import reset_settings

    reset_settings()
    import main as main_mod

    importlib.reload(main_mod)
    main_mod.LEDGER_FILE = path

    yield TestClient(main_mod.app)

    if old_ledger is not None:
        os.environ["LEDGER_FILE"] = old_ledger
    else:
        os.environ.pop("LEDGER_FILE", None)
    reset_settings()
    importlib.reload(main_mod)
    os.unlink(path)


def test_transactions_for_account_exposes_tags(ptags_client):
    """OWN posting's ``ptags`` surface as a list of [key, value] pairs."""
    r = ptags_client.get(
        "/api/transactions?month=2026-04&account=expenses:Moradia:Equipamentos"
    )
    assert r.status_code == 200
    data = r.json()
    matches = [
        tx for tx in data["transactions"] if "tag de posting" in tx["descricao"]
    ]
    assert matches, "expected the parcelamento tx to be returned"
    tx = matches[0]
    assert "tags" in tx
    assert tx["tags"] == [["parcelamento", "TV 1/6"]]


def test_transactions_for_account_tags_empty_when_absent(ptags_client):
    """Transactions whose OWN posting has no ptags surface ``tags: []``."""
    r = ptags_client.get(
        "/api/transactions?month=2026-04&account=expenses:Alimentacao:Supermercado"
    )
    assert r.status_code == 200
    data = r.json()
    assert data["transactions"], "expected the simple tx to be returned"
    for tx in data["transactions"]:
        assert tx["tags"] == []


def test_transactions_for_account_tags_multiple(ptags_client):
    """Multi-tag postings surface every (key, value) pair, ordered as written."""
    r = ptags_client.get(
        "/api/transactions?month=2026-04&account=expenses:Lazer:Streaming"
    )
    assert r.status_code == 200
    data = r.json()
    matches = [
        tx for tx in data["transactions"] if "Multi tag" in tx["descricao"]
    ]
    assert matches, "expected the multi-tag tx to be returned"
    tx = matches[0]
    pairs = {tuple(t) for t in tx["tags"]}
    assert ("categoria", "streaming") in pairs
    assert ("parcelamento", "NETFLIX 2/12") in pairs


def test_transactions_for_account_tags_surface_from_other_postings(ptags_client):
    """Tag on the expense leg surfaces when querying the CARD leg.

    Decision (overrides original Open Q4): ``tags`` is the union of
    ``ttags`` + every posting's ``ptags``. ADR-011 places the
    ``parcelamento:`` tag on the expense leg; the Fluxo passive panel
    needs the ``N/M`` pill on card-account queries, so the union is
    required.
    """
    r = ptags_client.get(
        "/api/transactions?month=2026-04&account=liabilities:Cartao:Visa"
    )
    assert r.status_code == 200
    data = r.json()
    matches = [
        tx for tx in data["transactions"] if "tag de posting" in tx["descricao"]
    ]
    assert matches, "expected the parcelamento tx on the card leg"
    tx = matches[0]
    assert ["parcelamento", "TV 1/6"] in tx["tags"]


def test_transactions_for_account_orto_life_pill_on_card_leg(ptags_client):
    """User-acceptance scenario: Orto Life parcelamento on xp-visa card.

    Querying the card leg returns the ``parcelamento`` tag from the
    expense leg, so the frontend can render the ``2/3`` pill.
    """
    r = ptags_client.get(
        "/api/transactions?month=2026-04&account=liabilities:cartao:xp-visa"
    )
    assert r.status_code == 200
    data = r.json()
    matches = [
        tx for tx in data["transactions"] if "Orto Life" in tx["descricao"]
    ]
    assert matches, "expected Orto Life tx on xp-visa card"
    tx = matches[0]
    assert ["parcelamento", "Orto Life Mateus 2/3"] in tx["tags"]


def test_transactions_for_account_tags_include_transaction_level(ptags_client):
    """Transaction-level ``ttags`` surface alongside posting-level tags.

    The ``viagem-floripa`` tag lives on the transaction header (not on
    any posting); querying the card leg must still see it.
    """
    r = ptags_client.get(
        "/api/transactions?month=2026-04&account=liabilities:Cartao:Visa"
    )
    assert r.status_code == 200
    data = r.json()
    matches = [
        tx for tx in data["transactions"] if "Hotel viagem" in tx["descricao"]
    ]
    assert matches, "expected Hotel viagem tx on the card leg"
    tx = matches[0]
    assert ["viagem-floripa", ""] in tx["tags"]


def test_transactions_for_account_tags_dedup_across_postings(ptags_client):
    """Same ``(key, value)`` on two postings appears only once."""
    r = ptags_client.get(
        "/api/transactions?month=2026-04&account=liabilities:Cartao:Visa"
    )
    assert r.status_code == 200
    data = r.json()
    matches = [
        tx for tx in data["transactions"] if "Tag duplicada" in tx["descricao"]
    ]
    assert matches, "expected the duplicate-tag tx"
    tx = matches[0]
    occurrences = [pair for pair in tx["tags"] if pair == ["categoria", "shared"]]
    assert len(occurrences) == 1, (
        f"categoria=shared should appear once, got {tx['tags']!r}"
    )


def test_transactions_global_branch_does_not_expose_tags(client):
    """Open Q4 (preserved): tags are added on the ``account=…`` branch only.

    The global ``register expenses`` branch (Transações tab) must NOT
    grow a ``tags`` field — that is out of scope for this PR.
    """
    r = client.get("/api/transactions?month=2026-03")
    assert r.status_code == 200
    data = r.json()
    for tx in data["transactions"]:
        assert "tags" not in tx
