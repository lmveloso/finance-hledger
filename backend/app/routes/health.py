"""Health check and login endpoints."""

import os
import secrets
import hmac

from fastapi import APIRouter, HTTPException, Request

from app.config import get_settings
from app.deps import _tokens

router = APIRouter()


@router.post("/api/login")
async def login(request: Request):
    """Autentica por senha e retorna token."""
    settings = get_settings()
    body = await request.json()
    password = body.get("password", "")
    for username, pw in settings.users.items():
        if hmac.compare_digest(password, pw):
            token = secrets.token_hex(32)
            _tokens[token] = username
            return {"token": token, "user": username}
    raise HTTPException(401, "Senha incorreta")


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
