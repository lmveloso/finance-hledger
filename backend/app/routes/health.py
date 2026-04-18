"""Health check endpoint."""

import os

from fastapi import APIRouter

router = APIRouter()


@router.get("/api/health")
def health():
    import main
    version = main.hledger("--version", output_format="text")
    return {
        "status": "ok",
        "hledger_version": version,
        "journal": main.LEDGER_FILE,
        "journal_exists": os.path.exists(main.LEDGER_FILE),
    }
