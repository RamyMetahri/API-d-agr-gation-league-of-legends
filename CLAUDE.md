# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Riot Stats : tableau de bord League of Legends. Monorepo (un seul dépôt git à la racine) avec une API FastAPI (`riot-stats-api/`) et un front React + Vite (`riot-stats-front/`). Code, commentaires, identifiants et messages de commit sont **en français** : garder cette convention.

## Commandes

Environnement Windows : le venv Python est dans `riot-stats-api/venv/Scripts/`.

```bash
# API (depuis riot-stats-api/, nécessite .env avec RIOT_API_KEY et DATABASE_URL, PostgreSQL lancé)
venv/Scripts/python -m uvicorn main:app --reload        # http://127.0.0.1:8000, doc sur /docs

# Tests API (sans réseau ni base)
venv/Scripts/python -m pytest                            # tous
venv/Scripts/python -m pytest tests/test_api.py::test_rafraichir_ne_telecharge_que_les_nouveaux_matchs

# Front (depuis riot-stats-front/)
npm run dev        # http://localhost:5173
npm run lint
npm run build

# API + PostgreSQL via Docker (depuis la racine)
docker compose up --build
```

`.claude/launch.json` définit les serveurs `api` et `front` pour les outils de preview.

## Architecture

### Flux d'une recherche de joueur
1. Le front appelle **`/stats` en premier**, puis `/historique`, `/rang`, `/maj`, `/champions` en parallèle. L'ordre compte : `/stats` déclenche la synchro avec Riot si les données ont plus de 10 min (`a_besoin_de_refresh`), les autres routes ne font que lire la base.
2. Chaque route résout le joueur via `get_puuid()` (`main.py`) : d'abord en base (insensible à la casse), sinon account-v1 puis enregistrement avec le pseudo officiel Riot.
3. `rafraichir_joueur()` récupère les IDs des derniers matchs et **ne télécharge que ceux absents** de `matchs_existants()`. Le JSON complet de chaque match est stocké dans `matchs_details` (JSONB) : `/match/{id}` le relit et le passe à `resumer_match()` sans rappeler Riot.

### API (`riot-stats-api/`)
- `riot_client.py` : tous les appels Riot passent par `appel_riot()` (client httpx partagé, timeout, retry sur 429 avec `Retry-After`). Région `europe` codée en dur.
- `main.py` : routes. Les erreurs httpx sont converties par des **gestionnaires globaux** (`@app.exception_handler`), donc pas de try/except dans les routes. Les routes qui peuvent appeler Riot portent `dependencies=LIMITE` (limiteur par IP en mémoire, `rate_limit.py`, valable pour une seule instance).
- `platform` est un `Literal` en liste blanche : il sert à construire le nom d'hôte de l'URL Riot envoyée avec la clé. Ne jamais accepter une valeur libre.
- `database.py` : psycopg2 brut, une connexion par fonction, pas d'ORM ni d'outil de migration. **Les changements de schéma vont dans `creer_tables()`** sous forme idempotente (`CREATE/ALTER ... IF NOT EXISTS`, puis rattrapage des données si besoin). `creer_tables()` tourne dans le `lifespan` de FastAPI, pas à l'import.
- `match_resume.py` et `stats_champions.py` : fonctions pures de mise en forme (JSON Riot ou totaux SQL vers réponse API), testées sans base.
- CS = `total_minions_killed + neutral_minions_killed`. Une participation avec `neutral_minions_killed IS NULL` (ligne antérieure à la colonne) est traitée comme absente par `matchs_existants()`, donc re-téléchargée une fois au prochain rafraîchissement.
- CORS : `CORS_ORIGINS` (liste) + `CORS_ORIGIN_REGEX` (par défaut localhost/127.0.0.1 sur tout port).

### Tests (`riot-stats-api/tests/`)
- `conftest.py` définit `RIOT_API_KEY` et `DATABASE_URL` **avant** d'importer `main`, car `riot_client` et `database` les exigent à l'import. Le `TestClient` est créé sans `with`, donc le lifespan (et la base) ne sont pas sollicités.
- `main.py` importe les fonctions par nom : il faut monkeypatcher **`main.<fonction>`**, pas `database.<fonction>` ni `riot_client.<fonction>`.
- `fabriquer_match()` / `fabriquer_participant()` construisent un match MATCH-V5 minimal ; la fixture `client` réinitialise le limiteur.

### Front (`riot-stats-front/src/`)
- Pas de routeur ni de store : l'état vit dans `App.jsx`, les composants sont dans `components/`.
- `api.js` : `API` vient de `VITE_API_URL` ; `lireJson()` lève une `Error` avec le `detail` renvoyé par l'API (à utiliser pour chaque fetch).
- `ddragon.js` : `useDdragon()` charge une seule fois la version Data Dragon, les sorts et les runes. `App` l'appelle et passe l'objet `dd` en prop aux composants qui construisent des URL d'icônes.
- `MatchList` charge le détail d'un match au clic et le garde en mémoire (map par `match_id`).

## CI et déploiement
- `.github/workflows/ci.yml` : pytest (API), lint + build (front), `docker build` de l'API.
- `render.yaml` déploie l'API (Docker) et PostgreSQL sur Render ; le front va sur Vercel (`VITE_API_URL`). La clé Riot de développement expire toutes les 24 h.
- `.gitattributes` force les fins de ligne LF.
