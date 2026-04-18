"""Testes unitários para funções auxiliares: _amount, _parse_amount_list, month_bounds, months_back_bounds."""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.legacy import _extract_one_amount, _parse_amount_list, _amount
from app.hledger.helpers import month_bounds, months_back_bounds


# ── _extract_one_amount ──────────────────────────────────────────────


def test_extract_one_amount_from_dict():
    obj = {"acommodity": "R$", "aquantity": {"floatingPoint": 123.45}}
    assert _extract_one_amount(obj) == 123.45


def test_extract_one_amount_from_dict_with_display():
    obj = {
        "acommodity": "BRL",
        "aquantity": {"floatingPoint": 500.0, "display": "BRL 500.00"},
    }
    assert _extract_one_amount(obj) == 500.0


def test_extract_one_amount_from_float():
    assert _extract_one_amount(42.5) == 42.5


def test_extract_one_amount_from_int():
    assert _extract_one_amount(100) == 100.0


def test_extract_one_amount_from_direct_aquantity_number():
    """Formatos ainda mais antigos: aquantity é um número direto."""
    obj = {"acommodity": "R$", "aquantity": 75.0}
    assert _extract_one_amount(obj) == 75.0


def test_extract_one_amount_non_dict_returns_zero():
    assert _extract_one_amount("invalid") == 0.0


def test_extract_one_amount_empty_dict_returns_zero():
    assert _extract_one_amount({}) == 0.0


# ── _parse_amount_list ───────────────────────────────────────────────


def test_parse_amount_list_none():
    assert _parse_amount_list(None) == []


def test_parse_amount_list_empty():
    assert _parse_amount_list([]) == []


def test_parse_amount_list_single_number():
    assert _parse_amount_list(42.5) == [42.5]


def test_parse_amount_list_single_dict():
    obj = {"acommodity": "R$", "aquantity": {"floatingPoint": 100.0}}
    assert _parse_amount_list(obj) == [100.0]


def test_parse_amount_list_list_of_numbers():
    assert _parse_amount_list([1.0, 2.0, 3.0]) == [1.0, 2.0, 3.0]


def test_parse_amount_list_list_of_dicts():
    objs = [
        {"acommodity": "R$", "aquantity": {"floatingPoint": 10.0}},
        {"acommodity": "R$", "aquantity": {"floatingPoint": 20.0}},
    ]
    assert _parse_amount_list(objs) == [10.0, 20.0]


def test_parse_amount_list_nested_lists():
    """Formato prrAmounts com períodos: [[{...}], [{...}]]"""
    nested = [
        [{"acommodity": "R$", "aquantity": {"floatingPoint": 5.0}}],
        [{"acommodity": "R$", "aquantity": {"floatingPoint": 15.0}}],
    ]
    assert _parse_amount_list(nested) == [5.0, 15.0]


# ── _amount ──────────────────────────────────────────────────────────


def test_amount_with_prrAmounts():
    row = {"prrAmounts": [{"acommodity": "R$", "aquantity": {"floatingPoint": 500.0}}]}
    assert _amount(row) == 500.0


def test_amount_with_amount_key():
    row = {"amount": [100.0, 200.0]}
    assert _amount(row) == 300.0


def test_amount_with_ebalance():
    row = {"ebalance": [{"acommodity": "R$", "aquantity": {"floatingPoint": 75.0}}]}
    assert _amount(row) == 75.0


def test_amount_empty_dict_returns_zero():
    assert _amount({}) == 0.0


def test_amount_non_dict_returns_zero():
    assert _amount("not a dict") == 0.0


def test_amount_priority_key_order():
    """Se prrAmounts e amount existem, usa prrAmounts (primeira chave)."""
    row = {
        "prrAmounts": [100.0],
        "amount": [999.0],
    }
    assert _amount(row) == 100.0


def test_amount_with_empty_list_key():
    """Chave existe mas lista vazia — retorna 0.0."""
    row = {"prrAmounts": []}
    assert _amount(row) == 0.0


# ── month_bounds ─────────────────────────────────────────────────────


def test_month_bounds_january():
    begin, end = month_bounds("2026-01")
    assert begin == "2026-01-01"
    assert end == "2026-02-01"


def test_month_bounds_december():
    """Dezembro cruza o ano."""
    begin, end = month_bounds("2026-12")
    assert begin == "2026-12-01"
    assert end == "2027-01-01"


def test_month_bounds_middle_month():
    begin, end = month_bounds("2026-06")
    assert begin == "2026-06-01"
    assert end == "2026-07-01"


def test_month_bounds_none_returns_current():
    begin, end = month_bounds(None)
    # Deve retornar datas válidas
    assert len(begin) == 10
    assert len(end) == 10
    assert begin.endswith("-01")


def test_month_bounds_format():
    begin, end = month_bounds("2026-03")
    assert begin == "2026-03-01"
    assert end == "2026-04-01"


# ── months_back_bounds ──────────────────────────────────────────────


def test_months_back_bounds_returns_strings():
    begin, end = months_back_bounds(3)
    assert isinstance(begin, str)
    assert isinstance(end, str)


def test_months_back_bounds_format():
    begin, end = months_back_bounds(6)
    assert len(begin) == 10
    assert len(end) == 10


def test_months_back_bounds_one_month():
    begin, end = months_back_bounds(1)
    # begin deve ser antes de end
    assert begin < end
