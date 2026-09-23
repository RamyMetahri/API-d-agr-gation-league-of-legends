import { useRef, useState } from "react";
import { API, lireJson } from "../api";
import { prechargerImages, urlsIconesDetail } from "../ddragon";
import { grouperParJour, NOMS_MODES } from "../format";
import MatchDetail from "./MatchDetail";
import MatchRow from "./MatchRow";

// Délai de survol avant de précharger un détail : évite une requête par ligne quand la souris ne fait que passer
const INTENTION_SURVOL_MS = 120;
// Durée de la fermeture du déroulé (0,28 s en CSS) plus une marge, avant de le retirer de la page
const DUREE_FERMETURE_MS = 350;

/**
 * Historique des matchs, groupé par jour.
 * Le détail d'un match est préchargé au survol (ou au focus clavier), icônes comprises,
 * pour que le déroulé s'ouvre d'un seul tenant ; il est ensuite gardé en mémoire.
 */
export default function MatchList({ historique, dd, mode, onSelectJoueur, onVoirTousLesModes }) {
  const [matchOuvert, setMatchOuvert] = useState(null);
  const [matchEnFermeture, setMatchEnFermeture] = useState(null); // reste affiché le temps de se replier
  const [details, setDetails] = useState({}); // match_id -> détail prêt à afficher
  const [erreurs, setErreurs] = useState({}); // match_id -> message
  const enCours = useRef(new Map()); // match_id -> promesse de chargement (une seule requête par match)
  const minuteurSurvol = useRef(null);
  const minuteurFermeture = useRef(null);

  function replier(matchId) {
    setMatchEnFermeture(matchId);
    clearTimeout(minuteurFermeture.current);
    minuteurFermeture.current = setTimeout(() => setMatchEnFermeture(null), DUREE_FERMETURE_MS);
  }

  function chargerDetail(matchId) {
    if (details[matchId]) return Promise.resolve();
    if (enCours.current.has(matchId)) return enCours.current.get(matchId);

    const promesse = fetch(`${API}/match/${encodeURIComponent(matchId)}`)
      .then(lireJson)
      .then(async (detail) => {
        // On attend que les icônes soient décodées (400 ms au plus) : pas d'apparition image par image
        await prechargerImages(urlsIconesDetail(dd, detail));
        setDetails((precedents) => ({ ...precedents, [matchId]: detail }));
      })
      .catch((err) => {
        setErreurs((precedentes) => ({ ...precedentes, [matchId]: err.message }));
      })
      .finally(() => enCours.current.delete(matchId));
    enCours.current.set(matchId, promesse);
    return promesse;
  }

  function survolerMatch(matchId) {
    clearTimeout(minuteurSurvol.current);
    minuteurSurvol.current = setTimeout(() => chargerDetail(matchId), INTENTION_SURVOL_MS);
  }

  function basculerMatch(matchId) {
    clearTimeout(minuteurSurvol.current);
    if (matchOuvert === matchId) {
      setMatchOuvert(null);
      replier(matchId);
      return;
    }
    if (matchOuvert) replier(matchOuvert);
    setMatchOuvert(matchId);
    setErreurs((precedentes) => ({ ...precedentes, [matchId]: null }));
    chargerDetail(matchId);
  }

  if (historique.length === 0) {
    return (
      <section className="panneau historique historique-vide" aria-labelledby="titre-historique">
        <h2 id="titre-historique">Historique</h2>
        {mode ? (
          <>
            <p>Aucune partie en {NOMS_MODES[mode]} parmi les parties récentes de ce joueur.</p>
            <button className="bouton-secondaire" onClick={onVoirTousLesModes}>
              Voir tous les modes
            </button>
          </>
        ) : (
          <p>Aucune partie récente trouvée pour ce joueur.</p>
        )}
      </section>
    );
  }

  return (
    <section className="panneau historique" aria-labelledby="titre-historique">
      <h2 id="titre-historique">
        Historique <span className="titre-precision">{historique.length} parties</span>
      </h2>
      {grouperParJour(historique).map((groupe, indexGroupe, groupes) => {
        // Rang global de la première partie du jour, pour l'apparition en cascade de la liste
        const decalage = groupes.slice(0, indexGroupe).reduce((total, g) => total + g.matchs.length, 0);
        const victoires = groupe.matchs.filter((m) => m.win).length;
        return (
          <div key={groupe.jour} className="groupe-jour">
            <h3 className="entete-jour">
              <span>{groupe.libelle}</span>
              <span className="entete-jour-bilan">
                {victoires}V {groupe.matchs.length - victoires}D
              </span>
            </h3>
            <ul className="liste-matchs">
              {groupe.matchs.map((match, i) => {
                const ouvert = matchOuvert === match.match_id;
                const visible = ouvert || matchEnFermeture === match.match_id;
                const idDetail = `detail-${match.match_id}`;
                const detail = details[match.match_id];
                const erreur = erreurs[match.match_id];
                return (
                  <li key={match.match_id} className="entree-match" style={{ "--i": Math.min(decalage + i, 10) }}>
                    <MatchRow
                      match={match}
                      dd={dd}
                      ouvert={ouvert}
                      idDetail={idDetail}
                      onToggle={() => basculerMatch(match.match_id)}
                      onIntention={() => survolerMatch(match.match_id)}
                    />
                    {visible && (
                      <div id={idDetail} className={`deroulant ${ouvert ? "" : "ferme"}`}>
                        <div className="deroulant-contenu">
                          {erreur ? (
                            <p className="erreur" role="alert">
                              Impossible de charger le détail de ce match. {erreur}
                            </p>
                          ) : detail ? (
                            <MatchDetail detail={detail} dd={dd} puuidJoueur={match.puuid} onSelectJoueur={onSelectJoueur} />
                          ) : (
                            <div className="squelette squelette-detail" aria-label="Chargement du détail" />
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
