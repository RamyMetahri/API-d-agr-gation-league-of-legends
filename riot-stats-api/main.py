"""
API principale du projet.
Lancement : uvicorn main:app --reload
Doc auto  : http://127.0.0.1:8000/docs
"""

import os
from contextlib import asynccontextmanager
from typing import Literal

import httpx
from fastapi import Depends, FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from riot_client import (
    get_account_by_riot_id,
    get_league_entries_by_puuid,
    get_match_details,
    get_match_ids_by_puuid,
)
from database import (
    a_besoin_de_refresh,
    creer_tables,
    get_derniere_maj,
    get_details_match,
    get_historique_joueur,
    get_puuid_en_base,
    get_rangs_joueur,
    get_stats_joueur,
    get_totaux_par_champion,
    marquer_a_jour,
    matchs_existants,
    rechercher_joueurs,
    sauvegarder_details_match,
    sauvegarder_joueur,
    sauvegarder_match,
    sauvegarder_participation,
    sauvegarder_rang,
)
from match_resume import resumer_match
from rate_limit import LimiteurRequetes
from stats_champions import resumer_champion


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Création des tables au démarrage du serveur (et pas à l'import, pour pouvoir tester sans base)
    creer_tables()
    yield


app = FastAPI(title="Riot Stats API", lifespan=lifespan)

# Origines autorisées, séparées par des virgules (ex : "https://mon-site.vercel.app")
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "")
# En développement, le front peut tourner sur n'importe quel port local (Vite passe à 5174 si 5173 est pris)
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX", r"http://(localhost|127\.0\.0\.1)(:\d+)?")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origine.strip() for origine in CORS_ORIGINS.split(",") if origine.strip()],
    allow_origin_regex=CORS_ORIGIN_REGEX or None,
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Limite par IP sur les routes qui peuvent appeler Riot, pour protéger notre quota
limiteur = LimiteurRequetes(max_requetes=int(os.getenv("RATE_LIMIT_PAR_MINUTE", "60")), fenetre_secondes=60)
LIMITE = [Depends(limiteur)]

# Liste blanche : la plateforme sert à construire l'URL Riot, on ne laisse pas passer n'importe quoi
Platform = Literal[
    "br1", "eun1", "euw1", "jp1", "kr", "la1", "la2", "me1",
    "na1", "oc1", "ru", "sg2", "tr1", "tw2", "vn2",
]


@app.exception_handler(httpx.HTTPStatusError)
def gerer_erreur_riot(request: Request, e: httpx.HTTPStatusError):
    """Convertit une erreur Riot en erreur HTTP claire pour l'utilisateur de ton API."""
    status = e.response.status_code
    if status == 404:
        return JSONResponse(status_code=404, content={"detail": "Joueur ou ressource introuvable côté Riot"})
    elif status in (401, 403):
        return JSONResponse(status_code=401, content={"detail": "Clé API invalide ou expirée"})
    elif status == 429:
        return JSONResponse(status_code=429, content={"detail": "Rate limit atteint, réessaie plus tard"})
    else:
        return JSONResponse(status_code=502, content={"detail": "Erreur inattendue côté Riot"})


@app.exception_handler(httpx.RequestError)
def gerer_erreur_reseau(request: Request, e: httpx.RequestError):
    """Riot injoignable (timeout, DNS, coupure réseau...)."""
    return JSONResponse(status_code=503, content={"detail": "Impossible de joindre l'API Riot, réessaie plus tard"})


def get_puuid(pseudo: str, tag: str) -> str:
    """
    Renvoie le PUUID d'un joueur. On regarde d'abord en base pour économiser
    un appel Riot ; sinon on interroge ACCOUNT-V1 et on enregistre le joueur
    avec son pseudo officiel (casse exacte renvoyée par Riot).
    """
    puuid = get_puuid_en_base(pseudo, tag)
    if puuid:
        return puuid

    compte = get_account_by_riot_id(pseudo, tag)
    sauvegarder_joueur(puuid=compte["puuid"], pseudo=compte["gameName"], tag=compte["tagLine"])
    return compte["puuid"]


@app.get("/")
def racine():
    return RedirectResponse(url="/docs")


@app.get("/sante")
def sante():
    """Utilisée par l'hébergeur pour vérifier que le serveur répond."""
    return {"statut": "ok"}


@app.get("/joueur/{pseudo}/{tag}", dependencies=LIMITE)
def joueur(pseudo: str, tag: str):
    """
    Récupère le compte Riot (PUUID + pseudo actuel) pour un pseudo#tag donné.
    Exemple : GET /joueur/Faker/KR1
    """
    return get_account_by_riot_id(pseudo, tag)


def rafraichir_joueur(puuid: str, count: int) -> dict:
    """
    Va chercher les derniers matchs d'un joueur chez Riot et sauvegarde ceux qu'on n'a pas encore.
    Réutilisée par /matchs (rafraîchissement manuel) et /stats (rafraîchissement auto).
    """
    match_ids = get_match_ids_by_puuid(puuid, count=count)
    deja_en_base = matchs_existants(puuid, match_ids)
    nouveaux = 0

    for match_id in match_ids:
        if match_id in deja_en_base:
            continue  # pas besoin de re-télécharger un match qu'on a déjà

        match_data = get_match_details(match_id)
        info = match_data["info"]

        participant = next((p for p in info["participants"] if p["puuid"] == puuid), None)
        if participant is None:
            continue

        sauvegarder_match(
            match_id=match_id,
            game_duration=info["gameDuration"],
            game_creation=info["gameCreation"],
            queue_id=info["queueId"],
        )
        sauvegarder_details_match(match_id, match_data)

        inserte = sauvegarder_participation(
            puuid=puuid,
            match_id=match_id,
            champion_name=participant["championName"],
            kills=participant["kills"],
            deaths=participant["deaths"],
            assists=participant["assists"],
            win=participant["win"],
            gold_earned=participant["goldEarned"],
            total_minions_killed=participant["totalMinionsKilled"],
            neutral_minions_killed=participant.get("neutralMinionsKilled", 0),
        )
        if inserte:
            nouveaux += 1

    marquer_a_jour(puuid)

    return {"match_ids": match_ids, "nouveaux": nouveaux}


@app.get("/joueur/{pseudo}/{tag}/matchs", dependencies=LIMITE)
def matchs_du_joueur(pseudo: str, tag: str, count: int = Query(10, ge=1, le=50)):
    puuid = get_puuid(pseudo, tag)
    resultat = rafraichir_joueur(puuid, count)

    return {
        "puuid": puuid,
        "match_ids": resultat["match_ids"],
        "message": f"{resultat['nouveaux']} nouveaux matchs sauvegardés ({len(resultat['match_ids'])} récupérés au total)"
    }


@app.get("/match/{match_id}", dependencies=LIMITE)
def details_match(match_id: str):
    """
    Détail d'un match (les 10 joueurs, items, dégâts...) en version allégée.
    Lu en base si possible, sinon demandé à Riot puis stocké.
    Exemple : GET /match/EUW1_1234567890
    """
    data = get_details_match(match_id)
    if data is None:
        data = get_match_details(match_id)
        info = data["info"]
        sauvegarder_match(
            match_id=match_id,
            game_duration=info["gameDuration"],
            game_creation=info["gameCreation"],
            queue_id=info["queueId"],
        )
        sauvegarder_details_match(match_id, data)

    return resumer_match(data)


@app.get("/joueur/{pseudo}/{tag}/historique", dependencies=LIMITE)
def historique_joueur(pseudo: str, tag: str, queue_id: int = None, limite: int = Query(20, ge=1, le=100)):
    puuid = get_puuid(pseudo, tag)
    historique = get_historique_joueur(puuid, queue_id=queue_id, limite=limite)
    return {"historique": historique}


@app.get("/joueur/{pseudo}/{tag}/stats", dependencies=LIMITE)
def stats_joueur(pseudo: str, tag: str, limite: int = Query(15, ge=1, le=50), queue_id: int = None):
    puuid = get_puuid(pseudo, tag)

    if a_besoin_de_refresh(puuid):
        rafraichir_joueur(puuid, count=15)

    return get_stats_joueur(puuid, limite=limite, queue_id=queue_id)


@app.get("/joueur/{pseudo}/{tag}/champions", dependencies=LIMITE)
def stats_par_champion(pseudo: str, tag: str, queue_id: int = None):
    """
    Statistiques par champion (parties, winrate, KDA, CS/min) sur toutes les parties en base.
    Lecture en base uniquement : aucun appel Riot hormis la recherche du joueur.
    """
    puuid = get_puuid(pseudo, tag)
    return {"champions": [resumer_champion(t) for t in get_totaux_par_champion(puuid, queue_id=queue_id)]}


@app.get("/joueur/{pseudo}/{tag}/rang", dependencies=LIMITE)
def rang_joueur(pseudo: str, tag: str, platform: Platform = "euw1"):
    """
    Récupère et sauvegarde le rang du joueur pour chaque file (Solo/Duo, Flex).
    Exemple : GET /joueur/kcdq spartacus/EUW/rang
    """
    puuid = get_puuid(pseudo, tag)
    entries = get_league_entries_by_puuid(puuid, platform=platform)

    for entry in entries:
        sauvegarder_rang(
            puuid=puuid,
            queue_type=entry["queueType"],
            tier=entry["tier"],
            rank=entry["rank"],
            league_points=entry["leaguePoints"],
            wins=entry["wins"],
            losses=entry["losses"],
        )

    return get_rangs_joueur(puuid)


@app.get("/joueurs/recherche")
def recherche_joueurs(q: str):
    """Autocomplétion : joueurs en base dont le pseudo commence par q."""
    if len(q) < 1:
        return {"resultats": []}
    return {"resultats": rechercher_joueurs(q)}


@app.get("/joueur/{pseudo}/{tag}/maj", dependencies=LIMITE)
def derniere_maj_joueur(pseudo: str, tag: str):
    """Renvoie la date de dernière synchro, pour afficher 'mis à jour il y a Xmin'."""
    puuid = get_puuid(pseudo, tag)
    derniere = get_derniere_maj(puuid)
    return {"derniere_maj": derniere.isoformat() if derniere else None}
