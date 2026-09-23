import { useState } from "react";
import { urlIconeChampion } from "../ddragon";

const NB_AFFICHES_PAR_DEFAUT = 5;

function classeRatio(ratio) {
  if (ratio === null || ratio >= 4) return "kda-excellent";
  if (ratio >= 2) return "kda-bon";
  return "kda-faible";
}

/** Statistiques par champion sur toutes les parties en base (les plus joués en premier). */
export default function ChampionStats({ champions, dd }) {
  const [toutAfficher, setToutAfficher] = useState(false);

  if (champions.length === 0) return null;

  const totalParties = champions.reduce((total, c) => total + c.parties, 0);
  const affiches = toutAfficher ? champions : champions.slice(0, NB_AFFICHES_PAR_DEFAUT);

  return (
    <div className="carte carte-champions">
      <h2>Champions ({totalParties} parties)</h2>
      {affiches.map((c) => (
        <div key={c.champion} className="ligne-champion">
          <img className="icone-champion-stats" src={urlIconeChampion(dd, c.champion)} alt="" loading="lazy" />
          <div className="champion-stats-nom">
            <span className="champion-nom" title={c.champion}>{c.champion}</span>
            <span className="champion-stats-detail">{c.cs_par_minute} CS/min</span>
          </div>
          <div className="champion-stats-colonne">
            <span className={c.winrate >= 50 ? "positif" : "negatif"}>{c.winrate}%</span>
            <span className="champion-stats-detail">{c.victoires}V {c.defaites}D</span>
          </div>
          <div className="champion-stats-colonne">
            <span className={`kda-ratio ${classeRatio(c.ratio_kda)}`}>
              {c.ratio_kda === null ? "Perfect" : `${c.ratio_kda.toFixed(2)} KDA`}
            </span>
            <span className="champion-stats-detail">
              {c.kda_moyen.kills} / {c.kda_moyen.deaths} / {c.kda_moyen.assists}
            </span>
          </div>
        </div>
      ))}
      {champions.length > NB_AFFICHES_PAR_DEFAUT && (
        <button className="bouton-voir-tout" onClick={() => setToutAfficher(!toutAfficher)}>
          {toutAfficher ? "Voir moins" : `Voir les ${champions.length} champions`}
        </button>
      )}
    </div>
  );
}
