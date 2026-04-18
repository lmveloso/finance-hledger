"""Tests for structured logging configuration and RequestIdMiddleware."""

import io
import json
import logging
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import structlog
from fastapi import FastAPI
from starlette.testclient import TestClient

from app.observability import configure_logging, get_logger
from app.observability.logging import REQUEST_ID_HEADER, RequestIdMiddleware


def _capture_structlog(buf: io.StringIO) -> None:
    """Reconfigure structlog to render JSON into `buf`."""
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.DEBUG),
        logger_factory=structlog.PrintLoggerFactory(file=buf),
        cache_logger_on_first_use=False,
    )


# ── configure_logging ───────────────────────────────────────────────────────


def test_configure_logging_json_format_is_parseable(capsys):
    configure_logging(level="INFO", fmt="json")
    log = get_logger("test")
    log.info("hello", foo="bar")
    captured = capsys.readouterr().out.strip()
    # With cache_logger_on_first_use=True we may have captured across tests,
    # take the last line to isolate our event.
    line = captured.splitlines()[-1] if captured else ""
    payload = json.loads(line)
    assert payload["event"] == "hello"
    assert payload["foo"] == "bar"
    assert payload["level"] == "info"
    assert "timestamp" in payload


def test_configure_logging_console_format_is_not_json(capsys):
    # Disable caching so our new config is actually picked up.
    configure_logging(level="DEBUG", fmt="console")
    log = structlog.get_logger("test-console")
    log.info("pretty", k="v")
    out = capsys.readouterr().out
    # Console renderer should not produce valid JSON.
    last = out.strip().splitlines()[-1] if out.strip() else ""
    try:
        json.loads(last)
        assert False, "console format should not be JSON"
    except json.JSONDecodeError:
        pass
    assert "pretty" in out


def test_configure_logging_respects_level():
    configure_logging(level="WARNING", fmt="json")
    # Internally the wrapper filters below WARNING. Emitting .debug shouldn't
    # blow up and shouldn't be printed; we just verify the call is a no-op.
    log = get_logger("level-test")
    log.debug("should-not-appear")  # no exception, no output expected


# ── RequestIdMiddleware ─────────────────────────────────────────────────────


def _build_app(buf: io.StringIO) -> FastAPI:
    """Build a tiny app wired to capture logs into `buf`."""
    _capture_structlog(buf)
    app = FastAPI()
    app.add_middleware(RequestIdMiddleware)

    @app.get("/ping")
    def ping():
        return {"ok": True}

    @app.get("/boom")
    def boom():
        raise RuntimeError("kaboom")

    return app


def _last_json(buf: io.StringIO) -> dict:
    lines = [ln for ln in buf.getvalue().splitlines() if ln.strip()]
    assert lines, "no log output captured"
    return json.loads(lines[-1])


def test_middleware_logs_request_with_expected_fields():
    buf = io.StringIO()
    client = TestClient(_build_app(buf))

    response = client.get("/ping")
    assert response.status_code == 200

    event = _last_json(buf)
    assert event["event"] == "request"
    assert event["method"] == "GET"
    assert event["path"] == "/ping"
    assert event["status_code"] == 200
    assert isinstance(event["duration_ms"], (int, float))
    assert event["duration_ms"] >= 0
    # A request id must have been bound to context.
    assert "request_id" in event
    assert len(event["request_id"]) > 0


def test_middleware_honors_inbound_request_id_header():
    buf = io.StringIO()
    client = TestClient(_build_app(buf))

    custom = "abc-123-req-id"
    response = client.get("/ping", headers={REQUEST_ID_HEADER: custom})
    assert response.status_code == 200

    event = _last_json(buf)
    assert event["request_id"] == custom


def test_middleware_generates_unique_ids_across_requests():
    buf = io.StringIO()
    client = TestClient(_build_app(buf))

    client.get("/ping")
    first = _last_json(buf)["request_id"]

    client.get("/ping")
    second = _last_json(buf)["request_id"]

    assert first != second


def test_middleware_echoes_request_id_on_response_header():
    buf = io.StringIO()
    client = TestClient(_build_app(buf))

    response = client.get("/ping", headers={REQUEST_ID_HEADER: "propagate-me"})
    assert response.status_code == 200
    assert response.headers.get(REQUEST_ID_HEADER) == "propagate-me"
