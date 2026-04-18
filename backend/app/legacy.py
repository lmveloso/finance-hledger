"""
Legacy hledger JSON parsing helpers.

These functions handle multiple hledger JSON shapes (1.40+ to 1.52+).
They are being replaced by Pydantic models in app.hledger.models,
but are kept for backward compat with existing tests and the budget endpoint.
"""

import logging

logger = logging.getLogger("finance-hledger")


def _extract_one_amount(amount_obj) -> float:
    """Extrai um único float de um objeto de amount do hledger.

    Formatos suportados:
      - {"acommodity": "R$", "aquantity": {"floatingPoint": 123.45}}
      - {"acommodity": "R$", "aquantity": {"floatingPoint": 123.45, "display": ...}}
      - 123.45  (numérico puro, versões antigas)
    """
    if isinstance(amount_obj, (int, float)):
        return float(amount_obj)
    if not isinstance(amount_obj, dict):
        return 0.0
    aq = amount_obj.get("aquantity", {})
    if isinstance(aq, dict):
        val = aq.get("floatingPoint")
        if val is not None:
            return float(val)
    # Formatos ainda mais antigos: "aquantity" pode ser direto um número
    if isinstance(aq, (int, float)):
        return float(aq)
    return 0.0




def _parse_amount_list(raw) -> list[float]:
    """Normaliza qualquer formato de lista de amount para [float].

    Lida com:
      - lista de dicts: [{"acommodity", "aquantity": {floatingPoint}}]
      - lista de listas de dicts: [[{"acommodity", ...}]]
      - lista de números: [123.45]
      - valor único dict ou number
      - None / vazio
    """
    if raw is None:
        return []
    # Valor único (dict ou number) — embrulhar em lista
    if isinstance(raw, (dict, int, float)):
        return [_extract_one_amount(raw)]
    if not isinstance(raw, list):
        return []
    if not raw:
        return []
    # Lista de listas (formato prrAmounts com períodos): [[{...}, ...], ...]
    if isinstance(raw[0], list):
        flat = []
        for sub in raw:
            if isinstance(sub, list):
                for item in sub:
                    flat.append(_extract_one_amount(item))
        return flat
    # Lista de dicts ou números: [{...}, ...] ou [1.0, 2.0]
    return [_extract_one_amount(item) for item in raw]




def _amount(row) -> float:
    """Extrai valor numérico (soma absoluta) de uma row/account do hledger JSON.

    Suporta todos os formatos conhecidos do hledger (1.40+ até 1.52+):
      - prrAmounts / prrTotal (balancesheet/incomestatement prTotals)
      - amount / tamount / ebalance (balance/register)
      - Listas planas ou aninhadas
      - Valores numéricos puros (int/float)
    Retorna 0.0 com warning logado se o formato não for reconhecido.
    """
    if not isinstance(row, dict):
        logger.warning("_amount: recebido %s em vez de dict", type(row).__name__)
        return 0.0

    # Chaves conhecidas em ordem de prioridade
    candidate_keys = ("prrAmounts", "prrTotal", "amount", "tamount", "ebalance")

    for key in candidate_keys:
        raw = row.get(key)
        if raw is not None:
            values = _parse_amount_list(raw)
            if values:
                return sum(values)
            # Se a chave existe mas resultou em lista vazia, logar debug
            logger.debug("_amount: chave '%s' presente mas resultou em lista vazia (row keys=%s)",
                         key, list(row.keys()))
            return 0.0

    # Nenhuma chave reconhecida
    logger.warning("_amount: nenhuma chave de amount encontrada em row com keys=%s",
                    list(row.keys()))
    return 0.0

