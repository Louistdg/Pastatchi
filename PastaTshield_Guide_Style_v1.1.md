# PastaTshield — Guide de style et identité visuelle

**Version :** 1.1 — révision lisibilité et contraste

**Changelog 1.1 :** Atkinson Hyperlegible Next est la police d'interface et de titres (meilleure distinction des caractères) ; corps de lecture 17 px/27 px, navigations et formulaires 16–17 px ; primaire de boutons assombri à `#2563EB` pour augmenter le contraste du texte blanc. Le monogramme PastaTshield conserve Space Grotesk. Le déploiement n'est pas un audit WCAG complet.
**Date :** 18 octobre 2026
**Statut :** référence officielle pour l'interface PastaTshield
**Objectif :** « Dark Professional », sobre, rassurant, accessible, inspiré de la rigueur visuelle de Linear et Vercel.

## 1. Identité de marque

- **Nom complet dans la sidebar et dans l'application :** PastaTshield.
- **Monogramme :** le **T-Bouclier**, une lettre T géométrique enchâssée dans un bouclier simplifié, monochrome, sans néon.
- **Sidebar :** symbole de 28 px + mot-symbole `PastaTshield` de 15 px en Space Grotesk semi-bold, avec le T accentué par sa graisse.
- **Favicon / icône :** symbole seul sur un carré arrondi bleu nuit.
- **Mobile :** symbole seul dans l'en-tête ; nom complet dans l'interface.
- Le signe « PTS » n'est **pas** le logotype principal : il est trop générique.

## 2. Typographie

Familles et usages :

| Niveau | Police | Taille / interligne |
| --- | --- | --- |
| Display | Atkinson Hyperlegible Next 700 | 36 / 44 px (mobile 32 / 40 px) |
| H1 | Atkinson Hyperlegible Next 600 | 30 / 38 px (mobile 27 / 36 px) |
| H2 | Atkinson Hyperlegible Next 600 | 24 / 32 px |
| H3 / titre de carte | Atkinson Hyperlegible Next 600 | 19 / 27 px |
| Body | Atkinson Hyperlegible Next 400 | 17 / 27 px |
| Label, navigation et boutons | Atkinson Hyperlegible Next 500–600 | 16 / 24–25 px |
| Caption | Atkinson Hyperlegible Next 400 | 14 / 21 px |
| Données techniques / secrets | JetBrains Mono 400 | Adapté au contexte |

Gras standard : 400/500/600, avec **exception Display 700** et T du logotype. Textes : titre `#F4F7FB`, corps `#E6ECF5`, secondaire `#9AA7B8`, désactivé `#6B7688`. Pas de blanc pur pour les longs paragraphes.

Les polices sont intégrées comme ressources statiques du frontend, **sans requêtes à Google Fonts**.

## 3. Palette sémantique

| Rôle | Couleur |
| --- | --- |
| Fond | `#050914` |
| Surface 1 | `#0F172A` |
| Surface 2 | `#1E293B` |
| Bouton / action primaire (texte blanc) | `#2563EB` |
| Survol action primaire | `#1D4ED8` |
| Succès / disponible / mot de passe fort | `#10B981` |
| Danger / alerte critique | `#EF4444` |
| Prudence / réutilisation de mot de passe | `#F59E0B` |
| Bordure | `#1E293B` |
| Bordure au survol | `#334155` |
| Texte secondaire lisible | `#B7C4D6` |

Le bleu indique les **actions**, les autres couleurs indiquent des **statuts**. Pour un site ayant un risque « Faible », afficher une observation limitée, **jamais** une garantie « site sûr ».

## 4. Composants et mise en page

- **Cartes :** opaques, fond Surface 1, bordure fine 1 px, coins de 12 px, sans glassmorphism ni halo.
- **Boutons principaux :** fond bleu, texte blanc, rayon 8 px, ombre minimale `0 2px 4px rgba(0,0,0,.2)`. Au survol, fond `#1D4ED8`.
- **Sidebar :** élément actif sur Surface 1 avec bordure bleue de 3 px à gauche.
- **Espacement :** 24 px entre cartes, 24 px dans cartes, 8 px titre ↔ texte.
- **Grille de modules actifs :** 4 colonnes sur ordinateur ; 2 colonnes sur téléphone.
- **Planète :** opacité maximale 15 %, floutée, derrière le contenu.
- **Aucun néon** : pas de glow sur le texte, les boutons, les cartes ou les icônes.
- Les zones de risques restent distinguées par **couleur et texte**, jamais uniquement par couleur.

## 5. Accessibilité, notamment seniors

- Taille des textes explicatifs courants : **17 px / 27 px**, titres structurés ; navigation et champs 16–17 px, sous-titres et légendes de 14 px. Contraste texte blanc / bleu primaire supérieur à 4,5:1, à vérifier automatiquement et dans le navigateur.
- Contraste suffisant du texte secondaire sur les surfaces.
- Focus clavier visible, réduction des animations si demandée par le système.
- Le coffre indique le temps restant **avant la tentative** d'effacement du presse-papiers avec un anneau de progression et des secondes lisibles. L'effacement effectif dépend des permissions du navigateur et de l'historique du système.
- Icônes de sites manquantes : **initiale du site** dans un cercle coloré, aucune image cassée.

## 6. Implantation dans le dépôt

- `frontend/src/TShieldIcon.jsx` : monogramme SVG accessible.
- `frontend/public/favicon.svg` : favicon.
- `frontend/src/main.jsx` : import des polices locales (Atkinson Hyperlegible Next pour l'interface, Space Grotesk pour le nom de marque et JetBrains Mono pour les secrets) et du système de design.
- `frontend/src/design-system.css` : **source de vérité des jetons et règles visuelles**. Cette feuille est importée après `styles.css` (compatibilité des écrans historiques).
- `frontend/src/PasswordManager.jsx` : compte à rebours du presse-papiers.

Toute nouvelle fonctionnalité doit réutiliser ces variables et conventions. La version **1.1** est celle du guide visuel, **indépendante de la version alpha de l'application**.

**Source typographique :** Braille Institute — *Atkinson Hyperlegible Next* (SIL Open Font License 1.1). La police a été choisie pour sa distinction des glyphes, **sans prétendre qu'une seule police soit universellement optimale**. Tests d'usage réel avec seniors à planifier.
