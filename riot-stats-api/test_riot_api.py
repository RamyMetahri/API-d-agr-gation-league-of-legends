"""
Premier appel de test vers l'API Riot (ACCOUNT-V1).
Usage : python test_riot_api.py "Pseudo" "Tag"
Exemple : python test_riot_api.py "Faker" "KR1"
"""

import sys
import os
import httpx
from dotenv import load_dotenv

# Charge les variables du fichier .env dans l'environnement
load_dotenv()

API_KEY = os.getenv("RIOT_API_KEY")

if not API_KEY:
    print("Erreur : RIOT_API_KEY absente. Vérifie ton fichier .env")
    sys.exit(1)

if len(sys.argv) != 3:
    print('Usage : python test_riot_api.py "Pseudo" "Tag"')
    sys.exit(1)

game_name = sys.argv[1]
tag_line = sys.argv[2]

# ACCOUNT-V1 est sur une route régionale (europe / americas / asia),
# pas sur une route de plateforme (euw1, na1, etc.)
url = f"https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"

headers = {"X-Riot-Token": API_KEY}

response = httpx.get(url, headers=headers)

print(f"Status code : {response.status_code}")

if response.status_code == 200:
    data = response.json()
    print("Succès ! Voici les données du compte :")
    print(data)
    print(f"\nPUUID à retenir pour la suite : {data['puuid']}")
elif response.status_code == 401:
    print("Erreur 401 : clé API invalide ou expirée. Régénère-la sur developer.riotgames.com")
elif response.status_code == 404:
    print("Erreur 404 : joueur introuvable. Vérifie le pseudo et le tag (sans le #).")
elif response.status_code == 429:
    print("Erreur 429 : rate limit atteint. Attends un peu avant de réessayer.")
else:
    print(f"Erreur inattendue : {response.text}")
