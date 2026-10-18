# Pastatchi — PastaTshield

**PastaTshield V0.2.1 (prototype local)** — « Un doute ? On vérifie. »

Application web responsive de prévention des arnaques FR/BE, exécutée sur la machine de l'utilisateur.

## Fonctions qui fonctionnent déjà

- Analyse de textes collés : e-mails, SMS, messageries et cas WhatsApp, via règles JSON versionnées.
- Analyse à la demande d'une URL publique HTTP(S), sans JavaScript : validation stricte, résolutions DNS publiques uniquement, IP de connexion épinglée, TLS standard, redirections revérifiées, limites de temps/taille.
- Inspection du HTML public : champs de formulaire, domaines tiers référencés, traceurs connus référencés, en-têtes `Set-Cookie` de la réponse.
- Option de consultation RDAP (par analyse et après consentement explicite) pour rechercher la date d'enregistrement disponible du domaine (suffixes publics corrects pour .co.uk, .com.au, etc.). La réponse RDAP est mise en cache localement 24 heures après consentement.
- Rapports sans pourcentage inventé : niveau textuel, indicateurs, recommandations, contrôles, sources, limites, vue simple/détaillée, copie texte.
- Historique SQLite local : résumé uniquement par défaut ; conservation du contenu seulement sur demande ; effacement de l'historique et du cache RDAP.
- Parcours élémentaire « J'ai déjà répondu » et conseils adaptés à la France et à la Belgique.
- Interface React, style bleu/violet sombre et planète, responsive.

## Sécurité et limites

- Le serveur FastAPI doit être lancé **uniquement sur `127.0.0.1:8000`**.
- Jeton secret de session généré en mémoire, journalisation d'événements de sécurité **sans URL ni contenu**, contrôle du `Host`, de l'`Origin`, du `Content-Type`, de la taille et du débit de requêtes. CORS permissif désactivé.
- Le téléchargement d'une URL provoque une connexion au site demandé : ce n'est pas « hors ligne ». La recherche RDAP séparée exige le consentement dans l'interface.
- Aucun script JavaScript du site n'est exécuté, aucune sous-ressource n'est chargée. Les scripts et traceurs mentionnés sont **référencés** par le HTML, pas prouvés comme exécutés.
- Une connexion TLS réussie ne prouve pas qu'un commerce est fiable ; les contrôles texte ne prouvent pas l'identité d'un expéditeur.
- **VirusTotal, Google Safe Browsing et les autres moteurs tiers ne sont pas encore connectés.** Leur vérification est indiquée « non vérifié ». Pas d'IA externe.
- Pas d'OCR ni d'analyse de fichiers, appels automatiques ou surveillance permanente en V0.2.1.
- Le module d'analyse URL est une fonctionnalité **expérimentale**, sans audit de sécurité indépendant ; aucune promesse de protection totale.
- Les URL sensibles peuvent contenir des paramètres : ne les saisissez pas si vous ne souhaitez pas transmettre l'URL au site distant.

## Installation Windows (dossier D:\\Pastachi)

Prérequis : Python 3.14+, Node.js 22+ et npm. Le lanceur Windows suppose un environnement virtuel créé dans `backend/.venv` via `python -m venv`.

```powershell
cd D:\Pastachi
py -3.14 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
cd frontend
npm install
npm run build
cd ..
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Ouvrez ensuite **http://127.0.0.1:8000/** sur le même ordinateur. Arrêt : `Ctrl+C` dans le terminal du serveur.

## Tests

Depuis la racine du dépôt (environnement de développement) :

```powershell
 .\\backend\\.venv\\Scripts\\python.exe -m pip install -r backend\\requirements-dev.txt
 .\\backend\\.venv\\Scripts\\python.exe -m unittest discover -s backend/tests -v
```

## Répertoire

- `frontend/` — interface React/Vite
- `backend/app/` — API, règles de messages, inspection URL, historique
- `backend/app/rules_frbe.json` — règles d'analyse versionnées
- `backend/tests/` — tests de non-régression
- `data/` — historique SQLite, cache RDAP et journal local sans données personnelles, ignorés par Git
- `version.json` — version produit unique (backend et frontend)

Voir `PastaTshield_Architecture_V0.2.1.md` pour les décisions, limites et évolutions.

## Lancement rapide

Double-cliquez sur `LANCER-PASTATSHIELD.cmd` après installation. Le lanceur vérifie les dépendances et la disponibilité du serveur avant d'ouvrir le navigateur ; le serveur doit rester sur `127.0.0.1:8000`.

**Licence :** aucune licence de redistribution n'a encore été choisie. Ne pas diffuser comme produit de sécurité achevé.
