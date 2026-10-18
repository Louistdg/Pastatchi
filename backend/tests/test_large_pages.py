"""Les grandes pages restent inspectables sans téléchargement illimité.

Aucune requête vers un site réel : le transport HTTPS est simulé et l'IP est épinglée.
"""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.urlscan import MAX_BYTES, _fetch_once, analyze_url, fetch_site


class FakeResponse:
    def __init__(self, body, content_type="text/html; charset=utf-8", *, status=200,
                 content_length=None, location=None):
        self.status = status
        self.body = body
        self.read_count = []
        self.headers = {
            "Content-Type": content_type,
            "Content-Length": str(len(body) if content_length is None else content_length),
        }
        if location:
            self.headers["Location"] = location

    def getheader(self, name, default=None):
        return self.headers.get(name, default)

    def getheaders(self):
        return list(self.headers.items())

    def read(self, size):
        self.read_count.append(size)
        return self.body[:size]


class FakeConnection:
    def __init__(self, response):
        self.response = response
        self.closed = False
        self.requested = []

    def request(self, *args, **kwargs):
        self.requested.append((args, kwargs))

    def getresponse(self):
        return self.response

    def close(self):
        self.closed = True


class LargePageTests(unittest.TestCase):
    def fetch(self, response, *, allow_partial):
        conn = FakeConnection(response)
        with patch("app.urlscan.ensure_public_host", return_value="93.184.216.34"), \
             patch("app.urlscan._PinnedHTTPS", return_value=conn):
            return _fetch_once("https://example.org/", allow_partial=allow_partial), conn

    def test_large_html_prefix_is_bounded_and_labeled_partial(self):
        response = FakeResponse(b"<html><form action='http://example.org/submit'>"
                                b"<input type='password'></form>" + b"x" * MAX_BYTES)
        result, conn = self.fetch(response, allow_partial=True)
        self.assertEqual(len(result["body"]), MAX_BYTES)
        self.assertTrue(result["truncated"])
        self.assertEqual(response.read_count, [MAX_BYTES + 1])
        self.assertTrue(conn.closed)
        self.assertTrue(conn.requested)
        with patch("app.urlscan.fetch_site", return_value=(result, [{"url":result["url"],"status":200}])):
            report = analyze_url("https://example.org/", mode="renforce")
        self.assertIn(report["risk"], ("Élevé", "Critique"))
        self.assertTrue(report["collection"]["partial_inspection"])
        self.assertIn("Mot de passe", report["collection"]["data_requested"])
        self.assertTrue(any(c["status"] == "partiel" for c in report["checks"]))
        self.assertTrue(any("seul son début" in value for value in report["limitations"]))

    def test_large_html_without_findings_never_becomes_low_risk(self):
        response = FakeResponse(b"<html><body>" + b"a" * MAX_BYTES)
        result, _ = self.fetch(response, allow_partial=True)
        with patch("app.urlscan.fetch_site", return_value=(result, [{"url":result["url"],"status":200}])):
            report = analyze_url("https://example.org/", mode="renforce")
        self.assertEqual(report["risk"], "Indéterminé")
        self.assertTrue(report["collection"]["partial_inspection"])
        self.assertEqual(report["collection"]["inspected_bytes"], MAX_BYTES)

    def test_420001_bytes_html_is_fully_inspected(self):
        # Régression de la limite V0.3 de 420 000 octets.
        body = b"<html><body>" + b"a" * (420_001 - len(b"<html><body>"))
        response = FakeResponse(body)
        result, _ = self.fetch(response, allow_partial=True)
        self.assertEqual(len(result["body"]), 420_001)
        self.assertFalse(result["truncated"])
        self.assertEqual(response.read_count, [MAX_BYTES + 1])
        with patch("app.urlscan.fetch_site", return_value=(result, [{"url": result["url"], "status": 200}])):
            report = analyze_url("https://example.org/", mode="standard")
        self.assertFalse(report["collection"]["partial_inspection"])
        self.assertFalse(any(c["name"] == "Taille de la page" for c in report["checks"]))
        self.assertTrue(any(c["name"] == "HTML et formulaires" and c["status"] == "effectué"
                            for c in report["checks"]))

    def test_exact_cap_html_not_falsely_marked_partial(self):
        body = b"<html><body>" + b"b" * (MAX_BYTES - len(b"<html><body>"))
        response = FakeResponse(body)
        result, _ = self.fetch(response, allow_partial=True)
        self.assertEqual(len(result["body"]), MAX_BYTES)
        self.assertFalse(result["truncated"])
        with patch("app.urlscan.fetch_site", return_value=(result, [{"url": result["url"], "status": 200}])):
            report = analyze_url("https://example.org/", mode="renforce")
        self.assertFalse(report["collection"]["partial_inspection"])
        self.assertFalse(any(c["name"] == "Taille de la page" for c in report["checks"]))

    def test_partial_size_check_reports_only_inspected_bytes(self):
        body = b"<html><body>" + b"b" * (MAX_BYTES + 50)
        response = FakeResponse(body)
        result, _ = self.fetch(response, allow_partial=True)
        with patch("app.urlscan.fetch_site", return_value=(result, [{"url": result["url"], "status": 200}])):
            report = analyze_url("https://example.org/", mode="standard")
        checks = [check for check in report["checks"] if check["name"] == "Taille de la page"]
        self.assertEqual(len(checks), 1)
        self.assertEqual(checks[0]["status"], "partiel")
        self.assertIn(f"{MAX_BYTES:,} octets", checks[0]["detail"])
        self.assertIn("fin n'a pas été inspectée", checks[0]["detail"])
        self.assertEqual(report["risk"], "Indéterminé")

    def test_html_content_length_large_is_not_rejected_before_read(self):
        response = FakeResponse(b"<html><body>court</body></html>", content_length=50_000_000)
        result, _ = self.fetch(response, allow_partial=True)
        self.assertTrue(result["truncated"])
        self.assertEqual(response.read_count, [MAX_BYTES + 1])

    def test_large_nonhtml_and_strict_mode_still_rejected(self):
        for mime, allow in [("application/json", True), ("text/html", False)]:
            with self.subTest(mime=mime, allow_partial=allow):
                response = FakeResponse(b"a" * (MAX_BYTES + 4), content_type=mime)
                with self.assertRaisesRegex(ValueError, "Réponse trop volumineuse"):
                    self.fetch(response, allow_partial=allow)

    def test_redirect_large_body_is_not_downloaded(self):
        response = FakeResponse(b"a" * (MAX_BYTES + 5), status=302,
                                location="https://example.org/after")
        result, _ = self.fetch(response, allow_partial=True)
        self.assertEqual(result["body"], b"")
        self.assertFalse(result["truncated"])
        self.assertEqual(response.read_count, [])

    def test_standard_still_inspects_basic_html_forms(self):
        body = (b"<html><form action='http://example.org/login'>"
                b"<input type='password'></form></html>")
        page = {
            "url": "https://example.org/", "status": 200,
            "headers": [("Content-Type", "text/html")],
            "content_type": "text/html", "body": body,
            "location": None, "truncated": False,
        }
        with patch("app.urlscan.fetch_site", return_value=(page, [{"url":page["url"],"status":200}])):
            report = analyze_url("https://example.org/", mode="standard")
        self.assertEqual(report["risk"], "Élevé")
        self.assertIn("Mot de passe", report["collection"]["data_requested"])
        self.assertTrue(any(x["name"] == "HTML et formulaires" and x["status"] == "effectué"
                            for x in report["checks"]))

    def test_standard_partial_html_no_false_reassurance(self):
        response = FakeResponse(b"<html><body>" + b"a" * MAX_BYTES)
        result, _ = self.fetch(response, allow_partial=True)
        with patch("app.urlscan.fetch_site", return_value=(result, [{"url":result["url"],"status":200}])):
            report = analyze_url("https://example.org/", mode="standard")
        self.assertEqual(report["risk"], "Indéterminé")
        self.assertTrue(any(check["status"] == "partiel" for check in report["checks"]))

    def test_rdap_fetch_remains_strict_by_default(self):
        page = FakeResponse(b"{" + b" " * MAX_BYTES + b"}", content_type="application/json")
        conn = FakeConnection(page)
        with patch("app.urlscan.ensure_public_host", return_value="93.184.216.34"), \
             patch("app.urlscan._PinnedHTTPS", return_value=conn):
            with self.assertRaisesRegex(ValueError, "Réponse trop volumineuse"):
                fetch_site("https://rdap.org/domain/example.org", require_https=True)


if __name__ == "__main__":
    unittest.main()
