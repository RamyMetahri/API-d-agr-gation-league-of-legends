import { urlIconeChampion } from "../ddragon";
import { classeKda, formatDuree, formatHeure, NOMS_MODES, ratioKda } from "../format";
import { IconeChevron } from "./Icones";

/** Une ligne de l'historique. Le bouton déplie le détail du match juste en dessous. */
export default function MatchRow({ match, dd, ouvert, onToggle, onIntention, idDetail }) {
  const csParMinute = (match.cs / (match.game_duration / 60)).toFixed(1);
  const resultat = match.win ? "Victoire" : "Défaite";
  const mode = NOMS_MODES[match.queue_id] || "Autre mode";

  return (
    <button
      type="button"
      className={`ligne-match ${match.win ? "victoire" : "defaite"} ${ouvert ? "ouvert" : ""}`}
      aria-expanded={ouvert}
      aria-controls={idDetail}
      aria-label={`${resultat} avec ${match.champion_name}, ${match.kills}/${match.deaths}/${match.assists}, ${mode} à ${formatHeure(match.game_creation)}. ${ouvert ? "Masquer" : "Afficher"} le détail`}
      onClick={onToggle}
      onPointerEnter={onIntention}
      onFocus={onIntention}
    >
      <span className="match-resultat">
        <span className="match-resultat-lettre" aria-hidden="true">{match.win ? "V" : "D"}</span>
        <span className="match-duree">{formatDuree(match.game_duration)}</span>
      </span>
      <img className="icone-champion" src={urlIconeChampion(dd, match.champion_name)} alt="" />
      <span className="match-infos">
        <span className="champion-nom">{match.champion_name}</span>
        <span className="detail-faible">
          {mode} · {formatHeure(match.game_creation)}
        </span>
      </span>
      <span className="match-kda">
        <span className="match-kda-valeurs">
          {match.kills} <span className="barre-oblique">/</span> <span className="morts">{match.deaths}</span>{" "}
          <span className="barre-oblique">/</span> {match.assists}
        </span>
        <span className={`kda-ratio ${classeKda(match.kills, match.deaths, match.assists)}`}>
          {match.deaths === 0 ? "KDA parfait" : `${ratioKda(match.kills, match.deaths, match.assists)} KDA`}
        </span>
      </span>
      <span className="match-chiffre">
        <span>{match.cs} CS</span>
        <span className="detail-faible">{csParMinute}/min</span>
      </span>
      <span className="match-chiffre match-gold">
        <span>{(match.gold_earned / 1000).toFixed(1)}k</span>
        <span className="detail-faible">gold</span>
      </span>
      <IconeChevron className="icone chevron-match" />
    </button>
  );
}
