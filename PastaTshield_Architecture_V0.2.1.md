# PastaTshield — Architecture technique V0.2.1

**Date :** 18 octobre 2026
**Statut :** prototype alpha développé ; non homologué pour la sécurité grand public.
**Dépôt :** Pastatchi ; code sous `frontend/` et `backend/`.

## Changelog

- **0.1 — proposition initiale** : React/FastAPI/SQLite, règles texte, analyse d'URL avec SSRF, transparence, local-first.
- **0.2 — consolidation des deux documents du 18/10/2026** : inclut les scénarios WhatsApp de la version plus complète ; clarifie `Pastatchi` comme nom du dépôt et `PastaTshield` comme nom du produit ; ajoute règles JSON, format de rapport, authentification de l'API locale, CSP, garde anti-SSRF, tests FR/BE et limites déclarées.

- **0.2.1 — correctifs de la revue de code** : limites de corps UTF-8, ordre de décision Standard, extraction de domaine via suffixes publics, détection de marque contextuelle, fenêtre WhatsApp, analyse de `<base href>`, HTTPS obligatoire pour les redirections RDAP, cache RDAP local 24 h, journal de sécurité sans contenu, traçabilité des versions de règles, lanceur Windows fiabilisé, version commune et tests d'intégration.

## Distribution

V0.2.1 s'exécute **sur Windows**, avec FastAPI sur `127.0.0.1:8000` et un frontend React compilé servi par le même processus. Aucun service cloud PastaTshield n'est déployé. Le navigateur mobile responsive peut afficher l'interface, mais un téléphone différent ne peut pas accéder directement au serveur lié à localhost ; une distribution mobile sécurisée nécessitera un projet séparé.

## Chaîne fonctionnelle

Saisie volontaire → API locale authentifiée → validateur → analyse déterministe texte ou URL → rapport structuré → SQLite (résumé seulement par défaut) → interface.

Les règles de messages sont stockées dans `backend/app/rules_frbe.json` avec identifiant et version, gravité, motif regex et justification. La décision est déterministe : un indicateur critique implique risque critique ; un ou plusieurs élevés impliquent risque élevé, avec modéré/faible/indéterminé selon le contexte. Il ne s'agit pas d'un score statistique de probabilité ni d'une authentification de l'expéditeur.

## Rapport V0.2.1

`kind`, `risk`, `summary`, `findings` (titre, gravité, indice, justification et identifiant pour les règles JSON), `checks` (effectué ou non vérifié + détail), `sources` (statut), `limitations`, `recommendations`, `links`; pour l'URL, `collection`, `site_host`, `redirects`.

Une date d'analyse est conservée dans le record local créé. Le schéma versionné complet des consentements et une confiance méthodologiquement validée restent des évolutions non réalisées.

## API locale

Endpoints versionnés :
- `POST /api/v1/analyze/text`
- `POST /api/v1/analyze/url`
- `GET /api/v1/history`
- `GET /api/v1/history/{id}`
- `DELETE /api/v1/history`
- `GET /api/v1/health`

Jeton aléatoire généré en mémoire au démarrage et injecté uniquement dans la page servie en localhost ; toutes les routes `/api/` exigent `X-PastaTshield-Token`. Validation de l'`Origin` et du `Host`, aucun CORS permissif, contrôle `application/json`, taille plafonnée à 100 000 octets UTF-8 (20 000 caractères après validation), limitation à 50 requêtes/minute/IP avec `Retry-After`, en-têtes CSP et `no-store`. Le choix `style-src 'self'` reste strict : les styles doivent provenir de fichiers CSS locaux et non d'attributs `style`.

Limite : ce modèle concerne une application locale mono-utilisateur ; il ne constitue pas une authentification multi-utilisateur ou une isolation complète du système.

## Inspection URL et garde anti-SSRF

Seuls `http` et `https` sont acceptés, sur ports Web usuels, sans userinfo, sans fragment ni caractères de contrôle. Les DNS sont résolus avant la connexion ; **toutes** les adresses résolues doivent être publiques, et la socket se connecte à une IP publique épinglée, avec le nom DNS original pour SNI et validation TLS. Chaque redirection est traitée manuellement et validée à nouveau. RDAP n'accepte que les redirections HTTPS. Les domaines enregistrables proviennent d'une liste de suffixes publics embarquée (mise à jour avec la dépendance `tldextract`).

Limites : 3 redirections, timeout de 5 s par requête, 420 000 octets maximum, aucun proxy hérité, aucune exécution JS, aucun chargement des sous-ressources. Les erreurs TLS/réseau produisent `Indéterminé`.

L'inspection HTML passive affiche champs de formulaires et domaines de ressources tierces **référencées**. Le nombre de cookies est déduit des en-têtes de la réponse initiale. Les transmissions dynamiques, le serveur, les cookies construits en JS et les étapes authentifiées sont non vérifiés. L'interprétation des URL relatives tient compte de `<base href>`.

Les requêtes autorisées vers le site indiqué sortent du PC à la demande de l'utilisateur. La vérification RDAP est séparée et facultative avec consentement **par analyse** ; aucun autre connecteur commercial de réputation n'est activé. Un cache local SQLite conserve les dates RDAP pendant 24 h après une consultation autorisée ; aucun appel RDAP n'est effectué sans consentement.

## Protection des données

SQLite local sous `data/history.sqlite3` (exclu du Git). Résumé et métadonnées uniquement par défaut ; la sauvegarde de la saisie doit être activée explicitement. Effacement complet de l'historique et du cache RDAP en un bouton. Un journal opérationnel local rotatif `data/security-events.log` enregistre uniquement des codes d'événement, jamais les messages, URL, IP ni jetons. Aucun chiffrement SQLite activé : les autres comptes/processus disposant de droits d'accès disque pourraient lire la base ; un chiffrement au repos ferait partie d'une version future.

## Non disponible en V0.2.1

- Réputation Google Safe Browsing / VirusTotal / URLhaus.
- Corpus étendu de vrais messages vérifiés, mesure d'exactitude ou de faux positifs.
- OCR/captures, fichiers, analyse d'appels, détection de fraude bancaire automatique.
- Consentements enregistrés en base avec expiration/révocation et audit avancé (seul le consentement RDAP par analyse est disponible).
- IA externe, serveur hébergé, application mobile native, surveillance continue.
- Audit indépendant, isolation système de niveau sécurité produit.

**Règle absolue :** « absence de détection ≠ sécurité garantie ». Ne jamais déclarer une connexion sécurisée équivalente à un site fiable.

## Publication / droits

Le dépôt ne comporte pas encore de licence de distribution décidée par le propriétaire ; ne pas inventer de licence open-source ni publier comme produit final. Les tests ne remplacent pas un audit de sécurité indépendant.
