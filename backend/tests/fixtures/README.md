# Corpus HTML de tests — PastaTshield V0.4

**Capturé / créé le :** 18 octobre 2026.
**Usage :** essais de non-régression **entièrement hors ligne** du moteur `inspect_html` et du rapport `analyze_url`. Les tests remplacent `fetch_site` par une réponse simulée : **aucun domaine n'est contacté pendant leur exécution**.

## Fichiers

| Fichier | Provenance | Scénario attendu |
| --- | --- | --- |
| `wikipedia.html` | **Capture réelle du HTML de `https://www.wikipedia.org/`** le 18/10/2026, récupération HTTP 200 | Une page publique avec un formulaire de recherche ; ne pas confondre formulaire ordinaire et collecte d'identifiants |
| `faux-ameli.html` | **Simulation originale entièrement fictive** de page se faisant passer pour une démarche d'assurance maladie | Identifier mot de passe, e-mail, téléphone, IBAN, carte bancaire et destination **HTTP** ; ne pas interpréter la seule présence de JavaScript comme une preuve de code malveillant |
| `formulaire-legitime.html` | **Simulation originale de connexion ordinaire** | La présence d'un mot de passe et d'un e-mail dans un formulaire HTTPS ne doit pas suffire à classer automatiquement la page comme dangereuse |

### Provenance Wikipédia

- URL source : `https://www.wikipedia.org/`.
- Date de capture : **2026-10-18**.
- Capture HTML conservée telle que téléchargée : **122 197 octets**.
- SHA-256 du fichier :

  `5c0de7d8a1af1dc8c06cc2a517265ff96db0ed11114a62be2625ed13c9cdb466`

- Ce **snapshot** est figé à des fins de test ; il ne prouve rien sur l'état **actuel** de Wikipédia ou d'un autre site.
- La page provient de Wikimedia ; marque, code HTML, habillage et éléments tiers restent soumis aux conditions et licences applicables de leurs titulaires. **PastaTshield n'en revendique pas la propriété.** Voir [Wikimedia — Conditions d'utilisation](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use) et [Wikipedia](https://www.wikipedia.org/).

### Sécurité des exemples fictifs

- Les domaines de destination se terminent par `.example.invalid` et n'existent pas pour recueillir des données.
- Le bouton du faux formulaire est **désactivé**, et les pages affichent des avertissements explicites. Aucun logo officiel n'est reproduit.
- La référence à un fichier JavaScript fictif dans `faux-ameli.html` est **un simple attribut HTML** : ce test ne télécharge ni n'exécute le script.
- **Ne pas publier ni héberger les fausses pages de démonstration comme de véritables services.**
- Ces exemples n'utilisent **aucun compte, secret, cookie ou historique d'utilisateur réel**.

## Ce que le corpus teste

1. Lecture du HTML via `html.parser.HTMLParser`, sans navigateur distant ni exécution de JavaScript.
2. Identification de champs de formulaire, de leur destination HTTP(S) et des domaines référencés dans certains attributs HTML.
3. Réduction des **faux positifs** : Wikipédia et un formulaire de connexion HTTPS ne sont pas considérés comme malveillants pour leur seule présence d'un formulaire.
4. Détection d'une combinaison suspecte **formulaire demandant des secrets + soumission en HTTP non chiffré**.
5. Conservation des limites du rapport : les constats de collecte **potentielle** ne sont ni une transmission observée ni la preuve d'une fraude.

## Ce que ce corpus ne teste PAS

- L'exécution et l'analyse comportementale de JavaScript ou des scripts tiers.
- Le détournement réel de compte, les faux boutons de paiement ou les techniques de phishing invisibles dans le HTML initial.
- Les mécanismes de protection anti-SSRF en conditions réseau : ceux-ci ont des tests séparés.
- La précision statistique sur les arnaques réelles : trois exemples ne constituent **pas** un échantillon représentatif.
- L'état ou la sécurité actuels du service Wikimedia.

## Reproduire

Depuis la racine du projet, avec le `backend/.venv` de développement installé :

```powershell
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -p test_html_corpus.py -v
```

Tous les tests backend :

```powershell
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -q
```

**Suite du chantier :** corpus plus large FR/BE, fixtures de HTML variable, typologies de faux positifs, seuils et résultats de référence annotés par des réviseurs humains ; aucune conclusion de précision n'est autorisée avant ce travail.
