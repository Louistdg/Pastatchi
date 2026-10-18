# Questionnaire de cadrage — audit indépendant PastaTshield V0.4

**Statut : réponses préparatoires du mainteneur, à vérifier par l'auditeur.** 19 octobre 2026.

| Question attendue | Réponse connue / preuve | Demande explicite à l'auditeur |
| --- | --- | --- |
| Que doit-on auditer ? | Backend FastAPI local, protections URL/SSRF, moteur HTML et messages, frontend React, coffre AES-GCM/WebCrypto, répertoire FR/BE. Révision identifiée par le commit du ZIP. | Définir périmètre, effort, méthode, exclusions et priorisation par sévérité. |
| Ces tests sont-ils une certification ? | **Non.** Ils valident des assertions déterministes. La matrice A/P/M/N distingue automatisé, partiel, manuel et non couvert. | Fournir constats reproductibles, gravité, preuves, correction et retest. |
| Que prouvent les tests DNS / SSRF ? | Ils simulent DNS public + privé, URL locales interdites, redirection vers localhost, réponses HTTPS contrôlées. Pas d'environnement réseau hostile réel. | Vérifier DNS rebinding (TTL court), TOCTOU, IP épinglée et SNI/TLS, redirections, HTTP malformé, compression et limites mémoire. |
| Le navigateur vérifie-t-il les scripts dangereux ? | **Non.** Le backend inspecte du HTML statique et relève certaines ressources `<script src>`. Une chaîne `eval(...)` dans une fixture **inerte** n'est pas exécutée ni classée malveillante. | Tester XSS, CSP réelle, formulaires JS dynamiques, extensions, requêtes déclenchées et exfiltration possible. |
| Un lien officiel dans un SMS est-il authentique ? | **Non.** Deux messages de référence FR/BE sont synthétiques. Aucun expéditeur n'est authentifié par le contenu collé. | Étudier homoglyphes/IDN, usurpation de l'expéditeur, contexte et faux positifs. |
| Le corpus permet-il un taux de détection ? | **Non.** Huit fixtures sont des régressions qualitatives (une capture HTML réelle, sept synthétiques), manifestes et SHA vérifiés. | Définir une campagne quantitative séparée avec données consenties et vérité terrain annotée. |
| Le coffre est-il prêt pour des secrets réels ? | Prototype expérimental, chiffrement navigateur AES-GCM et PBKDF2 ; tests de tamper, récupération et concurrence. **Pas d'export/restauration chiffrés** et aucune revue indépendante. | Étudier KDF, stockage local, XSS, clés en mémoire, journaux, presse-papiers et sauvegardes. |
| Pourquoi pas Playwright ? | Dépendance non ajoutée pour ne pas figer des E2E sur une UI alpha encore mouvante. Parcours critiques décrits dans la matrice pour environnement à base SQLite **jetable**. | Proposer E2E priorisés à automatiser avant bêta ; ne pas effacer les données utilisateur du mainteneur. |
| Quels résultats d'accessibilité ? | Contraste calculé de jetons, police locale Lexend, focus CSS et `prefers-reduced-motion` testés. **Pas de validation WCAG globale**. | Examiner réels composants, Tab/Shift+Tab, lecteurs d'écran, zoom, seniors, Safari et timers de copie. |
| Les dépendances sont-elles reproductibles ? | `frontend/package-lock.json` et `npm ci` contrôlés ; les versions Python sont **déclarées en plages**, non verrouillées. | Évaluer SBOM, reproductibilité Python, provenance et chaîne d'approvisionnement. |
| L'application distribue-t-elle un installateur signé ? | **Non.** FastAPI + React sont lancés localement, Tauri est une piste future. | Définir prérequis de signature, isolation du backend, mise à jour et désinstallation propres. |
| Peut-on reproduire depuis le ZIP ? | `README-AUDIT-V0.4.md` précise de compiler le frontend **avant** les tests backend (favicon). Archive produite avec `git archive`, données privées exclues par construction, test d'extraction réalisé. | Rejouer les commandes sur un autre système, préciser les écarts de dépendances et fournir les logs. |
| Quel est le contrat d'audit ? | Aucun examen indépendant encore reçu. V0.4 est **une archive à examiner**, pas une approbation publique. | Établir autorisation écrite, environnement, protection des données, délais, restitution et retest. |

## Questions ouvertes à résoudre pendant l'audit

1. Comment résiste le transport `_PinnedHTTPS` à un certificat renouvelé ou remplacé pendant la session, à un DNS rebinding à TTL faible et aux redirections successives ?
2. Le frontend peut-il révéler une clé ou des identifiants en mémoire sous une attaque XSS/extension, malgré la CSP et WebCrypto ?
3. Les mécanismes RDAP consentis ne déclenchent-ils aucun appel non sollicité en cas d'échec, redirection ou cache malformé ?
4. Quels contrôles contre homoglyphes/IDN, champs cachés et JavaScript dynamique sont rentables sans surpromettre la détection ?
5. Quels scénarios E2E, tests de sauvegarde chiffrée/restauration et usages seniors doivent bloquer la bêta ?
6. Le minuteur de presse-papiers est-il correctement présenté sur les systèmes et navigateurs concernés, notamment Safari (non testé) ?

**Références :** [matrice QA](QA_MATRIX_V0.4.md), [README de l'audit](../../README-AUDIT-V0.4.md), [manifest des fixtures](../../backend/tests/fixtures/MANIFEST.json), [modèle de menaces](../../THREAT_MODEL.md).

**Critère de sortie :** rapport signé/nominatif selon le contrat, constats reproductibles et hiérarchisés, corrections, retests indépendants, et décision documentée sur la diffusion. Un résultat « aucun constat » ne certifie jamais les parties exclues du périmètre.
