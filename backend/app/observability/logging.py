"""Structured logging setup + request-scoped middleware.

Uses structlog with two output formats:
  - json (default, production): one JSON object per line, ingestion-friendly.
  - console (dev): pretty, colorized renderer.

A contextvar carries the current ``request_id`` so any logger acquired via
:func:`get_logger` automatically stamps it onto its events.
"""

from __future__ import annotations

import logging
import time
import uuid
from typing import Literal

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp

LogFormat = Literal["json", "console"]

REQUEST_ID_HEADER = "X-Request-ID"


def configure_logging(level: str = "INFO", fmt: LogFormat = "json") -> None:
    """Configure the standard library root logger and structlog.

    Safe to call multiple times; each call replaces the previous config.
    """
    numeric_level = getattr(logging, level.upper(), logging.INFO)

    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
    ]

    if fmt == "console":
        renderer: structlog.types.Processor = structlog.dev.ConsoleRenderer(
            colors=False
        )
    else:
        renderer = structlog.processors.JSONRenderer()

    structlog.configure(
        processors=shared_processors
        + [structlog.processors.format_exc_info, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(numeric_level),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Route stdlib logging through the root logger at the same level so any
    # library emitting via ``logging`` still surfaces (uvicorn, etc.).
    logging.basicConfig(level=numeric_level, format="%(message)s", force=True)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Return a structlog logger bound to ``name`` (defaults to caller module)."""
    return structlog.get_logger(name)


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Assign/propagate a request id, bind it to structlog, and log the request.

    Honors an inbound ``X-Request-ID`` header if present (useful behind a
    reverse proxy); otherwise generates a UUID4. The id is set on the response
    header and cleared from the contextvar when the request ends.
    """

    def __init__(self, app: ASGIApp, logger_name: str = "http") -> None:
        super().__init__(app)
        self._log = get_logger(logger_name)

    async def dispatch(self, request: Request, call_next) -> Response:
        incoming = request.headers.get(REQUEST_ID_HEADER)
        request_id = incoming or uuid.uuid4().hex

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        start = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            self._log.info(
                "request",
                method=request.method,
                path=request.url.path,
                status_code=status_code,
                duration_ms=duration_ms,
            )
            # Best-effort: attach the id to the response for downstream tools.
            # (Response may not exist on exception paths, hence try/except.)
            try:
                response.headers[REQUEST_ID_HEADER] = request_id  # noqa: F821
            except Exception:
                pass
            structlog.contextvars.clear_contextvars()
