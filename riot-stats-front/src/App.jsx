import { useState } from "react";
import { lireJson, urlJoueur } from "./api";
import { useDdragon } from "./ddragon";
import { formatDerniereMaj } from "./format";
import MatchList from "./components/MatchList";
import RankCard from "./components/RankCard";
import SearchBar from "./components/SearchBar";
import StatsCard from "./components/StatsCard";
import "./App.css";

function App() {
  const dd = useDdragon();

  const [pseudo, setPseudo] = useState("");
  const [tag, setTag] = useState("");
  const [mode, setMode] = useState("");

  const [joueurAffiche, setJoueurAffiche] = useState(null);
  const [stats, setStats] = useState(null);
  const [historique, setHistorique] = useState(null);
  const [rangs, setRangs] = useState(null);
  const [derniereMaj, setDerniereMaj] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [actualisation, setActualisation] = useState(false);
  const [erreur, setErreur] = useState(null);

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
      // Pseudo officiel stocké en base (bonne casse) si on l'a, sinon ce qui a été tapé
      const premierMatch = dataHistorique.historique[0];
      setJoueurAffiche(
        premierMatch
          ? { pseudo: premierMatch.pseudo, tag: premierMatch.tag }
          : { pseudo: pseudoRecherche, tag: tagRecherche }
      );
    } catch (err) {
      setErreur(err.message);
    } finally {
      setChargement(false);
    }
  }

  function voirJoueur(pseudoCible, tagCible) {
    setPseudo(pseudoCible);
    setTag(tagCible);
    window.scrollTo({ top: 0, behavior: "smooth" });
    rechercherJoueur(pseudoCible, tagCible);
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

  const propsRecherche = {
    pseudo,
    tag,
    mode,
    onPseudo: setPseudo,
    onTag: setTag,
    onMode: setMode,
    onRechercher: () => rechercherJoueur(),
    chargement,
  };

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
        {joueurAffiche && <SearchBar variante="navbar" {...propsRecherche} />}
      </nav>

      {!joueurAffiche && (
        <div className="accueil">
          <div className="accueil-fond" aria-hidden="true" />
          <span className="eyebrow">Suivi de statistiques</span>
          <h1 className="titre">RIOT STATS</h1>
          <p className="sous-titre">Rang, winrate, KDA et historique de parties, en un coup d'œil.</p>
          <SearchBar variante="accueil" {...propsRecherche} />
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
                {rangs && <RankCard rangs={rangs} />}
                {stats && <StatsCard stats={stats} dd={dd} />}
              </div>

              {historique && historique.length > 0 && (
                <MatchList historique={historique} dd={dd} onSelectJoueur={voirJoueur} />
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
