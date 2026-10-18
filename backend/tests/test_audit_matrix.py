"""Matrice QA prioritaire : tests déterministes, API locale et transports simulés.

Ne requiert aucun accès Internet. Les bases temporaires sont isolées et
les réponses de sites sont entièrement construites en mémoire.
"""
from __future__ import annotations

import base64
import json
import socket
import ssl
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.main as main
from app.analyzer import analyze_text
from app.storage import RdapCache
from app.urlscan import (
    _rdap_domain_cached,
    analyze_url,
    ensure_public_host,
    fetch_site,
    inspect_html,
    normalize_target,
    registrable_domain,
)
from app.vault import VaultStore, validate_envelope


def envelope_sample() -> dict:
    def b64(n: int) -> str:
        return base64.b64encode(bytes([42]) * n).decode("ascii")
    return {
        "format": 1,
        "kdf": {"algorithm": "PBKDF2-SHA256", "iterations": 600_000, "salt": b64(16)},
        "wrapped_key": {"iv": b64(12), "data": b64(48)},
        "recovery_kdf": {"algorithm": "PBKDF2-SHA256", "iterations": 600_000, "salt": b64(16)},
        "recovery_wrapped_key": {"iv": b64(12), "data": b64(48)},
        "content": {"iv": b64(12), "data": b64(96)},
    }


def fake_response(*, status=200, content_type="text/html", body=b"<html></html>"):
    return {
        "url": "https://example.com/",
        "status": status,
        "ip": "93.184.216.34",
        "headers": [("Content-Type", content_type)],
        "content_type": content_type,
        "body": body,
        "location": None,
        "truncated": False,
    }


def offline_report(**kwargs):
    response = fake_response(**kwargs)
    with patch("app.urlscan.fetch_site", return_value=(
        response, [{"url": response["url"], "status": response["status"]}]
    )):
        return analyze_url("https://example.com/", external_consent=False)


class ApiSecurityMatrix(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app, base_url="http://127.0.0.1:8000")
        self.headers = {"x-pastatshield-token": main.TOKEN}
        main.ACCESS_TIMES.clear()

    def tearDown(self):
        self.client.close()
        main.ACCESS_TIMES.clear()

    def test_missing_and_wrong_session_tokens_are_forbidden(self):
        for headers in ({}, {"x-pastatshield-token": "wrong"}, {"x-pastatshield-token": ""}):
            with self.subTest(headers=headers):
                self.assertEqual(self.client.get("/api/v1/health", headers=headers).status_code, 403)

    def test_host_and_origin_denials(self):
        for headers in (
            {**self.headers, "Host": "evil.com"},
            {**self.headers, "Origin": "https://evil.com"},
            {**self.headers, "Origin": "null"},
        ):
            with self.subTest(headers=headers):
                self.assertEqual(self.client.get("/api/v1/health", headers=headers).status_code, 403)

    def test_51st_request_returns_429_and_retry_after(self):
        # Vérifie réellement l'incrément du compteur, et pas seulement la
        # valeur injectée dans ACCESS_TIMES.
        for i in range(main.RATE_LIMIT):
            response = self.client.get("/api/v1/health", headers=self.headers)
            self.assertEqual(response.status_code, 200, f"request {i + 1}")
        rejected = self.client.get("/api/v1/health", headers=self.headers)
        self.assertEqual(rejected.status_code, 429)
        self.assertEqual(rejected.headers.get("Retry-After"), "60")

    def test_oversized_json_request_rejected_before_parsing(self):
        response = self.client.post(
            "/api/v1/analyze/text",
            headers={**self.headers, "content-type": "application/json"},
            content=json.dumps({"text": "x" * (main.MAX_BODY + 1)}).encode("utf-8"),
        )
        self.assertEqual(response.status_code, 413)

    def test_wrong_content_type_rejected(self):
        response = self.client.post(
            "/api/v1/analyze/text",
            headers={**self.headers, "content-type": "text/plain"},
            content='{"text": "Ceci est un message ordinaire suffisamment long."}',
        )
        self.assertEqual(response.status_code, 415)

    def test_valid_api_response_has_csp_and_no_store_headers(self):
        response = self.client.get("/api/v1/health", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("Cache-Control"), "no-store")
        self.assertEqual(response.headers.get("X-Content-Type-Options"), "nosniff")
        csp = response.headers.get("Content-Security-Policy", "")
        self.assertIn("script-src 'self'", csp)
        self.assertIn("object-src 'none'", csp)
        self.assertIn("frame-ancestors 'none'", csp)


class TextRulesMatrix(unittest.TestCase):
    def test_legitimate_colis_without_link_is_low(self):
        report = analyze_text("Bonjour, je viens de recevoir un colis de La Poste aujourd'hui.")
        self.assertEqual(report["risk"], "Faible")

    def test_legitimate_ameli_article_on_news_site_is_low(self):
        report = analyze_text("J'ai lu un article sur Ameli sur https://www.lemonde.fr/ hier.")
        self.assertEqual(report["risk"], "Faible")

    def test_otp_request_remains_critical(self):
        report = analyze_text("Votre banque : envoyez le code reçu par SMS immédiatement.")
        self.assertEqual(report["risk"], "Critique")
        self.assertIn("credential.otp", [finding.get("id") for finding in report["findings"]])

    def test_imitation_domain_is_detected_but_not_looked_up(self):
        report = analyze_text("Remboursement Ameli : https://ameli-remboursement.example/connexion à confirmer.")
        self.assertIn("Domaine différent de l'organisme cité", [f["title"] for f in report["findings"]])
        self.assertEqual(report["risk"], "Élevé")
        self.assertIn("non vérifié", [c["status"] for c in report["checks"]])

    def test_whatsapp_alone_does_not_raise_fraud_alarm(self):
        report = analyze_text("On se parle demain par WhatsApp : https://wa.me/33612345678")
        self.assertEqual(report["risk"], "Faible")

    def test_whatsapp_investment_context_is_suspicious(self):
        report = analyze_text("Investissement garanti ! Rejoignez-nous sur https://wa.me/33612345678")
        self.assertEqual(report["risk"], "Élevé")
        self.assertTrue(any("WhatsApp" in f["title"] for f in report["findings"]))

    def test_standard_excludes_urgency_rule_renforce_includes_it(self):
        message = "URGENT ! Répondez rapidement à cette information importante aujourd'hui."
        std = analyze_text(message, "standard")
        strong = analyze_text(message, "renforce")
        self.assertNotIn("psychology.urgency", [f.get("id") for f in std["findings"]])
        self.assertIn("psychology.urgency", [f.get("id") for f in strong["findings"]])

    def test_short_message_indeterminate(self):
        self.assertEqual(analyze_text("Bonjour")["risk"], "Indéterminé")

    def test_versioned_declarative_findings_are_traceable(self):
        report = analyze_text("Envoyez le code reçu par SMS immédiatement pour accéder à votre compte.")
        matches = [f for f in report["findings"] if f.get("id", "").startswith("credential.")]
        self.assertTrue(matches)
        for finding in matches:
            self.assertTrue(all(k in finding for k in ("id", "version", "title", "severity", "reason")))
            self.assertGreaterEqual(finding["version"], 1)


class UrlAndRdapMatrix(unittest.TestCase):
    def test_private_ip_and_non_http_protocols_denied(self):
        values = (
            "http://127.0.0.1/", "http://192.168.1.1/", "http://10.0.0.1/",
            "http://169.254.169.254/", "file:///etc/passwd", "ftp://example.com/",
            "gopher://example.com/", "http://localhost/admin",
        )
        for value in values:
            with self.subTest(value=value), self.assertRaises(ValueError):
                normalize_target(value)

    def test_mixed_dns_public_then_private_rejected(self):
        records = [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("8.8.8.8", 443)),
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("192.168.1.1", 443)),
        ]
        with patch("app.urlscan.socket.getaddrinfo", return_value=records):
            with self.assertRaises(ValueError):
                ensure_public_host("example.com", 443)

    def test_redirect_to_loopback_refused_before_next_request(self):
        calls = []
        def once(url):
            calls.append(url)
            return {"url": url, "status": 302, "location": "http://localhost/admin"}
        with patch("app.urlscan._fetch_once", side_effect=once):
            with self.assertRaises(ValueError):
                fetch_site("https://example.com/")
        self.assertEqual(len(calls), 1)

    def test_200_html_reports_completed_inspection(self):
        report = offline_report(body=b"<html><form><input type='search'></form></html>")
        self.assertEqual(report["risk"], "Faible")
        self.assertFalse(report["collection"]["partial_inspection"])
        self.assertEqual(
            next(c["status"] for c in report["checks"] if c["name"] == "HTML et formulaires"),
            "effectué",
        )

    def test_non_html_reports_unchecked_and_indeterminate(self):
        report = offline_report(content_type="image/png", body=b"\x89PNG")
        self.assertEqual(report["risk"], "Indéterminé")
        self.assertEqual(
            next(c["status"] for c in report["checks"] if c["name"] == "HTML et formulaires"),
            "non vérifié",
        )

    def test_http_404_and_500_never_become_green(self):
        for code in (404, 500):
            with self.subTest(code=code):
                report = offline_report(status=code)
                self.assertEqual(report["risk"], "Indéterminé")

    def test_socket_timeout_and_tls_errors_result_indeterminate(self):
        for error in (socket.timeout("operation timed out"), ssl.SSLError("handshake failed")):
            with self.subTest(error=type(error).__name__):
                with patch("app.urlscan.fetch_site", side_effect=error):
                    report = analyze_url("https://example.com/")
                self.assertEqual(report["risk"], "Indéterminé")
                self.assertEqual(
                    next(c["status"] for c in report["checks"] if c["name"] == "Connexion au site"),
                    "non vérifié",
                )

    def test_base_href_is_respected_for_external_scripts(self):
        html = (
            '<base href="https://evil.example.com/sub/">'
            '<script src="payload.js"></script>'
        )
        report = inspect_html(html, "https://example.com/")
        self.assertIn("evil.example.com", report["third_party_domains"])

    def test_rdap_multilevel_public_suffix(self):
        self.assertEqual(registrable_domain("sub.example.co.uk"), "example.co.uk")

    def test_rdap_cache_avoids_second_network_call(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache = RdapCache(Path(tmp) / "rdap-cache.sqlite3")
            with patch("app.urlscan.RDAP_CACHE", cache):
                with patch("app.urlscan._rdap_domain", return_value={
                    "registered": "2018-01-01", "age_days": 3200
                }) as network:
                    first, cached_first = _rdap_domain_cached("sub.example.co.uk")
                    second, cached_second = _rdap_domain_cached("sub.example.co.uk")
                    self.assertFalse(cached_first)
                    self.assertTrue(cached_second)
                    self.assertEqual(first["registered"], second["registered"])
                    network.assert_called_once()

    def test_no_rdap_contact_without_user_consent(self):
        with patch("app.urlscan._rdap_domain_cached") as lookup:
            report = offline_report()
            lookup.assert_not_called()
        self.assertEqual(
            next(c["status"] for c in report["checks"] if c["name"] == "Ancienneté du domaine (RDAP)"),
            "non vérifié",
        )


class VaultValidationMatrix(unittest.TestCase):
    def test_missing_salt_unknown_kdf_and_bad_format_rejected(self):
        variants = [
            lambda env: env["kdf"].pop("salt"),
            lambda env: env["kdf"].update({"algorithm": "MD5"}),
            lambda env: env.update({"format": 99}),
        ]
        for mutate in variants:
            with self.subTest(mutate=mutate):
                envelope = envelope_sample()
                mutate(envelope)
                with self.assertRaises(ValueError):
                    validate_envelope(envelope)

    def test_oversized_encrypted_payload_rejected(self):
        envelope = envelope_sample()
        envelope["content"]["data"] = base64.b64encode(bytes([37]) * 68_000).decode("ascii")
        with self.assertRaisesRegex(ValueError, "trop volumineux"):
            validate_envelope(envelope)

    def test_api_rejects_invalid_envelopes_with_422(self):
        with tempfile.TemporaryDirectory() as tmp:
            with patch.object(main, "vault_store", VaultStore(Path(tmp) / "vault.sqlite3")):
                client = TestClient(main.app, base_url="http://127.0.0.1:8000")
                main.ACCESS_TIMES.clear()
                try:
                    env = envelope_sample()
                    env["kdf"].pop("salt")
                    response = client.put(
                        "/api/v1/vault",
                        headers={"x-pastatshield-token": main.TOKEN},
                        json={"revision": None, "envelope": env},
                    )
                    self.assertEqual(response.status_code, 422)
                finally:
                    client.close()
                    main.ACCESS_TIMES.clear()

    def test_concurrent_same_revision_only_one_update_succeeds(self):
        with tempfile.TemporaryDirectory() as tmp:
            store = VaultStore(Path(tmp) / "vault.sqlite3")
            env = envelope_sample()
            self.assertEqual(store.write(env, None)["revision"], 1)
            # Both workers share the same expected revision, forcing one 409.
            def update(_):
                try:
                    return store.write(envelope_sample(), 1)["revision"]
                except HTTPException as exc:
                    return exc.status_code
            with ThreadPoolExecutor(max_workers=2) as pool:
                results = list(pool.map(update, range(2)))
            self.assertCountEqual(results, [2, 409])
            self.assertEqual(store.read()["revision"], 2)


if __name__ == "__main__":
    unittest.main()
