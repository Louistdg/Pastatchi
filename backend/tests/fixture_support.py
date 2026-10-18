"""Validation indépendante de l'intégrité des fixtures d'audit.

Les octets du corpus sont comparés au MANIFEST.json avant chaque lecture de test.
Ce manifeste est une preuve de cohérence du paquet, PAS une signature d'auteur.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path, PurePosixPath

FIXTURES = Path(__file__).resolve().parent / "fixtures"
MANIFEST = FIXTURES / "MANIFEST.json"
CATEGORIES = {"html": ".html", "messages": ".txt"}


def manifest_entries() -> dict[str, dict]:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict) or manifest.get("schema_version") != 1:
        raise ValueError("Schéma de manifeste inconnu.")
    records = manifest.get("fixtures")
    if not isinstance(records, list) or not records:
        raise ValueError("Manifeste vide ou invalide.")
    indexed: dict[str, dict] = {}
    for record in records:
        if not isinstance(record, dict):
            raise ValueError("Entrée de manifeste mal formée.")
        relative = record.get("path")
        if not isinstance(relative, str):
            raise ValueError("Chemin de fixture absent.")
        path = PurePosixPath(relative)
        if (str(path) != relative or len(path.parts) != 2
                or path.parts[0] not in CATEGORIES or path.parts[1] in {".", ".."}
                or path.suffix != CATEGORIES[path.parts[0]]
                or not re.fullmatch(r"[a-z0-9][a-z0-9_.-]*", path.name)):
            raise ValueError(f"Chemin de fixture interdit : {relative}")
        if relative in indexed:
            raise ValueError(f"Fixture enregistrée deux fois : {relative}")
        if record.get("type") != ("html" if path.parts[0] == "html" else "message"):
            raise ValueError("Type de fixture incohérent.")
        if record.get("origin") not in {"capture", "synthetique"}:
            raise ValueError("Provenance absente.")
        if (not isinstance(record.get("source"), str)
                or not record["source"]
                or not isinstance(record.get("expected"), str)
                or not record["expected"]
                or record.get("expected_risk") not in {"Faible", "Modéré", "Élevé", "Critique", "Indéterminé"}):
            raise ValueError("Métadonnées de fixture incomplètes.")
        if not isinstance(record.get("bytes"), int) or record["bytes"] < 1:
            raise ValueError("Taille de fixture invalide.")
        if not isinstance(record.get("sha256"), str) or not re.fullmatch(
                r"[0-9a-f]{64}", record["sha256"]):
            raise ValueError("Empreinte SHA-256 invalide.")
        indexed[relative] = record
    return indexed


def verified_fixture(relative_path: str) -> bytes:
    """La vérification précède toujours la fourniture du HTML ou du message."""
    entries = manifest_entries()
    if relative_path not in entries:
        raise ValueError(f"Fixture non enregistrée : {relative_path}")
    file = FIXTURES.joinpath(*PurePosixPath(relative_path).parts)
    if file.is_symlink():
        raise ValueError("Lien symbolique interdit dans le corpus.")
    data = file.read_bytes()
    entry = entries[relative_path]
    if len(data) != entry["bytes"]:
        raise ValueError(f"Taille de fixture modifiée : {relative_path}")
    if hashlib.sha256(data).hexdigest() != entry["sha256"]:
        raise ValueError(f"Empreinte SHA-256 différente : {relative_path}")
    return data


def verify_complete_corpus() -> int:
    """Un nouveau fichier non inscrit dans le manifeste fait échouer la suite."""
    listed = manifest_entries()
    actual = set()
    for category, suffix in CATEGORIES.items():
        for path in (FIXTURES / category).iterdir():
            if path.is_symlink() or not path.is_file() or path.suffix != suffix:
                raise ValueError(f"Fichier inattendu dans les fixtures : {path.name}")
            actual.add(f"{category}/{path.name}")
    if actual != set(listed):
        raise ValueError(f"Écart manifeste/corpus : absents={sorted(actual - set(listed))}, "
                         f"manquants={sorted(set(listed) - actual)}")
    for path in listed:
        verified_fixture(path)
    return len(listed)
