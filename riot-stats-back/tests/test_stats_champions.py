import main
from stats_champions import resumer_champion


def totaux(**surcharges) -> dict:
    """Totaux d'un champion sur 4 parties de 30 min."""
    valeurs = {
        "champion": "Zed",
        "parties": 4,
        "victoires": 3,
        "kills": 32,
        "deaths": 16,
        "assists": 20,
        "cs": 840,
        "duree_secondes": 4 * 1800,
    }
    valeurs.update(surcharges)
    return valeurs


def test_moyennes_et_winrate():
    resume = resumer_champion(totaux())

    assert resume["champion"] == "Zed"
    assert resume["parties"] == 4
    assert resume["defaites"] == 1
    assert resume["winrate"] == 75.0
    assert resume["kda_moyen"] == {"kills": 8.0, "deaths": 4.0, "assists": 5.0}
    assert resume["ratio_kda"] == 3.25  # (32 + 20) / 16
    assert resume["cs_par_minute"] == 7.0  # 840 CS en 120 min


def test_aucune_mort_donne_un_kda_parfait():
    assert resumer_champion(totaux(deaths=0))["ratio_kda"] is None


def test_duree_nulle_ne_plante_pas():
    assert resumer_champion(totaux(duree_secondes=0))["cs_par_minute"] == 0


def test_route_champions_filtre_par_mode(client, monkeypatch):
    appels = []
    monkeypatch.setattr(main, "get_puuid", lambda pseudo, tag: "puuid-1")

    def faux_totaux(puuid, queue_id=None):
        appels.append((puuid, queue_id))
        return [totaux(), totaux(champion="Ahri", parties=1, victoires=0)]

    monkeypatch.setattr(main, "get_totaux_par_champion", faux_totaux)

    reponse = client.get("/joueur/Joueur/EUW/champions", params={"queue_id": 420})

    assert reponse.status_code == 200
    assert [c["champion"] for c in reponse.json()["champions"]] == ["Zed", "Ahri"]
    assert appels == [("puuid-1", 420)]
