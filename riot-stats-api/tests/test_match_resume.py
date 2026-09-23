from conftest import fabriquer_match
from match_resume import resumer_joueur, resumer_match


def test_equipe_gagnante_en_premier():
    resume = resumer_match(fabriquer_match(equipe_bleue_gagne=False))

    assert [e["team_id"] for e in resume["equipes"]] == [200, 100]
    assert resume["equipes"][0]["victoire"] is True
    assert resume["equipes"][1]["victoire"] is False


def test_cinq_joueurs_par_equipe_dans_la_bonne_equipe():
    resume = resumer_match(fabriquer_match(equipe_bleue_gagne=True))
    bleue, rouge = resume["equipes"]

    assert [j["puuid"] for j in bleue["joueurs"]] == [f"puuid-{i}" for i in range(5)]
    assert [j["puuid"] for j in rouge["joueurs"]] == [f"puuid-{i}" for i in range(5, 10)]


def test_infos_generales_et_objectifs():
    resume = resumer_match(fabriquer_match(match_id="EUW1_42", equipe_bleue_gagne=True))

    assert resume["match_id"] == "EUW1_42"
    assert resume["queue_id"] == 420
    assert resume["game_duration"] == 1800
    assert resume["equipes"][0]["objectifs"] == {"kills": 20, "tours": 3, "dragons": 1, "barons": 0}


def test_degats_max_du_match():
    # Le joueur 9 fait le plus de dégâts : 10000 + 9 * 1000
    assert resumer_match(fabriquer_match())["degats_max"] == 19000


def test_joueur_cs_items_sorts_runes():
    joueur = resumer_match(fabriquer_match(equipe_bleue_gagne=True))["equipes"][0]["joueurs"][0]

    assert joueur["pseudo"] == "Joueur0"
    assert joueur["tag"] == "EUW"
    assert joueur["cs"] == 160  # sbires + monstres neutres
    assert joueur["items"] == [1000, 1001, 1002, 1003, 1004, 1005, 1006]
    assert joueur["sorts"] == [4, 14]
    assert joueur["rune_principale"] == 8005
    assert joueur["rune_secondaire"] == 8400


def test_ancien_match_sans_riot_id_ni_runes():
    participant = fabriquer_match()["info"]["participants"][0]
    del participant["riotIdGameName"], participant["riotIdTagline"], participant["perks"]
    participant["summonerName"] = "VieuxPseudo"

    joueur = resumer_joueur(participant)

    assert joueur["pseudo"] == "VieuxPseudo"
    assert joueur["tag"] == ""
    assert joueur["rune_principale"] is None
    assert joueur["rune_secondaire"] is None
