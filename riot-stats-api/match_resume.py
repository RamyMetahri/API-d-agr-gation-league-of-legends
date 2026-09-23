"""
Transforme le JSON brut d'un match MATCH-V5 (très volumineux) en une version
allégée, contenant uniquement ce que le front affiche dans le détail d'un match.

Fonctions pures : aucun appel réseau ni base de données, donc faciles à tester.
"""


def resumer_joueur(p: dict) -> dict:
    """Garde les infos utiles d'un participant."""
    styles = p.get("perks", {}).get("styles", [])
    rune_principale = styles[0]["selections"][0]["perk"] if styles and styles[0].get("selections") else None
    rune_secondaire = styles[1]["style"] if len(styles) > 1 else None

    return {
        "puuid": p["puuid"],
        # riotIdGameName n'existe que depuis 2023 : on retombe sur summonerName pour les vieux matchs
        "pseudo": p.get("riotIdGameName") or p.get("summonerName", ""),
        "tag": p.get("riotIdTagline", ""),
        "champion": p["championName"],
        "niveau": p["champLevel"],
        "position": p.get("teamPosition", ""),
        "kills": p["kills"],
        "deaths": p["deaths"],
        "assists": p["assists"],
        # CS = sbires + monstres neutres (sinon un jungler n'a presque rien)
        "cs": p["totalMinionsKilled"] + p.get("neutralMinionsKilled", 0),
        "gold": p["goldEarned"],
        "degats": p["totalDamageDealtToChampions"],
        "vision": p.get("visionScore", 0),
        "items": [p.get(f"item{i}", 0) for i in range(7)],
        "sorts": [p.get("summoner1Id"), p.get("summoner2Id")],
        "rune_principale": rune_principale,
        "rune_secondaire": rune_secondaire,
    }


def resumer_equipe(equipe: dict, participants: list[dict]) -> dict:
    """Regroupe une équipe, ses objectifs et ses 5 joueurs."""
    objectifs = equipe.get("objectives", {})
    return {
        "team_id": equipe["teamId"],
        "victoire": equipe["win"],
        "objectifs": {
            "kills": objectifs.get("champion", {}).get("kills", 0),
            "tours": objectifs.get("tower", {}).get("kills", 0),
            "dragons": objectifs.get("dragon", {}).get("kills", 0),
            "barons": objectifs.get("baron", {}).get("kills", 0),
        },
        "joueurs": [resumer_joueur(p) for p in participants if p["teamId"] == equipe["teamId"]],
    }


def resumer_match(data: dict) -> dict:
    """Version allégée d'un match : infos générales + les 2 équipes (gagnante en premier)."""
    info = data["info"]
    equipes = [resumer_equipe(e, info["participants"]) for e in info["teams"]]
    equipes.sort(key=lambda e: not e["victoire"])

    return {
        "match_id": data["metadata"]["matchId"],
        "queue_id": info["queueId"],
        "game_creation": info["gameCreation"],
        "game_duration": info["gameDuration"],
        "degats_max": max((p["totalDamageDealtToChampions"] for p in info["participants"]), default=0),
        "equipes": equipes,
    }
