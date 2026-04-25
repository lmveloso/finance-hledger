"""Typed exceptions for credit-card aggregation.

Currently a thin marker class — most real failures already bubble through
:class:`HledgerError` from :mod:`app.hledger.errors`. Reserved for future
domain-specific errors (e.g. malformed alias declarations) so route code
keeps a single typed translator.
"""


class CreditCardError(Exception):
    """Base exception for credit-card aggregation."""
