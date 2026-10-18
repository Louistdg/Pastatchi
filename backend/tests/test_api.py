"""Intégration de l'API locale : UTF-8, contrôle d'accès et débit."""
import json
import sys
import tempfile
import time
import unittest
from collections import deque
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi.testclient import TestClient
import app.main as main
from app.storage import HistoryStore, RdapCache


class LocalApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store_patch = patch.object(main, "store", HistoryStore(Path(self.temp.name) / "test.sqlite3"))
        self.store_patch.start()
        self.cache_patch = patch.object(main, "RDAP_CACHE", RdapCache(Path(self.temp.name) / "rdap.sqlite3"))
        self.cache_patch.start()
        self.client = TestClient(main.app, base_url="http://127.0.0.1:8000")
        self.headers = {"x-pastatshield-token": main.TOKEN, "Content-Type": "application/json"}
        main.ACCESS_TIMES.clear()

    def tearDown(self):
        self.client.close()
        self.store_patch.stop()
        self.cache_patch.stop()
        main.ACCESS_TIMES.clear()
        self.temp.cleanup()

    def test_utf8_accents_20000_characters(self):
        body = json.dumps({"text": "é" * 20000, "mode": "renforce"}, ensure_ascii=False).encode("utf-8")
        self.assertGreater(len(body), 26000)
        res = self.client.post("/api/v1/analyze/text", content=body, headers=self.headers)
        self.assertEqual(res.status_code, 200, res.text[:300])

    def test_utf8_emoji_20000_characters(self):
        body = json.dumps({"text": "🔐" * 20000, "mode": "renforce"}, ensure_ascii=False).encode("utf-8")
        self.assertGreater(len(body), 26000)
        res = self.client.post("/api/v1/analyze/text", content=body, headers=self.headers)
        self.assertEqual(res.status_code, 200, res.text[:300])

    def test_unauthorized_and_host_blocked(self):
        self.assertEqual(self.client.get("/api/v1/health").status_code, 403)
        r = self.client.get("/api/v1/health", headers={**self.headers, "Origin": "https://bad.example"})
        self.assertEqual(r.status_code, 403)
        r = self.client.get("/api/v1/health", headers={**self.headers, "Host": "evil.example"})
        self.assertEqual(r.status_code, 403)

    def test_rate_limit_has_retry_after(self):
        main.ACCESS_TIMES["testclient"] = deque([time.monotonic()] * main.RATE_LIMIT)
        res = self.client.get("/api/v1/health", headers=self.headers)
        self.assertEqual(res.status_code, 429)
        self.assertEqual(res.headers.get("Retry-After"), "60")

    def test_clear_history_also_clears_rdap_cache(self):
        main.RDAP_CACHE.put("example.co.uk", "2018-01-01")
        self.assertEqual(main.RDAP_CACHE.get("example.co.uk"), "2018-01-01")
        res = self.client.delete("/api/v1/history", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        self.assertIsNone(main.RDAP_CACHE.get("example.co.uk"))

    def test_history_retains_rule_version_without_evidence(self):
        body = {"text": "Votre compte est bloqué, envoyez le code reçu par SMS immédiatement."}
        res = self.client.post("/api/v1/analyze/text", json=body, headers=self.headers)
        self.assertEqual(res.status_code, 200, res.text[:300])
        key = res.json()["record"]["id"]
        saved = self.client.get("/api/v1/history/" + key, headers=self.headers).json()
        finding = saved["report"]["findings"][0]
        self.assertIn("id", finding)
        self.assertIn("version", finding)
        self.assertNotIn("evidence", finding)
        self.assertIsNone(saved["content"])


if __name__ == "__main__":
    unittest.main()
