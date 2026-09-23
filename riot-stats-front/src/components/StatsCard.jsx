import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { urlIconeChampion } from "../ddragon";

export default function StatsCard({ stats, dd }) {
  if (stats.nb_parties === 0) {
    return (
      <div className="carte carte-stats">
        <p className="info">{stats.message}</p>
      </div>
    );
  }

  const donneesGraphique = [
    { name: "Victoires", value: stats.victoires },
    { name: "Défaites", value: stats.defaites },
  ];

  return (
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
            <img className="icone-champion-mini" src={urlIconeChampion(dd, stats.champion_favori.nom)} alt="" />
            {stats.champion_favori.nom} ({stats.champion_favori.parties_jouees})
          </span>
        </div>
      )}
    </div>
  );
}
