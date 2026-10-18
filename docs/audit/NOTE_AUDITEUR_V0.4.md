# Note d'accompagnement à l'auditeur — PastaTshield V0.4

**Objet : demande d'audit de sécurité indépendant — application locale PastaTshield V0.4**

Bonjour,

Je vous transmets une archive de code source PastaTshield **identifiée par un commit Git**, afin de solliciter une revue de sécurité indépendante. Le projet est une **application alpha locale** (FastAPI et React) pour aider des utilisateurs français et belges à examiner des messages et des URL suspects ; il comprend un coffre expérimental de mots de passe, non destiné pour l'instant à une diffusion publique.

Le dossier comprend **111 tests backend**, **26 tests frontend**, huit fixtures qualitatives figées (quatre HTML, quatre messages FR/BE synthétiques), un `MANIFEST.json` avec empreintes SHA-256 contrôlées avant utilisation et une [matrice de couverture](QA_MATRIX_V0.4.md) différenciant automatisé, partiel, manuel et non couvert. Le [README d'audit](../../README-AUDIT-V0.4.md) fournit les commandes de reproduction depuis le ZIP, à commencer par le build frontend.

**Je sollicite en priorité votre expertise sur :** le SSRF et les redirections dans un réseau hostile (DNS rebinding, TTL et TLS/IP épinglée) ; les XSS/CSP dans un navigateur réel et les limites de l'analyse statique du HTML ; la cryptographie et la confidentialité du coffre (clés en mémoire, absence actuelle de sauvegarde/restauration chiffrée) ; l'API locale et les frontières de confiance ; ainsi que l'accessibilité réelle des parcours.

**Les preuves sont limitées :** les mocks DNS/HTTP ne remplacent pas un test de pénétration, la présence de CSP ne prouve pas l'absence de XSS, et les tests WebCrypto ne prouvent pas la résistance à un vol de mémoire. Aucun JavaScript suspect n'est exécuté par l'inspecteur et les exemples FR/BE ne constituent pas une mesure quantitative de faux positifs ou faux négatifs.

Playwright n'est pas encore intégré car l'UI alpha évolue ; les scénarios E2E prioritaires sont décrits pour être rejoués sur une base isolée et sans aucun secret réel. Un corpus statistiquement représentatif reste à construire et à annoter.

Je souhaite recevoir **des constats argumentés avec sévérité, préconditions d'exploitation, preuve reproductible et recommandations**, puis convenir des corrections et retests. Merci de préciser également les parties non examinées et les conditions nécessaires à toute éventuelle diffusion grand public.

**Ce dossier est préparé pour démarrer l'audit : il ne constitue ni un audit déjà réalisé, ni une certification.**

Cordialement,

L'équipe de développement PastaTshield

---

*Avant envoi, compléter le nom du destinataire et joindre l'archive exacte identifiée par son commit et son SHA-256. Ne jamais joindre les bases SQLite, secrets, coffres ou archives privées.*
