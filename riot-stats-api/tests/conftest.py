"""
Configuration commune des tests.
Aucun test ne parle à Riot ni à PostgreSQL : les fonctions réseau et base
sont remplacées par des faux (monkeypatch) dans chaque test.
"""

import os

# Doit être fait AVANT d'importer main : riot_client et database vérifient ces variables à l'import
os.environ.setdefault("RIOT_API_KEY", "RGAPI-test")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:5432/test")

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def client():
    # Sans "with", le lifespan (creer_tables) ne tourne pas : pas besoin de base
    return TestClient(main.app)


def fabriquer_participant(numero: int, team_id: int, victoire: bool, **surcharges) -> dict:
    """Un participant MATCH-V5 minimal, avec seulement les champs qu'on utilise."""
    participant = {
        "puuid": f"puuid-{numero}",
        "riotIdGameName": f"Joueur{numero}",
        "riotIdTagline": "EUW",
        "championName": "Garen",
        "champLevel": 18,
        "teamPosition": "TOP",
        "teamId": team_id,
        "win": victoire,
        "kills": numero,
        "deaths": 2,
        "assists": 3,
        "totalMinionsKilled": 150,
        "neutralMinionsKilled": 10,
        "goldEarned": 12000,
        "totalDamageDealtToChampions": 10000 + numero * 1000,
        "visionScore": 20,
        **{f"item{i}": 1000 + i for i in range(7)},
        "summoner1Id": 4,
        "summoner2Id": 14,
        "perks": {
            "styles": [
                {"style": 8000, "selections": [{"perk": 8005}]},
                {"style": 8400, "selections": [{"perk": 8444}]},
            ]
        },
    }
    participant.update(surcharges)
    return participant


def fabriquer_match(match_id: str = "EUW1_1", equipe_bleue_gagne: bool = False) -> dict:
    """Un match MATCH-V5 complet : équipe bleue (100) = joueurs 0-4, rouge (200) = joueurs 5-9."""
    participants = [
        fabriquer_participant(i, 100 if i < 5 else 200, (i < 5) == equipe_bleue_gagne)
        for i in range(10)
    ]
    return {
        "metadata": {"matchId": match_id},
        "info": {
            "gameCreation": 1_700_000_000_000,
            "gameDuration": 1800,
            "queueId": 420,
            "participants": participants,
            "teams": [
                {
                    "teamId": 100,
                    "win": equipe_bleue_gagne,
                    "objectives": {"champion": {"kills": 20}, "tower": {"kills": 3}, "dragon": {"kills": 1}, "baron": {"kills": 0}},
                },
                {
                    "teamId": 200,
                    "win": not equipe_bleue_gagne,
                    "objectives": {"champion": {"kills": 30}, "tower": {"kills": 9}, "dragon": {"kills": 3}, "baron": {"kills": 1}},
                },
            ],
        },
    }
