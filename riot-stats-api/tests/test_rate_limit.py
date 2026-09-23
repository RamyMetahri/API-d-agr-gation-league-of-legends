import pytest
from fastapi import HTTPException

import main
from conftest import fabriquer_match
from rate_limit import LimiteurRequetes


class FausseRequete:
    def __init__(self, ip: str):
        self.client = type("Client", (), {"host": ip})()


def test_bloque_au_dela_de_la_limite():
    limiteur = LimiteurRequetes(max_requetes=2, fenetre_secondes=60)
    limiteur(FausseRequete("1.1.1.1"))
    limiteur(FausseRequete("1.1.1.1"))

    with pytest.raises(HTTPException) as erreur:
        limiteur(FausseRequete("1.1.1.1"))

    assert erreur.value.status_code == 429
    assert int(erreur.value.headers["Retry-After"]) > 0


def test_compte_chaque_ip_separement():
    limiteur = LimiteurRequetes(max_requetes=1, fenetre_secondes=60)
    limiteur(FausseRequete("1.1.1.1"))
    limiteur(FausseRequete("2.2.2.2"))  # ne lève pas d'exception


def test_la_fenetre_glisse(monkeypatch):
    horloge = [1000.0]
    monkeypatch.setattr("rate_limit.time.monotonic", lambda: horloge[0])
    limiteur = LimiteurRequetes(max_requetes=1, fenetre_secondes=60)

    limiteur(FausseRequete("1.1.1.1"))
    horloge[0] += 61
    limiteur(FausseRequete("1.1.1.1"))  # la première requête est sortie de la fenêtre


def test_purge_des_ip_inactives():
    limiteur = LimiteurRequetes(max_requetes=5, fenetre_secondes=60)
    limiteur(FausseRequete("1.1.1.1"))

    limiteur.purger(maintenant=10**9)

    assert limiteur.requetes_par_ip == {}


def test_limite_appliquee_sur_les_routes(client, monkeypatch):
    monkeypatch.setattr(main.limiteur, "max_requetes", 2)
    monkeypatch.setattr(main, "get_details_match", lambda match_id: fabriquer_match(match_id))

    codes = [client.get("/match/EUW1_1").status_code for _ in range(3)]

    assert codes == [200, 200, 429]


def test_sante(client):
    assert client.get("/sante").json() == {"statut": "ok"}
