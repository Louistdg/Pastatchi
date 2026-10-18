"""Historique local minimaliste : aucune donnée brute conservée par défaut."""
from __future__ import annotations

import json
import sqlite3
import uuid
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


class HistoryStore:
    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.execute("""CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY, created_at TEXT NOT NULL, kind TEXT NOT NULL,
                risk TEXT NOT NULL, summary TEXT NOT NULL, report_json TEXT NOT NULL,
                content TEXT
            )""")

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(self.path, timeout=10)
        try:
            with conn:
                yield conn
        finally:
            conn.close()

    def add(self, kind: str, report: dict, raw_input: str, keep_content: bool = False) -> dict:
        key = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat(timespec="seconds")
        safe_report = {
            "kind": kind, "risk": report["risk"], "summary": report["summary"],
            "findings": [{k: item[k] for k in ("id", "version", "title", "severity", "reason") if k in item}
                         for item in report.get("findings", [])],
            "sources": [{"name": item.get("name"), "status": item.get("status")}
                        for item in report.get("sources", [])],
            "checks": [{"name": item.get("name"), "status": item.get("status")}
                       for item in report.get("checks", [])],
            "limitations": report.get("limitations", []),
        }
        with self._connect() as conn:
            conn.execute("INSERT INTO history VALUES (?, ?, ?, ?, ?, ?, ?)",
                         (key, created_at, kind, report["risk"], report["summary"],
                          json.dumps(safe_report, ensure_ascii=False),
                          raw_input if keep_content else None))
        return {"id": key, "created_at": created_at, "kind": kind,
                "risk": report["risk"], "summary": report["summary"],
                "content_saved": keep_content}

    def list(self, limit: int = 50) -> list[dict]:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute("SELECT id, created_at, kind, risk, summary, content IS NOT NULL AS content_saved FROM history ORDER BY created_at DESC, rowid DESC LIMIT ?", (limit,)).fetchall()
            return [dict(row) for row in rows]

    def get(self, key: str) -> dict | None:
        with self._connect() as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute("SELECT * FROM history WHERE id = ?", (key,)).fetchone()
            if row is None:
                return None
            result = dict(row)
            result["report"] = json.loads(result.pop("report_json"))
            return result

    def clear(self):
        with self._connect() as conn:
            conn.execute("DELETE FROM history")


class RdapCache:
    """Cache locale de registres publics ; entrée conservée au maximum 24 h."""

    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self._connect() as conn:
            conn.execute("""CREATE TABLE IF NOT EXISTS rdap_cache (
                domain TEXT PRIMARY KEY, registered TEXT NOT NULL,
                expires_at INTEGER NOT NULL
            )""")

    @contextmanager
    def _connect(self):
        conn = sqlite3.connect(self.path, timeout=10)
        try:
            with conn:
                yield conn
        finally:
            conn.close()

    def get(self, domain: str) -> str | None:
        with self._connect() as conn:
            row = conn.execute("SELECT registered, expires_at FROM rdap_cache WHERE domain = ?", (domain,)).fetchone()
            if row and row[1] > int(time.time()):
                return row[0]
            if row:
                conn.execute("DELETE FROM rdap_cache WHERE domain = ?", (domain,))
        return None

    def put(self, domain: str, registered: str, ttl_seconds: int = 86400):
        with self._connect() as conn:
            conn.execute("INSERT OR REPLACE INTO rdap_cache VALUES (?, ?, ?)",
                         (domain, registered, int(time.time()) + ttl_seconds))

    def clear(self):
        with self._connect() as conn:
            conn.execute("DELETE FROM rdap_cache")
