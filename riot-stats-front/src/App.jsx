import { useEffect, useEffectEvent, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { lireJson, urlJoueur } from "./api";
import { useDdragon } from "./ddragon";
import { NOMS_MODES } from "./format";
import ChampionStats from "./components/ChampionStats";
import { Ecusson, IconeFermer } from "./components/Icones";
import Avatar from "./components/Avatar";
import MatchList from "./components/MatchList";
import ModeFilter from "./components/ModeFilter";
import ProfileBanner from "./components/ProfileBanner";
import SearchBar from "./components/SearchBar";
import StatsCard from "./components/StatsCard";
import "./App.css";

const CLE_RECENTS = "riotstats.recents";
const NB_RECENTS = 5;

function lireRecents() {
  try {
    const recents = JSON.parse(localStorage.getItem(CLE_RECENTS));
    return Array.isArray(recents) ? recents : [];
  } catch {
    return [];
  }
}

function memoriserRecent(joueur) {
  const recents = [joueur, ...lireRecents().filter((r) => `${r.pseudo}#${r.tag}`.toLowerCase() !== `${joueur.pseudo}#${joueur.tag}`.toLowerCase())].slice(0, NB_RECENTS);
  try {
    localStorage.setItem(CLE_RECENTS, JSON.stringify(recents));
  } catch {
    // stockage indisponible (navigation privée...) : les récents ne sont simplement pas gardés
  }
  return recents;
}

/** L'URL porte le joueur et le mode : lien partageable, bouton Retour et rafraîchissement fonctionnent. */
function lireUrl() {
  const params = new URLSearchParams(window.location.search);
  const riotId = params.get("joueur") ?? "";
  const position = riotId.lastIndexOf("#");
  const mode = params.get("mode") ?? "";
  if (position <= 0) return { joueur: null, mode };
  return { joueur: { pseudo: riotId.slice(0, position), tag: riotId.slice(position + 1) }, mode };
}

function ecrireUrl(joueur, mode, remplacer = false) {
  const params = new URLSearchParams();
  if (joueur) params.set("joueur", `${joueur.pseudo}#${joueur.tag}`);
  if (joueur && mode) params.set("mode", mode);
  const url = params.size > 0 ? `?${params}` : window.location.pathname;
  if (url === window.location.search) return;
  if (remplacer) window.history.replaceState(null, "", url);
  else window.history.pushState(null, "", url);
}

function messageErreur(err, joueur) {
  const riotId = `${joueur.pseudo}#${joueur.tag}`;
  if (err instanceof TypeError) return "Le serveur ne répond pas. Vérifie ta connexion, puis réessaie.";
  if (err.status === 404) return `Aucun joueur «\u00a0${riotId}\u00a0» trouvé. Vérifie l'orthographe et le tag (ex : EUW).`;
  if (err.status === 429) return "Trop de recherches d'un coup. Patiente une minute, puis réessaie.";
  if (err.status === 401 || err.status === 403) {
    return "L'accès à l'API Riot est momentanément indisponible (clé expirée). Réessaie plus tard.";
  }
  return err.message;
}

/** Retour après « Actualiser » ; rien si l'API ne précise pas le nombre de nouvelles parties. */
function messageActualisation(nouveaux) {
  if (nouveaux === undefined) return null;
  if (nouveaux === 0) return "À jour : aucune nouvelle partie";
  const s = nouveaux > 1 ? "s" : "";
  return `${nouveaux} nouvelle${s} partie${s} ajoutée${s}`;
}

/**
 * Change d'écran avec l'API View Transitions : le navigateur fond l'ancien et le nouvel état,
 * et fait glisser les éléments qui portent le même view-transition-name (cadre doré, recherche).
 * Sans support ou avec « réduire les animations », le changement est immédiat.
 */
function avecTransition(changer) {
  const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  if (!document.startViewTransition || reduit) {
    changer();
    return;
  }
  document.startViewTransition(() => flushSync(changer));
}

const DONNEES_VIDES = { stats: null, historique: null, rangs: null, champions: null, derniereMaj: null, profil: null };

function App() {
  const dd = useDdragon();

  // Un lien partagé (?joueur=...) affiche directement le squelette du profil, sans passer par l'accueil
  const [joueur, setJoueur] = useState(() => lireUrl().joueur);
  const [mode, setMode] = useState(() => lireUrl().mode);
  const [donnees, setDonnees] = useState(DONNEES_VIDES);
  const [chargement, setChargement] = useState(() => lireUrl().joueur !== null);
  const [synchro, setSynchro] = useState(() => ({ enCours: lireUrl().joueur !== null, message: null }));
  const [erreur, setErreur] = useState(null);
  const [recents, setRecents] = useState(lireRecents);
  const requeteCourante = useRef(0);

  function retourAccueil() {
    requeteCourante.current++;
    setJoueur(null);
    setDonnees(DONNEES_VIDES);
    setErreur(null);
    setChargement(false);
    setSynchro({ enCours: false, message: null });
    ecrireUrl(null, "");
  }

  /**
   * Charge un joueur pour un mode donné. /stats d'abord : c'est lui qui déclenche la synchro avec Riot
   * si les données sont anciennes ; les autres routes lisent ensuite la base à jour, en parallèle.
   */
  async function charger(cible, modeCible, { historiqueNavigateur = "pousser", complet = false } = {}) {
    const numero = ++requeteCourante.current;
    const autreJoueur = !(
      joueur &&
      joueur.pseudo.toLowerCase() === cible.pseudo.toLowerCase() &&
      joueur.tag.toLowerCase() === cible.tag.toLowerCase()
    );
    // Le rang et la date de synchro ne dépendent pas du mode : on ne les recharge que si nécessaire
    const rechargerProfil = complet || autreJoueur;
    const joueurPrecedent = joueur;
    const modePrecedent = mode;
    const donneesPrecedentes = donnees;

    setErreur(null);
    setChargement(true);
    setMode(modeCible);
    if (autreJoueur) {
      setJoueur(cible);
      setDonnees(DONNEES_VIDES);
      setSynchro({ enCours: true, message: null });
    }
    if (historiqueNavigateur !== "aucun") ecrireUrl(cible, modeCible, historiqueNavigateur === "remplacer");

    const filtre = modeCible ? `queue_id=${modeCible}` : "";
    const suffixe = filtre && `&${filtre}`;
    const base = urlJoueur(cible.pseudo, cible.tag);

    try {
      const stats = await lireJson(await fetch(`${base}/stats?limite=15${suffixe}`));
      const [historique, champions, rangs, maj] = await Promise.all([
        fetch(`${base}/historique?limite=20${suffixe}`).then(lireJson),
        fetch(`${base}/champions${filtre && `?${filtre}`}`).then(lireJson),
        rechargerProfil ? fetch(`${base}/rang`).then(lireJson) : null,
        rechargerProfil ? fetch(`${base}/maj`).then(lireJson) : null,
      ]);
      if (numero !== requeteCourante.current) return; // une recherche plus récente a pris la main

      setDonnees((precedentes) => ({
        stats,
        historique: historique.historique,
        champions: champions.champions,
        rangs: rangs ?? precedentes.rangs,
        derniereMaj: maj ? maj.derniere_maj : precedentes.derniereMaj,
        // Icône et niveau : absents si l'API n'est pas à jour ou si le joueur n'a encore aucune partie en base
        profil: maj ? { icone: maj.icone_profil ?? null, niveau: maj.niveau ?? null } : precedentes.profil,
      }));
      // Pseudo officiel stocké en base (bonne casse) si on l'a, sinon ce qui a été tapé
      const premier = historique.historique[0];
      const officiel = premier ? { pseudo: premier.pseudo, tag: premier.tag } : cible;
      setJoueur(officiel);
      if (autreJoueur || complet) {
        setRecents(memoriserRecent({ ...officiel, icone: maj?.icone_profil ?? null }));
        ecrireUrl(officiel, modeCible, true);
      }
    } catch (err) {
      if (numero !== requeteCourante.current) return;
      setErreur({ texte: messageErreur(err, cible), cible, modeCible });
      setMode(modePrecedent);
      if (autreJoueur) {
        // On revient au profil affiché avant (ou à l'accueil) plutôt que de laisser un profil vide
        setJoueur(joueurPrecedent);
        setDonnees(donneesPrecedentes);
        ecrireUrl(joueurPrecedent, modePrecedent, true);
      } else if (donneesPrecedentes.stats === null) {
        // Lien ouvert directement vers un joueur introuvable : retour à l'accueil avec le message
        setJoueur(null);
        ecrireUrl(null, "", true);
      } else {
        ecrireUrl(joueurPrecedent, modePrecedent, true);
      }
    } finally {
      if (numero === requeteCourante.current) {
        setChargement(false);
        setSynchro((s) => ({ ...s, enCours: false }));
      }
    }
  }

  // Le rendu initial et les boutons Précédent / Suivant du navigateur suivent l'URL
  const chargerDepuisUrl = useEffectEvent(() => {
    const { joueur: cible, mode: modeUrl } = lireUrl();
    if (cible) charger(cible, modeUrl in NOMS_MODES ? modeUrl : "", { historiqueNavigateur: "aucun", complet: true });
    else retourAccueil();
  });
  useEffect(() => {
    const premierChargement = lireUrl().joueur ? setTimeout(chargerDepuisUrl) : null;
    window.addEventListener("popstate", chargerDepuisUrl);
    return () => {
      clearTimeout(premierChargement);
      window.removeEventListener("popstate", chargerDepuisUrl);
    };
  }, []);

  function rechercher(pseudo, tag) {
    avecTransition(() => {
      window.scrollTo({ top: 0 });
      charger({ pseudo, tag }, mode);
    });
  }

  async function actualiser() {
    if (!joueur) return;
    setSynchro({ enCours: true, message: null });
    setErreur(null);
    try {
      const resultat = await lireJson(await fetch(`${urlJoueur(joueur.pseudo, joueur.tag)}/matchs?count=15`));
      const nouveaux = resultat.nouveaux;
      await charger(joueur, mode, { historiqueNavigateur: "aucun", complet: true });
      setSynchro({
        enCours: false,
        message: messageActualisation(nouveaux),
      });
    } catch (err) {
      setErreur({ texte: messageErreur(err, joueur), cible: joueur, modeCible: mode });
      setSynchro({ enCours: false, message: null });
    }
  }

  const blocErreur = erreur && (
    <div className="bandeau-erreur" role="alert">
      <p>{erreur.texte}</p>
      <div className="bandeau-erreur-actions">
        <button className="bouton-secondaire" onClick={() => charger(erreur.cible, erreur.modeCible)}>
          Réessayer
        </button>
        <button className="bouton-icone" aria-label="Fermer le message" onClick={() => setErreur(null)}>
          <IconeFermer />
        </button>
      </div>
    </div>
  );

  const nouveauJoueurEnChargement = chargement && !donnees.stats;

  return (
    <div className="page">
      <a className="lien-evitement" href="#contenu">
        Aller au contenu
      </a>
      <nav className="navbar" aria-label="Navigation principale">
        <button className="logo" onClick={() => avecTransition(retourAccueil)} aria-label="Riot Stats, retour à l'accueil">
          <Ecusson className="logo-icone" />
          <span className="logo-texte" aria-hidden="true">
            Riot<b>Stats</b>
          </span>
        </button>
        {joueur && <SearchBar variante="navbar" dd={dd} onRechercher={rechercher} chargement={chargement} />}
      </nav>

      {!joueur && (
        <main id="contenu" className="accueil">
          <div className="accueil-cadre cadre">
            <Ecusson className="accueil-ecusson" />
            <h1 className="titre">Riot Stats</h1>
            <p className="sous-titre">Ton rang, ta dernière session et chaque partie en détail, à partir de ton Riot&nbsp;ID.</p>
            <SearchBar variante="accueil" dd={dd} onRechercher={rechercher} chargement={chargement} />
            {blocErreur}
            {recents.length > 0 && (
              <div className="recents">
                <h2 className="recents-titre">Consultés récemment</h2>
                <ul>
                  {recents.map((r) => (
                    <li key={`${r.pseudo}#${r.tag}`}>
                      <button className="puce-recent" onClick={() => rechercher(r.pseudo, r.tag)}>
                        <Avatar dd={dd} icone={r.icone ?? null} taille="mini" />
                        <span>
                          {r.pseudo}
                          <span className="suggestion-tag">#{r.tag}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </main>
      )}

      {joueur && (
        <main id="contenu" className="dashboard">
          {blocErreur}

          <ProfileBanner
            joueur={joueur}
            rangs={donnees.rangs}
            historique={donnees.historique}
            mode={mode}
            dd={dd}
            derniereMaj={donnees.derniereMaj}
            profil={donnees.profil}
            synchro={synchro}
            onActualiser={actualiser}
          />

          <ModeFilter mode={mode} onMode={(m) => charger(joueur, m)} chargement={chargement} />

          {nouveauJoueurEnChargement ? (
            <div className="grille-dashboard" aria-busy="true">
              <div className="squelette squelette-historique" />
              <div className="colonne-laterale">
                <div className="squelette squelette-panneau" />
                <div className="squelette squelette-panneau" />
              </div>
            </div>
          ) : (
            donnees.stats && (
              <div className={`grille-dashboard ${chargement ? "rafraichit" : ""}`} aria-busy={chargement}>
                <MatchList
                  key={`${joueur.pseudo}#${joueur.tag}`}
                  historique={donnees.historique}
                  dd={dd}
                  mode={mode}
                  onSelectJoueur={rechercher}
                  onVoirTousLesModes={() => charger(joueur, "")}
                />
                {donnees.stats.nb_parties !== 0 && (
                  <aside className="colonne-laterale" aria-label="Statistiques">
                    <StatsCard stats={donnees.stats} dd={dd} />
                    <ChampionStats champions={donnees.champions} dd={dd} />
                  </aside>
                )}
              </div>
            )
          )}
        </main>
      )}

      <footer className="pied-de-page">
        Riot Stats n'est pas affilié à Riot Games. League of Legends et Riot Games sont des marques déposées de Riot Games, Inc.
      </footer>
    </div>
  );
}

export default App;
