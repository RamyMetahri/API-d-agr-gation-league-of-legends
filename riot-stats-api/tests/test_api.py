import httpx
import pytest

import main
from conftest import fabriquer_match


def erreur_riot(status: int) -> httpx.HTTPStatusError:
    """Construit l'exception que lève httpx quand Riot renvoie ce code HTTP."""
    requete = httpx.Request("GET", "https://europe.api.riotgames.com/test")
    return httpx.HTTPStatusError("erreur", request=requete, response=httpx.Response(status, request=requete))


def interdit(*args, **kwargs):
    raise AssertionError("Cet appel n'aurait pas dû avoir lieu")


# --- get_puuid : cache en base -------------------------------------------------

def test_get_puuid_lit_la_base_sans_appeler_riot(monkeypatch):
    monkeypatch.setattr(main, "get_puuid_en_base", lambda pseudo, tag: "puuid-en-base")
    monkeypatch.setattr(main, "get_account_by_riot_id", interdit)

    assert main.get_puuid("Joueur", "EUW") == "puuid-en-base"


def test_get_puuid_appelle_riot_et_enregistre_le_pseudo_officiel(monkeypatch):
    enregistres = []
    monkeypatch.setattr(main, "get_puuid_en_base", lambda pseudo, tag: None)
    monkeypatch.setattr(
        main, "get_account_by_riot_id",
        lambda pseudo, tag: {"puuid": "puuid-riot", "gameName": "Joueur", "tagLine": "EUW"},
    )
    monkeypatch.setattr(main, "sauvegarder_joueur", lambda **kw: enregistres.append(kw))

    assert main.get_puuid("joueur", "euw") == "puuid-riot"
    assert enregistres == [{"puuid": "puuid-riot", "pseudo": "Joueur", "tag": "EUW"}]


# --- rafraichir_joueur : pas de re-téléchargement -------------------------------

@pytest.fixture
def base_factice(monkeypatch):
    """Remplace toutes les écritures en base par des fonctions qui ne font rien."""
    participations = []
    monkeypatch.setattr(main, "sauvegarder_match", lambda **kw: None)
    monkeypatch.setattr(main, "sauvegarder_details_match", lambda match_id, data: None)
    monkeypatch.setattr(main, "marquer_a_jour", lambda puuid: None)
    monkeypatch.setattr(main, "maj_icone_joueur", lambda **kw: None)
    monkeypatch.setattr(
        main, "sauvegarder_participation",
        lambda **kw: participations.append(kw) or True,
    )
    return participations


def test_rafraichir_ne_telecharge_que_les_nouveaux_matchs(monkeypatch, base_factice):
    telecharges = []
    monkeypatch.setattr(main, "get_match_ids_by_puuid", lambda puuid, count: ["EUW1_1", "EUW1_2", "EUW1_3"])
    monkeypatch.setattr(main, "matchs_existants", lambda puuid, ids: {"EUW1_1", "EUW1_3"})

    def faux_details(match_id):
        telecharges.append(match_id)
        return fabriquer_match(match_id)

    monkeypatch.setattr(main, "get_match_details", faux_details)

    resultat = main.rafraichir_joueur("puuid-0", count=3)

    assert telecharges == ["EUW1_2"]
    assert resultat["nouveaux"] == 1
    assert base_factice[0]["match_id"] == "EUW1_2"
    assert base_factice[0]["neutral_minions_killed"] == 10  # CS de jungle bien transmis


def test_rafraichir_enregistre_l_icone_de_profil_du_joueur(monkeypatch, base_factice):
    icones = []
    monkeypatch.setattr(main, "maj_icone_joueur", lambda **kw: icones.append(kw))
    monkeypatch.setattr(main, "get_match_ids_by_puuid", lambda puuid, count: ["EUW1_1"])
    monkeypatch.setattr(main, "matchs_existants", lambda puuid, ids: set())
    monkeypatch.setattr(main, "get_match_details", lambda match_id: fabriquer_match(match_id))

    main.rafraichir_joueur("puuid-3", count=1)

    assert icones == [
        {"puuid": "puuid-3", "icone_profil": 5003, "niveau": 103, "game_creation": 1_700_000_000_000}
    ]


def test_maj_renvoie_l_icone_et_le_niveau(client, monkeypatch):
    monkeypatch.setattr(main, "get_puuid", lambda pseudo, tag: "puuid-1")
    monkeypatch.setattr(
        main, "get_profil_joueur",
        lambda puuid: {"derniere_maj": None, "icone_profil": 29, "niveau": 250},
    )

    assert client.get("/joueur/Joueur/EUW/maj").json() == {"derniere_maj": None, "icone_profil": 29, "niveau": 250}


def test_rafraichir_ignore_un_match_ou_le_joueur_est_absent(monkeypatch, base_factice):
    monkeypatch.setattr(main, "get_match_ids_by_puuid", lambda puuid, count: ["EUW1_1"])
    monkeypatch.setattr(main, "matchs_existants", lambda puuid, ids: set())
    monkeypatch.setattr(main, "get_match_details", lambda match_id: fabriquer_match(match_id))

    resultat = main.rafraichir_joueur("puuid-inconnu", count=1)

    assert resultat["nouveaux"] == 0
    assert base_factice == []


# --- /match/{id} ----------------------------------------------------------------

def test_detail_match_lu_en_base_sans_appeler_riot(client, monkeypatch):
    monkeypatch.setattr(main, "get_details_match", lambda match_id: fabriquer_match(match_id))
    monkeypatch.setattr(main, "get_match_details", interdit)

    reponse = client.get("/match/EUW1_7")

    assert reponse.status_code == 200
    assert reponse.json()["match_id"] == "EUW1_7"
    assert len(reponse.json()["equipes"]) == 2


def test_detail_match_absent_de_la_base_est_demande_a_riot_puis_stocke(client, monkeypatch):
    stockes = []
    monkeypatch.setattr(main, "get_details_match", lambda match_id: None)
    monkeypatch.setattr(main, "get_match_details", lambda match_id: fabriquer_match(match_id))
    monkeypatch.setattr(main, "sauvegarder_match", lambda **kw: None)
    monkeypatch.setattr(main, "sauvegarder_details_match", lambda match_id, data: stockes.append(match_id))

    reponse = client.get("/match/EUW1_8")

    assert reponse.status_code == 200
    assert stockes == ["EUW1_8"]


# --- Gestion des erreurs Riot ---------------------------------------------------

@pytest.mark.parametrize(
    "status_riot, status_attendu",
    [(404, 404), (401, 401), (403, 401), (429, 429), (500, 502)],
)
def test_erreurs_riot_converties(client, monkeypatch, status_riot, status_attendu):
    def echec(match_id):
        raise erreur_riot(status_riot)

    monkeypatch.setattr(main, "get_details_match", lambda match_id: None)
    monkeypatch.setattr(main, "get_match_details", echec)

    reponse = client.get("/match/EUW1_1")

    assert reponse.status_code == status_attendu
    assert isinstance(reponse.json()["detail"], str)


def test_riot_injoignable_donne_503(client, monkeypatch):
    def echec(match_id):
        raise httpx.ConnectTimeout("timeout")

    monkeypatch.setattr(main, "get_details_match", lambda match_id: None)
    monkeypatch.setattr(main, "get_match_details", echec)

    assert client.get("/match/EUW1_1").status_code == 503


# --- Validation des paramètres --------------------------------------------------

def test_platform_hors_liste_blanche_refusee(client, monkeypatch):
    monkeypatch.setattr(main, "get_puuid", interdit)

    reponse = client.get("/joueur/Joueur/EUW/rang", params={"platform": "site-pirate.com/#"})

    assert reponse.status_code == 422


def test_count_trop_grand_refuse(client, monkeypatch):
    monkeypatch.setattr(main, "get_puuid", interdit)

    assert client.get("/joueur/Joueur/EUW/matchs", params={"count": 500}).status_code == 422


def test_recherche_vide(client):
    assert client.get("/joueurs/recherche", params={"q": ""}).json() == {"resultats": []}
