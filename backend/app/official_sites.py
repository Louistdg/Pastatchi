"""Répertoire FR/BE : adresses de référence locales, jamais de recherche réseau.

La liste a été revue manuellement et est livrée avec l'application.
Sa présence ne constitue ni un certificat ni une vérification en temps réel.
"""
from __future__ import annotations

import json
import re
import unicodedata
from datetime import date
from difflib import get_close_matches
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

DIRECTORY_FILE = Path(__file__).with_name("official_sites_frbe.json")
LIMIT = 80


def normalize_search(value: str) -> str:
    """Recherche insensible aux accents, casse et ponctuation (sans appels externes)."""
    decomposed = unicodedata.normalize("NFKD", value.casefold())
    without_accents = "".join(c for c in decomposed if not unicodedata.combining(c))
    return " ".join(re.sub(r"[^a-z0-9]+", " ", without_accents).split())


def _trusted_https(url: object) -> bool:
    if not isinstance(url, str) or len(url) > 2048:
        return False
    try:
        parts = urlsplit(url)
        host = parts.hostname
        return (parts.scheme == "https" and bool(host) and "." in host
                and not parts.username and not parts.password
                and not parts.fragment and not parts.query and not parts.port
                and not host.endswith((".local", ".internal")))
    except ValueError:
        return False


@lru_cache(maxsize=1)
def load_directory() -> dict:
    """Lit et contrôle la liste au premier accès. Changement = nouvelle version de l'app."""
    data = json.loads(DIRECTORY_FILE.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or set(data) != {"version", "reviewed_on", "review_method", "sites"}:
        raise ValueError("Métadonnées du répertoire incorrectes.")
    if not isinstance(data["version"], str) or not re.fullmatch(r"\d+\.\d+", data["version"]):
        raise ValueError("Version du répertoire incorrecte.")
    date.fromisoformat(data["reviewed_on"])
    if not isinstance(data["review_method"], str) or not data["review_method"]:
        raise ValueError("Méthode de revue absente.")
    sites = data["sites"]
    if not isinstance(sites, list) or not (1 <= len(sites) <= 100):
        raise ValueError("Nombre d'adresses invalide.")
    ids = set()
    for site in sites:
        if not isinstance(site, dict) or set(site) != {
            "id", "country", "category", "name", "url", "keywords", "description", "source_url"
        }:
            raise ValueError("Schéma d'adresse incorrect.")
        if not isinstance(site["id"], str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", site["id"]):
            raise ValueError("Identifiant invalide.")
        if site["id"] in ids:
            raise ValueError("Doublon d'identifiant.")
        ids.add(site["id"])
        if site["country"] not in {"France", "Belgique"}:
            raise ValueError("Pays invalide.")
        if not isinstance(site["category"], str) or not (1 <= len(site["category"]) <= 32):
            raise ValueError("Catégorie invalide.")
        for k, limit in (("name", 100), ("description", 300)):
            if not isinstance(site[k], str) or not (1 <= len(site[k]) <= limit):
                raise ValueError("Contenu de répertoire invalide.")
        if not isinstance(site["keywords"], list) or not (1 <= len(site["keywords"]) <= 30):
            raise ValueError("Mots-clés invalides.")
        if any(not isinstance(kw, str) or not (1 <= len(kw) <= 40) for kw in site["keywords"]):
            raise ValueError("Mot-clé invalide.")
        if not _trusted_https(site["url"]) or not _trusted_https(site["source_url"]):
            raise ValueError("Adresse non HTTPS ou invalide.")
    return data


def search_official_sites(query: str = "", *, country: str = "") -> dict:
    """Retourne la liste locale, éventuellement filtrée. Ne fait jamais de fetch."""
    if len(query) > LIMIT:
        raise ValueError("Recherche trop longue.")
    if country not in {"", "France", "Belgique"}:
        raise ValueError("Pays invalide.")
    data = load_directory()
    subset = [site for site in data["sites"] if not country or site["country"] == country]
    needle = normalize_search(query)
    if needle:
        words = needle.split()
        matches = [
            site for site in subset
            if all(word in normalize_search(
                " ".join([site["name"], site["url"], site["category"]] + site["keywords"])
            ) for word in words)
        ]
    else:
        matches = subset

    suggested = None
    if needle and not matches and len(needle) >= 4:
        candidates = {
            normalize_search(term): site["id"]
            for site in subset for term in ([site["name"]] + site["keywords"])
            if len(normalize_search(term)) >= 4
        }
        near = get_close_matches(needle, list(candidates), n=1, cutoff=0.77)
        if near:
            suggested = {"query": near[0], "site_id": candidates[near[0]]}
    return {
        "version": data["version"],
        "reviewed_on": data["reviewed_on"],
        "review_method": data["review_method"],
        "sites": matches,
        "suggestion": suggested,
    }
