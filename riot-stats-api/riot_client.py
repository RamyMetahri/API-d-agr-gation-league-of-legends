"""
Fonctions réutilisables pour appeler l'API Riot.
On centralise ici tout ce qui parle à Riot, pour ne pas
répéter ce code dans chaque endpoint de main.py.
"""

import os
import time
from urllib.parse import quote

import httpx
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("RIOT_API_KEY")

if not API_KEY:
    raise RuntimeError("RIOT_API_KEY absente. Vérifie ton fichier .env")

# Un seul client partagé : réutilise les connexions HTTP et évite qu'un appel reste bloqué indéfiniment
client = httpx.Client(headers={"X-Riot-Token": API_KEY}, timeout=10)

MAX_TENTATIVES_429 = 2
ATTENTE_MAX_429 = 10  # secondes


def appel_riot(url: str, params: dict = None):
    """
    Fait un GET vers Riot et renvoie le JSON.
    En cas de 429 (rate limit), attend le délai indiqué par Riot (Retry-After) puis réessaie.
    Lève httpx.HTTPStatusError pour les autres erreurs.
    """
    for tentative in range(MAX_TENTATIVES_429 + 1):
        response = client.get(url, params=params)
        if response.status_code == 429 and tentative < MAX_TENTATIVES_429:
            attente = int(response.headers.get("Retry-After", 1))
            time.sleep(min(attente, ATTENTE_MAX_429))
            continue
        response.raise_for_status()  # lève une exception si status != 2xx
        return response.json()


def get_account_by_riot_id(game_name: str, tag_line: str) -> dict:
    """
    Appelle ACCOUNT-V1 pour récupérer le PUUID et les infos de base
    d'un joueur à partir de son pseudo#tag.

    Route régionale (europe / americas / asia), pas de route de plateforme.
    """
    # quote(safe="") encode aussi les espaces, "/", "#"... présents dans certains pseudos
    url = (
        "https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/"
        f"{quote(game_name, safe='')}/{quote(tag_line, safe='')}"
    )
    return appel_riot(url)


def get_match_ids_by_puuid(puuid: str, count: int = 20) -> list[str]:
    """Appelle MATCH-V5 pour récupérer la liste des IDs de matchs récents
    d'un joueur (les plus récents en premier)."""
    url = f"https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/{puuid}/ids"
    return appel_riot(url, params={"start": 0, "count": count})


def get_match_details(match_id: str) -> dict:
    """Appelle MATCH-V5 pour récupérer le détail complet d'un match précis :
    participants, champions joués, KDA, victoire/défaite, durée, etc.
    """
    url = f"https://europe.api.riotgames.com/lol/match/v5/matches/{quote(match_id, safe='')}"
    return appel_riot(url)


def get_league_entries_by_puuid(puuid: str, platform: str = "euw1") -> list[dict]:
    """
    Appelle LEAGUE-V4 pour récupérer le rang du joueur dans chaque file
    (Solo/Duo, Flex...). Route de PLATEFORME (euw1, na1...), pas régionale.
    """
    url = f"https://{platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}"
    return appel_riot(url)
