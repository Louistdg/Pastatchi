# PastaTshield V0.4 — Répertoire local de sites de référence

**Date :** 18 octobre 2026
**Statut :** alpha locale ; fonctionnalité expérimentale et non certifiée.
**Point de départ :** commit V0.3 `274c403`. Les anciennes archives d'audit V0.3 sont **inchangées**.
**Règle :** tout ajout d'un domaine de référence exige une nouvelle revue documentaire et une mise à jour de l'application.

## 1. Objectif

Fournir un accès simple aux adresses de référence d'organismes et de marques souvent imités dans les tentatives d'arnaque, **sans moteur de recherche externe**. Les recherches se font dans une liste locale documentée, et non dans Google/Bing. Une carte donne :

- un nom, une catégorie, le pays et une initiale (aucun favicon téléchargé) ;
- une adresse HTTPS lisible, sélectionnable manuellement, et un bouton « Copier ce lien » ;
- la **source documentaire** de l'adresse via un lien séparé, ouvert uniquement sur action volontaire ;
- la date globale de revue et un avertissement sur l'absence de surveillance en temps réel.

**Important :** la mention « adresse documentée » n'est **pas** une certification, ne garantit pas la sécurité actuelle du site et n'authentifie pas un courriel ou un message reçu. Ne pas employer « URL vérifiée par PastaTshield » comme garantie de sécurité.

## 2. Données

Fichier : `backend/app/official_sites_frbe.json`.

- **24 entrées : 12 France, 12 Belgique**, regroupées par catégorie.
- Date de revue : `2026-10-18`.
- Chaque entrée : `id`, `country`, `category`, `name`, `url`, `keywords`, `description`, `source_url`.
- Sources : pages de référence des administrations et de leurs éditeurs, notamment Service-Public, impots.gouv.fr, ameli.fr, La Poste, France Travail, Belgium.be, SPF Finances/MyMinfin, itsme et bpost.
- Les anciens domaines peuvent changer ou rediriger : par exemple `service-public.fr` renvoie désormais vers `service-public.gouv.fr`, et `myminfin.be` est un point d'entrée publiquement indiqué par Belgium.be.

**Maintenance nécessaire :** documenter les changements, revérifier les entrées périodiquement, publier une version de l'application et retirer toute entrée dont la source ne peut plus être justifiée. Les adresses financières et bancaires ne doivent pas être ajoutées automatiquement ou sur la foi d'un simple résultat de recherche.

## 3. Architecture et protection de la vie privée

```text
[ React : Sites officiels ]
    │ GET /api/v1/official-sites (une seule fois au montage)
    ▼
[ FastAPI : localhost 127.0.0.1:8000 + jeton déjà existant ]
    │ Lecture/validation locale uniquement, jamais de requête extérieure
    ▼
[ official_sites.py + official_sites_frbe.json ]
    ▲
    │ réponse liste + date de revue + sources
[ React : recherche en mémoire, normalisation des accents, filtre pays ]
    │
    └── bouton Copier -> presse-papiers (sur demande)
        lien Source -> site externe (clic explicite seulement)
```

- L'interface charge la liste **une fois par visite** de la page et filtre en JavaScript ; **aucun mot-clé saisi n'est transmis au backend** ni à un service externe.
- L'API prend aussi `q` et `country` pour les clients/tests, avec limites de longueur et autorisation par jeton, mais l'interface ne les utilise pas pendant la saisie.
- La validation des données rejette les URLs qui ne sont pas HTTPS, les fragments/paramètres de requête, les identifiants intégrés, les domaines locaux et les duplications d'IDs.
- La recherche tolère les accents et propose un mot-clé voisin via distance d'édition, sans sélection automatique ni redirection.
- Les domaines ne sont **jamais contactés par le serveur** lors de la recherche.
- Aucun téléchargement de logo ou favicon tiers.
- **Pas de minuteur d'effacement pour une URL publique** : cette donnée n'est pas un mot de passe ; effacer le presse-papiers risquerait de contrarier l'utilisateur.

## 4. Fichiers créés ou adaptés

- `backend/app/official_sites_frbe.json` — liste locale et sources.
- `backend/app/official_sites.py` — chargement, validation, recherche.
- `backend/app/main.py` — `GET /api/v1/official-sites`, sous les contrôles Host/Origin/jeton existants.
- `frontend/src/OfficialSitesDirectory.jsx` — page accessible via la sidebar + l'accueil.
- `frontend/src/officialSearch.js` — filtrage local et proposition de correction.
- `frontend/src/design-system.css` — extension sobre du style Dark Professional.
- `backend/tests/test_official_sites.py`, `frontend/tests/officialSites.test.mjs` — contrôle fonctionnel et de confidentialité.

## 5. Limites et priorités

Cette fonctionnalité fournit **des adresses de référence**, pas une vérification anti-phishing automatique en temps réel. Elle ne remplace ni l'analyse d'URL, ni un contrôle de réputation, ni le discernement devant une demande de mot de passe ou de paiement.

Le chiffre avancé dans une proposition (« 80 % des arnaques évitées ») **n'est pas étayé** : ne pas l'afficher sur le site ou dans la communication.

Les priorités de sécurité identifiées pour la V0.3 demeurent : audit XSS/CSP et SSRF, sauvegarde chiffrée/restauration du coffre, validation de l'API locale, fiabilité des verdicts et installation Windows sécurisée.

## 6. Tests

```powershell
# Depuis D:\Pastachi
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -q
.\backend\.venv\Scripts\ruff.exe check backend/app backend/tests --select E4,E7,E9,F
cd frontend
npm run build
npm run test:directory
npm run test:style
npm run test:crypto
```

La V0.4 mérite **un audit différentiel** avant toute distribution au grand public. Les archives V0.3 restent les références figées pour l'audit initial.
