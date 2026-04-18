"""Unit tests for the deterministic principle resolver."""

from __future__ import annotations

import logging

import pytest

from app.principles.models import Principle, PrincipleMapping
from app.principles.resolver import resolve_principle


@pytest.fixture
def mapping() -> PrincipleMapping:
    """A mapping that exercises exact match, wildcard, and specificity."""
    return PrincipleMapping(
        default="custos-fixos",
        rules={
            "expenses:moradia:água": "custos-fixos",
            "expenses:lazer:*": "prazeres",
            "expenses:alimentação:supermercado": "custos-fixos",
            "expenses:alimentação:*": "prazeres",
            "expenses:educação:*": "aumentar-renda",
            "expenses:educação:livros:*": "aumentar-renda",
        },
        principles=[
            Principle(
                id="custos-fixos", display_key="principle.custos-fixos", target_pct=40
            ),
            Principle(id="conforto", display_key="principle.conforto", target_pct=20),
            Principle(id="metas", display_key="principle.metas", target_pct=5),
            Principle(id="prazeres", display_key="principle.prazeres", target_pct=5),
            Principle(
                id="liberdade-financeira",
                display_key="principle.liberdade-financeira",
                target_pct=25,
            ),
            Principle(
                id="aumentar-renda",
                display_key="principle.aumentar-renda",
                target_pct=5,
            ),
            Principle(
                id="reserva-oportunidade",
                display_key="principle.reserva-oportunidade",
                target_pct=0,
            ),
        ],
    )


def test_resolve_exact_match(mapping):
    pid, fallback = resolve_principle("expenses:moradia:água", None, mapping)
    assert pid == "custos-fixos"
    assert fallback is False


def test_resolve_wildcard(mapping):
    pid, fallback = resolve_principle("expenses:lazer:clube", None, mapping)
    assert pid == "prazeres"
    assert fallback is False


def test_resolve_wildcard_matches_prefix_itself(mapping):
    """``expenses:lazer`` should still match ``expenses:lazer:*``."""
    pid, fallback = resolve_principle("expenses:lazer", None, mapping)
    assert pid == "prazeres"
    assert fallback is False


def test_resolve_specificity_exact_beats_wildcard(mapping):
    """``expenses:alimentação:supermercado`` is exact, shadows the wildcard."""
    pid, fallback = resolve_principle(
        "expenses:alimentação:supermercado", None, mapping
    )
    assert pid == "custos-fixos"
    assert fallback is False


def test_resolve_longer_wildcard_wins(mapping):
    """``expenses:educação:livros:*`` is more specific than ``expenses:educação:*``."""
    pid, _ = resolve_principle("expenses:educação:livros:didatico", None, mapping)
    assert pid == "aumentar-renda"


def test_resolve_fallback_to_default(mapping):
    pid, fallback = resolve_principle("expenses:desconhecido:categoria", None, mapping)
    assert pid == "custos-fixos"
    assert fallback is True


def test_resolve_tag_override_wins(mapping):
    """Valid tag ``principio: metas`` beats the mapping (which would say prazeres)."""
    pid, fallback = resolve_principle(
        "expenses:lazer:cinema",
        {"principio": "metas"},
        mapping,
    )
    assert pid == "metas"
    assert fallback is False


def test_resolve_english_principle_tag_also_accepted(mapping):
    pid, _ = resolve_principle(
        "expenses:lazer:cinema",
        {"principle": "metas"},
        mapping,
    )
    assert pid == "metas"


def test_resolve_invalid_tag_ignored(mapping, caplog):
    """Unknown tag value falls through to mapping and logs a warning."""
    caplog.set_level(logging.WARNING, logger="finance-hledger")
    pid, fallback = resolve_principle(
        "expenses:lazer:cinema",
        {"principio": "xyz"},
        mapping,
    )
    assert pid == "prazeres"  # from wildcard, not the invalid tag
    assert fallback is False
    assert any("principle.invalid_tag" in rec.message for rec in caplog.records)


def test_resolve_tag_case_insensitive(mapping):
    pid, _ = resolve_principle(
        "expenses:lazer:cinema",
        {"principio": " METAS "},
        mapping,
    )
    assert pid == "metas"


def test_resolve_empty_tags_falls_through(mapping):
    pid, _ = resolve_principle("expenses:moradia:água", {}, mapping)
    assert pid == "custos-fixos"


def test_resolve_default_when_no_rules():
    """Mapping with no rules always returns default + fallback=True."""
    mapping = PrincipleMapping(
        default="conforto",
        rules={},
        principles=[
            Principle(id="conforto", display_key="principle.conforto", target_pct=20),
        ],
    )
    pid, fallback = resolve_principle("expenses:anything", None, mapping)
    assert pid == "conforto"
    assert fallback is True
