"""Scénarios FR/BE QUALITATIFS, entièrement fictifs et hors ligne.

Une URL de référence dans un message ne prouve pas l'identité de son auteur.
« Faible » signifie seulement qu'aucune règle locale n'a détecté de risque.
"""
from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.analyzer import analyze_text
from fixture_support import verified_fixture


def message_report(name: str) -> dict:
    content = verified_fixture("messages/" + name).decode("utf-8")
    # Une analyse de texte ne doit pas consulter les URL qu'elle cite.
    with patch("socket.create_connection", side_effect=AssertionError("Réseau interdit")):
        return analyze_text(content)


class MessagesFrBeCorpusTests(unittest.TestCase):
    def test_reference_laposte_is_not_brand_impersonation(self):
        report = message_report("laposte-reference.txt")
        self.assertEqual(report["risk"], "Faible")
        self.assertEqual(report["findings"], [])
        self.assertIn("https://www.laposte.fr/", report["links"])
        self.assertEqual(next(c["status"] for c in report["checks"]
                              if c["name"] == "Réputation des liens"), "non vérifié")

    def test_reference_itsme_is_not_brand_impersonation(self):
        report = message_report("itsme-reference.txt")
        self.assertEqual(report["risk"], "Faible")
        self.assertEqual(report["findings"], [])
        self.assertIn("https://www.itsme-id.com/fr-be/", report["links"])

    def test_impots_imitation_is_detected_with_traceable_finding(self):
        report = message_report("impots-usurpation.txt")
        self.assertEqual(report["risk"], "Élevé")
        self.assertTrue(any(f["id"] == "brand.domain_mismatch" and f["version"] == 1
                            for f in report["findings"]))

    def test_bpost_payment_imitation_is_detected(self):
        report = message_report("bpost-usurpation.txt")
        self.assertEqual(report["risk"], "Élevé")
        self.assertTrue(any(f["id"] == "brand.domain_mismatch" and f["version"] == 1
                            for f in report["findings"]))

    def test_every_message_finding_has_stable_metadata(self):
        cases = [
            "Lien raccourci https://bit.ly/abcd1234, ne pas cliquer sans vérification.",
            "Investissement garanti, rejoignez-nous sur https://wa.me/33612345678",
            "Ameli demande une confirmation sur https://ameli-remboursement.example/connexion",
            "Trois adresses : https://a.example/ https://b.example/ https://c.example/",
            "Envoyez le code reçu par SMS immédiatement, votre compte est bloqué.",
        ]
        known = {
            "url.shortener", "messaging.whatsapp_sensitive",
            "brand.domain_mismatch", "url.multiple_domains", "credential.otp",
        }
        seen = set()
        for content in cases:
            report = analyze_text(content)
            for item in report["findings"]:
                with self.subTest(title=item["title"]):
                    self.assertIsInstance(item.get("id"), str)
                    self.assertTrue(item["id"])
                    self.assertIsInstance(item.get("version"), int)
                    self.assertGreaterEqual(item["version"], 1)
                    for key in ("title", "severity", "reason", "evidence"):
                        self.assertIn(key, item)
                seen.add(item["id"])
        self.assertTrue(known.issubset(seen))


if __name__ == "__main__":
    unittest.main()
