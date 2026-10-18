# Corpus qualitatif figé — PastaTshield V0.4

**Organisation actualisée le 19 octobre 2026.** Ce dossier est un **jeu de régression déterministe**, pas un échantillon représentatif des arnaques FR/BE. Il est distinct d'un futur corpus quantitatif annoté (messages authentifiés et consentis, méthodologie de sélection et vérité terrain contrôlée).

## Architecture et intégrité

- `MANIFEST.json` : chemin, type, provenance (capture ou synthétique), source, taille, empreinte SHA-256, comportement et verdict de référence de **chaque fichier**. Les empreintes sont calculées sur les octets bruts.
- `html/` : quatre pages HTML figées, dont une capture réelle de Wikipédia et trois créations de test.
- `messages/` : quatre messages FR/BE **synthétiques**, jamais reçus d'utilisateurs réels.
- `../fixture_support.py` : lecture des fichiers **seulement après contrôle** de taille et de SHA-256 par rapport au manifeste. `../test_fixture_manifest.py` vérifie l'exhaustivité des huit entrées, les empreintes et le rejet d'une mutation simulée.

Les fichiers de tests utilisent les chemins du manifeste et **échouent** si un octet change sans mise à jour explicite de celui-ci. Les règles Git `.gitattributes` conservent leurs octets en clonage et dans `git archive`. **Un SHA-256 à l'intérieur du même dépôt n'est pas une signature cryptographique externe** : il permet de détecter des divergences accidentelles et de figer une version auditée, pas de prouver l'identité de son éditeur.

## Cas HTML

| Fichier | Origine | But |
| --- | --- | --- |
| `html/wikipedia.html` | Capture réelle du HTML de `https://www.wikipedia.org/` le **18/10/2026** (HTTP 200, **122 197 octets**) | Formulaire de recherche normal ; éviter de le confondre avec un phishing |
| `html/faux-ameli.html` | Création entièrement fictive | Champs sensibles (e-mail, mot de passe, téléphone, IBAN, carte) et soumission **HTTP** ; constater les indices présents, pas conclure à une exfiltration observée |
| `html/formulaire-legitime.html` | Création entièrement fictive | Formulaire de connexion HTTPS avec mot de passe ; ne pas le déclarer dangereux pour la seule présence du champ |
| `html/script-tiers.html` | Création entièrement fictive | Repérer l'attribut `script src` pointant vers `ressource-inconnue.example.invalid` ; une chaîne `eval('2 + 2')` est stockée en JSON **inerte**, sans exécution ni verdict « script malveillant » |

**Capture Wikipédia :** son SHA-256 est inscrit dans `MANIFEST.json` et vérifié avant toute assertion, ainsi que dans le test historique `test_html_corpus.py`. Snapshot conservé sans affiliation avec Wikipédia ni garantie sur le site actuel. Droits et attribution : [Wikimedia Foundation, conditions d'utilisation](https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use).

## Cas de messages FR/BE

| Fichier | Origine | Assertion qualitative |
| --- | --- | --- |
| `messages/laposte-reference.txt` | **Référence synthétique**, non reçue par un utilisateur | Mention de La Poste et de `https://www.laposte.fr/` : aucun indice d'usurpation détecté par les règles locales |
| `messages/itsme-reference.txt` | **Référence synthétique**, non reçue par un utilisateur | Mention itsme et `https://www.itsme-id.com/fr-be/` : aucun indice d'usurpation détecté |
| `messages/impots-usurpation.txt` | **Imitation entièrement synthétique** | Domaine fictif `impots-gouv-remboursement.example` : constat `brand.domain_mismatch`, risque Élevé |
| `messages/bpost-usurpation.txt` | **Imitation entièrement synthétique** | Domaine fictif `bpost-livraison.example` : constat `brand.domain_mismatch`, risque Élevé |

**Une URL officielle affichée dans un SMS ne prouve jamais que l'expéditeur est légitime.** Les domaines peuvent être visuellement confondus (IDN/homoglyphes), l'expéditeur peut être usurpé et le contexte peut rester frauduleux. Le résultat « Faible » signifie uniquement qu'aucune règle locale n'a repéré d'indice dans **cet exemple textuel** : il ne certifie pas une authentification de SMS.

Aucun exemple n'utilise de compte ou de message personnel réel. Les destinations fictives `.example` et `.example.invalid` ne doivent pas être contactées et les pages HTML ne doivent jamais être hébergées comme de vrais services. Dans `faux-ameli.html`, la soumission du formulaire est désactivée.

## Ce que le moteur ne sait pas faire

- **JavaScript non exécuté** : il peut relever certains noms de domaines externes référencés par le HTML, mais **n'exécute pas** les scripts, ne détecte pas de façon fiable `eval()`, une obfuscation, un réseau d'exfiltration, un déclenchement après délai ou clic, ni un formulaire construit dynamiquement en JavaScript.
- **Inspection partielle** : au-delà de 1 Mo de HTML, le début de la page est analysé, la fin ne l'est pas ; « Faible » ne doit jamais résulter d'une inspection tronquée sans indice sérieux.
- **HTTPS et certificats** : le moteur vérifie une connexion TLS ponctuelle mais ne contrôle pas continuellement les certificats, ne consulte pas les journaux Certificate Transparency (CT), ni ne garantit la réputation du domaine.
- **Indicateurs statiques** : la présence d'un formulaire, d'un cookie, d'un domaine tiers ou d'un script **n'est pas la preuve d'une fraude ni d'une transmission**.

## Reproduire hors ligne

Depuis la racine du dépôt, après compilation préalable du frontend pour les tests d'intégration API :

```powershell
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -p test_fixture_manifest.py -v
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -p test_html_corpus.py -v
.\backend\.venv\Scripts\python.exe -m unittest discover -s backend/tests -p test_messages_corpus.py -v
```

Les tests de corpus remplacent les accès réseau de `analyze_url` par des réponses simulées ; les tests de texte analysent les messages en mémoire. Aucun domaine cité n'est téléchargé par ces tests.

**Mesurer des taux de faux positifs/faux négatifs** nécessitera un **autre corpus**, beaucoup plus vaste, avec vérité terrain externe et protocole d'échantillonnage : ces huit fixtures ne permettent aucune estimation statistique fiable.
