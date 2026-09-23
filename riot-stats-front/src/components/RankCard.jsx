import { urlEmblemeRang } from "../ddragon";
import { NOMS_FILES } from "../format";

export default function RankCard({ rangs }) {
  return (
    <div className="carte carte-rangs">
      <h2>Rang</h2>
      {rangs.length === 0 && <p className="info">Non classé cette saison.</p>}
      {rangs.map((r) => (
        <div key={r.queue_type} className="ligne-rang">
          <img
            className="embleme-rang"
            src={urlEmblemeRang(r.tier)}
            alt={r.tier}
            onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
          />
          <div className="ligne-rang-texte">
            <span className="label">{NOMS_FILES[r.queue_type] || r.queue_type}</span>
            <span className={`valeur-rang tier-${r.tier.toLowerCase()}`}>{r.tier} {r.rank} — {r.league_points} LP</span>
            <span className="wl-rang">{r.wins}V {r.losses}D</span>
          </div>
        </div>
      ))}
    </div>
  );
}
