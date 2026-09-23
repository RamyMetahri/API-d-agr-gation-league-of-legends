import { urlIconeChampion } from "../ddragon";
import { classeRatio } from "../format";
import Compteur from "./Compteur";

/** Tendance sur les N dernières parties du mode choisi. */
export default function StatsCard({ stats, dd }) {
  if (!stats || stats.nb_parties === 0) return null;

  const { kills, deaths, assists } = stats.kda_moyen;
  const ratio = deaths === 0 ? null : (kills + assists) / deaths;
  const partVictoires = (stats.victoires / (stats.victoires + stats.defaites)) * 100;

  return (
    <section className="panneau panneau-stats" aria-labelledby="titre-stats">
      <h2 id="titre-stats">
        Tendance <span className="titre-precision">{stats.nb_parties_analysees} dernières parties</span>
      </h2>

      <div className="stats-winrate">
        <span className={`stats-winrate-valeur ${stats.winrate >= 50 ? "positif" : "negatif"}`}>
          <Compteur valeur={stats.winrate} decimales={Number.isInteger(stats.winrate) ? 0 : 1} /> %
        </span>
        <span className="stats-winrate-detail">
          {stats.victoires}V {stats.defaites}D
        </span>
      </div>
      <div
        className="barre-victoires"
        role="img"
        aria-label={`${stats.victoires} victoires, ${stats.defaites} défaites`}
      >
        <span style={{ "--part": partVictoires / 100 }} />
      </div>

      <dl className="stats-lignes">
        <div>
          <dt>KDA moyen</dt>
          <dd>
            {kills} / {deaths} / {assists}
            <span className={`stats-ratio ${classeRatio(ratio)}`}>{ratio === null ? "Parfait" : ratio.toFixed(2)}</span>
          </dd>
        </div>
        {stats.champion_favori && (
          <div>
            <dt>Le plus joué</dt>
            <dd className="stats-favori">
              <img src={urlIconeChampion(dd, stats.champion_favori.nom)} alt="" />
              {stats.champion_favori.nom}
              <span className="stats-favori-parties">{stats.champion_favori.parties_jouees} parties</span>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
