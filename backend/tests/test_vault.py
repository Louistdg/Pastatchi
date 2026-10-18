"""Tests du coffre aveugle et des routes API locales."""
import base64
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from fastapi import HTTPException
import app.main as main
from app.vault import VaultStore, validate_envelope


def b64(size: int, char=42) -> str:
    return base64.b64encode(bytes([char])*size).decode("ascii")


def sample_envelope():
    return {
        "format": 1,
        "kdf": {"algorithm": "PBKDF2-SHA256", "iterations": 600000, "salt": b64(16)},
        "wrapped_key": {"iv": b64(12), "data": b64(48)},
        "recovery_kdf": {"algorithm": "PBKDF2-SHA256", "iterations": 600000, "salt": b64(16)},
        "recovery_wrapped_key": {"iv": b64(12), "data": b64(48)},
        "content": {"iv": b64(12), "data": b64(96)},
    }


class StorageVaultTests(unittest.TestCase):
    def test_creation_revision_updates_conflicts_and_deletion(self):
        with tempfile.TemporaryDirectory() as path:
            store = VaultStore(Path(path)/"vault.db")
            self.assertFalse(store.read()["exists"])
            env = sample_envelope()
            self.assertEqual(store.write(env, None)["revision"], 1)
            self.assertEqual(store.read()["envelope"], env)
            with self.assertRaises(HTTPException) as conflict:
                store.write(env, None)
            self.assertEqual(conflict.exception.status_code, 409)
            self.assertEqual(store.write(env, 1)["revision"], 2)
            with self.assertRaises(HTTPException):
                store.write(env, 1)
            store.clear()
            self.assertFalse(store.read()["exists"])

    def test_rejects_plaintext_and_invalid_crypto_parameters(self):
        env = sample_envelope()
        env["site"] = "SECRET_PLAINTEXT"
        with self.assertRaises(ValueError):
            validate_envelope(env)
        env = sample_envelope()
        env["kdf"]["iterations"] = 2500
        with self.assertRaises(ValueError):
            validate_envelope(env)
        env = sample_envelope()
        env["content"]["iv"] = b64(4)
        with self.assertRaises(ValueError):
            validate_envelope(env)

    def test_sqlite_does_not_store_test_password(self):
        with tempfile.TemporaryDirectory() as path:
            file = Path(path) / "vault.db"
            store = VaultStore(file)
            store.write(sample_envelope(), None)
            self.assertNotIn(b"SECRET_PLAINTEXT", file.read_bytes())


class VaultApiTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.patch = patch.object(main, "vault_store", VaultStore(Path(self.temp.name)/"vault.db"))
        self.patch.start()
        self.client = TestClient(main.app, base_url="http://127.0.0.1:8000")
        self.headers = {"x-pastatshield-token": main.TOKEN, "Content-Type": "application/json"}
        main.ACCESS_TIMES.clear()

    def tearDown(self):
        self.client.close()
        self.patch.stop()
        main.ACCESS_TIMES.clear()
        self.temp.cleanup()

    def test_vault_roundtrip_and_auth(self):
        self.assertEqual(self.client.get("/api/v1/vault").status_code, 403)
        r = self.client.get("/api/v1/vault", headers=self.headers)
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["exists"])
        body = {"revision": None, "envelope": sample_envelope()}
        r = self.client.put("/api/v1/vault", headers=self.headers, json=body)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["revision"], 1)
        self.assertTrue(self.client.get("/api/v1/vault", headers=self.headers).json()["exists"])
        self.assertEqual(self.client.put("/api/v1/vault", headers=self.headers, json=body).status_code, 409)
        self.assertEqual(self.client.delete("/api/v1/vault", headers=self.headers).status_code, 200)
        self.assertFalse(self.client.get("/api/v1/vault", headers=self.headers).json()["exists"])

    def test_cross_origin_rejected(self):
        r = self.client.get("/api/v1/vault", headers={**self.headers,"Origin":"https://evil.example"})
        self.assertEqual(r.status_code, 403)


if __name__ == "__main__":
    unittest.main()
