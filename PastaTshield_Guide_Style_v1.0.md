# PastaTshield — Guide de style et identité visuelle

**Version :** 1.0
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
| Display | Space Grotesk 700 | 32 / 38 px |
| H1 | Space Grotesk 600 | 24 / 30 px |
| H2 | Space Grotesk 600 | 20 / 26 px |
| H3 / titre de carte | Space Grotesk 600 | 16 / 22 px |
| Body | Inter 400 | 15 / 23 px |
| Label | Inter 500 | 13 / 18 px |
| Caption | Inter 400 | 12 / 17 px |
| Données techniques / secrets | JetBrains Mono 400 | Adapté au contexte |

Gras standard : 400/500/600, avec **exception Display 700** et T du logotype. Textes : titre `#F4F7FB`, corps `#E6ECF5`, secondaire `#9AA7B8`, désactivé `#6B7688`. Pas de blanc pur pour les longs paragraphes.

Les polices sont intégrées comme ressources statiques du frontend, **sans requêtes à Google Fonts**.

## 3. Palette sémantique

| Rôle | Couleur |
| --- | --- |
| Fond | `#050914` |
| Surface 1 | `#0F172A` |
| Surface 2 | `#1E293B` |
| Bouton / action primaire | `#3B82F6` |
| Succès / disponible / mot de passe fort | `#10B981` |
| Danger / alerte critique | `#EF4444` |
| Prudence / réutilisation de mot de passe | `#F59E0B` |
| Bordure | `#1E293B` |
| Bordure au survol | `#334155` |

Le bleu indique les **actions**, les autres couleurs indiquent des **statuts**. Pour un site ayant un risque « Faible », afficher une observation limitée, **jamais** une garantie « site sûr ».

## 4. Composants et mise en page

- **Cartes :** opaques, fond Surface 1, bordure fine 1 px, coins de 12 px, sans glassmorphism ni halo.
- **Boutons principaux :** fond bleu, texte blanc, rayon 8 px, ombre minimale `0 2px 4px rgba(0,0,0,.2)`. Au survol, fond `#2563EB`.
- **Sidebar :** élément actif sur Surface 1 avec bordure bleue de 3 px à gauche.
- **Espacement :** 24 px entre cartes, 24 px dans cartes, 8 px titre ↔ texte.
- **Grille de modules actifs :** 4 colonnes sur ordinateur ; 2 colonnes sur téléphone.
- **Planète :** opacité maximale 15 %, floutée, derrière le contenu.
- **Aucun néon** : pas de glow sur le texte, les boutons, les cartes ou les icônes.
- Les zones de risques restent distinguées par **couleur et texte**, jamais uniquement par couleur.

## 5. Accessibilité, notamment seniors

- Taille des textes explicatifs importants : **15 px minimum**, titres structurés ; labels et légendes de 13/12 px selon l'échelle.
- Contraste suffisant du texte secondaire sur les surfaces.
- Focus clavier visible, réduction des animations si demandée par le système.
- Le coffre indique le temps restant **avant la tentative** d'effacement du presse-papiers avec un anneau de progression et des secondes lisibles. L'effacement effectif dépend des permissions du navigateur et de l'historique du système.
- Icônes de sites manquantes : **initiale du site** dans un cercle coloré, aucune image cassée.

## 6. Implantation dans le dépôt

- `frontend/src/TShieldIcon.jsx` : monogramme SVG accessible.
- `frontend/public/favicon.svg` : favicon.
- `frontend/src/main.jsx` : import des polices locales et du système de design.
- `frontend/src/design-system.css` : **source de vérité des jetons et règles visuelles**. Cette feuille est importée après `styles.css` (compatibilité des écrans historiques).
- `frontend/src/PasswordManager.jsx` : compte à rebours du presse-papiers.

Toute nouvelle fonctionnalité doit réutiliser ces variables et conventions. La version **1.0** est celle du guide visuel, **indépendante de la version alpha de l'application**.
