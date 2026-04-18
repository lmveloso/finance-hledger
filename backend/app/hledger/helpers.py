"""
Shared helpers used by both main.py and route modules.

These used to live in main.py but were extracted to avoid circular imports.
"""

from datetime import date
from typing import Optional


def month_bounds(month: Optional[str] = None) -> tuple[str, str]:
    """Retorna (begin, end) ISO pro mês dado (YYYY-MM) ou mês atual."""
    if month:
        y, m = map(int, month.split("-"))
    else:
        today = date.today()
        y, m = today.year, today.month
    begin = f"{y:04d}-{m:02d}-01"
    end = f"{y + 1:04d}-01-01" if m == 12 else f"{y:04d}-{m + 1:02d}-01"
    return begin, end


def months_back_bounds(n: int) -> tuple[str, str]:
    today = date.today().replace(day=1)
    for _ in range(n):
        if today.month == 1:
            today = today.replace(year=today.year - 1, month=12)
        else:
            today = today.replace(month=today.month - 1)
    begin = today.strftime("%Y-%m-%d")
    end = date.today().strftime("%Y-%m-%d")
    return begin, end


def months_forward_bounds(n: int) -> tuple[str, str]:
    today = date.today().replace(day=1)
    begin = today.strftime("%Y-%m-%d")
    for _ in range(n):
        if today.month == 12:
            today = today.replace(year=today.year + 1, month=1)
        else:
            today = today.replace(month=today.month + 1)
    end = today.strftime("%Y-%m-%d")
    return begin, end


def add_month_str(ym: str, delta: int) -> str:
    y, m = map(int, ym.split("-"))
    total = y * 12 + (m - 1) + delta
    ny, nm = divmod(total, 12)
    return f"{ny:04d}-{nm + 1:02d}"
