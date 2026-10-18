# Inventaire des dépendances — PastaTshield V0.3

**Relevé le 18 octobre 2026** sur l'environnement Windows de développement. Ces versions ne constituent pas, à elles seules, une chaîne de construction reproductible.

## 1. Runtime de référence observé

| Logiciel | Version |
| --- | --- |
| Python | 3.14.7 |
| Node.js | 24.21.0 |
| npm | 11.19.0 |
| FastAPI | 0.146.0 |
| Uvicorn | 0.54.0 |
| tldextract | 5.4.0 |
| React / react-dom | 19.3.1 / 19.3.1 |
| Vite | 6.4.4 |

## 2. Python — dépendances directes déclarées

Fichier `backend/requirements.txt` :

```
fastapi>=0.115,<1
uvicorn>=0.30,<1
tldextract>=5.3,<6
```

Fichier `backend/requirements-dev.txt` :

```
-r requirements.txt
httpx>=0.27,<1
coverage>=7,<8
ruff>=0.12,<1
```

**Attention :** ces plages ne sont pas des versions verrouillées. Une installation nouvelle peut sélectionner d'autres versions (et produire d'autres résultats). Ajouter ultérieurement un fichier de contraintes/verrouillage vérifié, sans casser les installations existantes.

### Relevé complet `pip freeze` observé

```text
annotated-doc==0.0.5
annotated-types==0.8.0
anyio==4.15.1
certifi==2026.7.22
charset-normalizer==3.5.2
click==8.5.0
coverage==7.16.2
fastapi==0.146.0
filelock==4.2.2
h11==0.16.0
httpcore==1.0.9
httpx==0.28.1
idna==3.20
opentelemetry-api==1.45.1
pydantic==2.14.1
pydantic_core==2.50.1
requests==2.34.2
requests-file==3.0.1
ruff==0.17.1
starlette==1.8.0
tldextract==5.4.0
typing-inspection==0.4.4
typing_extensions==4.16.0
urllib3==2.8.0
uvicorn==0.54.0
```

Ce relevé sert à **documenter l'environnement historique** et à investiguer un défaut. Il n'est pas automatiquement une recommandation d'installation : l'auditeur devra vérifier la sécurité, le support et la compatibilité des versions au moment de l'évaluation.

## 3. Frontend — dépendances de premier niveau observées

Fichier `frontend/package.json` + `npm ls --depth=0` :

```text
@fontsource/inter@5.3.0
@fontsource/jetbrains-mono@5.3.0
@fontsource/space-grotesk@5.3.0
@scure/bip39@2.4.0
@vitejs/plugin-react@4.7.0
lucide-react@0.468.0
prettier@3.9.10
react-dom@19.3.1
react@19.3.1
vite@6.4.4
```

L'arbre transitif et les empreintes des tarballs npm figurent dans `frontend/package-lock.json` livré avec le code. Pour reproduire le frontend sur une machine propre, utiliser `npm ci`, pas `npm install`.

Un contrôle ponctuel `npm audit --omit=dev --audit-level=high` a retourné **0 vulnérabilité connue** le 18 octobre 2026 ; les dépendances de développement ne sont pas incluses par cette commande. Un audit doit inclure une revue du code des dépendances ayant accès aux secrets, de l'environnement de build et de leur cycle de mises à jour.

## 4. Points de vigilance de la chaîne d'approvisionnement

- Mettre en place **verrouillage et hashes Python** ou un système de résolution reproductible validé.
- Prévoir **scan SBOM**, licences de dépendances, maintenance/suivi de CVE, provenance du build et mises à jour sécurisées.
- Ne pas annoncer un code signé / installateur signé tant que la procédure n'existe pas.
- Les polices sont distribuées comme assets locaux, sans appel à un CDN externe.
- Pour les tests de secrets, n'installer que les dépendances attendues ; éviter les scripts npm non nécessaires et surveiller les dépendances transitoires.
