"""
Connexion à PostgreSQL et création des tables, avec psycopg2.
"""

import os
import psycopg2
from psycopg2.extras import Json
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL absente. Vérifie ton fichier .env")


def get_connection():
    """Ouvre une nouvelle connexion à la base. À fermer après usage."""
    return psycopg2.connect(DATABASE_URL)


def creer_tables():
    """Crée les tables si elles n'existent pas déjà."""
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS joueurs (
            puuid TEXT PRIMARY KEY,
            pseudo TEXT NOT NULL,
            tag TEXT NOT NULL,
            derniere_maj TIMESTAMP
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS matchs (
            match_id TEXT PRIMARY KEY,
            game_duration INTEGER,
            game_creation BIGINT,
            queue_id INTEGER
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS participations (
            id SERIAL PRIMARY KEY,
            puuid TEXT NOT NULL REFERENCES joueurs(puuid),
            match_id TEXT NOT NULL REFERENCES matchs(match_id),
            champion_name TEXT,
            kills INTEGER,
            deaths INTEGER,
            assists INTEGER,
            win BOOLEAN,
            gold_earned INTEGER,
            total_minions_killed INTEGER,
            UNIQUE (puuid, match_id)
        );
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS rangs (
            id SERIAL PRIMARY KEY,
            puuid TEXT NOT NULL REFERENCES joueurs(puuid),
            queue_type TEXT NOT NULL,
            tier TEXT,
            rank TEXT,
            league_points INTEGER,
            wins INTEGER,
            losses INTEGER,
            UNIQUE (puuid, queue_type)
        );
    """)

    # JSON complet renvoyé par Riot, pour afficher le détail d'un match sans rappeler Riot
    cur.execute("""
        CREATE TABLE IF NOT EXISTS matchs_details (
            match_id TEXT PRIMARY KEY REFERENCES matchs(match_id),
            data JSONB NOT NULL
        );
    """)

    # Migration : monstres neutres (jungle), ajoutés après coup pour avoir le vrai CS
    cur.execute("ALTER TABLE participations ADD COLUMN IF NOT EXISTS neutral_minions_killed INTEGER;")
    # Rattrapage des anciennes lignes à partir du JSON complet des matchs, quand on l'a
    cur.execute("""
        UPDATE participations p
        SET neutral_minions_killed = (participant->>'neutralMinionsKilled')::int
        FROM matchs_details d,
             jsonb_array_elements(d.data->'info'->'participants') AS participant
        WHERE d.match_id = p.match_id
          AND participant->>'puuid' = p.puuid
          AND p.neutral_minions_killed IS NULL;
    """)

    conn.commit()
    cur.close()
    conn.close()


def sauvegarder_joueur(puuid: str, pseudo: str, tag: str):
    """
    Insère un joueur. Si le puuid existe déjà, met à jour pseudo et tag
    (un joueur peut changer de Riot ID, on garde toujours le plus récent).
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO joueurs (puuid, pseudo, tag)
        VALUES (%s, %s, %s)
        ON CONFLICT (puuid) DO UPDATE SET
            pseudo = EXCLUDED.pseudo,
            tag = EXCLUDED.tag;
    """, (puuid, pseudo, tag))
    conn.commit()
    cur.close()
    conn.close()

def get_puuid_en_base(pseudo: str, tag: str):
    """
    Cherche le PUUID d'un joueur déjà connu (pseudo#tag insensible à la casse).
    Renvoie None s'il n'est pas en base : il faudra alors demander à Riot.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT puuid FROM joueurs
        WHERE LOWER(pseudo) = LOWER(%s) AND LOWER(tag) = LOWER(%s);
    """, (pseudo, tag))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row[0] if row else None


def matchs_existants(puuid: str, match_ids: list[str]) -> set[str]:
    """
    Renvoie les match_id de la liste pour lesquels la participation du joueur est déjà en base et complète.
    Une ligne sans neutral_minions_killed (enregistrée avant l'ajout de la colonne) est considérée
    comme absente : le match sera re-téléchargé une fois pour la compléter.
    """
    if not match_ids:
        return set()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT match_id FROM participations
        WHERE puuid = %s AND match_id = ANY(%s) AND neutral_minions_killed IS NOT NULL;
    """, (puuid, list(match_ids)))
    existants = {row[0] for row in cur.fetchall()}
    cur.close()
    conn.close()
    return existants


def sauvegarder_match(match_id: str, game_duration: int, game_creation: int, queue_id: int):
    """Insère un match. Si le match_id existe déjà, ne fait rien."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO matchs (match_id, game_duration, game_creation, queue_id)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (match_id) DO NOTHING;
    """, (match_id, game_duration, game_creation, queue_id))
    conn.commit()
    cur.close()
    conn.close()


def sauvegarder_details_match(match_id: str, data: dict):
    """Stocke le JSON complet d'un match. Si déjà présent, ne fait rien."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO matchs_details (match_id, data)
        VALUES (%s, %s)
        ON CONFLICT (match_id) DO NOTHING;
    """, (match_id, Json(data)))
    conn.commit()
    cur.close()
    conn.close()


def get_details_match(match_id: str):
    """Renvoie le JSON complet d'un match stocké en base (ou None)."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT data FROM matchs_details WHERE match_id = %s;", (match_id,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row[0] if row else None


def sauvegarder_participation(puuid: str, match_id: str, champion_name: str,
                                kills: int, deaths: int, assists: int, win: bool,
                                gold_earned: int, total_minions_killed: int,
                                neutral_minions_killed: int) -> bool:
    """
    Insère une participation, ou complète le CS d'une ligne existante.
    Retourne True si une nouvelle ligne a été insérée, False si elle existait déjà.
    """
    conn = get_connection()
    cur = conn.cursor()
    # xmax = 0 uniquement pour une ligne tout juste insérée (astuce PostgreSQL pour distinguer INSERT et UPDATE)
    cur.execute("""
        INSERT INTO participations
            (puuid, match_id, champion_name, kills, deaths, assists, win, gold_earned,
             total_minions_killed, neutral_minions_killed)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (puuid, match_id)
        DO UPDATE SET neutral_minions_killed = EXCLUDED.neutral_minions_killed
        RETURNING (xmax = 0);
    """, (puuid, match_id, champion_name, kills, deaths, assists, win, gold_earned,
          total_minions_killed, neutral_minions_killed))
    inserte = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return inserte

def sauvegarder_rang(puuid: str, queue_type: str, tier: str, rank: str,
                       league_points: int, wins: int, losses: int):
    """
    Insère ou met à jour le rang d'un joueur pour une file donnée.
    Contrairement aux participations, on VEUT écraser l'ancienne valeur :
    le rang change dans le temps, on garde toujours le plus récent.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO rangs (puuid, queue_type, tier, rank, league_points, wins, losses)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (puuid, queue_type)
        DO UPDATE SET
            tier = EXCLUDED.tier,
            rank = EXCLUDED.rank,
            league_points = EXCLUDED.league_points,
            wins = EXCLUDED.wins,
            losses = EXCLUDED.losses;
    """, (puuid, queue_type, tier, rank, league_points, wins, losses))
    conn.commit()
    cur.close()
    conn.close()


def get_historique_joueur(puuid: str, queue_id: int = None, limite: int = 20):
    """
    Récupère les derniers matchs d'un joueur, avec toutes les stats détaillées.
    queue_id optionnel : filtre sur un mode de jeu précis (420 = Solo/Duo, etc.)
    """
    conn = get_connection()
    cur = conn.cursor()

    requete = """
        SELECT
            p.puuid,
            j.pseudo,
            j.tag,
            p.champion_name,
            p.kills,
            p.deaths,
            p.assists,
            p.win,
            p.gold_earned,
            p.total_minions_killed,
            p.total_minions_killed + COALESCE(p.neutral_minions_killed, 0) AS cs,
            m.match_id,
            m.game_creation,
            m.game_duration,
            m.queue_id
        FROM participations p
        JOIN joueurs j ON j.puuid = p.puuid
        JOIN matchs m ON m.match_id = p.match_id
        WHERE p.puuid = %s
    """
    params = [puuid]

    if queue_id is not None:
        requete += " AND m.queue_id = %s"
        params.append(queue_id)

    requete += " ORDER BY m.game_creation DESC LIMIT %s;"
    params.append(limite)

    cur.execute(requete, tuple(params))

    colonnes = [desc[0] for desc in cur.description]
    lignes = cur.fetchall()

    cur.close()
    conn.close()

    return [dict(zip(colonnes, ligne)) for ligne in lignes]

def get_stats_joueur(puuid: str, limite: int = 15, queue_id: int = None):
    conn = get_connection()
    cur = conn.cursor()

    filtre_queue = "AND m.queue_id = %s" if queue_id is not None else ""
    params_sous_requete = [puuid] + ([queue_id] if queue_id is not None else []) + [limite]

    cur.execute(f"""
        SELECT
            COUNT(*) AS nb_parties,
            SUM(CASE WHEN win THEN 1 ELSE 0 END) AS victoires,
            AVG(kills) AS kills_moyen,
            AVG(deaths) AS deaths_moyen,
            AVG(assists) AS assists_moyen
        FROM (
            SELECT p.kills, p.deaths, p.assists, p.win
            FROM participations p
            JOIN matchs m ON m.match_id = p.match_id
            WHERE p.puuid = %s {filtre_queue}
            ORDER BY m.game_creation DESC
            LIMIT %s
        ) AS derniers_matchs;
    """, tuple(params_sous_requete))

    nb_parties, victoires, kills_moyen, deaths_moyen, assists_moyen = cur.fetchone()

    cur.execute(f"""
        SELECT champion_name, COUNT(*) AS nb
        FROM (
            SELECT p.champion_name
            FROM participations p
            JOIN matchs m ON m.match_id = p.match_id
            WHERE p.puuid = %s {filtre_queue}
            ORDER BY m.game_creation DESC
            LIMIT %s
        ) AS derniers_matchs
        GROUP BY champion_name
        ORDER BY nb DESC
        LIMIT 1;
    """, tuple(params_sous_requete))

    champion_favori = cur.fetchone()

    cur.close()
    conn.close()

    if nb_parties == 0:
        return {"nb_parties": 0, "message": "Aucune donnée en base pour ce joueur/ce mode."}

    winrate = round((victoires / nb_parties) * 100, 1)

    return {
        "nb_parties_analysees": nb_parties,
        "victoires": victoires,
        "defaites": nb_parties - victoires,
        "winrate": winrate,
        "kda_moyen": {
            "kills": round(kills_moyen, 1),
            "deaths": round(deaths_moyen, 1),
            "assists": round(assists_moyen, 1),
        },
        "champion_favori": {
            "nom": champion_favori[0],
            "parties_jouees": champion_favori[1],
        } if champion_favori else None,
    }

def get_rangs_joueur(puuid: str) -> list[dict]:
    """Lit les rangs stockés d'un joueur, toutes files confondues."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT queue_type, tier, rank, league_points, wins, losses
        FROM rangs
        WHERE puuid = %s;
    """, (puuid,))
    colonnes = [desc[0] for desc in cur.description]
    lignes = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(zip(colonnes, ligne)) for ligne in lignes]


def a_besoin_de_refresh(puuid: str, minutes: int = 10) -> bool:
    """
    Vérifie si les données du joueur sont trop anciennes (ou absentes)
    et doivent être rafraîchies depuis Riot.
    """
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT derniere_maj IS NULL OR derniere_maj < NOW() - (%s * INTERVAL '1 minute')
        FROM joueurs
        WHERE puuid = %s;
    """, (minutes, puuid))
    row = cur.fetchone()
    cur.close()
    conn.close()

    # Si le joueur n'existe pas encore en base, row vaut None -> il faut le rafraîchir
    if row is None:
        return True
    return row[0]

def marquer_a_jour(puuid: str):
    """Met à jour le timestamp de dernière synchronisation d'un joueur."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        UPDATE joueurs SET derniere_maj = NOW() WHERE puuid = %s;
    """, (puuid,))
    conn.commit()
    cur.close()
    conn.close()

def rechercher_joueurs(prefixe: str, limite: int = 8):
    """Cherche des joueurs déjà en base dont le pseudo commence par ce préfixe."""
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT pseudo, tag
        FROM joueurs
        WHERE pseudo ILIKE %s
        ORDER BY pseudo
        LIMIT %s;
    """, (f"{prefixe}%", limite))
    resultats = cur.fetchall()
    cur.close()
    conn.close()
    return [{"pseudo": p, "tag": t} for p, t in resultats]


def get_derniere_maj(puuid: str):
    """Renvoie la date de dernière synchro d'un joueur (ou None)."""
    conn = get_connection()
    cur = conn.cursor()
    # AT TIME ZONE : renvoie une date avec fuseau, pour que le front calcule "il y a X min" correctement
    cur.execute("""
        SELECT derniere_maj AT TIME ZONE current_setting('TimeZone')
        FROM joueurs WHERE puuid = %s;
    """, (puuid,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row[0] if row else None