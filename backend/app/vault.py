"""Coffre local : serveur aveugle qui ne stocke que des enveloppes chiffrées.

Le chiffrement et la dérivation des clés sont réalisés dans le navigateur.
Les métadonnées des comptes sont aussi à l'intérieur du chiffré.
"""
from __future__ import annotations

import base64
import binascii
import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from threading import Lock

from fastapi import HTTPException

MAX_VAULT_BYTES = 90_000
ITERATIONS_MIN = 400_000
ITERATIONS_MAX = 2_000_000


def _decoded(value: object, minimum: int, maximum: int) -> None:
    if not isinstance(value, str):
        raise ValueError("Enveloppe chiffrée incorrecte.")
    try:
        decoded = base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ValueError("Encodage de coffre invalide.") from exc
    if not minimum <= len(decoded) <= maximum:
        raise ValueError("Champ chiffré de taille invalide.")


def validate_envelope(envelope: object) -> dict:
    if not isinstance(envelope, dict) or set(envelope) != {
        "format", "kdf", "wrapped_key", "recovery_kdf", "recovery_wrapped_key", "content"
    }:
        raise ValueError("Structure du coffre invalide.")
    if envelope["format"] != 1:
        raise ValueError("Format de coffre inconnu.")
    for field in ("kdf", "recovery_kdf"):
        value = envelope[field]
        if not isinstance(value, dict) or set(value) != {"algorithm", "iterations", "salt"}:
            raise ValueError("Paramètres de chiffrement incorrects.")
        if value["algorithm"] != "PBKDF2-SHA256" or type(value["iterations"]) is not int:
            raise ValueError("Algorithme de dérivation incorrect.")
        if not ITERATIONS_MIN <= value["iterations"] <= ITERATIONS_MAX:
            raise ValueError("Nombre d'itérations de dérivation invalide.")
        _decoded(value["salt"], 16, 32)
    for field in ("wrapped_key", "recovery_wrapped_key", "content"):
        value = envelope[field]
        if not isinstance(value, dict) or set(value) != {"iv", "data"}:
            raise ValueError("Élément chiffré incorrect.")
        _decoded(value["iv"], 12, 12)
        _decoded(value["data"], 16, 70_000)
    if len(json.dumps(envelope, separators=(",", ":")).encode("utf-8")) > MAX_VAULT_BYTES:
        raise ValueError("Coffre trop volumineux.")
    return envelope


class VaultStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.lock = Lock()
        with self._connect() as db:
            db.execute("""CREATE TABLE IF NOT EXISTS vault (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                revision INTEGER NOT NULL,
                envelope_json TEXT NOT NULL
            )""")

    @contextmanager
    def _connect(self):
        db = sqlite3.connect(self.path, timeout=10)
        try:
            with db:
                yield db
        finally:
            db.close()

    def read(self) -> dict:
        with self._connect() as db:
            row = db.execute("SELECT revision, envelope_json FROM vault WHERE id = 1").fetchone()
        return {"exists": bool(row), "revision": row[0] if row else None,
                "envelope": json.loads(row[1]) if row else None}

    def write(self, envelope: dict, expected_revision: int | None) -> dict:
        value = validate_envelope(envelope)
        if expected_revision is not None and (type(expected_revision) is not int or expected_revision < 1):
            raise ValueError("Version attendue incorrecte.")
        # Transaction conditionnelle empêche l'écrasement silencieux entre deux onglets.
        with self.lock:
            with self._connect() as db:
                row = db.execute("SELECT revision FROM vault WHERE id = 1").fetchone()
                actual = row[0] if row else None
                if actual != expected_revision:
                    raise HTTPException(status_code=409, detail="Coffre modifié dans un autre onglet. Rechargez-le.")
                if actual is None:
                    db.execute("INSERT INTO vault VALUES (1, 1, ?)",
                               (json.dumps(value, separators=(",", ":")),))
                else:
                    db.execute("UPDATE vault SET revision = ?, envelope_json = ? WHERE id = 1",
                               (actual + 1, json.dumps(value, separators=(",", ":"))))
                return {"revision": (actual or 0) + 1}

    def clear(self):
        with self.lock:
            with self._connect() as db:
                db.execute("DELETE FROM vault WHERE id = 1")
