# PastaTshield — travaux à prévoir

## V0.4 — dette technique CSS / accessibilité

- [ ] **Consolider les feuilles de style** `frontend/src/styles.css` et `frontend/src/design-system.css` : supprimer les règles dupliquées et les anciennes couleurs « cyber », puis limiter `!important` aux cas réellement indispensables. Conserver les jetons officiels de `design-system.css` et vérifier chaque écran à chaque étape.
- [ ] **Tests d'accessibilité réels** : navigation au clavier, lecteur d'écran, zoom à 200 % / 400 %, reflow à 320 px, taille des cibles et contraste effectif de tous les composants (pas seulement les jetons CSS), y compris états hover/focus/disabled.
- [ ] **Tests avec des utilisateurs** : évaluer la lisibilité de Lexend, les textes de verdict et les scénarios de prudence auprès de personnes de 60 ans et plus, sans supposer qu'une police est universellement optimale.
- [ ] **Cas de figures particuliers** : textes longs, messages d'erreur, langues et accents, listes de domaines et mots de passe sur écrans étroits.
- [ ] **Couleurs sémantiques** : ne jamais représenter un risque uniquement par une couleur ; éviter tout message « sûr » absolu pour un verdict faible.

## Priorités de sécurité inchangées avant diffusion publique

- [ ] Faire réaliser l'audit indépendant du frontend (XSS/CSP/secret en mémoire), de l'API locale et des vérifications URL/SSRF.
- [ ] Implémenter et tester une sauvegarde/export et restauration **chiffrés et authentifiés** du coffre, y compris sur un autre ordinateur.
- [ ] Verrouiller les dépendances Python, mettre en place les contrôles de sécurité reproductibles et la CI.
- [ ] Construire et valider un corpus de messages FR/BE annotés, puis améliorer les faux positifs/négatifs.
- [ ] Ajouter des sources de réputation uniquement avec transparence et consentement granularisé.
- [ ] Préparer un installateur Windows signé, des mises à jour vérifiées et une désinstallation respectant les données locales.

**Note :** un build réussi et des tests de contraste de jetons ne suffisent pas à qualifier l'application d'accessible ni de prête pour une distribution grand public.
