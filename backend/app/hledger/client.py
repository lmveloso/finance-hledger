"""
HledgerClient — subprocess wrapper for hledger CLI.

This is the ONLY module authorized to invoke the hledger binary.
All routes and workers must go through this client.

PR-2: thin wrapper with same behavior as the old hledger() function.
PR-3: adds Pydantic model returns and unified parsers.
"""

import json
import logging
import subprocess
from pathlib import Path
from typing import Optional

from app.hledger.errors import HledgerCallError, HledgerNotFound, HledgerTimeout

logger = logging.getLogger("finance-hledger")


class HledgerClient:
    def __init__(
        self,
        ledger_file: str | Path,
        binary: str = "hledger",
        timeout: int = 30,
    ):
        self._ledger = str(ledger_file)
        self._binary = binary
        self._timeout = timeout

    def run(
        self,
        *args: str,
        output_format: str = "json",
        expected_type: Optional[type] = None,
    ) -> dict | list | str:
        """Execute hledger CLI and return parsed result.

        Args:
            *args: hledger subcommand and arguments.
            output_format: "json" or "text".
            expected_type: If provided (dict or list), warn if result doesn't match.

        Returns:
            Parsed JSON (dict/list) or raw text string.

        Raises:
            HledgerNotFound: Binary not found.
            HledgerTimeout: Subprocess exceeded timeout.
            HledgerCallError: Non-zero exit code.
        """
        # Flag ordering: -f J SUBCMD -O json [flags...]
        # hledger 1.25 rejects -O json before subcommand; 1.52 accepts both.
        cmd = [self._binary, "-f", self._ledger]
        cmd.extend(args)
        if output_format == "json":
            cmd.extend(["-O", "json"])

        try:
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=self._timeout
            )
        except FileNotFoundError:
            raise HledgerNotFound(f"hledger not found at '{self._binary}'")
        except subprocess.TimeoutExpired:
            raise HledgerTimeout(
                f"hledger timed out after {self._timeout}s: {args}"
            )

        if result.returncode != 0:
            raise HledgerCallError(result.stderr.strip())

        if output_format == "json":
            try:
                parsed = json.loads(result.stdout)
            except json.JSONDecodeError:
                logger.warning("hledger returned non-JSON for args=%s", args)
                return result.stdout.strip()

            if expected_type is not None and not isinstance(parsed, expected_type):
                logger.warning(
                    "hledger schema: expected %s, got %s for args=%s",
                    expected_type.__name__,
                    type(parsed).__name__,
                    args,
                )
            return parsed

        return result.stdout.strip()
