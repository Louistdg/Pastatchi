"""Moteur de règles déterministes pour messages suspects (FR/BE)."""
from __future__ import annotations

import re
import json
from pathlib import Path
from urllib.parse import urlsplit

RULES = json.loads((Path(__file__).with_name('rules_frbe.json')).read_text(encoding='utf-8'))

URL_RE = re.compile(r"https?://[^\s<>\"'\u00ab\u00bb]+", re.I)
EMAIL_RE = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?:\+\d{1,3}[\s.-]?)?(?:\d[\s.-]?){9,13}")
BRANDS = {
    "la poste": ("laposte.fr",), "colissimo": ("laposte.fr", "colissimo.fr"),
    "ameli": ("ameli.fr",), "cpam": ("ameli.fr",),
    "impôts": ("impots.gouv.fr",), "impots": ("impots.gouv.fr",),
    "dgfip": ("impots.gouv.fr",), "caf": ("caf.fr",),
    "itsme": ("itsme-id.com",), "bpost": ("bpost.be",),
    "ebox": ("ebox.be", "myebox.be"), "myminfin": ("minfin.fgov.be",),
    "france travail": ("francetravail.fr",), "spf finances": ("finances.belgium.be",),
    "proximus": ("proximus.be",), "microsoft": ("microsoft.com",),
}
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "cutt.ly", "is.gd", "ow.ly"}


def _hit(pattern: str, text: str):
    return re.search(pattern, text, re.I | re.S)


def _evidence(text: str, match: re.Match | None) -> str:
    if not match:
        return ""
    # Only matched expression, not surrounding personal message content.
    return match.group(0)[:140]


def _risk(findings: list[dict], sufficient: bool) -> str:
    if not sufficient:
        return "Indéterminé"
    counts = {"Critique": 0, "Élevé": 0, "Modéré": 0}
    for finding in findings:
        if finding["severity"] in counts:
            counts[finding["severity"]] += 1
    if counts["Critique"]:
        return "Critique"
    if counts["Élevé"]:
        return "Élevé"
    if counts["Modéré"]:
        return "Modéré"
    return "Faible"


def analyze_text(content: str, mode: str = "renforce") -> dict:
    text = content.strip()
    if not text or len(text) > 20000:
        raise ValueError("Le message doit contenir entre 1 et 20 000 caractères.")
    if mode not in {"standard", "renforce", "maximum"}:
        raise ValueError("Mode de protection invalide.")

    findings: list[dict] = []
    urls = [m.group(0).rstrip(".,;!?)]}") for m in URL_RE.finditer(text)]
    urls = list(dict.fromkeys(urls))
    emails = list(dict.fromkeys(EMAIL_RE.findall(text)))

    # Règles déclaratives versionnées, conservées en JSON pour audit et tests.
    for rule in RULES["rules"]:
        # Standard : contrôles prioritaires seulement ; Renforcé/Maximum : toutes les règles.
        if mode == "standard" and rule["id"] in {"psychology.urgency", "psychology.threat", "psychology.reward"}:
            continue
        match = _hit(rule["pattern"], text)
        if match:
            findings.append({
                "id": rule["id"], "version": rule["version"],
                "title": rule["title"], "severity": rule["severity"],
                "evidence": _evidence(text, match), "reason": rule["reason"]
            })

    brand_found = []
    lower = text.casefold()
    for brand, official in BRANDS.items():
        if brand in lower:
            brand_found.append((brand, official))
    for url_match in URL_RE.finditer(text):
        url = url_match.group(0).rstrip(".,;!?)]}")
        try:
            host = (urlsplit(url).hostname or "").lower().rstrip(".")
        except ValueError:
            continue
        if host in SHORTENERS:
            findings.append({"id": "url.shortener", "version": 1,
                             "title": "Lien raccourci", "severity": "Modéré",
                             "evidence": host, "reason": "Un lien raccourci masque sa destination finale ; elle n'a pas été vérifiée ici."})
        if host in {"wa.me", "chat.whatsapp.com", "api.whatsapp.com"}:
            window = text[max(0, url_match.start() - 175):min(len(text), url_match.end() + 175)]
            context = _hit(r"(?:investissement|rendement(?: garanti)?|gain garanti|vous avez gagné|paiement|transf[ée]rez|envoyez.{0,40}code|colis bloqu[ée]|remboursement)", window)
            if context:
                findings.append({"id": "messaging.whatsapp_sensitive", "version": 1,
                                 "title": "Invitation WhatsApp à vérifier", "severity": "Élevé",
                                 "evidence": host, "reason": "Ce lien WhatsApp est accompagné d'une sollicitation sensible ou inhabituelle."})
        for brand, official_domains in brand_found:
            slug = re.sub(r"[^a-z0-9]", "", brand.casefold().replace("ô", "o"))
            compact_host = re.sub(r"[^a-z0-9]", "", host.casefold())
            if (host and (slug in compact_host)
                    and not any(host == d or host.endswith("." + d) for d in official_domains)):
                # Seule une imitation visible dans le hostname déclenche l'alerte.
                findings.append({"id": "brand.domain_mismatch", "version": 1,
                                 "title": "Domaine différent de l'organisme cité", "severity": "Élevé",
                                 "evidence": brand + " ≠ " + host,
                                 "reason": "Le nom de domaine ne correspond pas aux domaines officiels connus pour cet organisme."})
                break

    if len(urls) > 2 and len({urlsplit(u).hostname for u in urls}) > 2:
        findings.append({"id": "url.multiple_domains", "version": 1,
                         "title": "Multiples destinations", "severity": "Modéré",
                         "evidence": str(len(urls)) + " liens", "reason": "Plusieurs domaines différents sont présents dans le message."})

    # Un lien non vérifié ne doit pas devenir un faux indicateur de fraude.
    risk = _risk(findings, len(text) >= 20)
    labels = {
        "Critique": "Ce message présente des signaux d'arnaque particulièrement préoccupants.",
        "Élevé": "Plusieurs éléments de ce message nécessitent une grande prudence.",
        "Modéré": "Certains éléments méritent d'être vérifiés avant d'agir.",
        "Faible": "Aucun indicateur préoccupant n'a été détecté par les règles appliquées.",
        "Indéterminé": "Le contenu fourni ne permet pas une évaluation fiable.",
    }
    advice = {
        "Critique": ["Ne communiquez aucun code ni identifiant.", "Contactez l'organisme par son application ou son site officiel.", "Si vous avez déjà agi, sécurisez immédiatement vos comptes."],
        "Élevé": ["Ne cliquez pas sur les liens sans vérification.", "Confirmez la demande par un canal officiel indépendant.", "Ne communiquez pas de données personnelles."],
        "Modéré": ["Vérifiez directement l'identité de l'expéditeur.", "Analysez séparément tout lien reçu avant ouverture."],
        "Faible": ["Restez prudent : les contrôles automatiques ne prouvent pas qu'un message est sûr."],
        "Indéterminé": ["Fournissez davantage de contexte sans partager de secrets confidentiels."],
    }
    return {
        "kind": "texte", "risk": risk, "summary": labels[risk],
        "findings": findings,
        "checks": [
            {"name": "Motifs d'arnaque FR / BE", "status": "effectué", "detail": "Règles déclaratives v" + RULES["version"] + " (FR/BE)."},
            {"name": "Liens et domaines extraits", "status": "effectué", "detail": f"{len(urls)} lien(s) identifié(s), {len(emails)} adresse(s) e-mail."},
            {"name": "Réputation des liens", "status": "non vérifié", "detail": "Les URLs extraites ne sont pas interrogées automatiquement."},
            *([{"name": "Prudence renforcée sur les URL", "status": "non vérifié", "detail": "Mode Maximum : analysez séparément les liens avant ouverture."}]
              if mode == "maximum" and urls else []),
        ],
        "sources": [{"name": "Règles locales PastaTshield", "status": "effectué", "detail": "Analyse sans envoi à un service externe."}],
        "limitations": ["Les en-têtes techniques d'e-mail ne sont pas authentifiés par le texte collé.",
                        "La réputation des liens, l'identité de l'expéditeur et les données réseau ne sont pas vérifiées ici.",
                        "L'absence d'alerte ne garantit pas la sécurité."],
        "recommendations": advice[risk] + (["Vérifiez séparément les URL du message avant de les ouvrir."] if mode == "maximum" and urls else []), "links": urls, "collection": None,
    }
