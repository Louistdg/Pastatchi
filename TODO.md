# PastaTshield — travaux à prévoir

## V0.4 — dette technique CSS / accessibilité

- [ ] **Consolider les feuilles de style** `frontend/src/styles.css` et `frontend/src/design-system.css` : supprimer les règles dupliquées et les anciennes couleurs « cyber », puis limiter `!important` aux cas réellement indispensables. Conserver les jetons officiels de `design-system.css` et vérifier chaque écran à chaque étape.
- [ ] **Tests d'accessibilité réels** : navigation au clavier, lecteur d'écran, zoom à 200 % / 400 %, reflow à 320 px, taille des cibles et contraste effectif de tous les composants (pas seulement les jetons CSS), y compris états hover/focus/disabled.
- [ ] **Tests avec des utilisateurs** : évaluer la lisibilité de Lexend, les textes de verdict et les scénarios de prudence auprès de personnes de 60 ans et plus, sans supposer qu'une police est universellement optimale.
- [ ] **Cas de figures particuliers** : textes longs, messages d'erreur, langues et accents, listes de domaines et mots de passe sur écrans étroits.
- [ ] **Couleurs sémantiques** : ne jamais représenter un risque uniquement par une couleur ; éviter tout message « sûr » absolu pour un verdict faible.

## Maintenance du nouveau répertoire de sites (V0.4)

- [ ] Programmer une revue documentaire régulière des **24 adresses FR/BE** (fonctionnement, domaine, changement de propriétaire, redirections, source officielle).
- [ ] Définir un processus de retrait rapide d'une adresse douteuse et de publication/mise à jour des listes **sans téléchargement arbitraire ni affaiblissement des consentements**.
- [ ] Élargir après vérification aux banques, mutuelles et opérateurs courants, en évitant les homonymes et les URLs non confirmées.
- [ ] Faire tester la recherche avec des seniors, y compris les fautes d'orthographe, l'annonce des suggestions et la visibilité des avertissements.
- [ ] Mettre en place une revue de sécurité différentielle du répertoire V0.4 : validation des sources, comportements des liens, UI/XSS et URL présentées.

## Couverture des tests et traçabilité (avant la bêta)

- [ ] **Harmoniser la traçabilité des constats heuristiques** du moteur de messages (`analyzer.py`) : `id` et `version` manquent pour certains liens raccourcis, invitations WhatsApp et domaines imités. Ne pas déclarer tous les constats versionnés avant correction.
- [ ] **Tests d'attaque bout en bout du transport** : DNS rebinding/TOCTOU dans un labo isolé, IP épinglée et SNI, réponses HTTP hostiles, protection locale depuis une page Web tierce.
- [ ] **Parcours E2E Playwright sur base jetable** : analyse, historique, coffre et presse-papiers, clavier, zoom et lecteurs d'écran. Ne jamais effacer les données réelles pendant des tests.
- [ ] **Valider et étendre la matrice QA** `docs/audit/QA_MATRIX_V0.4.md` : documenter les écarts, leur gravité et les retests.

## Priorités de sécurité inchangées avant diffusion publique

- [ ] Faire réaliser l'audit indépendant du frontend (XSS/CSP/secret en mémoire), de l'API locale et des vérifications URL/SSRF.
- [ ] Implémenter et tester une sauvegarde/export et restauration **chiffrés et authentifiés** du coffre, y compris sur un autre ordinateur.
- [ ] Verrouiller les dépendances Python, mettre en place les contrôles de sécurité reproductibles et la CI.
- [ ] Construire et valider un corpus de messages FR/BE annotés, puis améliorer les faux positifs/négatifs.
- [ ] Ajouter des sources de réputation uniquement avec transparence et consentement granularisé.
- [ ] **Cible desktop : Tauri v2 (après audit et sauvegarde)**. Prototype Windows avec frontend React, backend Python embarqué comme processus auxiliaire (*sidecar*) compilé, WebView2, emplacement des données dans le profil utilisateur, communication locale contrôlée, démarrage/arrêt propres et protection XSS/CSP revérifiée.
- [ ] Distribuer un installateur Windows NSIS `.exe` ou MSI, signer le code et les mises à jour, prévoir WebView2 et tester une installation/désinstallation sur PC vierge sans Python/Node installés.
- [ ] Ensuite seulement évaluer macOS `.app`/DMG avec build et notarisation spécifiques, puis une extension navigateur limitée et auditable ; l'application mobile reste une phase distincte.

**Note :** un build réussi et des tests de contraste de jetons ne suffisent pas à qualifier l'application d'accessible ni de prête pour une distribution grand public.
