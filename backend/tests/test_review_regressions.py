"""Tests de non-régression des observations de la revue V0.2."""
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.analyzer import analyze_text
from app.urlscan import analyze_url, _rdap_domain, _rdap_domain_cached, inspect_html, fetch_site
from app.storage import RdapCache

HTML = {
    "url": "https://example.com/",
    "status": 200,
    "headers": [("Content-Type", "text/html")],
    "content_type": "text/html",
    "body": b"<html><body>page publique</body></html>",
    "location": None,
}

class ReviewRegressions(unittest.TestCase):
    def test_standard_never_masks_http_risk(self):
        page = {**HTML, "url": "http://example.com/"}
        with patch("app.urlscan.fetch_site", return_value=(page, [{"url": page["url"], "status": 200}])):
            r = analyze_url("http://example.com/", mode="standard")
        self.assertEqual(r["risk"], "Élevé")

    def test_standard_https_without_findings_does_not_force_indeterminate(self):
        with patch("app.urlscan.fetch_site", return_value=(HTML, [{"url": HTML["url"], "status": 200}])):
            r = analyze_url("https://example.com/", mode="standard")
        self.assertEqual(r["risk"], "Faible")
        self.assertTrue(any(x["status"] == "non vérifié" for x in r["checks"]))

    def test_rdap_multilevel_suffix_co_uk(self):
        answer = {"events": [{"eventAction": "registration", "eventDate": "2018-01-01T00:00:00Z"}]}
        page = {"status": 200, "body": json.dumps(answer).encode()}
        with patch("app.urlscan.fetch_site", return_value=(page, [{"url": "https://rdap.org/domain/example.co.uk", "status": 200}])) as fake:
            res = _rdap_domain("foo.example.co.uk")
        self.assertGreater(res["age_days"], 2000)
        self.assertEqual(fake.call_args.args[0], "https://rdap.org/domain/example.co.uk")

    def test_rdap_australia_suffix(self):
        answer = {"events": [{"eventAction": "registration", "eventDate": "2019-01-01"}]}
        with patch("app.urlscan.fetch_site", return_value=({"status": 200, "body": json.dumps(answer).encode()}, [])) as fake:
            _rdap_domain("shop.example.com.au")
        self.assertEqual(fake.call_args.args[0], "https://rdap.org/domain/example.com.au")

    def test_unrelated_link_with_brand_does_not_flag(self):
        r = analyze_text("J'ai lu un article sur La Poste dans cette revue : https://www.lemonde.fr/article/explications")
        self.assertNotIn("Domaine différent de l'organisme cité", [f["title"] for f in r["findings"]])

    def test_impersonating_brand_in_domain_does_flag(self):
        r = analyze_text("Votre remboursement Ameli est disponible ici https://ameli-remboursement.example/urgent")
        self.assertIn("Domaine différent de l'organisme cité", [f["title"] for f in r["findings"]])

    def test_whatsapp_context_far_away_does_not_flag(self):
        r = analyze_text("Mon compte est à jour. " + "blabla " * 60 + "Salut, rejoins-moi sur https://wa.me/33611111111")
        self.assertNotIn("Invitation WhatsApp à vérifier", [f["title"] for f in r["findings"]])

    def test_whatsapp_near_investment_flags(self):
        r = analyze_text("Investissement garanti 20% par mois ; rejoins notre groupe ici https://chat.whatsapp.com/invitation")
        self.assertIn("Invitation WhatsApp à vérifier", [f["title"] for f in r["findings"]])

    def test_maximum_unknown_link_is_check_not_risk(self):
        r = analyze_text("Voici un article qui parle du sujet https://www.wikipedia.org/une-page", mode="maximum")
        self.assertEqual(r["risk"], "Faible")
        self.assertTrue(any(c["status"] == "non vérifié" for c in r["checks"]))

    def test_html_base_href_affects_relative_script(self):
        html = '<base href="https://cdn-tracker.example/assets/"><script src="run.js"></script>'
        r = inspect_html(html, "https://example.com/")
        self.assertIn("cdn-tracker.example", r["third_party_domains"])

    def test_html_base_href_affects_relative_form(self):
        html = '<base href="http://nonchiffre.example/"><form action="submit"><input type="password"></form>'
        r = inspect_html(html, "https://example.com/")
        self.assertEqual(r["insecure_forms"], 1)

    def test_rdap_cache_avoids_repeated_requests(self):
        with tempfile.TemporaryDirectory() as directory:
            cache = RdapCache(Path(directory) / "rdap.sqlite3")
            with patch("app.urlscan.RDAP_CACHE", cache), patch("app.urlscan._rdap_domain", return_value={"registered": "2018-01-01", "age_days": 3200}) as lookup:
                first, from_cache = _rdap_domain_cached("shop.example.co.uk")
                second, from_cache_second = _rdap_domain_cached("foo.example.co.uk")
                self.assertFalse(from_cache)
                self.assertTrue(from_cache_second)
                self.assertEqual(first["registered"], second["registered"])
                lookup.assert_called_once()

    def test_rdap_rejects_http_redirect(self):
        page = {"status": 302, "location": "http://rdap.example/unsafe", "url": "https://rdap.org/domain/example.com"}
        with patch("app.urlscan._fetch_once", return_value=page):
            with self.assertRaises(ValueError):
                fetch_site("https://rdap.org/domain/example.com", require_https=True)


if __name__ == "__main__":
    unittest.main()
