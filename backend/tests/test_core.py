import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.analyzer import analyze_text
from app.urlscan import normalize_target, ensure_public_host, inspect_html
from app.storage import HistoryStore


class TextAnalysisTests(unittest.TestCase):
    def test_bank_otp_critical(self):
        report = analyze_text("Votre banque : compte bloqué ! Envoyez le code reçu par SMS immédiatement pour débloquer votre compte.")
        self.assertEqual(report["risk"], "Critique")
        self.assertTrue(report["findings"])

    def test_legitimate_message_not_automatically_fraudulent(self):
        report = analyze_text("Bonjour, nous confirmons votre rendez-vous au bureau mardi prochain. Bonne journée et à bientôt.")
        self.assertEqual(report["risk"], "Faible")

    def test_short_message_indeterminate(self):
        self.assertEqual(analyze_text("Bonjour")["risk"], "Indéterminé")

    def test_whatsapp_investment_suspect(self):
        report = analyze_text("Vous avez gagné un investissement incroyable ! Rejoignez notre groupe https://chat.whatsapp.com/ABCDEFG maintenant.")
        self.assertIn(report["risk"], {"Élevé", "Critique"})

    def test_findings_include_traceability(self):
        report = analyze_text("Urgent : payez les frais de douane pour votre colis ici https://laposte-colis-paiement.example")
        self.assertTrue(all(f.get("evidence") and f.get("reason") for f in report["findings"]))
        self.assertIn("limitations", report)


class UrlSecurityTests(unittest.TestCase):
    def test_block_private_destinations(self):
        for target in ["http://127.0.0.1/", "http://169.254.169.254/", "http://10.2.3.4/", "http://[::1]/", "http://localhost/", "http://test.local/"]:
            with self.subTest(target=target):
                with self.assertRaises(ValueError):
                    normalize_target(target)

    def test_block_bad_protocol_and_credentials(self):
        for target in ["file:///etc/passwd", "https://user:pass@example.com/", "ftp://example.com", "http://example.com:1234", "http://example.com/#fragment"]:
            with self.subTest(target=target):
                with self.assertRaises(ValueError):
                    normalize_target(target)

    def test_accept_public_domain(self):
        self.assertEqual(normalize_target("https://example.com/abc?x=1"), "https://example.com/abc?x=1")

    def test_dns_private_resolution_rejected(self):
        with patch("app.urlscan.socket.getaddrinfo", return_value=[(2, 1, 6, "", ("192.168.1.1", 443))]):
            with self.assertRaises(ValueError):
                ensure_public_host("example.com", 443)

    def test_html_forms_and_third_parties(self):
        html = '<form action="/login"><input type="password" name="pw"><input name="email" type="email"></form><script src="https://analytics.example.org/a.js"></script>'
        inspected = inspect_html(html, "https://shop.example.com")
        self.assertIn("Mot de passe", inspected["data_requested"])
        self.assertIn("Adresse e-mail", inspected["data_requested"])
        self.assertIn("analytics.example.org", inspected["third_party_domains"])


class HistoryTests(unittest.TestCase):
    def test_store_summary_only_and_delete(self):
        with tempfile.TemporaryDirectory() as directory:
            store = HistoryStore(Path(directory) / "test.db")
            report = analyze_text("Attention : votre banque demande votre code secret immédiatement.")
            stored = store.add("texte", report, raw_input="SECRET_PRIVATE_VALUE", keep_content=False)
            self.assertEqual(len(store.list()), 1)
            self.assertNotIn("SECRET_PRIVATE_VALUE", str(store.get(stored["id"])))
            store.clear()
            self.assertEqual(store.list(), [])


if __name__ == "__main__":
    unittest.main()
