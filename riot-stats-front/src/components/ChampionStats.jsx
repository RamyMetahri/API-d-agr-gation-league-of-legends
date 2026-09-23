import { useState } from "react";
import { urlIconeChampion } from "../ddragon";
import { classeRatio } from "../format";

const NB_AFFICHES_PAR_DEFAUT = 5;

/** Statistiques par champion sur toutes les parties en base (les plus joués en premier). */
export default function ChampionStats({ champions, dd }) {
  const [toutAfficher, setToutAfficher] = useState(false);

  if (!champions || champions.length === 0) return null;

  const totalParties = champions.reduce((total, c) => total + c.parties, 0);
  const affiches = toutAfficher ? champions : champions.slice(0, NB_AFFICHES_PAR_DEFAUT);

  return (
    <section className="panneau panneau-champions" aria-labelledby="titre-champions">
      <h2 id="titre-champions">
        Champions <span className="titre-precision">{totalParties} parties enregistrées</span>
      </h2>
      <div className="entete-champions" aria-hidden="true">
        <span>Champion</span>
        <span>Victoires</span>
        <span>KDA</span>
      </div>
      <ul className="liste-champions">
        {affiches.map((c) => (
          <li key={c.champion} className="ligne-champion">
            <img className="icone-champion-stats" src={urlIconeChampion(dd, c.champion)} alt="" loading="lazy" />
            <div className="champion-stats-nom">
              <span className="champion-nom" title={c.champion}>{c.champion}</span>
              <span className="detail-faible">{c.cs_par_minute} CS/min</span>
            </div>
            <div className="champion-stats-colonne">
              <span className={c.winrate >= 50 ? "positif" : "negatif"}>{c.winrate} %</span>
              <span className="detail-faible">{c.victoires}V {c.defaites}D</span>
            </div>
            <div className="champion-stats-colonne">
              <span className={`kda-ratio ${classeRatio(c.ratio_kda)}`}>
                {c.ratio_kda === null ? "Parfait" : c.ratio_kda.toFixed(2)}
              </span>
              <span className="detail-faible">
                {c.kda_moyen.kills} / {c.kda_moyen.deaths} / {c.kda_moyen.assists}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {champions.length > NB_AFFICHES_PAR_DEFAUT && (
        <button className="bouton-voir-tout" aria-expanded={toutAfficher} onClick={() => setToutAfficher(!toutAfficher)}>
          {toutAfficher ? "Voir moins" : `Voir les ${champions.length} champions`}
        </button>
      )}
    </section>
  );
}
