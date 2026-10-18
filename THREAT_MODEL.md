# PastaTshield — modèle de menaces initial (THREAT_MODEL)

**Date :** 18 octobre 2026
**Base de code :** V0.3 commit `57a4b01b1c290aab355f039e1d3f3a59bf80dbb9`
**Statut :** hypothèses pour revue indépendante, **non validées par un pentest**.

## 1. Hypothèses et frontières de confiance

PastaTshield est un serveur **local** FastAPI accessible sur `127.0.0.1:8000`, avec une interface React chargée dans un navigateur de l'utilisateur. Il peut faire une **requête réseau à un site public choisi volontairement** et, après une option explicite, interroger un registre RDAP pour son domaine. Le coffre chiffre dans le navigateur et écrit **une enveloppe chiffrée** via l'API dans une base SQLite locale.

Les frontières principales sont :
1. **Contenu collé par l'utilisateur / données reçues du site tiers** → moteur de règles, HTML parser et interface de résultats.
2. **Navigateur de confiance relative** → API sur localhost protégée par un jeton de session, contrôle Host/Origin et limite de débit.
3. **API localhost** → filesystem de l'utilisateur : base d'historique, cache RDAP, base de coffre, journal d'événements.
4. **Serveur local** → réseau public pour l'analyse d'URL et le registre RDAP si autorisé.
5. **Texte/phrase maître en mémoire du navigateur** → WebCrypto → enveloppe chiffrée → API.
6. **Presse-papiers du système** → une autre application locale peut éventuellement accéder aux mots de passe copiés.

Une protection contre les sites Internet hostiles **ne démontre pas** une protection contre un logiciel malveillant installé sur le même ordinateur, contre une extension de navigateur compromise ou contre l'accès physique non autorisé à une session ouverte.

## 2. Actifs à protéger

- Phrases maîtres, clés de secours, `CryptoKey`, mots de passe, identifiants, domaines et noms de comptes stockés.
- Confidentialité et intégrité du fichier SQLite chiffré et disponibilité des données (perte de disque/ransomware/suppression).
- Jeton API de la session et disponibilité du serveur local.
- Historique des messages et URL analysés, éventuellement sauvegardés en clair sur demande.
- Intégrité des résultats, règles, étiquettes « Faible / Indéterminé » et mentions de limites.
- Préférences/consentements de requêtes externes ; IP locale et environnement réseau de l'utilisateur.
- Chaîne de distribution, dépendances et mises à jour futures.

## 3. Adversaires envisagés

| Adversaire | Capacité plausible | Objectif |
| --- | --- | --- |
| Site Internet ouvert dans un autre onglet | Formulaire, scripts du site, requêtes vers `localhost`, redirections | Déclencher API ou analyse sans autorisation, obtenir des données |
| Contenu de phishing ou site soumis à l'analyse | Texte, URL, HTML, en-têtes, redirections, DNS contrôlés | Contourner une règle, injecter une interface, provoquer SSRF ou déni de service |
| Service externe RDAP / réputation futur | Voir certains domaines ou URL envoyés | Collecter informations de navigation / profiler |
| Logiciel local malveillant | Accès réseau loopback et parfois accès fichiers/processus | Lire jeton, copier coffre chiffré, compromettre navigateur ou données |
| Extension de navigateur compromise | Accès aux pages, saisies ou mémoire selon ses permissions | Voler phrases maîtres/mots de passe |
| Attaquant ayant accès au disque hors session | Copier/modifier la base chiffrée | Deviner la phrase maître hors ligne, altérer ou détruire le coffre |
| Utilisateur légitime sous pression | Réutiliser un mot de passe, oublier la phrase maître, perdre son PC | Perte de disponibilité ou compromission accidentelle |
| Dépendance / build compromis | Injecter du code dans l'UI ou serveur | Exfiltrer des secrets, détourner les analyses |

## 4. Scénarios à évaluer

| ID | Menace / scénario | Contrôles à vérifier dans le code actuel | Lacune ou risque résiduel |
| --- | --- | --- | --- |
| T-01 | XSS via URL, message, réponse d'un site, rendu de rapport | React, absence de rendu HTML brut, CSP `script-src 'self' 'nonce-...'` | Une XSS dans la même origine pourrait lire des secrets durant l'ouverture du coffre ; revue dynamique nécessaire |
| T-02 | CSRF, DNS rebinding navigateur / accès inter-origines à `localhost` | Jeton d'en-tête, `Host`/`Origin`, absence de CORS permissif | Un programme **local** peut potentiellement obtenir le jeton en demandant la page d'accueil ; l'absence d'Origin n'est pas automatiquement rejetée |
| T-03 | SSRF par URL, IPv4/IPv6 ou redirection | Schémas HTTP(S) seulement, DNS IP publique et IP épinglée, chaque redirection vérifiée | Vérifier cas limites DNS, versions IP, erreurs TLS, temps et réponses malformées |
| T-04 | Exfiltration des mots de passe par dépendance JS ou extension | WebCrypto dans navigateur, aucun secret envoyé intentionnellement à FastAPI | Clés/données restent accessibles en mémoire tant que le coffre est ouvert ; JavaScript ne garantit pas la mise à zéro |
| T-05 | Vol du fichier SQLite du coffre | AES-GCM, clé aléatoire 256 bits, enveloppes protégées par PBKDF2-SHA256 600 000 itérations | Attaque hors ligne sur une phrase maître faible ; paramètres KDF et migration à étudier |
| T-06 | Réutilisation IV / corruption / substitution du coffre | IV aléatoire, tags AEAD, validation d'enveloppe, versions de révision | Format/version/métadonnées non authentifiées en AAD : vérifier la robustesse aux substitutions et aux rollbacks |
| T-07 | Perte du disque ou suppression SQLite | Clé de secours distincte | **Aucune sauvegarde chiffrée**, récupération impossible si le fichier manque |
| T-08 | Deux onglets / écrasement de sauvegarde | Révision conditionnelle en base (conflit HTTP 409) | Tester transitions verrouillées, course entre lectures et mises à jour, messages utilisateur |
| T-09 | Mot de passe copié dans le presse-papiers | Copie manuelle et tentative de nettoyage après 60 s | Effacement conditionnel et non garanti ; historique du presse-papiers OS et autres applications |
| T-10 | Résultat « faible » abusivement rassurant | Vérifications décrites et « absence d'alerte ≠ sûr » | Sans réputation externe ni corpus annoté, l'estimation peut manquer de nombreuses fraudes |
| T-11 | Requête réseau non consentie ou transmission trop détaillée | Analyse du site initiée par l'utilisateur ; option RDAP par analyse | Pas de registre de consentement révocable par source ; URL complètes peuvent contenir des paramètres sensibles |
| T-12 | Journalisation imprudente de contenu sensible | Journal d'événements codés, contenu brut optionnel dans l'historique | Audit traces d'exception, logs process et contenu des réponses ; historique non chiffré |
| T-13 | DoS local : URL lente, body énorme, requêtes répétées | Timeouts réseau, limites de taille et débit API | Tester concurrence/threadpool, requêtes chunked, mémoire/disque, limites RDAP |
| T-14 | Dépendance npm/Python malveillante ou vulnérable | `package-lock.json`, audit npm production exécuté | Pas de verrouillage Python, pas de CI sécurisée ni de processus de patch documenté |
| T-15 | Installation/update trompeuse | Lanceur Windows `.cmd` local | Pas d'installateur signé, mise à jour authentifiée ni procédure de désinstallation |
| T-16 | Consentement/UI inaccessible entraînant une mauvaise action | Vues simples et expertes, avertissements, interface responsive | Tests seniors/assistive tech insuffisants ; « sûr » doit rester strictement contextualisé |

**Attention :** ce tableau énumère des **risques hypothétiques** et **lacunes constatées dans l'architecture**, pas une liste de vulnérabilités démontrées. Coter CVSS uniquement une faiblesse confirmée avec conditions d'exploitation.

## 5. Flux de données (vue simplifiée)

```text
UTILISATEUR
  ├─ colle un message ─────────> React → FastAPI → moteur de règles → rapport
  │                                                └─ SQLite historique (résumé, texte si choisi)
  ├─ saisit une URL ───────────> React → FastAPI → contrôles DNS/IP → HTTP(S) public
  │                                                   └─ HTML statique → rapport
  │                                 consentement RDAP ────> HTTPS RDAP + cache 24 h
  └─ crée un coffre/secret ────> React + WebCrypto
                                     │ secret en mémoire uniquement tant que nécessaire
                                     └─ enveloppe chiffrée → FastAPI → SQLite coffre

Presse-papiers OS <── copie volontaire depuis React
                          └─ tentative d'effacement à 60 s, sans garantie
```

## 6. Mesures actuelles et validations manquantes

Contrôles apparents dans le code : jeton API, contrôle des origines/hosts, CSP, validation d'IP publiques et redirections, chiffrement côté navigateur, révisions du coffre, absence d'analyse automatique des messages.

Vérifications qui **n'ont pas été démontrées** : revue complète XSS, pentest SSRF, sécurité contre programmes locaux, validation crypto indépendante, résistance aux rollbacks / XSS par dépendances, essais de restauration hors machine, validation terrain des verdicts, audit d'accessibilité complet et audit de mise à jour.

## 7. Périmètre et sécurité des tests d'audit

- Utiliser **uniquement des comptes et secrets factices** ; ne jamais utiliser le coffre personnel de l'utilisateur.
- Tester les URL sur environnements contrôlés et autorisés ; ne pas scanner des sites externes sans autorisation.
- Préserver les preuves sans divulguer de secrets, cookies de session, fichiers personnels ou adresse réelle.
- Reproduire les résultats sur Windows avec le serveur lié à `127.0.0.1`.
- En cas de faille critique confirmée, signaler au propriétaire avant publication d'une preuve d'exploitation.

## 8. Décisions ouvertes

1. Stratégie de sauvegarde chiffrée, authentification des exports et tests de restauration entre machines.
2. Réévaluation du KDF (Argon2id ?) et plan de migration compatible avec les coffres existants.
3. Séparation ou durcissement supplémentaire de l'interface et du coffre si l'analyse de pages tierces s'étend.
4. Liste blanche/autorisation persistante des sources externes, consentements révocables et transparence du flux.
5. Protection contre rollback du coffre / protection contre la perte du fichier.
6. Packaging Windows, signature de code, mise à jour et chiffrement éventuel de l'historique.

**Principe directeur :** priorité aux vulnérabilités confirmées et à la sauvegarde des données avant l'ajout de fonctionnalités nouvelles.
