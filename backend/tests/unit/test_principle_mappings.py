"""Unit tests for loading and validating principles.json."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.principles.errors import PrincipleFileNotFound, PrincipleMappingError
from app.principles.mappings import (
    extract_posting_tags,
    extract_transaction_tags,
    load_mapping,
)


def _write(tmp_path: Path, payload: dict) -> Path:
    p = tmp_path / "principles.json"
    p.write_text(json.dumps(payload), encoding="utf-8")
    return p


def _valid_payload(**overrides) -> dict:
    base = {
        "default": "custos-fixos",
        "principles": [
            {
                "id": "custos-fixos",
                "display_key": "principle.custos-fixos",
                "target_pct": 40,
            },
            {"id": "conforto", "display_key": "principle.conforto", "target_pct": 20},
            {"id": "metas", "display_key": "principle.metas", "target_pct": 5},
            {"id": "prazeres", "display_key": "principle.prazeres", "target_pct": 5},
            {
                "id": "liberdade-financeira",
                "display_key": "principle.liberdade-financeira",
                "target_pct": 25,
            },
            {
                "id": "aumentar-renda",
                "display_key": "principle.aumentar-renda",
                "target_pct": 5,
            },
            {
                "id": "reserva-oportunidade",
                "display_key": "principle.reserva-oportunidade",
                "target_pct": 0,
            },
        ],
        "rules": {
            "expenses:moradia:água": "custos-fixos",
            "expenses:lazer:*": "prazeres",
        },
    }
    base.update(overrides)
    return base


# ── load_mapping ─────────────────────────────────────────────────────


def test_from_file_ok(tmp_path):
    path = _write(tmp_path, _valid_payload())
    m = load_mapping(path)
    assert m.default == "custos-fixos"
    assert m.rules["expenses:moradia:água"] == "custos-fixos"
    assert m.rules["expenses:lazer:*"] == "prazeres"
    assert len(m.principles) == 7


def test_from_file_not_found(tmp_path):
    with pytest.raises(PrincipleFileNotFound):
        load_mapping(tmp_path / "does-not-exist.json")


def test_from_file_missing_default(tmp_path):
    payload = _valid_payload()
    payload.pop("default")
    path = _write(tmp_path, payload)
    with pytest.raises(PrincipleMappingError, match="default"):
        load_mapping(path)


def test_from_file_unknown_default(tmp_path):
    payload = _valid_payload(default="not-a-real-principle")
    path = _write(tmp_path, payload)
    with pytest.raises(PrincipleMappingError, match="default"):
        load_mapping(path)


def test_from_file_invalid_principle_id_in_rules(tmp_path):
    payload = _valid_payload()
    payload["rules"]["expenses:foo"] = "ignorado"
    path = _write(tmp_path, payload)
    with pytest.raises(PrincipleMappingError, match="ignorado"):
        load_mapping(path)


def test_from_file_invalid_principle_entry(tmp_path):
    payload = _valid_payload()
    payload["principles"][0]["id"] = "bogus"
    path = _write(tmp_path, payload)
    with pytest.raises(PrincipleMappingError, match="bogus"):
        load_mapping(path)


def test_from_file_invalid_json(tmp_path):
    p = tmp_path / "principles.json"
    p.write_text("{ not valid json", encoding="utf-8")
    with pytest.raises(PrincipleMappingError):
        load_mapping(p)


def test_from_file_duplicate_principle_id(tmp_path):
    payload = _valid_payload()
    payload["principles"].append(
        {"id": "custos-fixos", "display_key": "duplicate", "target_pct": 10}
    )
    path = _write(tmp_path, payload)
    with pytest.raises(PrincipleMappingError, match="duplicate"):
        load_mapping(path)


def test_from_file_factory_default_loads(tmp_path):
    """The shipped factory JSON must be valid — guards against future breaks."""
    from app.principles import mappings as mod

    factory = Path(mod.__file__).parent / "principles.default.json"
    m = load_mapping(factory)
    assert len(m.principles) == 7
    ids = {p.id for p in m.principles}
    assert ids == {
        "custos-fixos",
        "conforto",
        "metas",
        "prazeres",
        "liberdade-financeira",
        "aumentar-renda",
        "reserva-oportunidade",
    }


# ── extract_posting_tags ─────────────────────────────────────────────


def test_extract_posting_tags_list_of_pairs():
    raw = {"ptags": [["principio", "metas"], ["extra", "foo"]]}
    assert extract_posting_tags(raw) == {"principio": "metas", "extra": "foo"}


def test_extract_posting_tags_dict():
    raw = {"ptags": {"principio": "metas"}}
    assert extract_posting_tags(raw) == {"principio": "metas"}


def test_extract_posting_tags_empty_fallback_to_comment():
    raw = {"ptags": [], "pcomment": "principio: prazeres\n"}
    assert extract_posting_tags(raw) == {"principio": "prazeres"}


def test_extract_posting_tags_missing_returns_empty():
    assert extract_posting_tags({}) == {}


def test_extract_transaction_tags_list_of_pairs():
    raw = {"ttags": [["principio", "metas"]]}
    assert extract_transaction_tags(raw) == {"principio": "metas"}


def test_extract_transaction_tags_fallback_to_comment():
    raw = {"ttags": [], "tcomment": "principio: conforto\n"}
    assert extract_transaction_tags(raw) == {"principio": "conforto"}
