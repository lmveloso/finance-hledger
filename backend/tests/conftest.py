"""
Fixtures de teste para finance-hledger.

JSON mockados representando cada formato conhecido de saída do hledger.
Reutilizáveis em test_parsers.py e nos testes de endpoint (T4).
"""

import pytest


# ──────────────────────────────────────────────────────────────────────────
# Fixtures: objetos de amount em formatos variados
# ──────────────────────────────────────────────────────────────────────────

@pytest.fixture
def amount_standard():
    """Formato hledger 1.52 padrão: aquantity.floatingPoint."""
    return {"acommodity": "R$", "aquantity": {"floatingPoint": 1500.75, "display": "R$1500.75"}}


@pytest.fixture
def amount_negative():
    """Amount negativo (despesa)."""
    return {"acommodity": "R$", "aquantity": {"floatingPoint": -350.00}}


@pytest.fixture
def amount_pure_float():
    """Formato antigo: valor numérico puro (float)."""
    return 42.50


@pytest.fixture
def amount_pure_int():
    """Formato antigo: valor numérico puro (int)."""
    return 100


@pytest.fixture
def amount_aquantity_number():
    """Formato raro: aquantity é número direto (sem floatingPoint)."""
    return {"acommodity": "$", "aquantity": 99.99}


@pytest.fixture
def amount_list_flat():
    """Lista plana de amounts (balance/register format)."""
    return [
        {"acommodity": "R$", "aquantity": {"floatingPoint": 200.00}},
        {"acommodity": "R$", "aquantity": {"floatingPoint": 50.50}},
    ]


@pytest.fixture
def amount_list_nested():
    """Lista aninhada de amounts (prrAmounts multi-período)."""
    return [
        [{"acommodity": "R$", "aquantity": {"floatingPoint": 1000.00}}],
        [{"acommodity": "R$", "aquantity": {"floatingPoint": 2000.00}}],
    ]


@pytest.fixture
def amount_list_numbers():
    """Lista de números puros (formato antigo)."""
    return [10.0, 20.0, 30.0]


# ──────────────────────────────────────────────────────────────────────────
# Fixtures: rows completas como retornadas pelo hledger
# ──────────────────────────────────────────────────────────────────────────

@pytest.fixture
def row_prramounts():
    """Row de prTotals com prrAmounts (incomestatement/balancesheet)."""
    return {
        "prrAmounts": [
            [{"acommodity": "R$", "aquantity": {"floatingPoint": 5000.00}}],
        ],
        "prrTotal": [
            [{"acommodity": "R$", "aquantity": {"floatingPoint": 5000.00}}],
        ],
    }


@pytest.fixture
def row_amount():
    """Row com chave 'amount' (balance format)."""
    return {
        "amount": [{"acommodity": "R$", "aquantity": {"floatingPoint": 750.25}}],
    }


@pytest.fixture
def row_tamount():
    """Row com chave 'tamount' (register format)."""
    return {
        "tamount": [{"acommodity": "R$", "aquantity": {"floatingPoint": 1200.00}}],
    }


@pytest.fixture
def row_ebalance():
    """Row com chave 'ebalance' (budget/effective balance)."""
    return {
        "ebalance": [{"acommodity": "R$", "aquantity": {"floatingPoint": 300.00}}],
    }


@pytest.fixture
def row_numeric_amount():
    """Row com amount numérico puro (versão antiga do hledger)."""
    return {
        "amount": [42.50],
    }


@pytest.fixture
def row_empty():
    """Row com chaves mas listas vazias (journal vazio)."""
    return {
        "prrAmounts": [],
        "prrTotal": [],
    }


@pytest.fixture
def row_unknown_keys():
    """Row com chaves desconhecidas (formato futuro/não mapeado)."""
    return {
        "someNewField": "value",
        "anotherField": 123,
    }


@pytest.fixture
def row_zero_amount():
    """Row com amount zerado."""
    return {
        "amount": [{"acommodity": "R$", "aquantity": {"floatingPoint": 0.0}}],
    }


# ──────────────────────────────────────────────────────────────────────────
# Fixtures: respostas completas do hledger por comando
# ──────────────────────────────────────────────────────────────────────────

@pytest.fixture
def incomestatement_response():
    """Resposta simulada de hledger incomestatement -O json."""
    return {
        "cbrSubreports": [
            ["Revenues", {
                "prRows": [
                    {
                        "prrAmounts": [
                            [{"acommodity": "R$", "aquantity": {"floatingPoint": 8500.00}}]
                        ],
                    }
                ],
                "prTotals": {
                    "prrAmounts": [
                        [{"acommodity": "R$", "aquantity": {"floatingPoint": 8500.00}}]
                    ],
                },
            }],
            ["Expenses", {
                "prRows": [
                    {
                        "prrAmounts": [
                            [{"acommodity": "R$", "aquantity": {"floatingPoint": 6200.00}}]
                        ],
                    }
                ],
                "prTotals": {
                    "prrAmounts": [
                        [{"acommodity": "R$", "aquantity": {"floatingPoint": 6200.00}}]
                    ],
                },
            }],
        ],
        "cbrDates": [],
    }


@pytest.fixture
def cashflow_response():
    """Resposta simulada de hledger incomestatement -M -O json."""
    return {
        "cbrDates": [
            [{"contents": "2026-01-01"}, {"contents": "2026-02-01"}],
            [{"contents": "2026-02-01"}, {"contents": "2026-03-01"}],
        ],
        "cbrSubreports": [
            ["Revenues", {
                "prRows": [
                    {
                        "prrAmounts": [
                            [{"acommodity": "R$", "aquantity": {"floatingPoint": 8000.00}}],
                            [{"acommodity": "R$", "aquantity": {"floatingPoint": 9000.00}}],
                        ],
                    }
                ],
            }],
            ["Expenses", {
                "prRows": [
                    {
                        "prrAmounts": [
                            [{"acommodity": "R$", "aquantity": {"floatingPoint": 5000.00}}],
                            [{"acommodity": "R$", "aquantity": {"floatingPoint": 6500.00}}],
                        ],
                    }
                ],
            }],
        ],
    }


@pytest.fixture
def balance_response():
    """Resposta simulada de hledger balance expenses -O json --layout=bare."""
    return [
        [
            ["expenses:Alimentação", "Alimentação",
             [{"acommodity": "R$", "aquantity": {"floatingPoint": 2200.00}}],
             [{"acommodity": "R$", "aquantity": {"floatingPoint": 2200.00}}]],
            ["expenses:Transporte", "Transporte",
             [{"acommodity": "R$", "aquantity": {"floatingPoint": 800.00}}],
             [{"acommodity": "R$", "aquantity": {"floatingPoint": 800.00}}]],
        ]
    ]


@pytest.fixture
def register_response():
    """Resposta simulada de hledger register expenses -O json."""
    return [
        ["2026-04-01", None, "Supermercado",
         {"paccount": "expenses:Alimentação",
          "pamount": [{"acommodity": "R$", "aquantity": {"floatingPoint": 185.50}}]},
         [{"acommodity": "R$", "aquantity": {"floatingPoint": 185.50}}]],
        ["2026-04-03", None, "Uber",
         {"paccount": "expenses:Transporte",
          "pamount": [{"acommodity": "R$", "aquantity": {"floatingPoint": 32.00}}]},
         [{"acommodity": "R$", "aquantity": {"floatingPoint": 217.50}}]],
    ]


@pytest.fixture
def empty_list_response():
    """Resposta de journal vazio: lista vazia."""
    return []


@pytest.fixture
def empty_dict_response():
    """Resposta de journal vazio: dict vazio ou sem subreports."""
    return {"cbrSubreports": [], "cbrDates": []}


@pytest.fixture
def text_response():
    """Resposta de hledger quando output_format=text (não-JSON)."""
    return "            R$ 5000.00  expenses\n            R$ 5000.00\n"
