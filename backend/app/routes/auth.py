"""Authentication endpoints (login)."""

from fastapi import APIRouter, Depends, HTTPException, Request

from app.auth.password import issue_token, verify_password
from app.config import Settings, get_settings

router = APIRouter()


@router.post("/api/login")
async def login(
    request: Request,
    settings: Settings = Depends(get_settings),
):
    """Authenticate by password and return a Bearer token."""
    body = await request.json()
    password = body.get("password", "")
    username = verify_password(password, settings.users)
    if username is None:
        raise HTTPException(401, "Senha incorreta")
    token = issue_token(username)
    return {"token": token, "user": username}
