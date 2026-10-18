"""Inspection passive d'URL : connexions IP épinglées, aucune exécution JavaScript."""
from __future__ import annotations

import http.client
import ipaddress
import json
import re
import socket
import ssl
import datetime
import tldextract
from pathlib import Path
from .storage import RdapCache
from .security_log import security_event
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit, urlunsplit

MAX_BYTES = 1_000_000  # Plafond strict de téléchargement : 1 Mo + 1 octet sentinelle.
MAX_REDIRECTS = 3
TIMEOUT = 5
USER_AGENT = "PastaTshield/0.4 (+local-requested-passive-inspection)"
BLOCKED_SUFFIXES = (".local", ".localhost", ".internal", ".home", ".lan", ".test", ".invalid", ".onion")
PUBLIC_SUFFIX = tldextract.TLDExtract(suffix_list_urls=(), cache_dir=False)
RDAP_CACHE = RdapCache(Path(__file__).resolve().parents[2] / "data" / "rdap-cache.sqlite3")
TRACKERS = ("google-analytics.com", "googletagmanager.com", "doubleclick.net",
            "facebook.net", "connect.facebook.net", "hotjar.com", "clarity.ms", "tiktok.com")


def normalize_target(value: str) -> str:
    if not isinstance(value, str) or not value or len(value) > 2048:
        raise ValueError("L'URL doit contenir entre 1 et 2 048 caractères.")
    if value != value.strip() or any(ord(c) < 33 or ord(c) == 127 for c in value):
        raise ValueError("L'URL contient des caractères interdits.")
    try:
        parsed = urlsplit(value)
        if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname or parsed.username is not None or parsed.password is not None:
            raise ValueError("Utilisez une URL HTTP(S) sans identifiants.")
        if parsed.fragment:
            raise ValueError("Les fragments d'URL ne sont pas acceptés.")
        host = parsed.hostname.encode("idna").decode("ascii").lower().rstrip(".")
        if not host or len(host) > 253 or host == "localhost" or host.endswith(BLOCKED_SUFFIXES):
            raise ValueError("Ce nom d'hôte n'est pas autorisé.")
        try:
            ip = ipaddress.ip_address(host.strip("[]"))
        except ValueError:
            ip = None
        if ip and not ip.is_global:
            raise ValueError("Les adresses privées ou réservées sont interdites.")
        if not ip:
            if "." not in host or not re.fullmatch(r"[a-z0-9-]+(?:\.[a-z0-9-]+)+", host):
                raise ValueError("Nom d'hôte invalide.")
            if any(not part or part.startswith("-") or part.endswith("-") for part in host.split(".")):
                raise ValueError("Nom d'hôte invalide.")
        port = parsed.port
        if port and port != (443 if parsed.scheme == "https" else 80):
            raise ValueError("Seuls les ports Web standards sont autorisés.")
        netloc = f"[{host}]" if ":" in host else host
        return urlunsplit((parsed.scheme.lower(), netloc, parsed.path or "/", parsed.query, ""))
    except (UnicodeError, ValueError) as exc:
        raise ValueError(str(exc) or "URL invalide.") from exc


def ensure_public_host(host: str, port: int) -> str:
    """Reject if ANY DNS result is not globally routable, pin one vetted IP for connect."""
    try:
        answers = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (OSError, UnicodeError) as exc:
        raise ValueError("Résolution DNS impossible : " + str(exc)) from exc
    addresses = list(dict.fromkeys(item[4][0] for item in answers))
    if not addresses:
        raise ValueError("Aucune adresse IP DNS reçue.")
    for address in addresses:
        try:
            if not ipaddress.ip_address(address).is_global:
                raise ValueError("Adresse interne/réservée refusée par la protection anti-SSRF.")
        except ValueError as exc:
            security_event("SSRF_REJECTED")
            raise ValueError("Adresse interne/réservée ou invalide refusée par la protection anti-SSRF.") from exc
    return addresses[0]


class _PinnedHTTPS(http.client.HTTPSConnection):
    def __init__(self, hostname: str, ip: str, timeout: float = TIMEOUT):
        super().__init__(hostname, port=443, timeout=timeout, context=ssl.create_default_context())
        self._pinned_ip = ip

    def connect(self):
        raw = socket.create_connection((self._pinned_ip, self.port), self.timeout)
        try:
            self.sock = self._context.wrap_socket(raw, server_hostname=self.host)
        except Exception:
            raw.close()
            raise


def _fetch_once(url: str, *, allow_partial: bool = False) -> dict:
    normalized = normalize_target(url)
    parts = urlsplit(normalized)
    host = parts.hostname
    port = 443 if parts.scheme == "https" else 80
    ip = ensure_public_host(host, port)
    conn = _PinnedHTTPS(host, ip) if parts.scheme == "https" else http.client.HTTPConnection(ip, port, timeout=TIMEOUT)
    host_header = host if ":" not in host else f"[{host}]"
    path = (parts.path or "/") + (("?" + parts.query) if parts.query else "")
    try:
        conn.request("GET", path, headers={"Host": host_header, "User-Agent": USER_AGENT,
                    "Accept": "text/html,application/xhtml+xml,application/json;q=0.8,*/*;q=0.2",
                    "Accept-Encoding": "identity", "Connection": "close"})
        response = conn.getresponse()
        content_type = response.getheader("Content-Type", "")
        location = response.getheader("Location")
        mime = content_type.partition(";")[0].strip().lower()
        is_html = mime in {"text/html", "application/xhtml+xml"}
        redirect = response.status in {301, 302, 303, 307, 308} and bool(location)
        length = response.getheader("Content-Length")
        announced_oversize = bool(length and length.isdigit() and int(length) > MAX_BYTES)

        # Les redirections sont contrôlées sur leur en-tête Location. Inutile
        # de télécharger un corps éventuellement immense avant le saut suivant.
        if redirect:
            data = b""
            truncated = False
        else:
            # Un HTML long est inspecté sur son début, sans transfert illimité.
            # Les autres formats (notamment les JSON RDAP) doivent rester complets.
            if announced_oversize and not (allow_partial and is_html):
                raise ValueError(f"Réponse trop volumineuse : limite de {MAX_BYTES:,} octets.")
            data = response.read(MAX_BYTES + 1)
            truncated = announced_oversize or len(data) > MAX_BYTES
            if truncated and not (allow_partial and is_html):
                raise ValueError(f"Réponse trop volumineuse : limite de {MAX_BYTES:,} octets.")
            data = data[:MAX_BYTES]

        return {
            "url": normalized, "status": response.status, "ip": ip,
            "headers": response.getheaders(), "content_type": content_type,
            "body": data, "location": location, "truncated": truncated
        }
    finally:
        conn.close()


def fetch_site(target: str, max_redirects: int = MAX_REDIRECTS, require_https: bool = False,
               allow_partial: bool = False) -> tuple[dict, list[dict]]:
    """Pour l'analyse HTML seulement, autoriser un préfixe borné et signalé.

    RDAP et les autres réponses structurées restent strictement complètes.
    """
    current = normalize_target(target)
    if require_https and not current.startswith("https://"):
        raise ValueError("RDAP impose une connexion HTTPS.")
    chain = []
    for redirect in range(max_redirects + 1):
        fetched = _fetch_once(current, allow_partial=True) if allow_partial else _fetch_once(current)
        chain.append({"url": current, "status": fetched["status"]})
        if fetched["status"] in {301, 302, 303, 307, 308} and fetched["location"]:
            if redirect == max_redirects:
                raise ValueError("Trop de redirections ; limite de trois.")
            current = normalize_target(urljoin(current, fetched["location"]))
            if require_https and not current.startswith("https://"):
                raise ValueError("Redirection RDAP vers HTTP refusée.")
            continue
        return fetched, chain
    raise ValueError("La chaîne de redirection a dépassé la limite.")


class _PageInspector(HTMLParser):
    def __init__(self, page_url: str):
        super().__init__(convert_charrefs=True)
        self.url = page_url
        self.base = page_url
        self.seen_base = False
        self.inputs: set[str] = set()
        self.external_scripts: set[str] = set()
        self.form_actions: list[str] = []
        self.form_count = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]):
        attrs_dict = dict(attrs)
        if tag == "base" and attrs_dict.get("href") and not self.seen_base:
            self.base = urljoin(self.url, attrs_dict["href"])
            self.seen_base = True
            return
        if tag == "form":
            self.form_count += 1
            self.form_actions.append(attrs_dict.get("action") or self.url)
        if tag == "input":
            typ = (attrs_dict.get("type") or "text").lower()
            name = ((attrs_dict.get("name") or "") + " " + (attrs_dict.get("autocomplete") or "")).lower()
            if typ == "password" or "password" in name:
                self.inputs.add("Mot de passe")
            if typ == "email" or "email" in name:
                self.inputs.add("Adresse e-mail")
            if typ == "tel" or "phone" in name or "mobile" in name:
                self.inputs.add("Numéro de téléphone")
            if "card" in name or "cc-number" in name:
                self.inputs.add("Carte bancaire")
            if "iban" in name:
                self.inputs.add("IBAN")
            if "address" in name:
                self.inputs.add("Adresse postale")
        if tag in {"script", "img", "iframe"} and attrs_dict.get("src"):
            full = urljoin(self.base, attrs_dict["src"])
            domain = urlsplit(full).hostname
            if domain and domain != urlsplit(self.url).hostname:
                self.external_scripts.add(domain)


def inspect_html(html: str, page_url: str) -> dict:
    inspector = _PageInspector(page_url)
    inspector.feed(html)
    domain = urlsplit(page_url).hostname
    # These are indicators of potential collection, not proof of transmission.
    return {
        "form_count": inspector.form_count,
        "data_requested": sorted(inspector.inputs),
        "third_party_domains": sorted(inspector.external_scripts),
        "known_trackers": sorted(d for d in inspector.external_scripts if any(d == t or d.endswith("." + t) for t in TRACKERS)),
        "insecure_forms": sum(1 for action in inspector.form_actions if urlsplit(urljoin(inspector.base, action)).scheme == "http"),
        "domain": domain,
    }


def registrable_domain(host: str) -> str:
    extracted = PUBLIC_SUFFIX(host)
    if not extracted.domain or not extracted.suffix:
        raise ValueError("Suffixe public introuvable : domaine non vérifiable via RDAP.")
    return extracted.domain + "." + extracted.suffix


def _rdap_domain(host: str) -> dict:
    """Consultation RDAP par HTTPS après consentement explicite."""
    candidate = registrable_domain(host)
    result, _ = fetch_site("https://rdap.org/domain/" + candidate, max_redirects=2, require_https=True)
    if result["status"] != 200:
        raise ValueError(f"Serveur RDAP : HTTP {result['status']}")
    payload = json.loads(result["body"])
    for event in payload.get("events", []):
        if event.get("eventAction") == "registration":
            date = event.get("eventDate", "")[:10]
            created = datetime.date.fromisoformat(date)
            age = (datetime.datetime.now(datetime.timezone.utc).date() - created).days
            return {"age_days": age, "registered": date}
    raise ValueError("Date d'enregistrement non publiée.")


def _rdap_domain_cached(host: str) -> tuple[dict, bool]:
    """La conservation du domaine dans le cache reste locale, limitée à 24h."""
    candidate = registrable_domain(host)
    cached_date = RDAP_CACHE.get(candidate)
    if cached_date:
        age = (datetime.datetime.now(datetime.timezone.utc).date() - datetime.date.fromisoformat(cached_date)).days
        return {"age_days": age, "registered": cached_date}, True
    result = _rdap_domain(host)
    RDAP_CACHE.put(candidate, result["registered"])
    return result, False


def analyze_url(url: str, mode: str = "renforce", external_consent: bool = False) -> dict:
    if mode not in {"standard", "renforce", "maximum"}:
        raise ValueError("Mode de protection invalide.")
    normalized = normalize_target(url)
    original = urlsplit(normalized)
    findings: list[dict] = []
    checks = []
    limitations = [
        "Le code serveur, les comportements après connexion et le JavaScript exécuté dans le navigateur ne sont pas inspectés.",
        "La présence de formulaires/traceurs ne prouve pas une fuite de données.",
        "L'absence d'alerte ne garantit pas la sécurité."
    ]
    def add(title, severity, evidence, reason):
        findings.append({"title": title, "severity": severity, "evidence": evidence, "reason": reason})

    if original.scheme != "https":
        add("Connexion non chiffrée", "Élevé", "HTTP", "Les données échangées sur HTTP peuvent être interceptées.")
    checks.append({"name": "Format et destination de l'URL", "status": "effectué",
                   "detail": "Schéma et destination publique vérifiés avant connexion."})
    fetched = None
    chain = []
    fetch_error = None
    try:
        fetched, chain = fetch_site(normalized, allow_partial=True)
        checks.append({"name": "Connexion au site", "status": "effectué",
                       "detail": f"HTTP {fetched['status']} via une IP publique contrôlée."})
        if fetched["status"] >= 400:
            limitations.append(f"Le serveur a répondu HTTP {fetched['status']} ; l'analyse du contenu peut être incomplète.")
        if fetched.get("truncated"):
            limitations.append(
                f"La page dépasse {MAX_BYTES:,} octets : seul son début a été examiné. "
                "Des formulaires ou éléments suspects peuvent se trouver plus loin."
            )
    except Exception as exc:
        security_event("URL_FETCH_FAILED")
        fetch_error = str(exc)
        checks.append({"name": "Connexion au site", "status": "non vérifié", "detail": fetch_error[:230]})
        limitations.append("La page n'a pas pu être récupérée ou la connexion n'a pas pu être vérifiée.")

    if fetched and urlsplit(fetched["url"]).scheme != "https" and original.scheme == "https":
        add("Redirection non chiffrée", "Élevé", "HTTPS → HTTP",
            "Le site passe d'une connexion HTTPS vers HTTP après redirection.")
    if len(chain) >= 2:
        domains = {urlsplit(item["url"]).hostname for item in chain}
        if len(domains) > 1 or len(chain) >= 3:
            add("Redirections à examiner", "Modéré", f"{len(chain)-1} redirection(s)",
                "La navigation change de domaine ou passe par plusieurs étapes.")
    checks.append({"name": "Redirections", "status": "effectué" if fetched else "non vérifié",
                   "detail": f"{max(0,len(chain)-1)} saut(s) vérifié(s), destination contrôlée." if fetched else "Contrôle interrompu."})

    partial = bool(fetched and fetched.get("truncated"))
    privacy = {"data_requested": [], "form_count": 0, "third_party_domains": [], "known_trackers": [], "observed_cookies": 0,
               "observed_transmissions": [], "partial_inspection": partial,
               "inspected_bytes": len(fetched["body"]) if fetched else 0,
               "not_observed": "Trafic JavaScript, serveur, cookies persistants et parcours authentifiés."}
    if fetched and "html" in fetched["content_type"].lower():
        html = fetched["body"].decode("utf-8", errors="replace")
        details = inspect_html(html, fetched["url"])
        privacy.update({k: details[k] for k in ["data_requested", "form_count", "third_party_domains", "known_trackers"]})
        privacy["observed_cookies"] = sum(1 for name, _ in fetched["headers"] if name.lower() == "set-cookie")
        if details["insecure_forms"]:
            add("Formulaire non chiffré", "Élevé", "Action HTTP", "Un formulaire peut soumettre des données sans chiffrement.")
        if details["known_trackers"] and mode != "standard":
            add("Traceurs identifiés", "Modéré", ", ".join(details["known_trackers"][:3]),
                "Des domaines de suivi connus figurent parmi les ressources référencées. Leur exécution n'a pas été mesurée.")
        checks.append({
            "name": "HTML et formulaires", "status": "partiel" if partial else "effectué",
            "detail": (
                f"Début de page uniquement ({len(fetched['body']):,} octets) : "
                f"{details['form_count']} formulaire(s) et {len(details['third_party_domains'])} domaines tiers repérés. "
                "D'autres éléments peuvent ne pas avoir été vus."
                if partial else
                f"{details['form_count']} formulaire(s) ; {len(details['third_party_domains'])} domaines tiers référencés."
            )
        })
    else:
        checks.append({"name": "HTML et formulaires", "status": "non vérifié",
                       "detail": "Page HTML indisponible."})

    sources = [{"name": "Inspection passive locale",
                "status": "partiel" if partial else ("effectué" if fetched else "non vérifié"),
                "detail": "Inspection limitée au début du document, sans exécuter JavaScript ni sous-ressources."
                          if partial else
                          "Requête contrôlée, sans exécuter le JavaScript ni charger des sous-ressources."}]
    if external_consent:
        try:
            data, cached = _rdap_domain_cached(original.hostname)
            checks.append({"name": "Ancienneté du domaine (RDAP)", "status": "effectué",
                           "detail": f"Enregistrement : {data['registered']} ; âge : {data['age_days']} jours."})
            sources.append({"name": "RDAP", "status": "effectué",
                            "detail": "Résultat enregistré dans le cache local (moins de 24h)." if cached
                                      else "Données publiques du registre, après consentement."})
            if 0 <= data["age_days"] < 30:
                add("Domaine très récent", "Élevé", str(data["age_days"]) + " jours", "Domaine enregistré il y a moins de 30 jours.")
            elif 0 <= data["age_days"] < 90:
                add("Domaine récent", "Modéré", str(data["age_days"]) + " jours", "Domaine enregistré il y a moins de 90 jours.")
        except Exception as exc:
            security_event("RDAP_FAILED")
            checks.append({"name": "Ancienneté du domaine (RDAP)", "status": "non vérifié", "detail": str(exc)[:180]})
            sources.append({"name": "RDAP", "status": "non vérifié", "detail": "Aucune donnée exploitable."})
    else:
        checks.append({"name": "Ancienneté du domaine (RDAP)", "status": "non vérifié", "detail": "Consentement externe non accordé."})
    sources.append({"name": "Google Safe Browsing / VirusTotal", "status": "non vérifié",
                    "detail": "Connecteurs de réputation non configurés dans cette version ; aucune consultation prétendue."})

    # Insufficient verification must never lead to green / Faible.
    if not fetched or fetched["status"] >= 400 or "html" not in fetched["content_type"].lower():
        risk = "Indéterminé"
    elif partial and not any(f["severity"] in {"Critique", "Élevé"} for f in findings):
        # Une inspection partielle ne peut jamais produire « Faible ».
        # Un indice élevé effectivement observé peut rester signalé.
        risk = "Indéterminé"
    elif any(f["severity"] == "Critique" for f in findings):
        risk = "Critique"
    elif sum(f["severity"] == "Élevé" for f in findings) >= 2:
        risk = "Critique"
    elif any(f["severity"] == "Élevé" for f in findings):
        risk = "Élevé"
    elif findings:
        risk = "Modéré"
    elif mode == "maximum" and not external_consent:
        risk = "Indéterminé"
    else:
        risk = "Faible"
    labels = {
        "Indéterminé": "Les vérifications disponibles sont insuffisantes pour conclure.",
        "Critique": "Des risques majeurs ont été identifiés sur cette URL.",
        "Élevé": "Des signaux techniques importants nécessitent de la prudence.",
        "Modéré": "Certains éléments du site demandent une vérification supplémentaire.",
        "Faible": "Aucun indicateur inquiétant n'a été relevé dans les contrôles effectivement réalisés.",
    }
    recommendations = (
        ["N'entrez aucune information sensible avant une confirmation indépendante.", "Vérifiez le nom du domaine depuis le site officiel connu."]
        if risk in {"Critique", "Élevé", "Indéterminé"}
        else ["Vérifiez l'identité du commerçant et les conditions de vente.", "Ne réutilisez pas de mot de passe, même sur un site apparemment fiable."]
    )
    return {
        "kind": "url", "risk": risk, "summary": labels[risk], "findings": findings, "checks": checks,
        "sources": sources, "limitations": limitations,
        "recommendations": recommendations, "collection": privacy, "links": [],
        "site_host": original.hostname, "redirects": chain,
    }
