"""
Testes unitários para _amount(), _extract_one_amount(), _parse_amount_list().
"""

import sys
import os

# Garantir que o diretório backend está no path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import _amount, _extract_one_amount, _parse_amount_list


class TestExtractOneAmount:
    def test_standard_format(self, amount_standard):
        assert _extract_one_amount(amount_standard) == 1500.75

    def test_negative(self, amount_negative):
        assert _extract_one_amount(amount_negative) == -350.00

    def test_pure_float(self, amount_pure_float):
        assert _extract_one_amount(amount_pure_float) == 42.50

    def test_pure_int(self, amount_pure_int):
        assert _extract_one_amount(amount_pure_int) == 100

    def test_aquantity_number(self, amount_aquantity_number):
        assert _extract_one_amount(amount_aquantity_number) == 99.99

    def test_none(self):
        assert _extract_one_amount(None) == 0.0

    def test_string(self):
        assert _extract_one_amount("invalid") == 0.0

    def test_empty_dict(self):
        assert _extract_one_amount({}) == 0.0

    def test_dict_without_aquantity(self):
        assert _extract_one_amount({"acommodity": "R$"}) == 0.0


class TestParseAmountList:
    def test_flat_list(self, amount_list_flat):
        result = _parse_amount_list(amount_list_flat)
        assert result == [200.0, 50.5]

    def test_nested_list(self, amount_list_nested):
        result = _parse_amount_list(amount_list_nested)
        assert result == [1000.0, 2000.0]

    def test_number_list(self, amount_list_numbers):
        result = _parse_amount_list(amount_list_numbers)
        assert result == [10.0, 20.0, 30.0]

    def test_single_dict(self, amount_standard):
        result = _parse_amount_list(amount_standard)
        assert result == [1500.75]

    def test_single_number(self):
        result = _parse_amount_list(42.0)
        assert result == [42.0]

    def test_none(self):
        assert _parse_amount_list(None) == []

    def test_empty_list(self):
        assert _parse_amount_list([]) == []

    def test_string(self):
        assert _parse_amount_list("bad") == []

    def test_empty_nested(self):
        assert _parse_amount_list([[]]) == []


class TestAmount:
    def test_prramounts(self, row_prramounts):
        assert _amount(row_prramounts) == 5000.0

    def test_amount_key(self, row_amount):
        assert _amount(row_amount) == 750.25

    def test_tamount_key(self, row_tamount):
        assert _amount(row_tamount) == 1200.0

    def test_ebalance_key(self, row_ebalance):
        assert _amount(row_ebalance) == 300.0

    def test_numeric_amount(self, row_numeric_amount):
        assert _amount(row_numeric_amount) == 42.5

    def test_empty(self, row_empty):
        assert _amount(row_empty) == 0.0

    def test_unknown_keys(self, row_unknown_keys):
        # Deve logar warning mas retornar 0.0 sem crash
        assert _amount(row_unknown_keys) == 0.0

    def test_zero_amount(self, row_zero_amount):
        assert _amount(row_zero_amount) == 0.0

    def test_not_a_dict(self):
        assert _amount("not a dict") == 0.0
        assert _amount(None) == 0.0
        assert _amount(42) == 0.0

    def test_empty_dict(self):
        assert _amount({}) == 0.0
