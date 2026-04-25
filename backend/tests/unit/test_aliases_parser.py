"""Unit tests for the journal alias parser.

Pure file I/O — no hledger involvement. The parser reads ``account ... ;
alias: <name>`` directives directly from the journal source so we can
surface human-friendly card names that hledger JSON does not expose.
"""

from __future__ import annotations

import logging
from pathlib import Path

from app.credit_cards.aliases import (
    MAX_INCLUDE_DEPTH,
    display_name,
    last_segment_title,
    parse_account_aliases,
    safe_mtime_iso,
)


def _write(tmp_path: Path, name: str, content: str) -> Path:
    p = tmp_path / name
    p.write_text(content, encoding="utf-8")
    return p


# ── parse_account_aliases ────────────────────────────────────────


def test_simple_alias(tmp_path):
    journal = _write(
        tmp_path,
        "main.journal",
        "account liabilities:cartão:nubank ; alias: Nubank Lucas\n",
    )
    aliases = parse_account_aliases(journal)
    assert aliases == {"liabilities:cartão:nubank": "Nubank Lucas"}


def test_alias_with_extra_whitespace(tmp_path):
    journal = _write(
        tmp_path,
        "main.journal",
        "   account   liabilities:cartao:visa   ;  alias :   Cartão Visa Família   \n",
    )
    aliases = parse_account_aliases(journal)
    assert aliases == {"liabilities:cartao:visa": "Cartão Visa Família"}


def test_no_alias_skipped(tmp_path):
    journal = _write(
        tmp_path,
        "main.journal",
        "\n".join(
            [
                "account liabilities:cartão:nubank",
                "account liabilities:cartão:visa ; some-other-tag: value",
                "account assets:bank ; alias: Family Account",
            ]
        ),
    )
    aliases = parse_account_aliases(journal)
    assert aliases == {"assets:bank": "Family Account"}


def test_malformed_alias_value_skipped(tmp_path):
    journal = _write(
        tmp_path,
        "main.journal",
        "\n".join(
            [
                "account liabilities:cartão:nubank ; alias:   ",  # empty value
                "account liabilities:cartão:visa ; alias: OK Name",
            ]
        ),
    )
    aliases = parse_account_aliases(journal)
    assert aliases == {"liabilities:cartão:visa": "OK Name"}


def test_include_directive_resolves_relative(tmp_path):
    sub = tmp_path / "subs"
    sub.mkdir()
    _write(
        sub,
        "cards.journal",
        "account liabilities:cartão:nubank ; alias: Nubank from Sub\n",
    )
    main = _write(
        tmp_path,
        "main.journal",
        "include subs/cards.journal\n"
        "account liabilities:cartão:visa ; alias: Visa Main\n",
    )
    aliases = parse_account_aliases(main)
    assert aliases == {
        "liabilities:cartão:nubank": "Nubank from Sub",
        "liabilities:cartão:visa": "Visa Main",
    }


def test_include_absolute_path(tmp_path):
    other_dir = tmp_path / "abs"
    other_dir.mkdir()
    abs_file = _write(
        other_dir,
        "cards.journal",
        "account liabilities:cartão:nubank ; alias: From Absolute\n",
    )
    main = _write(
        tmp_path,
        "main.journal",
        f"include {abs_file}\n",
    )
    aliases = parse_account_aliases(main)
    assert aliases == {"liabilities:cartão:nubank": "From Absolute"}


def test_missing_include_logs_warning(tmp_path, caplog):
    caplog.set_level(logging.WARNING, logger="finance-hledger")
    main = _write(
        tmp_path,
        "main.journal",
        "include does-not-exist.journal\n"
        "account liabilities:cartão:nubank ; alias: Survives\n",
    )
    aliases = parse_account_aliases(main)
    assert aliases == {"liabilities:cartão:nubank": "Survives"}
    assert any("aliases.io_error" in rec.message for rec in caplog.records)


def test_circular_include_does_not_loop(tmp_path):
    a = tmp_path / "a.journal"
    b = tmp_path / "b.journal"
    a.write_text(
        "include b.journal\n"
        "account liabilities:cartão:a ; alias: From A\n",
        encoding="utf-8",
    )
    b.write_text(
        "include a.journal\n"
        "account liabilities:cartão:b ; alias: From B\n",
        encoding="utf-8",
    )
    aliases = parse_account_aliases(a)
    assert aliases == {
        "liabilities:cartão:a": "From A",
        "liabilities:cartão:b": "From B",
    }


def test_depth_limit_reached(tmp_path, caplog):
    """Generate a chain longer than MAX_INCLUDE_DEPTH and confirm we stop."""
    caplog.set_level(logging.WARNING, logger="finance-hledger")
    # Build chain main -> f0 -> f1 -> ... -> fN where N > MAX_INCLUDE_DEPTH.
    chain_len = MAX_INCLUDE_DEPTH + 2
    for i in range(chain_len):
        next_path = (
            f"f{i + 1}.journal" if i < chain_len - 1 else None
        )
        body = ""
        if next_path:
            body += f"include {next_path}\n"
        body += f"account liabilities:cartão:f{i} ; alias: F{i}\n"
        (tmp_path / f"f{i}.journal").write_text(body, encoding="utf-8")
    main = _write(tmp_path, "main.journal", "include f0.journal\n")
    aliases = parse_account_aliases(main)
    # We should have visited at least the first MAX_INCLUDE_DEPTH levels and
    # stopped before reaching the deepest entry.
    deepest_account = f"liabilities:cartão:f{chain_len - 1}"
    assert deepest_account not in aliases
    assert any(
        "max_include_depth_reached" in rec.message for rec in caplog.records
    )


def test_lines_inside_comments_are_ignored(tmp_path):
    journal = _write(
        tmp_path,
        "main.journal",
        "; account liabilities:cartão:fake ; alias: Fake\n"
        "account liabilities:cartão:nubank ; alias: Real\n",
    )
    aliases = parse_account_aliases(journal)
    assert aliases == {"liabilities:cartão:nubank": "Real"}


def test_first_seen_alias_wins(tmp_path):
    journal = _write(
        tmp_path,
        "main.journal",
        "\n".join(
            [
                "account liabilities:cartão:nubank ; alias: First",
                "account liabilities:cartão:nubank ; alias: Second",
            ]
        ),
    )
    aliases = parse_account_aliases(journal)
    assert aliases["liabilities:cartão:nubank"] == "First"


# ── helpers ──────────────────────────────────────────────────────


def test_last_segment_title_simple():
    assert last_segment_title("liabilities:cartão:nubank") == "Nubank"


def test_last_segment_title_hyphen():
    assert last_segment_title("liabilities:credit-card:visa") == "Visa"


def test_last_segment_title_handles_empty():
    assert last_segment_title("") == ""


def test_display_name_prefers_alias():
    aliases = {"liabilities:cartão:nubank": "Nubank Lucas"}
    assert (
        display_name("liabilities:cartão:nubank", aliases) == "Nubank Lucas"
    )


def test_display_name_fallback():
    assert display_name("liabilities:cartão:visa", {}) == "Visa"


def test_safe_mtime_iso(tmp_path):
    journal = _write(tmp_path, "x.journal", "; empty\n")
    stamp = safe_mtime_iso(journal)
    assert stamp is not None
    assert "T" in stamp


def test_safe_mtime_iso_missing_returns_none(tmp_path, caplog):
    caplog.set_level(logging.WARNING, logger="finance-hledger")
    assert safe_mtime_iso(tmp_path / "nope.journal") is None
