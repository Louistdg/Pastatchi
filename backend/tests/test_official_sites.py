"""Répertoire local de sites de référence : pas de réseau ni de faux sentiment de sécurité."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
import app.main as main
from app.official_sites import (
    DIRECTORY_FILE, _trusted_https, load_directory, normalize_search, search_official_sites
)


class DirectoryTests(unittest.TestCase):
    def test_list_and_provenance(self):
        data = load_directory()
        self.assertEqual(len(data["sites"]), 24)
        self.assertEqual(data["reviewed_on"], "2026-10-18")
        self.assertEqual(len({s["id"] for s in data["sites"]}), 24)
        for site in data["sites"]:
            self.assertTrue(_trusted_https(site["url"]))
            self.assertTrue(_trusted_https(site["source_url"]))
            self.assertGreater(len(site["description"]), 10)

    def test_normalization_countries_and_partial_terms(self):
        self.assertEqual(normalize_search("SÉCURITÉ  Sociale"), "securite sociale")
        fr = search_official_sites("impôts", country="France")
        self.assertIn("impots", [site["id"] for site in fr["sites"]])
        self.assertNotIn("myminfin", [site["id"] for site in fr["sites"]])
        be = search_official_sites("IMPOTS", country="Belgique")
        self.assertIn("myminfin", [site["id"] for site in be["sites"]])
        self.assertEqual(len(search_official_sites("", country="France")["sites"]), 12)
        self.assertEqual(len(search_official_sites("", country="Belgique")["sites"]), 12)

    def test_typo_and_no_false_match(self):
        response = search_official_sites("amelie")
        self.assertEqual(response["sites"], [])
        self.assertEqual(response["suggestion"]["query"], "ameli")
        self.assertEqual(response["suggestion"]["site_id"], "ameli")
        response = search_official_sites("inexistantmotdeteste12345")
        self.assertEqual(response["sites"], [])
        self.assertIsNone(response["suggestion"])

    def test_limits_and_unsafe_addresses(self):
        with self.assertRaises(ValueError):
            search_official_sites("z"*81)
        with self.assertRaises(ValueError):
            search_official_sites("a", country="X")
        for value in ("http://exemple.fr", "https://localhost", "javascript:alert(1)",
                      "https://public.fr@evil.example/path", "https://public.fr/#frag",
                      "https://public.fr/?token=123"):
            self.assertFalse(_trusted_https(value) if value != "https://public.fr@evil.example/path" else
                             value.startswith("https://") and _trusted_https(value))
        self.assertFalse(_trusted_https("https://user:secret@public.fr/"))

    def test_invalid_catalogue_rejected(self):
        with patch("app.official_sites.DIRECTORY_FILE", DIRECTORY_FILE.with_name("missing.json")):
            load_directory.cache_clear()
            with self.assertRaises(FileNotFoundError):
                load_directory()
        load_directory.cache_clear()

    def test_search_uses_only_local_catalogue(self):
        # Ces fonctions n'appellent ni requests ni urllib. Le contrôle couvre
        # le chemin direct, indépendamment des autres services de l'application.
        with patch("socket.create_connection", side_effect=AssertionError("network prohibited")):
            result = search_official_sites("colis")
        self.assertGreaterEqual(len(result["sites"]), 2)


class DirectoryApiTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app, base_url="http://127.0.0.1:8000")
        self.headers = {"X-PastaTshield-Token": main.TOKEN}
        main.ACCESS_TIMES.clear()

    def tearDown(self):
        self.client.close()
        main.ACCESS_TIMES.clear()

    def test_auth_and_search(self):
        self.assertEqual(self.client.get("/api/v1/official-sites").status_code, 403)
        response = self.client.get("/api/v1/official-sites", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["sites"]), 24)
        self.assertEqual(response.json()["reviewed_on"], "2026-10-18")
        filtered = self.client.get("/api/v1/official-sites", params={"q":"améli", "country": "France"},
                                   headers=self.headers)
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(filtered.json()["sites"][0]["id"], "ameli")

    def test_cross_origin_and_invalid_query(self):
        bad = self.client.get("/api/v1/official-sites",
                              headers={**self.headers, "Origin": "https://evil.example"})
        self.assertEqual(bad.status_code, 403)
        too_long = self.client.get("/api/v1/official-sites",
                                   headers=self.headers, params={"q": "x"*81})
        self.assertEqual(too_long.status_code, 422)


if __name__ == "__main__":
    unittest.main()
