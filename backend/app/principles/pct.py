"""Percentage rebalancing for the yearly principle matrix.

When we split a monthly total across 7 principles, naive ``round(x, 2)`` of
each share drifts — the column may end up summing to 99.98 or 100.02. The
dashboard renders those sums as a QA guardrail, so we fix the drift here.

The algorithm is the classic **largest-remainder method**:

1. Multiply each share by 100 → raw percentage (float).
2. Floor to 2 decimals (equivalent to ``floor(raw * 100) / 100``).
3. Distribute the remainder, 0.01 at a time, to the principles with the
   largest fractional parts, until the column sums to exactly 100.00.

Ties are broken by the principle order in the mapping — deterministic and
stable across requests.
"""

from __future__ import annotations

import math

_CENTS = 100  # work in integer cents to avoid float comparison traps.


def _balance_pct_matrix(
    months: list[str],
    principle_ids: list[str],
    per_month_totals: dict[str, dict[str, float]],
) -> dict[str, dict[str, float]]:
    """Return ``{month: {principle_id: pct}}`` with each column summing to 100.

    If a month has zero total expenses every principle gets ``pct=0.0``.
    """
    out: dict[str, dict[str, float]] = {}
    for month in months:
        totals = per_month_totals.get(month, {})
        month_sum = sum(totals.get(pid, 0.0) for pid in principle_ids)
        if month_sum <= 0:
            out[month] = {pid: 0.0 for pid in principle_ids}
            continue
        out[month] = _largest_remainder(principle_ids, totals, month_sum)
    return out


def _largest_remainder(
    principle_ids: list[str],
    totals: dict[str, float],
    month_sum: float,
) -> dict[str, float]:
    """Split 10_000 cents (= 100.00 %) across principles by value share."""
    target_cents = 100 * _CENTS  # 10_000 = 100.00%
    raw_cents: dict[str, float] = {
        pid: (totals.get(pid, 0.0) / month_sum) * target_cents for pid in principle_ids
    }
    floor_cents: dict[str, int] = {pid: math.floor(v) for pid, v in raw_cents.items()}
    remainder = target_cents - sum(floor_cents.values())

    # Rank by fractional part desc, stable on mapping order (enumerate).
    ranked = sorted(
        enumerate(principle_ids),
        key=lambda pair: (-(raw_cents[pair[1]] - floor_cents[pair[1]]), pair[0]),
    )
    for i in range(remainder):
        _, pid = ranked[i % len(ranked)]
        floor_cents[pid] += 1

    return {pid: floor_cents[pid] / _CENTS for pid in principle_ids}
