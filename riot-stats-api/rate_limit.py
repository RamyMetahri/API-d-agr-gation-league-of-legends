"""
Limiteur de requêtes par IP, en mémoire.
Protège le quota Riot : sans lui, n'importe qui pourrait vider notre quota
en appelant l'API en boucle. Suffisant pour une seule instance du serveur.
"""

import math
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request


class LimiteurRequetes:
    """Autorise au plus `max_requetes` par IP sur une fenêtre glissante de `fenetre_secondes`."""

    def __init__(self, max_requetes: int, fenetre_secondes: int = 60):
        self.max_requetes = max_requetes
        self.fenetre_secondes = fenetre_secondes
        self.requetes_par_ip: dict[str, deque] = defaultdict(deque)

    def __call__(self, request: Request):
        ip = request.client.host if request.client else "inconnue"
        maintenant = time.monotonic()

        # Évite que le dictionnaire grossisse sans fin avec des IP qui ne reviennent jamais
        if len(self.requetes_par_ip) > 10_000:
            self.purger(maintenant)

        requetes = self.requetes_par_ip[ip]

        # On oublie les requêtes sorties de la fenêtre
        while requetes and requetes[0] <= maintenant - self.fenetre_secondes:
            requetes.popleft()

        if len(requetes) >= self.max_requetes:
            attente = math.ceil(requetes[0] + self.fenetre_secondes - maintenant)
            raise HTTPException(
                status_code=429,
                detail="Trop de requêtes, réessaie dans quelques secondes",
                headers={"Retry-After": str(attente)},
            )

        requetes.append(maintenant)

    def purger(self, maintenant: float):
        """Supprime les IP dont toutes les requêtes sont sorties de la fenêtre."""
        limite = maintenant - self.fenetre_secondes
        for ip in [ip for ip, reqs in self.requetes_par_ip.items() if not reqs or reqs[-1] <= limite]:
            del self.requetes_par_ip[ip]

    def reinitialiser(self):
        self.requetes_par_ip.clear()
