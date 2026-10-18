"""Exiger un manifeste intègre et exhaustif avant tout test sur les fixtures."""
from __future__ import annotations

import hashlib
import json
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fixture_support import FIXTURES, manifest_entries, verified_fixture, verify_complete_corpus


class FixtureIntegrityTests(unittest.TestCase):
    def test_manifest_covers_every_fixture_and_checks_all_hashes(self):
        self.assertEqual(verify_complete_corpus(), 8)

    def test_provenance_and_expected_behavior_are_documented(self):
        entries = manifest_entries()
        wikipedia = entries["html/wikipedia.html"]
        self.assertEqual(wikipedia["origin"], "capture")
        self.assertEqual(wikipedia["source"], "https://www.wikipedia.org/")
        for name, entry in entries.items():
            with self.subTest(path=name):
                self.assertIn(entry["expected_risk"],
                              {"Faible", "Modéré", "Élevé", "Critique", "Indéterminé"})
                if name != "html/wikipedia.html":
                    self.assertEqual(entry["origin"], "synthetique")
                self.assertEqual(hashlib.sha256(verified_fixture(name)).hexdigest(), entry["sha256"])

    def test_mutating_a_byte_is_detected_before_a_parser_gets_it(self):
        original = verified_fixture("html/script-tiers.html")
        file_path = FIXTURES / "html" / "script-tiers.html"
        builtin_read = Path.read_bytes

        def fake_read(path):
            if path == file_path:
                return original[:-1] + bytes([original[-1] ^ 1])
            return builtin_read(path)

        with patch.object(Path, "read_bytes", autospec=True, side_effect=fake_read):
            with self.assertRaisesRegex(ValueError, "SHA-256"):
                verified_fixture("html/script-tiers.html")

    def test_traversal_and_unlisted_files_rejected(self):
        for path in ("../outside.txt", "html/../messages/laposte-reference.txt",
                     "html/not-in-manifest.html"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                verified_fixture(path)

    def test_manifest_is_valid_json_readable_by_an_independent_auditor(self):
        raw = json.loads((FIXTURES / "MANIFEST.json").read_text(encoding="utf-8"))
        self.assertEqual(raw["schema_version"], 1)
        self.assertEqual(len(raw["fixtures"]), 8)
        self.assertEqual(len({entry["path"] for entry in raw["fixtures"]}), 8)


if __name__ == "__main__":
    unittest.main()
