# Pastatchi — PastaTshield

**PastaTshield V0.4 (prototype local)** — « Un doute ? On vérifie. »

**Pour une revue indépendante V0.4 :** commencez par [README-AUDIT-V0.4.md](README-AUDIT-V0.4.md), le [modèle de menaces](THREAT_MODEL.md) et les [fixtures HTML de non-régression](backend/tests/fixtures/README.md). L'ancien [dossier d'audit V0.3](README-AUDIT.md) reste disponible. Aucun de ces documents ne constitue une certification.

Application web responsive de prévention des arnaques FR/BE, exécutée sur la machine de l'utilisateur.

## Fonctions qui fonctionnent déjà

- Analyse de textes collés : e-mails, SMS, messageries et cas WhatsApp, via règles JSON versionnées.
- Analyse à la demande d'une URL publique HTTP(S), sans JavaScript : validation stricte, résolutions DNS publiques uniquement, IP de connexion épinglée, TLS standard, redirections revérifiées, limites de temps/taille.
- Inspection du HTML public : champs de formulaire, domaines tiers référencés, traceurs connus référencés, en-têtes `Set-Cookie` de la réponse. **Pages volumineuses :** maximum 1 Mo lu ; l'analyse continue sur le début de la page avec un état « partiel ». Sans indice fort, le verdict reste « Indéterminé », jamais « Faible » par défaut. Le mode Standard inspecte aussi les formulaires de base.
- Option de consultation RDAP (par analyse et après consentement explicite) pour rechercher la date d'enregistrement disponible du domaine (suffixes publics corrects pour .co.uk, .com.au, etc.). La réponse RDAP est mise en cache localement 24 heures après consentement.
- Rapports sans pourcentage inventé : niveau textuel, indicateurs, recommandations, contrôles, sources, limites, vue simple/détaillée, copie texte.
- Historique SQLite local : résumé uniquement par défaut ; conservation du contenu seulement sur demande ; effacement de l'historique et du cache RDAP.
- Parcours élémentaire « J'ai déjà répondu » et conseils adaptés à la France et à la Belgique.
- Interface React responsive « Dark Professional » : bleu nuit, bleu discret, cartes opaques et planète très atténuée.
- Module « Mots de passe » : génération robuste et phrases françaises aléatoires, saisie manuelle avec estimation de force, copie, coffre chiffré local côté navigateur, clé de secours et avertissement de réutilisation.
- **V0.4 — Trouver un site officiel :** répertoire local de **24 adresses (12 FR / 12 BE)** documentées avec source et date de revue, filtres pays, recherche tolérante aux accents et aux fautes, copie de l'URL. **Les mots-clés restent dans le navigateur ; aucun moteur de recherche n'est interrogé.**
- **Tests hors ligne du HTML :** un snapshot réel de Wikipédia et des formulaires fictifs (phishing et connexion ordinaire) permettent de vérifier les faux positifs et les champs sensibles sans télécharger de pages pendant les tests.

## Sécurité et limites

- Le serveur FastAPI doit être lancé **uniquement sur `127.0.0.1:8000`**.
- Jeton secret de session généré en mémoire, journalisation d'événements de sécurité **sans URL ni contenu**, contrôle du `Host`, de l'`Origin`, du `Content-Type`, de la taille et du débit de requêtes. CORS permissif désactivé.
- Le téléchargement d'une URL provoque une connexion au site demandé : ce n'est pas « hors ligne ». La recherche RDAP séparée exige le consentement dans l'interface.
- Aucun script JavaScript du site n'est exécuté, aucune sous-ressource n'est chargée. Les scripts et traceurs mentionnés sont **référencés** par le HTML, pas prouvés comme exécutés.
- Une connexion TLS réussie ne prouve pas qu'un commerce est fiable ; les contrôles texte ne prouvent pas l'identité d'un expéditeur.
- **VirusTotal, Google Safe Browsing et les autres moteurs tiers ne sont pas encore connectés.** Leur vérification est indiquée « non vérifié ». Pas d'IA externe.
- Pas d'OCR ni d'analyse de fichiers, appels automatiques ou surveillance permanente en V0.4.
- **Le répertoire n'est pas un certificat :** les domaines y sont recensés à la date indiquée, sans vérification en temps réel. Leur présence ne garantit ni la sécurité du site ni l'authenticité d'un message usurpant son identité. Cliquer sur « Source » ouvre volontairement un site externe.
- Le coffre est **expérimental** : les secrets sont chiffrés en AES-GCM dans le navigateur avant leur stockage SQLite. La phrase maître n'est pas transmise au backend. La clé de secours sert à ouvrir le fichier chiffré existant, **pas à récupérer une base supprimée**.
- Le coffre n'a pas encore été audité ; évitez d'y déposer des secrets irremplaçables sans sauvegarde adaptée. Pas de cloud, pas d'import/export, pas de remplissage automatique ni d'extension.
- Presse-papiers : l'effacement après 60 secondes est seulement tenté quand le navigateur l'autorise ; l'historique système peut conserver une copie.
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
 cd frontend
 npm run test:crypto
 npm run test:style
 npm run test:directory
```

## Répertoire

- `frontend/` — interface React/Vite
- `backend/app/` — API, règles de messages, inspection URL, historique
- `backend/app/rules_frbe.json` — règles d'analyse versionnées
- `backend/app/official_sites_frbe.json` — adresses de référence FR/BE et sources documentaires ; pas de requête réseau pour la recherche
- `frontend/src/OfficialSitesDirectory.jsx` — page « Sites officiels » et copie de liens
- `backend/tests/` — tests de non-régression et API du coffre
- `backend/tests/fixtures/` — corpus HTML hors ligne documenté et attribué ; test du formulaire de recherche Wikipédia, formulaire fictif sensible, et formulaire ordinaire
- `frontend/src/passwordCrypto.js` et `PasswordManager.jsx` — chiffrement navigateur et interface du coffre
- `frontend/tests/` — tests des fonctions WebCrypto
- `data/` — historique SQLite, cache RDAP et journal local sans données personnelles, ignorés par Git
- `version.json` — version produit unique (backend et frontend)

**Guide de style officiel :** [`PastaTshield_Guide_Style_v1.2.md`](PastaTshield_Guide_Style_v1.2.md). Logo T-Bouclier, palette sémantique et typographie locale : `frontend/src/design-system.css`.

Voir `PastaTshield_Architecture_V0.4.md` pour le répertoire local et ses limites ; `PastaTshield_Architecture_V0.3.md` documente le coffre et les choix antérieurs. L'architecture 0.2.1 reste conservée à titre historique.

## Lancement rapide

Double-cliquez sur `LANCER-PASTATSHIELD.cmd` après installation. Le lanceur vérifie les dépendances et la disponibilité du serveur avant d'ouvrir le navigateur ; le serveur doit rester sur `127.0.0.1:8000`.

**Licence :** aucune licence de redistribution n'a encore été choisie. Ne pas diffuser comme produit de sécurité achevé.
