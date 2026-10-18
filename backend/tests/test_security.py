import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from app.analyzer import RULES, analyze_text
from app.urlscan import fetch_site, analyze_url, ensure_public_host


class DeclarativeRuleTests(unittest.TestCase):
    def test_all_rules_are_valid_and_unique(self):
        ids = [r["id"] for r in RULES["rules"]]
        self.assertEqual(len(ids), len(set(ids)))
        for rule in RULES["rules"]:
            self.assertTrue(all(k in rule for k in ("id", "version", "severity", "pattern", "reason")))
            self.assertGreater(rule["version"], 0)

    def test_no_fraud_claim_from_whatsapp_url_alone(self):
        result=analyze_text("Tu peux me rejoindre ici pour discuter tranquillement : https://wa.me/33612345678 ce soir.")
        self.assertNotIn("Invitation WhatsApp à vérifier",[x["title"] for x in result["findings"]])

    def test_itsme_code_critical(self):
        result=analyze_text("Support itsme : communiquez le code itsme que vous avez reçu immédiatement.")
        self.assertEqual(result["risk"],"Critique")

    def test_france_belgium_domains(self):
        result=analyze_text("Votre remboursement ameli est en attente, payez les frais ici : https://ameli-paiement.example/rapidement")
        self.assertIn("Domaine différent de l'organisme cité",[x["title"] for x in result["findings"]])


class SSRFRegressions(unittest.TestCase):
    def test_mixed_public_private_dns_is_rejected(self):
        infos=[(2,1,6,"",("8.8.8.8",443)),(2,1,6,"",("127.0.0.1",443))]
        with patch("app.urlscan.socket.getaddrinfo",return_value=infos):
            with self.assertRaises(ValueError):
                ensure_public_host("example.org",443)

    def test_redirect_to_loopback_blocked_before_second_fetch(self):
        calls=[]
        def fake_fetch(url):
            calls.append(url)
            return {"status":302,"location":"http://127.0.0.1/admin","url":url}
        with patch("app.urlscan._fetch_once",side_effect=fake_fetch):
            with self.assertRaises(ValueError):
                fetch_site("https://example.org/")
        self.assertEqual(len(calls),1)

    def test_invalid_cert_or_network_failure_never_green(self):
        with patch("app.urlscan.fetch_site",side_effect=OSError("TLS handshake failed")):
            report=analyze_url("https://example.org")
        self.assertEqual(report["risk"],"Indéterminé")
        self.assertTrue(any(x["status"]=="non vérifié" for x in report["checks"]))

    def test_safe_fetch_inspects_html_but_not_js(self):
        doc=b'<html><form><input type="password" name="password"></form><script src="https://www.google-analytics.com/g.js"></script></html>'
        result={"url":"https://example.org/","status":200,"headers":[("Content-Type","text/html")],
                "content_type":"text/html","body":doc,"location":None}
        with patch("app.urlscan.fetch_site",return_value=(result,[{"url":"https://example.org/","status":200}])):
            report=analyze_url("https://example.org",mode="renforce")
        self.assertIn("Mot de passe",report["collection"]["data_requested"])
        self.assertTrue(any("JavaScript" in s for s in report["limitations"]))


if __name__=="__main__":
    unittest.main()
