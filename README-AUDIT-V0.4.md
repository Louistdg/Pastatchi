# PastaTshield V0.4 — dossier de revue de sécurité indépendante

**Préparé le :** 18 octobre 2026
**Statut :** application **alpha locale** (FastAPI + React, exécutée sur `127.0.0.1`).
**Révision auditée :** le commit indiqué dans le nom du ZIP livré. Cette archive est **un objet à auditer, pas un logiciel certifié**.
**Pour le modèle de menaces initial :** [THREAT_MODEL.md](THREAT_MODEL.md).
**Pour le périmètre d'origine V0.3 :** [README-AUDIT.md](README-AUDIT.md) (figé, référence historique, **pas** un état V0.4).

## 1. Contenu du ZIP

- Code source du backend FastAPI (analyse des messages, analyse URL/HTML, prévention SSRF, API locale, historique, RDAP sur consentement, coffre).
- Code source React/Vite (Lexend, thème Dark Professional, rapports et coffre).
- Répertoire local de **24 adresses de référence FR/BE**, avec provenance documentaire et date de revue.
- Tests backend et frontend, **dont un corpus figé de HTML** avec snapshot de Wikipédia et deux pages de démonstration fictives. Voir [backend/tests/fixtures/README.md](backend/tests/fixtures/README.md) pour l'attribution et les limites.
- Dépendances Python **déclarées par plages** et verrou npm `frontend/package-lock.json`; documentation de conception.

Le ZIP est créé via **`git archive HEAD`** pour exclure les données locales et les fichiers non versionnés. **Aucun secret personnel, coffret SQLite, token de session ou profil utilisateur n'est nécessaire pour l'audit.** Les pages HTML fictives ne contiennent aucune donnée personnelle réelle.

## 2. Changements spécifiques entre V0.3 et V0.4

1. **Analyse des grandes réponses HTTP(S).** `backend/app/urlscan.py` lit au maximum **1 000 001 octets** (1 Mo + 1 octet témoin) et ne conserve que les **1 000 000 premiers octets** ; si une page HTML est tronquée, les contrôles `Taille de la page`, `HTML et formulaires` et `Inspection passive locale` indiquent **partiel**. Si aucune alerte élevée n'est étayée par la partie reçue, le verdict reste **Indéterminé** ; ne jamais conclure `Faible` par défaut.
2. **Modes d'analyse.** Le mode Standard inspecte également les champs de formulaire du HTML ; les traceurs référencés sont pris en compte dans les autres modes. Aucun JavaScript distant n'est exécuté.
3. **Répertoire de sites.** `backend/app/official_sites_frbe.json` + route `GET /api/v1/official-sites` + UI React. Les termes tapés sont filtrés **en mémoire du navigateur** après un chargement local unique. Le clic `Source` ouvre un site externe uniquement sur demande. La présence d'une adresse **n'est pas un certificat de sécurité**.
4. **UX et accessibilité de lecture.** Police locale Lexend, contrastes des textes de statut, focus visible et réduction des animations. Des **tests d'accessibilité complets auprès d'utilisateurs** restent nécessaires.
5. **Corpus hors ligne de non-régression.** `backend/tests/fixtures/wikipedia.html` est un snapshot réel du HTML du portail Wikipédia ; `faux-ameli.html` et `formulaire-legitime.html` sont des créations fictives. Les tests vérifient le formulaire de recherche non suspect, les champs sensibles et l'action de soumission HTTP, ainsi que l'absence de classification abusive du seul champ mot de passe.

Les modifications de V0.4 sont **non auditées indépendamment**. Le fait que les tests soient au vert ne constitue pas une preuve de résistance aux attaques.

## 3. Surfaces prioritaires pour l'auditeur

| Domaine | Fichiers principaux | Questions |
| --- | --- | --- |
| SSRF/HTTP/TLS | `backend/app/urlscan.py`, `backend/tests/test_large_pages.py` | DNS et IP épinglées, redirections, Content-Length erroné, HTML tronqué, débit mémoire, exceptions réseau, réponses compressées/chunked |
| Analyse HTML | `backend/app/urlscan.py`, `backend/tests/test_html_corpus.py`, `backend/tests/fixtures/` | Champs reconnus, destinations HTTP, faux positifs, limites du parser, détection non garantie des scripts et du phishing |
| API localhost | `backend/app/main.py`, `backend/tests/test_security.py` | Jeton, Host/Origin/CSRF, navigateur hostile, processus local malveillant, confidentialité des réponses |
| Coffre chiffré | `frontend/src/passwordCrypto.js`, `PasswordManager.jsx`, `backend/app/vault.py` | AES-GCM, KDF, clé de secours, mémoire des secrets, presse-papiers, backup/restauration absents |
| Frontend | `frontend/src/App.jsx`, `frontend/src/OfficialSitesDirectory.jsx` | XSS, contenu tiers, CSP, formats de rapports, URL de liens, données en mémoire |
| Répertoire FR/BE | `backend/app/official_sites.py` + JSON, `frontend/src/officialSearch.js` | Vérification de domaine et provenance, fausses adresses, expiration de la revue, URL proposées |
| Dépendances | `backend/requirements*.txt`, `frontend/package-lock.json` | Python non verrouillé, chaîne d'approvisionnement, dépendances build et production |

## 4. Résultats observés au moment de la préparation

| Contrôle | Résultat |
| --- | --- |
| Backend : `unittest discover -s backend/tests -q` | **70 tests réussis** |
| Régression HTML : `test_html_corpus.py` (incluse ci-dessus) | **7 tests réussis** |
| Lint Python ciblé `ruff --select E4,E7,E9,F` | **Réussi** |
| `npm run build` | **Réussi** |
| `npm run test:directory` | **5 réussis** |
| `npm run test:style` | **9 réussis** |
| `npm run test:crypto` | **6 réussis** |
| `npm audit --omit=dev --audit-level=high` | **0 vulnérabilité connue signalée** au moment du contrôle |

**Note :** les 7 tests HTML sont **compris dans les 70 tests backend**, et ne doivent pas être additionnés une seconde fois. Le lint, le build et les tests unitaires/intégration **ne remplacent pas** un audit indépendant, une évaluation statistique de détection ni un test de pénétration.

## 5. Commandes pour reproduction sur Windows

Avec Python 3.14, Node 24 et npm, depuis le ZIP décompressé et **sans aucune base d'utilisateur** :

```powershell
py -3.14 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend\tests -q
.\backend\.venv\Scripts\ruff.exe check backend\app backend\tests --select E4,E7,E9,F

cd frontend
npm ci
npm run test:directory
npm run test:style
npm run test:crypto
npm run build
npm audit --omit=dev --audit-level=high
cd ..
```

Lancer localement uniquement si le laboratoire est isolé et sans données personnelles :

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Ne tester des sites Internet tiers qu'avec une autorisation appropriée. Les scénarios du corpus HTML sont conçus pour fonctionner **sans réseau** et ne doivent pas être utilisés comme sites réels.

## 6. Travaux bloquants avant diffusion

- **Audit indépendant** complet du coffre, du frontend, de l'API locale et du SSRF ; correction et retest des failles confirmées.
- **Export/restauration chiffrés et authentifiés** du coffre, testé sur une autre machine.
- Corpus FR/BE représentatif annoté et mesures de faux positifs / faux négatifs / couvertures.
- Traçabilité des sources de réputation et consentements révocables avant toute connexion supplémentaire.
- Versions Python reproductibles, signature et chaîne d'installation/mise à jour.
- Tests d'accessibilité réelle, notamment avec des seniors.

**Livrable attendu de l'auditeur :** rapport de constats prouvés, sévérité, conditions d'exploitation, recommandations, tests de non-régression, retests et décision explicite de distribution. Se reporter à [docs/audit/AUDITOR_DELIVERABLES.md](docs/audit/AUDITOR_DELIVERABLES.md) pour le modèle détaillé rédigé pour V0.3 et toujours applicable aux mêmes surfaces.
