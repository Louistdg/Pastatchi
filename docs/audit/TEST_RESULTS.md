# PastaTshield V0.3 — résultats des tests reproductibles

**Exécutés le :** 18 octobre 2026, sur Windows, dépôt `D:\Pastachi`, commit source `57a4b01b1c290aab355f039e1d3f3a59bf80dbb9`.

Ce relevé vient d'une **exécution réellement effectuée** au moment de préparer l'audit. Il décrit des tests unitaires et d'intégration limités, pas une revue de sécurité externe.

## 1. Environnement observé

- **Windows** (développement local, architecture/version Windows non collectées).
- **Python 3.14.7** dans `backend/.venv`.
- **Node.js 24.21.0**.
- **npm 11.19.0**.
- **FastAPI 0.146.0**, **Uvicorn 0.54.0**, **tldextract 5.4.0**.
- **React 19.3.1**, **Vite 6.4.4**.
- Voir [DEPENDENCIES.md](DEPENDENCIES.md) pour les autres dépendances directes et la liste Python observée.

## 2. Résultats observés

| Contrôle | Commande depuis le dépôt | Résultat observé |
| --- | --- | --- |
| Tests backend | `python -m unittest discover -s backend/tests -q` | **44 tests**, OK, code de sortie 0, env. 4.1 s |
| Lint Python ciblé | `ruff check backend/app backend/tests --select E4,E7,E9,F` | **All checks passed**, code 0 |
| Tests cryptographiques JS | `npm run test:crypto` depuis `frontend` | **6 tests**, 6 réussis, 0 échec, code 0 |
| Tests de cohérence design | `npm run test:style` depuis `frontend` | **4 tests**, 4 réussis, 0 échec, code 0 |
| Compilation production React | `npm run build` depuis `frontend` | **Vite build réussi**, code 0 |
| Inventaire vulnérabilités npm (production seulement) | `npm audit --omit=dev --audit-level=high` depuis `frontend` | **found 0 vulnerabilities**, code 0 ; résultat ponctuel, ni audit de code ni garantie d'absence de vulnérabilité |

**Avertissement d'exécution backend non bloquant :** Starlette a émis `StarletteDeprecationWarning` indiquant que l'usage de `httpx` avec `starlette.testclient` est déprécié et recommandant `httpx2`. Les 44 tests ont néanmoins terminé en statut OK ; le sujet de compatibilité devra être suivi.

**Important :** le contrôle `ruff --select E4,E7,E9,F` couvre les erreurs syntaxiques/semantiques choisies et certaines classes Pyflakes. Il **ne couvre pas** toute la qualité ni la sécurité du code.

## 3. Procédure Windows de reproduction (nouveau poste)

Prérequis : environnement Python compatible (le test initial a utilisé 3.14.7) et Node.js compatible (24.21.0 relevé). Aucun accès à un coffre réel n'est nécessaire.

```powershell
# Se placer à la racine du dépôt décompressé
py -3.14 -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
cd frontend
npm ci
npm run test:crypto
npm run test:style
npm run build
npm audit --omit=dev --audit-level=high
cd ..
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend\tests -q
.\backend\.venv\Scripts\ruff.exe check backend\app backend\tests --select E4,E7,E9,F
```

Puis, pour lancer l'application dans un laboratoire local de test :

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
# Ouvrir http://127.0.0.1:8000/ dans un navigateur sur le même poste
```

**Ne pas exécuter de tests actifs sur des domaines tiers sans autorisation ; éviter les données personnelles.** La connexion à un site choisi dans l'analyse URL est une vraie requête sortante.

## 4. Limites de ce relevé

- Les tests vérifient certains scénarios de mauvais mots de passe, de chiffrement/déchiffrement, de secours, d'API et de l'analyse ; ils ne prouvent pas la résistance à une XSS, à une attaque SSRF réelle, ni à un programme local malveillant.
- Les tests design vérifient certaines signatures et propriétés des styles, **pas** le contraste WCAG réel ni l'expérience senior.
- Les tests cryptographiques démontrent le fonctionnement de l'implémentation dans les cas sélectionnés, **pas** sa validation cryptographique indépendante.
- Le build réussi ne prouve pas que la distribution Windows fonctionne sur un poste vierge.
- L'audit npm exécuté ne porte pas sur toutes les dépendances de développement (`--omit=dev`) et n'analyse pas les défauts logiques.
- Les dépendances Python restent définies par des plages dans `requirements.txt` ; les versions relevées ne garantissent pas un résultat identique lors d'une installation future.

## 5. À faire compléter par l'auditeur

1. Tests de sécurité dynamiques : XSS, CSP, CSRF, SSRF, DNS rebinding, abus d'API locale.
2. Revue cryptographique indépendante, mémoire des secrets, presse-papiers et coffre de secours.
3. POC de sauvegarde/restauration avec vérification AEAD, panne simulée et restauration sur **un autre ordinateur**.
4. Tests de charge, d'interruption et de concurrence multi-onglets.
5. Corpus de messages FR/BE annotés, seuils de verdict, taux de faux positifs et de faux négatifs.
6. Tests d'accessibilité WCAG et UX senior.

Le protocole et les résultats de reproduction devront être annexés au rapport final.
