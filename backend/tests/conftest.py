"""
Fixtures para testes do finance-hledger.
Cria um journal mínimo temporário e configura o TestClient do FastAPI.
"""
import os
import tempfile
import pytest
from fastapi.testclient import TestClient

# Minimal journal com ~5 transações, 1 periodic budget, 1 asset, 1 liability
MINIMAL_JOURNAL = """\
~ monthly
    expenses:Alimentacao       2200.00
    expenses:Transporte         800.00
    expenses:Saude             1500.00
    expenses:Lazer              600.00
    expenses:Moradia          3500.00
    expenses:Vestuario          400.00
    expenses:Educacao          1200.00
    expenses:Servicos           800.00
    expenses:Outros             500.00
    equity:Opening

2026-01-05 * Supermercado
    expenses:Alimentacao:Supermercado  185.50
    assets:Banco:Nubank

2026-01-10 * Aluguel
    expenses:Moradia:Aluguel  3500.00
    assets:Banco:Nubank

2026-01-15 * Uber
    expenses:Transporte:Uber  45.00
    liabilities:Cartao:Visa

2026-02-03 * Supermercado
    expenses:Alimentacao:Supermercado  210.00
    assets:Banco:Nubank

2026-02-08 * Farmacia
    expenses:Saude:Farmacia  120.00
    liabilities:Cartao:Visa

2026-02-12 * Netflix
    expenses:Lazer:Streaming  55.90
    liabilities:Cartao:Visa

2026-03-01 * Salario
    assets:Banco:Nubank  12000.00
    income:Salario

2026-03-05 * Supermercado
    expenses:Alimentacao:Supermercado  195.00
    assets:Banco:Nubank

2026-03-10 * Curso online
    expenses:Educacao:Cursos  250.00
    liabilities:Cartao:Visa

2026-03-15 * Internet
    expenses:Servicos:Internet  99.90
    assets:Banco:Nubank
"""


@pytest.fixture(scope="session")
def journal_file():
    """Cria um journal temporário e configura LEDGER_FILE."""
    with tempfile.NamedTemporaryFile(mode="w", suffix=".journal", delete=False) as f:
        f.write(MINIMAL_JOURNAL)
        f.flush()
        path = f.name

    # Set LEDGER_FILE para o journal de teste
    old_ledger = os.environ.get("LEDGER_FILE")
    os.environ["LEDGER_FILE"] = path

    yield path

    # Restaurar e limpar
    if old_ledger is not None:
        os.environ["LEDGER_FILE"] = old_ledger
    else:
        os.environ.pop("LEDGER_FILE", None)
    os.unlink(path)


@pytest.fixture(scope="session")
def client(journal_file):
    """TestClient do FastAPI com LEDGER_FILE apontando pro fixture."""
    # Precisa reimportar o módulo para capturar o LEDGER_FILE atualizado
    # O main.py lê LEDGER_FILE no nível do módulo, então precisamos
    # recarregar o módulo para que ele pegue o valor do fixture.
    import importlib
    import main as main_mod
    importlib.reload(main_mod)

    # Reconfigurar LEDGER_FILE no módulo
    main_mod.LEDGER_FILE = journal_file

    # Verificar se frontend/dist existe — se não, não montar SPA
    # (o TestClient funciona sem isso)
    return TestClient(main_mod.app)
