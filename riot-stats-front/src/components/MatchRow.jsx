import { urlIconeChampion } from "../ddragon";
import { classeKda, formatDate, formatDuree, NOMS_MODES, ratioKda } from "../format";

/** Une ligne de l'historique. Cliquable : déplie le détail du match. */
export default function MatchRow({ match, dd, ouvert, onToggle }) {
  const csParMinute = (match.cs / (match.game_duration / 60)).toFixed(1);

  function gererTouche(e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  }

  return (
    <div
      className={`carte-match ${match.win ? "victoire" : "defaite"} ${ouvert ? "ouvert" : ""}`}
      role="button"
      tabIndex={0}
      aria-expanded={ouvert}
      onClick={onToggle}
      onKeyDown={gererTouche}
    >
      <div className="colonne-match-mode">
        <span className="mode-jeu">{NOMS_MODES[String(match.queue_id)] || "Autre"}</span>
        <span className="date-match">{formatDate(match.game_creation)}</span>
        <span className="duree-match">{formatDuree(match.game_duration)}</span>
      </div>
      <img className="icone-champion" src={urlIconeChampion(dd, match.champion_name)} alt={match.champion_name} />
      <div className="infos-match">
        <span className="champion-nom">{match.champion_name}</span>
        <span className={`resultat resultat-${match.win ? "victoire" : "defaite"}`}>{match.win ? "Victoire" : "Défaite"}</span>
      </div>
      <div className="kda-match">
        <span>{match.kills} / {match.deaths} / {match.assists}</span>
        <span className={`kda-ratio ${classeKda(match.kills, match.deaths, match.assists)}`}>
          {ratioKda(match.kills, match.deaths, match.assists)} KDA
        </span>
      </div>
      <div className="farm-match">
        <span>{match.cs} CS</span>
        <span className="cs-min">{csParMinute}/min</span>
      </div>
      <div className="gold-match">
        <span>{(match.gold_earned / 1000).toFixed(1)}k</span>
        <span className="gold-label">gold</span>
      </div>
      <span className="chevron-match" aria-hidden="true">{ouvert ? "▴" : "▾"}</span>
    </div>
  );
}
