"""
Mise en forme des statistiques par champion (fonction pure, facile à tester).
Les totaux bruts viennent de database.get_totaux_par_champion.
"""


def resumer_champion(totaux: dict) -> dict:
    """Transforme les totaux d'un champion (sommes sur toutes ses parties) en moyennes lisibles."""
    parties = totaux["parties"]
    victoires = totaux["victoires"]
    kills, deaths, assists = totaux["kills"], totaux["deaths"], totaux["assists"]
    minutes = totaux["duree_secondes"] / 60

    return {
        "champion": totaux["champion"],
        "parties": parties,
        "victoires": victoires,
        "defaites": parties - victoires,
        "winrate": round(victoires / parties * 100, 1),
        "kda_moyen": {
            "kills": round(kills / parties, 1),
            "deaths": round(deaths / parties, 1),
            "assists": round(assists / parties, 1),
        },
        # None = aucune mort : le front affiche "Perfect"
        "ratio_kda": round((kills + assists) / deaths, 2) if deaths else None,
        "cs_par_minute": round(totaux["cs"] / minutes, 1) if minutes else 0,
    }
