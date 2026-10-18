# PastaTshield V0.4 — Matrice de tests et de couverture QA

**État au 18 octobre 2026 — alpha locale, aucun audit indépendant réalisé.**

Cette matrice transpose la checklist de sécurité en **preuves disponibles**, **tests de non-régression automatisés** et **chantiers non couverts**. Les attentes sont alignées avec les comportements réellement implémentés, pas avec des spécifications théoriques qui n'existent pas encore.

## Légende

| Statut | Signification |
| --- | --- |
| **A — Automatisé** | Test exécutable dans le dépôt (sans accès à un site externe) |
| **P — Partiel** | Une facette est testée, mais pas toutes les conditions de sécurité pertinentes |
| **M — Manuel** | Scénario reproductible à réaliser, **sans preuve automatique à ce stade** |
| **N — Non couvert** | À implémenter ou à demander explicitement à l'auditeur |

La réussite d'un test signifie uniquement que **son assertion précise passe** dans l'environnement essayé. Elle ne prouve ni l'absence de vulnérabilité ni la conformité globale aux WCAG.

## 1. API locale, réseau et SSRF

| Priorité | Scénario | État | Source de preuve / limite |
| --- | --- | --- | --- |
| Critique | Jeton absent, vide ou incorrect → **403** | **A** | `backend/tests/test_audit_matrix.py::ApiSecurityMatrix.test_missing_and_wrong_session_tokens_are_forbidden` |
| Critique | `Host: evil.com` → **403** | **A** | `test_host_and_origin_denials` |
| Critique | `Origin: https://evil.com`, `Origin: null` → **403** | **A** | `test_host_and_origin_denials` |
| Haute | Appels 1–50 acceptés ; 51e requête → **429** et `Retry-After: 60` | **A** | `test_51st_request_returns_429_and_retry_after` (client simulé, 60 s de fenêtre) |
| Haute | JSON dépassant **100 000 octets** → **413** | **A** | `test_oversized_json_request_rejected_before_parsing` |
| Haute | POST `text/plain` → **415** | **A** | `test_wrong_content_type_rejected` |
| Haute | En-têtes CSP, `no-store` et `nosniff` sur API | **A** | `test_valid_api_response_has_csp_and_no_store_headers` ; ne démontre pas l'efficacité CSP dans un navigateur réel |
| Critique | SSRF : `127.0.0.1`, `192.168.x.x`, `10.x.x.x`, `169.254.169.254` refusés | **A** | `test_private_ip_and_non_http_protocols_denied` et `test_core.py` |
| Critique | `file://`, `ftp://`, `gopher://` refusés | **A** | `test_private_ip_and_non_http_protocols_denied` |
| Critique | DNS contenant une IP publique **et** une IP privée → refus | **A** | `test_mixed_dns_public_then_private_rejected` et `test_security.py` ; mock DNS, pas de réseau hostile réel |
| Critique | Redirection 302 vers `localhost` refusée **avant** le second fetch | **A** | `test_redirect_to_loopback_refused_before_next_request` |
| Critique | Connexion IP épinglée, SNI TLS, certificat distant et changement DNS après résolution | **P** | Implémentation `_PinnedHTTPS`, tests de résolution et de redirections ; **test d'attaque bout en bout et revue TLS à réaliser** |
| Haute | Fuite de jeton, requêtes Cross-Origin, CSRF/CORS dans navigateurs hostiles | **P** | Jeton/Host/Origin et CSP testés côté FastAPI ; scénarios intersites réels non automatisés |
| Haute | `Content-Length` absent ou mensonger, corps en flux, slowloris, attaques sur la limite | **P** | Corps > 100 Ko, lectures bornées et troncature HTML couverts ; tests de flux HTTP adverses incomplets |

## 2. Moteur de règles FR/BE

| Priorité | Scénario | État | Source de preuve / limite |
| --- | --- | --- | --- |
| Haute | « Bonjour, colis de La Poste » sans lien → **Faible** | **A** | `test_legitimate_colis_without_link_is_low` |
| Haute | Article Ameli sur `lemonde.fr` → **Faible** | **A** | `test_legitimate_ameli_article_on_news_site_is_low` |
| Critique | Demande du code SMS/OTP → **Critique** | **A** | `test_otp_request_remains_critical` |
| Haute | Domaine `ameli-remboursement.example` dans un message Ameli → **Élevé** | **A** | `test_imitation_domain_is_detected_but_not_looked_up` ; aucun réseau/reputation externe interrogé |
| Haute | URL `wa.me` seule → **Faible** | **A** | `test_whatsapp_alone_does_not_raise_fraud_alarm` |
| Haute | URL `wa.me` + investissement garanti → **Élevé** | **A** | `test_whatsapp_investment_context_is_suspicious` |
| Moyenne | Mode Standard ignore « urgence » ; Renforcé applique la règle | **A** | `test_standard_excludes_urgency_rule_renforce_includes_it` |
| Moyenne | Message « Bonjour » → **Indéterminé** | **A** | `test_short_message_indeterminate` |
| Haute | Constats issus des règles JSON : `id`, `version`, `title`, `severity`, `reason` | **A** | `test_versioned_declarative_findings_are_traceable` |
| Haute | **Tous** les constats, y compris liens raccourcis / WhatsApp / domaines imités, possèdent `id` et `version` | **N** | **Écart actuel :** les constats heuristiques sont produits sans ces champs. À corriger avec schéma versionné avant de promettre une traçabilité universelle |
| Critique | Mesures de faux positifs/faux négatifs sur corpus représentatif anonymisé FR/BE | **N** | Quelques scénarios synthétiques uniquement ; aucun taux de détection fiable ni seuil de référence |

## 3. Analyse URL, HTML et RDAP

| Priorité | Scénario | État | Source de preuve / limite |
| --- | --- | --- | --- |
| Haute | HTTP 200, HTML simple → inspection « effectué » | **A** | `test_200_html_reports_completed_inspection` |
| Haute | HTML 1,5 Mo → lecture bornée, taille « partiel » et pas de verdict rassurant abusif | **A** | `backend/tests/test_large_pages.py` (1 Mo + 1 octet témoin) |
| Haute | `Content-Type: image/png` → HTML « non vérifié », risque **Indéterminé** | **A** | `test_non_html_reports_unchecked_and_indeterminate` |
| Haute | HTTP **404/500** → **Indéterminé** | **A** | `test_http_404_and_500_never_become_green` |
| Haute | `socket.timeout` et `ssl.SSLError` → **Indéterminé** | **A** | `test_socket_timeout_and_tls_errors_result_indeterminate` |
| Haute | HTML `input[type=password]`, carte, IBAN, action HTTP | **A** | `backend/tests/test_html_corpus.py` ; HTML fictif, sans JavaScript exécuté |
| Haute | `<base href="https://evil.example.com/">` fait résoudre le `src` relatif vers le domaine externe | **A** | `test_base_href_is_respected_for_external_scripts` |
| Haute | Formulaire de recherche Wikipédia → pas d'alerte injustifiée | **A** | Snapshot réel `backend/tests/fixtures/wikipedia.html`, SHA-256 fixé |
| Haute | Formulaire HTTPS avec mot de passe seul → pas de condamnation automatique | **A** | `backend/tests/fixtures/formulaire-legitime.html` |
| Haute | Cache RDAP : second appel sans requête réseau | **A** | `test_rdap_cache_avoids_second_network_call` (mock de la source) |
| Haute | Suffixe `sub.example.co.uk` → domaine enregistrable `example.co.uk` | **A** | `test_rdap_multilevel_public_suffix` |
| Critique | Aucun RDAP sans consentement explicite | **A** | `test_no_rdap_contact_without_user_consent` |
| Critique | Anti-SSRF RDAP à travers redirections, certificats et flux hostiles | **P** | Contrôles communs ; audit manuel redirection et résolution obligatoire |
| Haute | Sites réels Cloudflare / CAPTCHA / JS requis / pages lentes | **M** | Vérifier la bonne mention « non vérifié », sans contourner les protections des sites |
| Haute | Contenu HTML obfusqué, encodages inattendus, bases malicieuses, charset non UTF-8 | **N** | Parsing statique ; couverture non exhaustive |
| Critique | Scanner le comportement de JavaScript malveillant | **N** | Hors périmètre actuel : référence aux scripts, **pas** analyse comportementale |

## 4. Coffre et cryptographie

| Priorité | Scénario | État | Source de preuve / limite |
| --- | --- | --- | --- |
| Critique | Création, chiffrement AES-GCM, ouverture par phrase maître | **A** | `frontend/tests/crypto.test.mjs`, `securityMatrix.test.mjs` |
| Critique | Mauvaise phrase maître ou clé de secours → échec | **A** | `crypto.test.mjs` |
| Critique | Clé de secours correcte → déverrouillage | **A** | `crypto.test.mjs` |
| Critique | Altération du `content.data` chiffré → erreur d'intégrité | **A** | `crypto.test.mjs` |
| Critique | Clé AES du coffre non exportable par WebCrypto | **A** | `securityMatrix.test.mjs` ; ne garantit pas absence de secrets en mémoire JS |
| Haute | Enveloppe contient `kdf.salt`, `wrapped_key.iv`, `content.iv` ; jamais le mot de passe en clair | **A** | `securityMatrix.test.mjs` ; `test_vault.py` |
| Haute | Validation d'enveloppe : sel absent, algorithme et format invalides → **422** (API) / `ValueError` | **A** | `test_api_rejects_invalid_envelopes_with_422`, `test_missing_salt_unknown_kdf_and_bad_format_rejected` |
| Haute | Enveloppe au-delà de **90 000 octets** → rejet | **A** | `test_oversized_encrypted_payload_rejected` |
| Critique | Deux modifications avec la même révision → une réussit, l'autre reçoit **409** | **A** | `test_concurrent_same_revision_only_one_update_succeeds` au niveau SQLite ; appels PUT HTTP simultanés non reproduits |
| Moyenne | Génération : 16 et 64 caractères, majuscules, minuscules, chiffres, symboles | **A** | `frontend/tests/securityMatrix.test.mjs` |
| Moyenne | Phrase de passe : 7 mots séparés par des tirets | **A** | `frontend/tests/securityMatrix.test.mjs` |
| Moyenne | Estimation `123456` → Faible, chaîne longue variée → « Fort (estimation) » | **A** | `securityMatrix.test.mjs`. **Attention :** `MonSuperMotDePasse!2026` reste **Faible**, car motif commun détecté : ne pas forcer « Fort » dans un test |
| Haute | Maximum 100 entrées ; 101e rejetée | **A** | `securityMatrix.test.mjs` |
| Critique | Export et restauration chiffrés testés sur un autre ordinateur | **N** | **Fonctionnalité non développée**, prioritaire avant distribution |
| Critique | XSS, mémoire des secrets, effacement du presse-papiers et logs réseau | **P** | Tests crypto locaux + tests de présence du timer ; revue humaine/dynamique requise |

## 5. Accessibilité / expérience et bout en bout

| Priorité | Scénario | État | Source de preuve / limite |
| --- | --- | --- | --- |
| Haute | Jetons de texte : contraste **≥ 4,5:1** | **A** | `frontend/tests/style.test.mjs` ; jetons, **pas** chaque paire de couleurs réelles |
| Haute | Couleurs d'icônes et contour de focus : contraste **≥ 3:1** sur les surfaces définies | **A** | `style.test.mjs` ; pas une certification WCAG complète |
| Haute | Lexend local, absence d'Inter/Atkinson actifs | **A** | `style.test.mjs` |
| Haute | Corps 17 px ; menu/boutons 16 px ; focus visible | **A** | Assertions CSS dans `style.test.mjs` |
| Haute | `prefers-reduced-motion: reduce` | **A** | Présence des styles ; **l'effet perceptuel réel reste à tester** |
| Haute | Accueil → Analyser → rapport avec verdict et vue experte | **M** | Parcours manuel guidé ci-dessous ; automatisation Playwright à ajouter |
| Haute | Analyse → Historique → effacer tout | **M** | Ne jamais effectuer sur la vraie base d'un utilisateur |
| Critique | Coffre créer → générer → enregistrer → verrouiller → déverrouiller | **M** | Utiliser une **base SQLite éphémère**, jamais de vrais secrets |
| Moyenne | Copie d'un mot de passe → minuteur 60 secondes → effacement tenté | **P** | Contrôle statique CSS/JS ; le système d'exploitation peut conserver l'historique du presse-papiers |
| Haute | Navigation uniquement par Tab, focus visible sur tous les contrôles | **M** | Inspecter avec vrai navigateur, test clavier et lecteur d'écran |
| Haute | Zoom 200 % / 400 %, reflow mobile à 320 px, lecteurs d'écran, seniors | **N** | Revue accessibilité et tests utilisateurs à organiser |
| Haute | E2E automatisés sur base isolée avec Playwright | **N** | `playwright` non ajouté pour éviter une nouvelle dépendance lourde avant l'audit |

### Scénarios E2E manuels à exécuter sur un environnement isolé

**Prérequis :** décompresser une **copie du ZIP source dans un dossier de test séparé**, créer ses dépendances et compiler le frontend dans cette copie, puis démarrer FastAPI depuis celle-ci. Vérifier que le chemin des bases SQLite de test pointe dans cette copie et non vers `D:\\Pastachi\\data`. Utiliser un navigateur de test ; ne jamais purger l'historique ou le coffre réels.

1. **Analyse de message :** ouvrir l'accueil, aller dans « Analyser », coller « Votre colis est bloqué, payez les frais ici https://colis-laposte-paiement.example/ », lancer l'analyse. Attendu : verdict basé sur les règles et traces visibles, sans appel au domaine mentionné dans le message.
2. **Historique :** créer une analyse *fictive*, ouvrir « Historique », retrouver le résumé, effacer l'historique. Attendu : liste vide ; cache RDAP local vidé. **Attention : suppression irréversible de la base de test uniquement.**
3. **Coffre :** créer une phrase maître fictive longue, générer un secret de test, enregistrer, verrouiller et déverrouiller. Attendu : secret identique après déchiffrement, mais absent des appels réseau et du SQLite en clair.
4. **Presse-papiers :** copier un secret factice, vérifier l'affichage du compte à rebours de 60 secondes et le résultat affiché. Ne jamais garantir la suppression de l'historique système.
5. **Clavier :** parcourir l'accueil, l'analyse, les sites officiels et les paramètres **uniquement par Tab et Shift+Tab** ; vérifier l'ordre logique, le contour visible et l'absence de piège clavier.
6. **Accessibilité :** essayer à 200 % de zoom, réduire les animations via le système puis parcourir les pages sans perte de contenu ou action critique cachée.

### Commandes de vérification automatique (Windows)

**D'abord compiler le frontend** (le test API du favicon dépend du répertoire `frontend/dist`) :

```powershell
cd frontend
npm ci
npm run build
npm run test:all
cd ..

.\backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -q
.\backend\.venv\Scripts\ruff.exe check backend/app backend/tests --select E4,E7,E9,F
```

Pour exécuter les nouveaux tests seulement :

```powershell
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -p test_audit_matrix.py -v
cd frontend
npm run test:security
```

**Séparation des preuves :** les tests ci-dessus utilisent des mocks réseau et des bases éphémères ; ce sont des tests unitaires/d'intégration locale. `npm audit` nécessite des métadonnées publiques du registre npm et n'est pas équivalent à un test local hors réseau. Les scénarios E2E, la sécurité navigateur et les essais contre des serveurs réels autorisés sont un chantier distinct.

## 6. Décision d'audit

Cette matrice est un **plan de vérification**, pas un certificat de qualité ni une mesure de couverture du code en pourcentage. Avant toute bêta publique, demander au minimum à l'auditeur :

- une revue SSRF réseau adversarial (DNS rebinding et redirections, TLS/IP pinning), des formats et encodages HTTP ;
- une revue XSS/CSP, du stockage navigateur des secrets et des logs ;
- une revue des métadonnées manquantes dans les constats heuristiques ;
- une analyse cryptographique du coffre, un protocole de **sauvegarde/restauration chiffrée** et une preuve de restauration sur une autre machine ;
- des E2E isolés, une base de messages FR/BE anonymisés plus grande et un contrôle accessibilité WCAG sur composants réels.

**Livrable attendu :** vulnérabilités prouvées avec gravité, conditions d'exploitation, corrections, tests de régression et retests indépendants.
