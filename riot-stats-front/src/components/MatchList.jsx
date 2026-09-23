import { useState } from "react";
import { API, lireJson } from "../api";
import MatchDetail from "./MatchDetail";
import MatchRow from "./MatchRow";

/** Historique des matchs. Le détail d'un match est chargé au clic, puis gardé en mémoire. */
export default function MatchList({ historique, dd, onSelectJoueur }) {
  const [matchOuvert, setMatchOuvert] = useState(null);
  const [details, setDetails] = useState({}); // match_id -> détail déjà chargé
  const [chargementDetail, setChargementDetail] = useState(null);
  const [erreurDetail, setErreurDetail] = useState(null);

  async function basculerMatch(matchId) {
    if (matchOuvert === matchId) {
      setMatchOuvert(null);
      return;
    }
    setMatchOuvert(matchId);
    setErreurDetail(null);
    if (details[matchId]) return; // déjà en mémoire : aucune requête

    setChargementDetail(matchId);
    try {
      const detail = await lireJson(await fetch(`${API}/match/${encodeURIComponent(matchId)}`));
      setDetails((precedents) => ({ ...precedents, [matchId]: detail }));
    } catch (err) {
      setErreurDetail(err.message);
    } finally {
      setChargementDetail(null);
    }
  }

  return (
    <div className="carte liste-matchs">
      <h2>Derniers matchs</h2>
      <div className="conteneur-matchs">
        {historique.map((match) => (
          <div key={match.match_id}>
            <MatchRow
              match={match}
              dd={dd}
              ouvert={matchOuvert === match.match_id}
              onToggle={() => basculerMatch(match.match_id)}
            />
            {matchOuvert === match.match_id && (
              <>
                {chargementDetail === match.match_id && <div className="squelette squelette-detail" />}
                {erreurDetail && <p className="erreur">{erreurDetail}</p>}
                {details[match.match_id] && (
                  <MatchDetail
                    detail={details[match.match_id]}
                    dd={dd}
                    puuidJoueur={match.puuid}
                    onSelectJoueur={onSelectJoueur}
                  />
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
