"""Unit tests for app.formatting display helpers.

Covers format_category, display_segment, and format_account_name, including the
capitalization fallback for segments not present in account_display_names.json.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.formatting import display_segment, format_account_name, format_category


# ── format_category ──────────────────────────────────────────────────


def test_format_category_known_segment():
    """A known segment resolves to its accented display name."""
    assert format_category("expenses:alimentacao") == "Alimentação"


def test_format_category_unknown_segment_capitalizes():
    """An unknown leaf segment falls back to str.capitalize()."""
    assert format_category("expenses:gizmos") == "Gizmos"


def test_format_category_accented_known_segment_nested():
    """Accented known segment resolves even when nested."""
    assert format_category("expenses:saude:medico") == "Médico"


def test_format_category_deep_nested_uses_last_segment():
    """Paths deeper than 2 still pick only the last segment."""
    assert format_category("expenses:saude:farmacia:generico") == "Generico"
    assert format_category("expenses:lazer:viagem:hotel:extras") == "Extras"


def test_format_category_single_segment_returned_as_is():
    """Single-segment accounts don't have a leaf to format — returned as-is."""
    assert format_category("expenses") == "expenses"


# ── newly added keys ─────────────────────────────────────────────────


def test_format_category_comunidades():
    assert format_category("expenses:comunidades") == "Comunidades"


def test_format_category_terceiros():
    assert format_category("expenses:terceiros") == "Terceiros"


def test_format_category_equipamentos():
    assert format_category("expenses:equipamentos") == "Equipamentos"


def test_format_category_manutencao():
    assert format_category("expenses:manutencao") == "Manutenção"


def test_format_category_consulta():
    assert format_category("expenses:saude:consulta") == "Consulta"


def test_format_category_taxas():
    assert format_category("expenses:financeiro:taxas") == "Taxas"


def test_format_category_ajuste():
    assert format_category("expenses:ajuste") == "Ajuste"


# ── display_segment ──────────────────────────────────────────────────


def test_display_segment_known():
    assert display_segment("alimentacao") == "Alimentação"


def test_display_segment_unknown_capitalizes():
    assert display_segment("gizmos") == "Gizmos"


def test_display_segment_compound_hyphenated_known():
    """Compound hyphenated segments stay mapped from the JSON verbatim."""
    assert display_segment("plano-de-saude") == "Plano de Saúde"


# ── format_account_name ──────────────────────────────────────────────


def test_format_account_name_known_three_parts():
    assert format_account_name("assets:banco:nubank") == "Nubank (Banco)"


def test_format_account_name_unknown_three_parts_capitalizes():
    """Unknown leaf and parent segments both fall back to capitalize()."""
    assert format_account_name("assets:foo:bar") == "Bar (Foo)"


def test_format_account_name_two_parts_known():
    assert format_account_name("assets:caixa") == "Caixa"


def test_format_account_name_two_parts_unknown_capitalizes():
    assert format_account_name("assets:gizmos") == "Gizmos"


def test_format_account_name_single_segment_returned_as_is():
    assert format_account_name("assets") == "assets"
