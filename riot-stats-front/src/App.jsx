import { useEffect, useRef, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import "./App.css";

const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

// Version de secours si Data Dragon est injoignable ; la vraie est chargée au démarrage
const VERSION_DDRAGON_SECOURS = "14.19.1";

/** Lit la réponse JSON, ou lève une erreur avec le message ("detail") renvoyé par l'API. */
async function lireJson(res) {
  if (res.ok) return res.json();
  let detail = null;
  try {
    detail = (await res.json()).detail;
  } catch {
    // corps vide ou non-JSON : on garde le message générique
  }
  throw new Error(typeof detail === "string" ? detail : `Erreur ${res.status}`);
}

function urlJoueur(pseudo, tag) {
  return `${API}/joueur/${encodeURIComponent(pseudo)}/${encodeURIComponent(tag)}`;
}

const MODES = [
  { id: "", label: "Tous les modes" },
  { id: "420", label: "Ranked Solo/Duo" },
  { id: "440", label: "Ranked Flex" },
  { id: "450", label: "ARAM" },
  { id: "400", label: "Normal Draft" },
  { id: "430", label: "Normal Blind" },
];

const NOMS_MODES = Object.fromEntries(MODES.map((m) => [m.id, m.label]));

const NOMS_FILES = {
  RANKED_SOLO_5x5: "Solo/Duo",
  RANKED_FLEX_SR: "Flex",
};

function App() {
  const [pseudo, setPseudo] = useState("");
  const [tag, setTag] = useState("");
  const [mode, setMode] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const [joueurAffiche, setJoueurAffiche] = useState(null);
  const [stats, setStats] = useState(null);
  const [historique, setHistorique] = useState(null);
  const [rangs, setRangs] = useState(null);
  const [derniereMaj, setDerniereMaj] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [versionDdragon, setVersionDdragon] = useState(VERSION_DDRAGON_SECOURS);
  const derniereRequeteSuggestions = useRef(0);

  useEffect(() => {
    fetch("https://ddragon.leagueoflegends.com/api/versions.json")
      .then((res) => res.json())
      .then((versions) => setVersionDdragon(versions[0]))
      .catch(() => {});
  }, []);

  function retourAccueil() {
    setJoueurAffiche(null);
    setStats(null);
    setHistorique(null);
    setRangs(null);
    setDerniereMaj(null);
    setErreur(null);
    setPseudo("");
    setTag("");
  }

  async function chercherSuggestions(valeur) {
    setPseudo(valeur);
    if (valeur.length < 1) {
      setSuggestions([]);
      return;
    }
    // Si l'utilisateur tape vite, une ancienne réponse peut arriver après une plus récente : on l'ignore
    const numeroRequete = ++derniereRequeteSuggestions.current;
    try {
      const data = await lireJson(await fetch(`${API}/joueurs/recherche?q=${encodeURIComponent(valeur)}`));
      if (numeroRequete === derniereRequeteSuggestions.current) setSuggestions(data.resultats);
    } catch {
      if (numeroRequete === derniereRequeteSuggestions.current) setSuggestions([]);
    }
  }

  function choisirSuggestion(s) {
    setPseudo(s.pseudo);
    setTag(s.tag);
    setSuggestions([]);
  }

  function gererToucheRecherche(e) {
    if (e.key === "Enter") {
      setSuggestions([]);
      rechercherJoueur();
    }
  }

  async function rechercherJoueur(pseudoRecherche = pseudo, tagRecherche = tag) {
    if (!pseudoRecherche || !tagRecherche) {
      setErreur("Renseigne un pseudo et un tag pour lancer la recherche.");
      return;
    }

    setChargement(true);
    setErreur(null);

    const suffixeMode = mode ? `&queue_id=${mode}` : "";
    const suffixeModeHistorique = mode ? `?queue_id=${mode}` : "";

    try {
      const base = urlJoueur(pseudoRecherche, tagRecherche);

      // /stats d'abord : c'est lui qui déclenche la synchro avec Riot si les données sont anciennes.
      // Les 3 autres lisent ensuite la base à jour (et le PUUID déjà connu), en parallèle.
      const dataStats = await lireJson(await fetch(`${base}/stats?limite=15${suffixeMode}`));
      const [dataHistorique, dataRangs, dataMaj] = await Promise.all([
        fetch(`${base}/historique${suffixeModeHistorique}`).then(lireJson),
        fetch(`${base}/rang`).then(lireJson),
        fetch(`${base}/maj`).then(lireJson),
      ]);

      setStats(dataStats);
      setHistorique(dataHistorique.historique);
      setRangs(dataRangs);
      setDerniereMaj(dataMaj.derniere_maj);
      setJoueurAffiche({ pseudo: pseudoRecherche, tag: tagRecherche });
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  async function actualiserJoueur() {
    if (!joueurAffiche) return;
    setActualisation(true);
    try {
      await lireJson(await fetch(`${urlJoueur(joueurAffiche.pseudo, joueurAffiche.tag)}/matchs?count=15`));
      await rechercherJoueur(joueurAffiche.pseudo, joueurAffiche.tag);
    } catch (err) {
      setErreur(err.message);
    } finally {
      setActualisation(false);
    }
  }

  function urlIconeChampion(nomChampion) {
    return `https://ddragon.leagueoflegends.com/cdn/${versionDdragon}/img/champion/${nomChampion}.png`;
  }

  function urlEmblemeRang(tier) {
    return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}.png`;
  }

  function formatDuree(secondes) {
    const min = Math.floor(secondes / 60);
    const sec = secondes % 60;
    return `${min}m ${sec}s`;
  }

  function formatDate(timestampMs) {
    return new Date(timestampMs).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
  }

  function formatDerniereMaj(iso) {
    if (!iso) return "jamais";
    const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    return `il y a ${diffH}h`;
  }

  function classeKda(kills, deaths, assists) {
    if (deaths === 0) return "kda-excellent";
    const ratio = (kills + assists) / deaths;
    if (ratio >= 4) return "kda-excellent";
    if (ratio >= 2) return "kda-bon";
    return "kda-faible";
  }

  const donneesGraphique = stats
    ? [
        { name: "Victoires", value: stats.victoires },
        { name: "Défaites", value: stats.defaites },
      ]
    : [];

  const champAutocomplete = (placeholder, className = "") => (
    <div className="champ-autocomplete">
      <input
        type="text"
        placeholder={placeholder}
        value={pseudo}
        className={className}
        onChange={(e) => chercherSuggestions(e.target.value)}
        onKeyDown={gererToucheRecherche}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul className="dropdown-suggestions">
          {suggestions.map((s) => (
            <li key={s.pseudo + s.tag} onClick={() => choisirSuggestion(s)}>
              {s.pseudo}
              <span className="tag-suggestion">#{s.tag}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="page">
      <nav className="navbar">
        <div className="logo" onClick={retourAccueil}>
          <svg className="logo-icone" viewBox="0 0 48 48" aria-hidden="true">
            <path d="M24 3 L43 12 V26 C43 36 35 43 24 46 C13 43 5 36 5 26 V12 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
            <path d="M24 13 L26.5 21.5 L35 22 L28 27.5 L30 36 L24 31 L18 36 L20 27.5 L13 22 L21.5 21.5 Z" fill="currentColor" />
          </svg>
          <span className="logo-texte">Riot<b>Stats</b></span>
        </div>
        {joueurAffiche && (
          <div className="navbar-recherche">
            {champAutocomplete("Pseudo")}
            <input
              type="text"
              placeholder="Tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={gererToucheRecherche}
            />
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <button onClick={() => rechercherJoueur()} disabled={chargement}>
              {chargement ? "..." : "Rechercher"}
            </button>
          </div>
        )}
      </nav>

      {!joueurAffiche && (
        <div className="accueil">
          <div className="accueil-fond" aria-hidden="true" />
          <span className="eyebrow">Suivi de statistiques</span>
          <h1 className="titre">RIOT STATS</h1>
          <p className="sous-titre">Rang, winrate, KDA et historique de parties, en un coup d'œil.</p>
          <div className="barre-recherche">
            {champAutocomplete("Pseudo")}
            <span className="separateur-hashtag">#</span>
            <input
              type="text"
              placeholder="Tag (ex: EUW)"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              onKeyDown={gererToucheRecherche}
            />
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <button className="bouton-recherche-rond" onClick={() => rechercherJoueur()} aria-label="Rechercher" disabled={chargement}>
              {chargement ? <span className="spinner" /> : "⚔"}
            </button>
          </div>
          {erreur && <p className="erreur">{erreur}</p>}
        </div>
      )}

      {joueurAffiche && (
        <div className="contenu-dashboard">
          <div className="entete-joueur">
            <h1 className="titre-joueur">
              {joueurAffiche.pseudo}<span className="tag-joueur">#{joueurAffiche.tag}</span>
            </h1>
            <div className="bloc-maj">
              <span className="info-maj">Mis à jour {formatDerniereMaj(derniereMaj)}</span>
              <button className="bouton-actualiser" onClick={actualiserJoueur} disabled={actualisation}>
                <span className={`icone-refresh ${actualisation ? "tourne" : ""}`}>↻</span>
                {actualisation ? "Actualisation..." : "Actualiser"}
              </button>
            </div>
          </div>

          {erreur && <p className="erreur">{erreur}</p>}

          {chargement ? (
            <div className="grille-squelette">
              <div className="squelette squelette-colonne" />
              <div className="squelette squelette-liste" />
            </div>
          ) : (
            <div className="dashboard">
              <div className="colonne-gauche">
                {rangs && rangs.length > 0 && (
                  <div className="carte carte-rangs">
                    <h2>Rang</h2>
                    {rangs.map((r) => (
                      <div key={r.queue_type} className="ligne-rang">
                        <img
                          className="embleme-rang"
                          src={urlEmblemeRang(r.tier)}
                          alt={r.tier}
                          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
                        />
                        <div className="ligne-rang-texte">
                          <span className="label">{NOMS_FILES[r.queue_type] || r.queue_type}</span>
                          <span className={`valeur-rang tier-${r.tier.toLowerCase()}`}>{r.tier} {r.rank} — {r.league_points} LP</span>
                          <span className="wl-rang">{r.wins}V {r.losses}D</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {rangs && rangs.length === 0 && (
                  <div className="carte carte-rangs">
                    <h2>Rang</h2>
                    <p className="info">Non classé cette saison.</p>
                  </div>
                )}

                {stats && stats.nb_parties === 0 && (
                  <div className="carte carte-stats">
                    <p className="info">{stats.message}</p>
                  </div>
                )}

                {stats && stats.nb_parties_analysees !== undefined && (
                  <div className="carte carte-stats">
                    <h2>Statistiques ({stats.nb_parties_analysees} dernières parties)</h2>
                    <div className="graphique-container">
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie
                            data={donneesGraphique}
                            dataKey="value"
                            innerRadius={45}
                            outerRadius={70}
                            startAngle={90}
                            endAngle={-270}
                            isAnimationActive={false}
                            stroke="none"
                          >
                            <Cell fill="var(--victoire)" />
                            <Cell fill="var(--defaite)" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="winrate-central">
                        <span className={stats.winrate >= 50 ? "positif" : "negatif"}>{stats.winrate}%</span>
                        <span className="winrate-label">winrate</span>
                      </div>
                    </div>
                    <div className="ligne-stat"><span className="label">Victoires</span><span className="positif">{stats.victoires}</span></div>
                    <div className="ligne-stat"><span className="label">Défaites</span><span className="negatif">{stats.defaites}</span></div>
                    <div className="ligne-stat">
                      <span className="label">KDA moyen</span>
                      <span>{stats.kda_moyen.kills} / {stats.kda_moyen.deaths} / {stats.kda_moyen.assists}</span>
                    </div>
                    {stats.champion_favori && (
                      <div className="ligne-stat ligne-champion-favori">
                        <span className="label">Champion favori</span>
                        <span className="champion-favori-valeur">
                          <img className="icone-champion-mini" src={urlIconeChampion(stats.champion_favori.nom)} alt="" />
                          {stats.champion_favori.nom} ({stats.champion_favori.parties_jouees})
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {historique && historique.length > 0 && (
                <div className="carte liste-matchs">
                  <h2>Derniers matchs</h2>
                  <div className="conteneur-matchs">
                    {historique.map((match) => {
                      const kda = match.deaths === 0
                        ? "Perfect"
                        : ((match.kills + match.assists) / match.deaths).toFixed(2);
                      const csParMinute = (match.total_minions_killed / (match.game_duration / 60)).toFixed(1);

                      return (
                        <div key={match.match_id} className={`carte-match ${match.win ? "victoire" : "defaite"}`}>
                          <div className="colonne-match-mode">
                            <span className="mode-jeu">{NOMS_MODES[String(match.queue_id)] || "Autre"}</span>
                            <span className="date-match">{formatDate(match.game_creation)}</span>
                            <span className="duree-match">{formatDuree(match.game_duration)}</span>
                          </div>
                          <img className="icone-champion" src={urlIconeChampion(match.champion_name)} alt={match.champion_name} />
                          <div className="infos-match">
                            <span className="champion-nom">{match.champion_name}</span>
                            <span className={`resultat resultat-${match.win ? "victoire" : "defaite"}`}>{match.win ? "Victoire" : "Défaite"}</span>
                          </div>
                          <div className="kda-match">
                            <span>{match.kills} / {match.deaths} / {match.assists}</span>
                            <span className={`kda-ratio ${classeKda(match.kills, match.deaths, match.assists)}`}>{kda} KDA</span>
                          </div>
                          <div className="farm-match">
                            <span>{match.total_minions_killed} CS</span>
                            <span className="cs-min">{csParMinute}/min</span>
                          </div>
                          <div className="gold-match">
                            <span>{(match.gold_earned / 1000).toFixed(1)}k</span>
                            <span className="gold-label">gold</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <footer className="pied-de-page">
        Riot Stats n'est pas affilié à Riot Games. League of Legends et Riot Games sont des marques déposées de Riot Games, Inc.
      </footer>
    </div>
  );
}

export default App;
