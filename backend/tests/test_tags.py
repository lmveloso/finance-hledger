"""Tests for GET /api/tags — period-scoped contract (PR-AS2 / issue #18)."""

from datetime import date


# ── March 2026: known tagged transactions ───────────────────────────────────
# The fixture journal has:
#   - 2026-03-20 viagem-floripa
#   - 2026-03-25 viagem-floripa
#   - 2026-03-28 pet-luna
# No tagged transactions in April 2026.


def test_tags_march_2026_counts(client):
    """?month=2026-03 returns viagem-floripa (2) and pet-luna (1), sorted desc."""
    r = client.get("/api/tags?month=2026-03")
    assert r.status_code == 200
    data = r.json()
    assert data == {
        "tags": [
            {"tag": "viagem-floripa", "count": 2},
            {"tag": "pet-luna", "count": 1},
        ]
    }


def test_tags_april_2026_is_empty(client):
    """?month=2026-04 has no tagged transactions — returns empty list."""
    r = client.get("/api/tags?month=2026-04")
    assert r.status_code == 200
    assert r.json() == {"tags": []}


def test_tags_narrow_range_excludes_pet_luna(client):
    """?start=2026-03-20&end=2026-03-26 captures both viagem tx but excludes pet-luna (03-28)."""
    r = client.get("/api/tags?start=2026-03-20&end=2026-03-26")
    assert r.status_code == 200
    data = r.json()
    assert data == {"tags": [{"tag": "viagem-floripa", "count": 2}]}


def test_tags_no_params_returns_current_month_shape(client):
    """No params defaults to the current month. Assert shape only (test runs any day)."""
    r = client.get("/api/tags")
    assert r.status_code == 200
    data = r.json()
    assert "tags" in data
    assert isinstance(data["tags"], list)
    for t in data["tags"]:
        assert isinstance(t.get("tag"), str)
        assert t["tag"]
        assert isinstance(t.get("count"), int)
        assert t["count"] > 0


def test_tags_no_params_differs_from_march_when_not_march(client):
    """When the current month is not March 2026, the default response must not
    accidentally equal the March-scoped result (that would mean scoping is broken).
    """
    today = date.today()
    if today.year == 2026 and today.month == 3:
        # Running in March 2026 — the assertion below would be meaningless.
        return
    default = client.get("/api/tags").json()
    march = client.get("/api/tags?month=2026-03").json()
    assert default != march


def test_tags_item_structure_and_sort_desc(client):
    """Items have {tag: str, count: int>0}; counts sorted desc."""
    r = client.get("/api/tags?month=2026-03")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data["tags"], list)
    counts = []
    for t in data["tags"]:
        assert isinstance(t["tag"], str) and t["tag"]
        assert isinstance(t["count"], int) and t["count"] > 0
        counts.append(t["count"])
    assert counts == sorted(counts, reverse=True)


def test_tags_count_parity_with_transactions_endpoint(client):
    """viagem-floripa count from /api/tags must equal the number of transactions
    returned by /api/transactions?tag=viagem-floripa for the same period.
    """
    tags_resp = client.get("/api/tags?month=2026-03")
    assert tags_resp.status_code == 200
    viagem = next(
        (t for t in tags_resp.json()["tags"] if t["tag"] == "viagem-floripa"),
        None,
    )
    assert viagem is not None

    tx_resp = client.get("/api/transactions?month=2026-03&tag=viagem-floripa&limit=500")
    assert tx_resp.status_code == 200
    tx_total = tx_resp.json()["total"]
    assert viagem["count"] == tx_total
