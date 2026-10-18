"""Événements opérationnels sans URL, IP, message ni donnée personnelle."""
from __future__ import annotations

import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path

ALLOWED = {
    "HOST_REJECTED", "ORIGIN_REJECTED", "TOKEN_REJECTED", "RATE_LIMITED",
    "URL_REJECTED", "SSRF_REJECTED", "URL_FETCH_FAILED",
    "RDAP_CONSENTED", "RDAP_FAILED", "HISTORY_CLEARED",
}
logger = logging.getLogger("pastatshield.security")
logger.setLevel(logging.INFO)
logger.propagate = False
if not logger.handlers:
    folder = Path(__file__).resolve().parents[2] / "data"
    folder.mkdir(parents=True, exist_ok=True)
    handler = RotatingFileHandler(folder / "security-events.log", maxBytes=200_000,
                                  backupCount=2, encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(message)s"))
    logger.addHandler(handler)


def security_event(code: str) -> None:
    if code not in ALLOWED:
        raise ValueError("Code d'événement de sécurité inconnu.")
    logger.info(code)
