import { urlIconeChampion, urlIconeItem, urlIconeRune, urlIconeSort } from "../ddragon";
import { classeKda, ratioKda } from "../format";

function Icone({ src, className, alt = "" }) {
  if (!src) return <span className={`${className} icone-vide`} />;
  return <img className={className} src={src} alt={alt} loading="lazy" />;
}

function LigneJoueur({ joueur, dd, degatsMax, estJoueurRecherche, onSelectJoueur }) {
  const pourcentageDegats = degatsMax > 0 ? (joueur.degats / degatsMax) * 100 : 0;

  return (
    <div className={`ligne-detail ${estJoueurRecherche ? "joueur-recherche" : ""}`}>
      <div className="detail-champion">
        <Icone className="detail-icone-champion" src={urlIconeChampion(dd, joueur.champion)} alt={joueur.champion} />
        <span className="detail-niveau">{joueur.niveau}</span>
      </div>
      <div className="detail-sorts">
        {joueur.sorts.map((id, i) => <Icone key={i} className="detail-icone-petite" src={urlIconeSort(dd, id)} />)}
      </div>
      <div className="detail-sorts">
        <Icone className="detail-icone-petite" src={urlIconeRune(dd, joueur.rune_principale)} />
        <Icone className="detail-icone-petite rune-secondaire" src={urlIconeRune(dd, joueur.rune_secondaire)} />
      </div>
      <div className="detail-nom">
        {joueur.tag && !estJoueurRecherche ? (
          <button
            className="lien-joueur"
            title={`Voir le profil de ${joueur.pseudo}#${joueur.tag}`}
            onClick={() => onSelectJoueur(joueur.pseudo, joueur.tag)}
          >
            {joueur.pseudo}
          </button>
        ) : (
          <span>{joueur.pseudo}</span>
        )}
      </div>
      <div className="detail-kda">
        <span>{joueur.kills} / {joueur.deaths} / {joueur.assists}</span>
        <span className={`kda-ratio ${classeKda(joueur.kills, joueur.deaths, joueur.assists)}`}>
          {ratioKda(joueur.kills, joueur.deaths, joueur.assists)}
        </span>
      </div>
      <div className="detail-degats" title={`${joueur.degats.toLocaleString("fr-FR")} dégâts aux champions`}>
        <span>{(joueur.degats / 1000).toFixed(1)}k</span>
        <div className="barre-degats">
          <div className="barre-degats-remplie" style={{ width: `${pourcentageDegats}%` }} />
        </div>
      </div>
      <div className="detail-chiffre">{joueur.cs}<span className="detail-unite">CS</span></div>
      <div className="detail-chiffre">{(joueur.gold / 1000).toFixed(1)}k<span className="detail-unite">gold</span></div>
      <div className="detail-chiffre">{joueur.vision}<span className="detail-unite">vision</span></div>
      <div className="detail-items">
        {joueur.items.map((id, i) => (
          <Icone key={i} className="detail-icone-item" src={id ? urlIconeItem(dd, id) : null} />
        ))}
      </div>
    </div>
  );
}

/** Détail d'un match : les 2 équipes, 5 joueurs chacune. */
export default function MatchDetail({ detail, dd, puuidJoueur, onSelectJoueur }) {
  return (
    <div className="detail-match">
      {detail.equipes.map((equipe) => (
        <div key={equipe.team_id} className={`equipe ${equipe.victoire ? "victoire" : "defaite"}`}>
          <div className="entete-equipe">
            <span className={`resultat-${equipe.victoire ? "victoire" : "defaite"}`}>
              {equipe.victoire ? "Victoire" : "Défaite"}
            </span>
            <span className="nom-equipe">{equipe.team_id === 100 ? "Équipe bleue" : "Équipe rouge"}</span>
            <span className="objectifs">
              {equipe.objectifs.kills} kills · {equipe.objectifs.tours} tours · {equipe.objectifs.dragons} dragons · {equipe.objectifs.barons} barons
            </span>
          </div>
          {equipe.joueurs.map((joueur) => (
            <LigneJoueur
              key={joueur.puuid}
              joueur={joueur}
              dd={dd}
              degatsMax={detail.degats_max}
              estJoueurRecherche={joueur.puuid === puuidJoueur}
              onSelectJoueur={onSelectJoueur}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
