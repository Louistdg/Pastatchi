# PastaTshield — README d'audit indépendant

**Dossier d'audit préparé le :** 18 octobre 2026
**Application :** PastaTshield V0.3 (alpha locale FR/BE)
**Révision du code à étudier :** `57a4b01b1c290aab355f039e1d3f3a59bf80dbb9`
**Plateforme actuelle :** web responsive React/Vite + API FastAPI sur `127.0.0.1:8000` + SQLite.
**Objectif :** revue indépendante de sécurité et de fiabilité *avant* toute distribution grand public.

> **Avertissement :** ce dossier est une demande d'audit, pas une certification. Les protections décrites sont des implémentations à **vérifier**, pas des garanties. N'utilisez **jamais de vrais secrets personnels ou bancaires** pour les tests.

## 1. Livrable et règles de confidentialité

L'archive contient le **code source suivi par Git**, les règles, les tests, les spécifications et ce dossier. Elle exclut les bases locales `data/`, les `.env`, les fichiers SQLite, l'environnement virtuel Python, `node_modules`, les fichiers GEDCOM et les fichiers personnels présents sur la machine du propriétaire. Aucune base de coffre réel ni phrase maître ne doit être transmise.

Le dépôt `Louistdg/Pastatchi` est accessible publiquement au moment de cette préparation, mais **aucune licence de réutilisation ou de redistribution n'a été choisie** par le propriétaire. Auditer les fichiers communiqués n'autorise pas à les republier sous une autre licence.

Périmètre du code de référence : commit **57a4b01** ; l'ajout du dossier d'audit lui-même ne modifie pas la logique du logiciel.

## 2. Ce qui existe réellement

- **Analyse de messages** à la demande : règles déterministes France/Belgique/WhatsApp dans `backend/app/analyzer.py` et `rules_frbe.json`. L'authenticité d'un expéditeur et la réputation des liens d'un message **ne sont pas vérifiées automatiquement**.
- **Analyse de sites** sur requête explicite : `backend/app/urlscan.py` résout le DNS, contrôle les IP publiques, épingle l'IP de connexion, limite les redirections, le temps et la taille, puis examine le HTML public. Aucun JavaScript du site inspecté n'est exécuté. Une requête réseau est néanmoins effectuée vers le site saisi.
- **RDAP facultatif** : consultation du registre uniquement après accord au moment de cette analyse ; cache local de 24 heures. Google Safe Browsing, VirusTotal et URLhaus ne sont **pas** intégrés.
- **API locale** : `backend/app/main.py` présente un jeton en mémoire, des vérifications d'Origin et de Host, une limite de débit, une CSP, des limites de taille des requêtes et des routes `/api/v1/`.
- **Coffre de mots de passe alpha** : données chiffrées **dans le navigateur**, puis enveloppe JSON chiffrée enregistrée dans SQLite. `frontend/src/passwordCrypto.js`, `PasswordManager.jsx`, `backend/app/vault.py`. Phrase maître, clé de secours, copie, suppression, verrouillage après inactivité.
- **Historique** : résumé SQLite en clair local par défaut ; contenu d'origine seulement si l'utilisateur choisit de le conserver.

## 3. Hors périmètre actuel ou absence connue

- **Pas de sauvegarde/restauration du coffre** : une clé de secours ne peut pas reconstituer un fichier SQLite perdu ou effacé.
- **Pas d'audit antérieur indépendant** ; pas de certification ni d'engagement « inviolable ».
- Pas d'application native, d'extension de navigateur, de remplissage automatique, de synchronisation cloud, d'installateur signé ni de mise à jour automatique sécurisée.
- Pas de traitement OCR, de capture d'écran ou de fichiers dangereux en V0.3.
- **Consentement persistant et révocable par source non implémenté** : seule la consultation RDAP est demandée individuellement à l'analyse.
- Les règles de détection ne disposent pas encore d'un grand **corpus annoté FR/BE** pour mesurer précision, rappel, faux positifs et non-régression.
- Python `requirements.txt` contient des **plages de versions**, pas un verrouillage exact.

## 4. Fichiers à examiner en priorité

| Domaine | Fichiers |
| --- | --- |
| Chiffrement, clés, effacement mémoire, récupération | `frontend/src/passwordCrypto.js` ; `frontend/src/PasswordManager.jsx` |
| Stockage du coffre, conflits d'onglets, suppression | `backend/app/vault.py` ; `backend/tests/test_vault.py` |
| API localhost, token, CSRF/origine, CSP, validation | `backend/app/main.py` ; `frontend/src/App.jsx` |
| SSRF, DNS rebinding, redirects, TLS, RDAP, parsers | `backend/app/urlscan.py` ; `backend/tests/test_core.py` |
| Règles, agrégation de risque, faux positifs | `backend/app/analyzer.py` ; `backend/app/rules_frbe.json` |
| Minimisation, durée de vie et suppression de données | `backend/app/storage.py` ; `backend/app/security_log.py` |
| Dépendances et chaîne de distribution | `frontend/package-lock.json`, `frontend/package.json`, `backend/requirements*.txt`, `LANCER-PASTATSHIELD.cmd` |

## 5. Questions de sécurité adressées à l'auditeur

### A. Frontend, XSS, CSP et confidentialité

1. Une chaîne utilisateur, une URL ou du HTML du site analysé peut-il exécuter du JavaScript via React, une dépendance, un attribut d'URL ou un composant ? Examiner les frontières d'encodage, tout rendu HTML brut, les liens et les rapports copiés.
2. La CSP (`script-src 'self' 'nonce-...'`) résiste-t-elle aux scénarios réalistes ? Le nonce et le jeton de session sont-ils exposables par une chaîne d'attaque pertinente ?
3. Quels secrets restent dans des états React, des chaînes JavaScript, des `CryptoKey`, des closures, le DOM, le presse-papiers, les erreurs ou des journaux ? Que fait réellement le verrouillage ? **Ne pas supposer que JavaScript garantit un effacement mémoire.**
4. Tester les cas de plusieurs onglets, retours à la page, blocages, onglet en arrière-plan, veille système, rechargement, fermeture et échec du presse-papiers.

### B. Coffre et sauvegarde

1. Revoir le modèle de clés **AES-GCM 256**, PBKDF2-SHA256 (600 000 itérations), génération des sels et IV, clé de récupération distincte, tags d'authentification, résistance au tampering et évolution du format.
2. La rotation de phrase maître réenveloppe-t-elle correctement les données ? Une ancienne clé de secours peut-elle encore ouvrir le coffre après une récupération ? Les clés sont-elles non exportables autant que possible ?
3. Le serveur « aveugle » ne reçoit-il réellement aucune valeur en clair dans ses requêtes et ses logs, y compris les cas d'erreurs et d'échecs ?
4. Définir puis auditer **export chiffré + restauration**, avec test d'intégrité (AEAD et métadonnées), gestion des versions, conflits de révisions et essai de restauration **sur un autre poste**. Un simple hash non authentifié n'empêche pas une substitution malveillante.
5. Évaluer le KDF pour des phrases maîtres faibles (Argon2id vs PBKDF2) ; aucun changement cryptographique ne doit être improvisé avant revue et plan de migration.

### C. Backend localhost et SSRF

1. Tester la résistance d'API à un **site ouvert dans le même navigateur** (Origin, Host, absence d'Origin, CORS/CSRF, en-tête token), et à un **programme local malveillant**. Un processus local peut éventuellement lire la page d'accueil et obtenir le jeton : les défenses localhost ne sont pas une isolation contre tous les programmes locaux.
2. Tester redirections, réponses fragmentées/volumineuses, délais réseau, types MIME, DNS rebinding, IPv4/IPv6, IP réservées et encodages d'URL ambigus. Vérifier le DNS *réellement utilisé* pour chaque connexion.
3. Tester la séparation de confiance entre cible du site (requête initiée par l'utilisateur), RDAP (accord explicite) et futurs services de réputation (non implémentés).
4. Tester une dégradation sûre des contrôles : une vérification impossible ne doit jamais être interprétée comme « sans danger ».

### D. Conformité pratique et qualités de détection

1. Vérifier consentement exact par source, domaine/URL transmis, durée, révocation et changement des finalités, en décrivant explicitement les fonctionnalités manquantes.
2. Évaluer les règles France/Belgique/WhatsApp sur corpus anonymisé et annoté ; tests de non-régression à chaque version, mesure des faux positifs et couverture d'arnaques.
3. Vérifier l'absence de fuite de secrets vers les services d'analytique, logs, erreurs et plateformes externes.
4. Auditer les permissions, dépendances, packaging Windows, signature, mise à jour et désinstallation avant déploiement.

## 6. Reproduction des tests

Voir [docs/audit/TEST_RESULTS.md](docs/audit/TEST_RESULTS.md) pour les versions, les commandes et les résultats effectivement relevés le 18 octobre 2026, et [docs/audit/DEPENDENCIES.md](docs/audit/DEPENDENCIES.md) pour l'inventaire installé.

Les tests actuels sont **unitaires et d'intégration ciblés** ; ils ne sont **pas** un pentest, une preuve de sécurité cryptographique, une mesure de performance ni une attestation de fiabilité des verdicts.

## 7. Résultats attendus

Voir [docs/audit/AUDITOR_DELIVERABLES.md](docs/audit/AUDITOR_DELIVERABLES.md) :
- rapport de constats confirmés, preuves reproductibles, composant et impacts ;
- cotation de sévérité (CVSS si applicable) et priorisation, **sans attribuer de CVSS à une simple fonctionnalité manquante** ;
- correctifs proposés, tests de non-régression à ajouter, statut de réexamen ;
- avis séparés sur **sécurité du coffre**, **API localhost**, **SSRF**, **front/XSS**, **confidentialité/consentements** ;
- décision de diffusion : **non prêt / corrections nécessaires / nouvelles vérifications recommandées**.

**Important :** respecter le caractère local-first et le choix volontaire de chaque analyse ; aucun audit actif de sites tiers non autorisés n'est inclus dans ce mandat.
