# PastaTshield — Architecture et livraison V0.3

**Date :** 18 octobre 2026
**Statut :** alpha locale expérimentale, non homologuée comme gestionnaire de mots de passe.
**Dépôt principal :** `Pastatchi` — produit `PastaTshield`.

## Changelog de la version 0.3

- Refonte de l'interface selon la proposition « Dark Professional » : bleu nuit, surfaces opaques, accent bleu, planète très atténuée, cartes et navigation assagies.
- Nouvelle page **Mots de passe**, accessible depuis la navigation.
- Générateur de mots de passe aléatoires (16 à 40 caractères via l'interface, algorithme jusqu'à 64) avec répartition lettres/chiffres/symboles.
- Générateur de phrases aléatoires **7 mots français sur une liste BIP39 de 2 048 mots** : ~77 bits d'entropie nominale, sans la promesse trompeuse qu'une phrase choisie librement serait équivalente.
- Saisie manuelle et estimation de robustesse heuristique, clairement indiquée comme estimation.
- Coffre local chiffré côté navigateur, avec phrase maître, clé de secours, historique des accès, recherche, copie, suppression et détection des mots de passe réutilisés.
- Confirmation explicite avant la réutilisation volontaire d'un mot de passe sur un autre site.
- Renouvellement de la phrase maître ; en cas de récupération, génération d'une nouvelle clé de secours.
- Verrouillage après cinq minutes sans interaction lorsque le coffre est ouvert, et expiration de l'écran de sauvegarde du code de secours.
- Tests d'API du coffre et tests WebCrypto.

## Architecture et flux de secret

```text
[ Utilisateur ]
    │ Saisie, génération, phrase maître / secours
    ▼
[ React / navigateur sur localhost ]
    │ crypto.getRandomValues
    │ PBKDF2-SHA256 -> clé d'enveloppement (600 000 itérations)
    │ AES-GCM -> clé de données 256 bits aléatoire
    │ AES-GCM -> chiffré du contenu JSON {entries: [...]}
    │
    ▼ chiffré, sels et IV uniquement
[ FastAPI /api/v1/vault sur 127.0.0.1:8000 ]
    │ contrôle de session, Host/Origin, taille, débit
    ▼
[ SQLite data/vault.sqlite3 ]
```

Toutes les métadonnées d'une entrée (**nom du site, URL, domaine, identifiant, mot de passe**) sont dans le bloc chiffré. Le backend ne connaît ni la phrase maître ni le contenu des entrées. Un numéro de révision est vérifié côté serveur pour éviter les écrasements entre onglets.

Une clé de secours aléatoire de 256 bits protège la même clé de données par un second enveloppement. Elle est affichée au moment de la création puis lors d'un renouvellement. La récupération permet d'ouvrir le coffre et de définir une nouvelle phrase maître. **La clé de secours ne reconstitue PAS les données si le fichier SQLite chiffré a été perdu**. Des sauvegardes chiffrées restent à concevoir.

## Choix techniques divergents de la proposition

- La proposition évoquait **Argon2**. Pour cette alpha, WebCrypto natif est utilisé avec **PBKDF2-SHA256 / 600 000 itérations** afin d'éviter une dépendance cryptographique WASM non auditée. L'usage d'Argon2id reste à étudier avant une diffusion publique.
- La proposition suggérait 3–4 mots aléatoires ; la V0.3 emploie **7 mots sur 2 048**, afin de ne pas affaiblir la protection.
- Les favicons ne sont **pas téléchargés** depuis les domaines tiers. Une icône locale (initiale du site) est affichée ; cela évite les requêtes non nécessaires et de nouveaux risques SSRF.
- L'effacement du presse-papiers après 60 secondes est **une tentative conditionnelle** : le navigateur doit autoriser sa lecture et le contenu ne doit pas avoir changé. L'historique du presse-papiers du système ne peut pas être garanti effacé.
- L'estimation « Faible / Moyen / Fort » ne constitue pas une mesure cryptographique ni un audit contre les mots de passe compromis. Aucune interrogation externe de secrets n'est effectuée.
- Le coffre enregistre les éléments comme un **seul document chiffré** plutôt qu'une ligne SQL par compte : noms des sites et identifiants restent chiffrés eux aussi, mais cette version est limitée à 100 entrées et ne propose pas d'index SQL par site.

## Routes

- `GET /api/v1/vault` : existence, révision, enveloppe chiffrée.
- `PUT /api/v1/vault` : remplacement conditionnel et validation des champs chiffrés.
- `DELETE /api/v1/vault` : suppression définitive du document chiffré.

Le coffre est **distinct de l'historique des analyses**. « Effacer l'historique » ne doit pas supprimer les mots de passe ; la suppression du coffre demande deux confirmations.

## Tests de validation

- `backend/tests/test_vault.py` : structure, paramètres cryptographiques, conflits de révision, autorisation, suppression.
- `frontend/tests/crypto.test.mjs` : génération, ouverture, clé de secours, changement de phrase maître, détection de corruption AES-GCM.
- Tests backend historiques conservés, contrôle Ruff, compilation Vite.
- Essais intégrés dans Chromium local avec données factices ; coffre de test supprimé après essai.

## Limites / sécurité

- **Logiciel alpha non audité**, impropre au stockage de secrets irremplaçables ou professionnels sans autre solution de sauvegarde.
- Pas de synchronisation, import/export de coffre, sauvegarde chiffrée automatisée, extension ni remplissage automatique.
- Aucun fournisseur d'IA ou de réputation ne reçoit les mots de passe.
- Toute faille XSS dans la même origine pourrait exposer les secrets déchiffrés en mémoire pendant une session ouverte : audit CSP, dépendances et interface requis avant diffusion.
- Les mots de passe copiés peuvent être conservés dans des historiques du système. La confidentialité du presse-papiers ne peut pas être garantie.
- Le chiffrement n'empêche pas un malware présent sur l'appareil de lire les secrets pendant leur saisie ou leur utilisation.
- La phrase maître n'est pas récupérable depuis le serveur. La clé de secours doit être conservée hors de l'appareil.
- Aucune licence publique n'a été définie par le propriétaire du projet.

**Règle de commercialisation :** ne pas annoncer une sécurité « zéro connaissance certifiée », « inviolable » ou une protection totale avant validation externe.
