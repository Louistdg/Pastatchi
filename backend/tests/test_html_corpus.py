"""Corpus HTML figé : vérifier les détections et les faux positifs hors ligne.

Aucun chargement réseau pendant ces tests : fetch_site est remplacé par un stub.
Le fichier wikipedia.html est une capture réelle conservée pour régression.
Les deux autres fichiers sont entièrement fictifs, sans formulaire fonctionnel.
"""
from __future__ import annotations

import hashlib
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.urlscan import MAX_BYTES, analyze_url, inspect_html

FIXTURE_DIR = Path(__file__).resolve().parent / "fixtures"
WIKIPEDIA_SHA256 = "5c0de7d8a1af1dc8c06cc2a517265ff96db0ed11114a62be2625ed13c9cdb466"
FAKE_URL = "https://assurance-simulation.example.com/"
LEGIT_URL = "https://compte.example.com/"
WIKIPEDIA_URL = "https://www.wikipedia.org/"


def fixture_bytes(name: str) -> bytes:
    return (FIXTURE_DIR / name).read_bytes()


def offline_report(name: str, url: str, *, mode: str = "renforce") -> dict:
    """Exécuter l'algorithme de rapport sans résoudre le DNS ni faire de requête HTTP."""
    response = {
        "url": url,
        "status": 200,
        "ip": "93.184.216.34",
        "headers": [("Content-Type", "text/html; charset=utf-8")],
        "content_type": "text/html; charset=utf-8",
        "body": fixture_bytes(name),
        "location": None,
        "truncated": False,
    }
    with patch("app.urlscan.fetch_site", return_value=(response, [{"url": url, "status": 200}])):
        return analyze_url(url, mode=mode, external_consent=False)


class HtmlCorpusTests(unittest.TestCase):
    def test_real_wikipedia_fixture_is_pinned_and_small_enough(self):
        payload = fixture_bytes("wikipedia.html")
        self.assertEqual(hashlib.sha256(payload).hexdigest(), WIKIPEDIA_SHA256)
        self.assertTrue(payload.startswith(b"<!DOCTYPE html>"))
        self.assertLess(len(payload), MAX_BYTES)
        self.assertGreater(len(payload), 10_000)

    def test_wikipedia_search_form_is_not_flagged_as_phishing(self):
        page = fixture_bytes("wikipedia.html").decode("utf-8")
        details = inspect_html(page, WIKIPEDIA_URL)
        self.assertGreaterEqual(details["form_count"], 1)
        self.assertEqual(details["insecure_forms"], 0)
        self.assertNotIn("Mot de passe", details["data_requested"])
        self.assertNotIn("Carte bancaire", details["data_requested"])
        self.assertNotIn("IBAN", details["data_requested"])

    def test_wikipedia_report_has_no_unjustified_danger_finding(self):
        report = offline_report("wikipedia.html", WIKIPEDIA_URL)
        self.assertEqual(report["findings"], [])
        self.assertEqual(report["risk"], "Faible")
        self.assertGreaterEqual(report["collection"]["form_count"], 1)
        self.assertFalse(report["collection"]["partial_inspection"])
        self.assertTrue(any(c["name"] == "HTML et formulaires" and c["status"] == "effectué"
                            for c in report["checks"]))

    def test_fake_ameli_fixture_has_sensitive_fields_and_insecure_action(self):
        body = fixture_bytes("faux-ameli.html").decode("utf-8")
        details = inspect_html(body, FAKE_URL)
        for label in ("Mot de passe", "Adresse e-mail", "Numéro de téléphone", "IBAN", "Carte bancaire"):
            with self.subTest(field=label):
                self.assertIn(label, details["data_requested"])
        self.assertEqual(details["form_count"], 1)
        self.assertEqual(details["insecure_forms"], 1)
        # Une référence <script src> est observable, mais sa malveillance ni
        # son exécution dans le navigateur ne peuvent être prouvées.
        self.assertIn("script-miroir.example.invalid", details["third_party_domains"])
        self.assertNotIn("script-miroir.example.invalid", details["known_trackers"])

    def test_fake_ameli_report_flags_insecure_form_but_not_unproven_js(self):
        report = offline_report("faux-ameli.html", FAKE_URL)
        self.assertEqual(report["risk"], "Élevé")
        self.assertTrue(any(f["title"] == "Formulaire non chiffré" and f["severity"] == "Élevé"
                            for f in report["findings"]))
        self.assertFalse(any("malveillant" in str(f).lower() for f in report["findings"]))
        self.assertIn("IBAN", report["collection"]["data_requested"])

    def test_legitimate_https_login_not_flagged_for_password_field_alone(self):
        details = inspect_html(fixture_bytes("formulaire-legitime.html").decode("utf-8"), LEGIT_URL)
        self.assertIn("Mot de passe", details["data_requested"])
        self.assertEqual(details["insecure_forms"], 0)
        self.assertEqual(details["form_count"], 1)
        report = offline_report("formulaire-legitime.html", LEGIT_URL)
        self.assertEqual(report["findings"], [])
        self.assertEqual(report["risk"], "Faible")
        self.assertIn("Mot de passe", report["collection"]["data_requested"])

    def test_fixtures_are_not_operational_phishing_pages(self):
        fake = fixture_bytes("faux-ameli.html").decode("utf-8")
        self.assertIn("example.invalid", fake)
        self.assertIn("type=\"submit\" disabled", fake)
        self.assertIn("TEST", fake)
        self.assertNotIn("https://www.ameli.fr", fake)
        for name in ("faux-ameli.html", "formulaire-legitime.html"):
            self.assertLess(len(fixture_bytes(name)), MAX_BYTES)


if __name__ == "__main__":
    unittest.main()
