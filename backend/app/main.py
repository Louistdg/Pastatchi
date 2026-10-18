"""PastaTshield V1 — serveur local authentifié et protégé par origine."""
from __future__ import annotations

import asyncio
import json
import secrets
import time
from collections import defaultdict, deque
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, Query
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .analyzer import analyze_text
from .urlscan import analyze_url, normalize_target, RDAP_CACHE
from .security_log import security_event
from .storage import HistoryStore
from .vault import VaultStore
from .official_sites import search_official_sites

ROOT = Path(__file__).resolve().parents[2]
VERSION = json.loads((ROOT / "version.json").read_text(encoding="utf-8"))["version"]
store = HistoryStore(ROOT / "data" / "history.sqlite3")
vault_store = VaultStore(ROOT / "data" / "vault.sqlite3")
TOKEN = secrets.token_urlsafe(32)
CSP_NONCE = secrets.token_urlsafe(16)
ACCESS_TIMES = defaultdict(deque)
RATE_WINDOW = 60
RATE_LIMIT = 50
MAX_BODY = 100_000
TRUSTED_HOSTS = {"localhost:8000", "127.0.0.1:8000"}
TRUSTED_ORIGINS = {"http://127.0.0.1:8000", "http://localhost:8000"}
app = FastAPI(title="PastaTshield", version=VERSION, docs_url=None, redoc_url=None, openapi_url=None)

@app.middleware("http")
async def protect(request: Request, call_next):
    if request.headers.get("host", "").lower() not in TRUSTED_HOSTS:
        security_event("HOST_REJECTED")
        return JSONResponse({"detail": "Hôte non autorisé."}, status_code=403)
    origin = request.headers.get("origin")
    if origin and origin not in TRUSTED_ORIGINS:
        security_event("ORIGIN_REJECTED")
        return JSONResponse({"detail": "Origine non autorisée."}, status_code=403)
    if request.url.path.startswith("/api/"):
        if not secrets.compare_digest(request.headers.get("x-pastatshield-token", ""), TOKEN):
            security_event("TOKEN_REJECTED")
            return JSONResponse({"detail": "Accès refusé : jeton de session manquant."}, status_code=403)
        now = time.monotonic()
        key = request.client.host if request.client else "local"
        recent = ACCESS_TIMES[key]
        # Éviction paresseuse si une future configuration autorise plusieurs IP.
        if len(ACCESS_TIMES) > 32:
            for previous in list(ACCESS_TIMES):
                if previous != key and (not ACCESS_TIMES[previous] or now - ACCESS_TIMES[previous][-1] > RATE_WINDOW):
                    del ACCESS_TIMES[previous]
        while recent and now - recent[0] > RATE_WINDOW:
            recent.popleft()
        if len(recent) >= RATE_LIMIT:
            security_event("RATE_LIMITED")
            return JSONResponse({"detail": "Trop de requêtes. Patientez une minute."}, status_code=429, headers={"Retry-After": "60"})
        recent.append(now)
    if request.method in {"POST", "PUT", "PATCH"}:
        if not request.headers.get("content-type", "").lower().startswith("application/json"):
            return JSONResponse({"detail": "Content-Type application/json requis."}, status_code=415)
        declared = request.headers.get("content-length")
        if declared is None or not declared.isdigit() or int(declared) > MAX_BODY:
            return JSONResponse({"detail": "Taille de requête invalide ou supérieure à la limite."}, status_code=413)
        # La lecture est bornée, y compris si un client ignore Content-Length.
        parts = []
        consumed = 0
        async for chunk in request.stream():
            consumed += len(chunk)
            if consumed > MAX_BODY:
                return JSONResponse({"detail": "Requête trop volumineuse."}, status_code=413)
            parts.append(chunk)
        request._body = b"".join(parts)
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Content-Security-Policy"] = (f"default-src 'self'; script-src 'self' 'nonce-{CSP_NONCE}'; "
       "style-src 'self'; "
       "font-src 'self'; img-src 'self' data:; "
       "connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")
    return response

class TextRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)
    mode: str = "renforce"
    keep_content: bool = False

class UrlRequest(BaseModel):
    url: str = Field(min_length=1, max_length=2048)
    mode: str = "renforce"
    keep_content: bool = False
    external_consent: bool = False

class VaultPayload(BaseModel):
    envelope: dict
    revision: int | None = None


@app.get("/api/v1/vault")
def vault_read():
    return vault_store.read()


@app.put("/api/v1/vault")
def vault_write(payload: VaultPayload):
    try:
        return vault_store.write(payload.envelope, payload.revision)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.delete("/api/v1/vault")
def vault_delete():
    vault_store.clear()
    return {"deleted": True}


@app.get("/api/v1/official-sites")
def official_sites(q: str = Query(default="", max_length=80),
                   country: str = Query(default="", max_length=16)):
    """Recherche en fichier local sans sortie réseau ; l'UI charge une seule fois."""
    try:
        return search_official_sites(q, country=country)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "app": "PastaTshield", "version": VERSION}

@app.post("/api/v1/analyze/text")
async def text_analysis(payload: TextRequest):
    try:
        report = await asyncio.to_thread(analyze_text, payload.text, payload.mode)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    item = store.add("texte", report, payload.text, keep_content=payload.keep_content)
    return {"report": report, "record": item}

@app.post("/api/v1/analyze/url")
async def url_analysis(payload: UrlRequest):
    try:
        normalize_target(payload.url)
        if payload.external_consent:
            security_event("RDAP_CONSENTED")
        report = await asyncio.to_thread(analyze_url, payload.url, payload.mode, payload.external_consent)
    except ValueError as exc:
        security_event("URL_REJECTED")
        raise HTTPException(status_code=422, detail=str(exc))
    item = store.add("url", report, payload.url, keep_content=payload.keep_content)
    return {"report": report, "record": item}

@app.get("/api/v1/history")
def history():
    return {"items": store.list()}

@app.get("/api/v1/history/{record_id}")
def history_detail(record_id: str):
    record = store.get(record_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Analyse introuvable.")
    return record

@app.delete("/api/v1/history")
def history_clear():
    store.clear()
    RDAP_CACHE.clear()
    security_event("HISTORY_CLEARED")
    return {"deleted": True}

DIST = ROOT / "frontend" / "dist"
if (DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

@app.get("/favicon.svg", response_class=FileResponse)
def favicon():
    """Icône officielle chargée localement (pas d'appel tiers)."""
    path = DIST / "favicon.svg"
    if not path.exists():
        raise HTTPException(status_code=404, detail="Favicon non compilé.")
    return FileResponse(path, media_type="image/svg+xml")


@app.get("/", response_class=HTMLResponse)
def homepage():
    index = DIST / "index.html"
    if not index.exists():
        raise HTTPException(status_code=503, detail="Frontend non compilé.")
    html = index.read_text(encoding="utf-8")
    bootstrap = '<script nonce="' + CSP_NONCE + '">window.__PASTATSHIELD_TOKEN__="' + TOKEN + '";</script>'
    html = html.replace("</head>", bootstrap + "</head>", 1)
    return HTMLResponse(html)
