# Mandat et livrables attendus de l'audit de PastaTshield

**Projet :** V0.3 alpha locale, code source au commit `57a4b01b1c290aab355f039e1d3f3a59bf80dbb9`.

## 1. Périmètre

Auditer le code Python et JavaScript communiqué, les dépendances, l'API locale, les contrôles SSRF, la confidentialité des rapports et la cryptographie du coffre. Réaliser des tests dynamiques **en laboratoire isolé**, avec fausses données et domaines de test autorisés.

La conformité totale à une certification, une validation officielle de sécurité, un déploiement cloud, un service mobile natif et la sécurité des systèmes tiers ne font **pas** partie du périmètre actuellement démontrable.

## 2. Forme du rapport attendu

Pour chaque **vulnérabilité confirmée**, consigner :

| Champ | Attendu |
| --- | --- |
| Identifiant | `PTS-SEC-001` etc. |
| Sous-système | Frontend/CSP, coffre, API locale, URL/SSRF, données, dépendances |
| Gravité | Critique / Élevée / Modérée / Faible / Information |
| Score CVSS | Uniquement si une faille exploitable est confirmée et que le vecteur est justifiable |
| Prérequis | Attaquant réseau, même navigateur, programme local, disque volé, etc. |
| Comportement observé | Conditions de déclenchement et résultat mesuré |
| Impact | Confidentialité, intégrité et/ou disponibilité |
| Preuve | Étapes **reproductibles en environnement contrôlé**, sans secret réel |
| Correctif | Mesure concrète et idéalement test de non-régression |
| Statut | À confirmer / Confirmée / À corriger / Corrigée / Retest validé |

**Distinguer** les failles prouvées des limites fonctionnelles (absence de sauvegarde, pas d'installateur, sources de réputation absentes), des risques théoriques et des bonnes pratiques recommandées.

## 3. Domaines de revue obligatoires

1. **Cryptographie** : AES-GCM, IV/sels, authentification des métadonnées, PBKDF2, phrase maître, récupération, rotation, comparaison des révisions, effacement mémoire (dans les limites du JavaScript) et exposition au presse-papiers.
2. **API locale** : token bootstrap, CSRF, vérification Host/Origin, CSP, CORS, navigateur hostile, attaque par un programme local, débit et taille.
3. **URL / SSRF** : DNS/IP épinglés, URL/parser, IPv6, DNS rebinding, redirections, TLS, fichiers volumineux, latence, services de métadonnées, droits réseau.
4. **Frontend** : XSS/DOM injection, rendu de contenu hostile, liens, dépendances React/npm, variables de secrets, erreurs et journaux.
5. **Vie privée** : historique, durée de conservation, consentement RDAP et transmission d'URL complètes, absence de consentement persistant révocable, logs.
6. **Qualité de détection** : corpus FR/BE/WhatsApp annoté, erreurs de classement, non-régression, absence de réputation, limites du HTML statique.
7. **Chaîne de distribution** : dépendances, verrouillage Python, build, signature, mise à jour, désinstallation et données locales.
8. **Sauvegarde** : projet de format d'export chiffré authentifié, restauration sur un autre ordinateur, gestion des interruptions, compatibilité et corruption.

## 4. Livrables techniques

- Rapport exécutif (risques majeurs, blocages de publication et priorisation).
- Rapport technique détaillé avec preuves reproductibles et matrice de sévérité.
- Proposition de correctifs et tests associés ; liste des correctifs à retester.
- Avis sur la **conception du coffre** et sur la sauvegarde avant tout usage réel.
- Compte rendu des tests non réalisés et des accès/artefacts manquants.
- Recommandation explicite quant au statut « **non prêt à être distribué / correctifs requis / revue supplémentaire** ».

## 5. Critères minimaux avant une diffusion au public

Ce ne sont pas des obligations certifiantes, mais des **conditions de sortie du statut alpha** à négocier avec l'auditeur :

- Aucune vulnérabilité critique ou élevée ouverte dans le périmètre déclaré.
- Restaurer un export chiffré **sur un second poste** avec échec sûr si les données sont falsifiées.
- Démontrer la protection des principales frontières (XSS/CSP, API localhost, SSRF).
- Documenter précisément les limites « risque faible », « non vérifié » et les données transmises aux tiers.
- Refaire les tests unitaires/intégration, plus tests de sécurité ciblés et corpus de non-régression.
- Distribuer un build installable, maintenable, signé et mis à jour de manière sûre, sans modifier silencieusement la portée des consentements.

## 6. Confidentialité de l'échange avec l'auditeur

L'auditeur utilise uniquement les données factices fournies ou créées pour le test. Toute faille grave non corrigée devra être transmise **au propriétaire du projet** avant sa divulgation publique ; éviter l'exposition de preuves exploitables, de mots de passe, de jetons ou de données d'utilisateurs.

**Important :** ni ce mandat ni les contrôles automatisés du projet ne constituent un audit indépendant effectivement réalisé.
