import { nomItem, nomRune, nomSort, urlIconeChampion, urlIconeItem, urlIconeRune, urlIconeSort } from "../ddragon";
import { classeKda, ratioKda } from "../format";

/** Icône avec son nom en infobulle et pour les lecteurs d'écran. */
function Icone({ src, className, nom = "" }) {
  if (!src) return <span className={`${className} icone-vide`} aria-hidden="true" />;
  return <img className={className} src={src} alt={nom} title={nom || undefined} decoding="async" />;
}

function LigneJoueur({ joueur, dd, degatsMax, estJoueurRecherche, onSelectJoueur }) {
  const pourcentageDegats = degatsMax > 0 ? (joueur.degats / degatsMax) * 100 : 0;

  return (
    <li className={`ligne-detail ${estJoueurRecherche ? "joueur-recherche" : ""}`}>
      <div className="detail-champion">
        <Icone className="detail-icone-champion" src={urlIconeChampion(dd, joueur.champion)} nom={joueur.champion} />
        <span className="detail-niveau" title="Niveau du champion">{joueur.niveau}</span>
      </div>
      <div className="detail-sorts">
        {joueur.sorts.map((id, i) => (
          <Icone key={i} className="detail-icone-petite" src={urlIconeSort(dd, id)} nom={nomSort(dd, id)} />
        ))}
      </div>
      <div className="detail-sorts">
        <Icone className="detail-icone-petite" src={urlIconeRune(dd, joueur.rune_principale)} nom={nomRune(dd, joueur.rune_principale)} />
        <Icone
          className="detail-icone-petite rune-secondaire"
          src={urlIconeRune(dd, joueur.rune_secondaire)}
          nom={nomRune(dd, joueur.rune_secondaire)}
        />
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
        <span>
          {joueur.kills} / {joueur.deaths} / {joueur.assists}
        </span>
        <span className={`kda-ratio ${classeKda(joueur.kills, joueur.deaths, joueur.assists)}`}>
          {ratioKda(joueur.kills, joueur.deaths, joueur.assists)}
        </span>
      </div>
      <div className="detail-degats" title={`${joueur.degats.toLocaleString("fr-FR")} dégâts aux champions`}>
        <span>
          {(joueur.degats / 1000).toFixed(1)}k<span className="detail-unite"> dégâts</span>
        </span>
        <div className="barre-degats" aria-hidden="true">
          <div className="barre-degats-remplie" style={{ width: `${pourcentageDegats}%` }} />
        </div>
      </div>
      <div className="detail-chiffre detail-cs">
        {joueur.cs}
        <span className="detail-unite">CS</span>
      </div>
      <div className="detail-chiffre detail-gold">
        {(joueur.gold / 1000).toFixed(1)}k<span className="detail-unite">gold</span>
      </div>
      <div className="detail-chiffre detail-vision">
        {joueur.vision}
        <span className="detail-unite">vision</span>
      </div>
      <div className="detail-items">
        {joueur.items.map((id, i) => (
          <Icone key={i} className="detail-icone-item" src={id ? urlIconeItem(dd, id) : null} nom={id ? nomItem(dd, id) : ""} />
        ))}
      </div>
    </li>
  );
}

/** Détail d'un match : les 2 équipes, 5 joueurs chacune. */
export default function MatchDetail({ detail, dd, puuidJoueur, onSelectJoueur }) {
  return (
    <div className="detail-match">
      {detail.equipes.map((equipe) => (
        <section
          key={equipe.team_id}
          className={`equipe ${equipe.victoire ? "victoire" : "defaite"}`}
          aria-label={`${equipe.team_id === 100 ? "Équipe bleue" : "Équipe rouge"} : ${equipe.victoire ? "victoire" : "défaite"}`}
        >
          <div className="entete-equipe">
            <span className={`resultat-${equipe.victoire ? "victoire" : "defaite"}`}>
              {equipe.victoire ? "Victoire" : "Défaite"}
            </span>
            <span className="nom-equipe">{equipe.team_id === 100 ? "Équipe bleue" : "Équipe rouge"}</span>
            <span className="objectifs">
              {equipe.objectifs.kills} kills · {equipe.objectifs.tours} tours · {equipe.objectifs.dragons} dragons ·{" "}
              {equipe.objectifs.barons} barons
            </span>
          </div>
          <div className="colonnes-detail" aria-hidden="true">
            <span className="col-joueur">Joueur</span>
            <span>KDA</span>
            <span>Dégâts</span>
            <span className="col-droite">CS</span>
            <span className="col-droite">Gold</span>
            <span className="col-droite">Vision</span>
            <span>Objets</span>
          </div>
          <ul className="joueurs-equipe">
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
          </ul>
        </section>
      ))}
    </div>
  );
}
