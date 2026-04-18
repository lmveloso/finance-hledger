"""Seasonality heatmap endpoint."""

from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends

from app.deps import get_current_user

router = APIRouter()


@router.get("/api/seasonality")
def seasonality(
    months: int = 12,
    user: Optional[str] = Depends(get_current_user),
):
    """Matriz mes x categoria para heatmap de sazonalidade."""
    from app.formatting import category_spending

    matrix = []
    start = date.today().replace(day=1)
    for i in range(months - 1, -1, -1):
        m_date = start
        for _ in range(i):
            m_date = (m_date - timedelta(days=1)).replace(day=1)
        ym = m_date.strftime("%Y-%m")
        spending = category_spending(ym)
        matrix.append({"mes": ym, "categorias": spending})

    all_cats = set()
    for row in matrix:
        all_cats.update(row["categorias"].keys())

    return {
        "categorias": sorted(all_cats),
        "meses": matrix,
    }
