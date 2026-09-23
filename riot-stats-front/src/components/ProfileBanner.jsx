import { urlEmblemeRang, urlGrandEmblemeRang, urlIconeChampion } from "../ddragon";
import {
  classeRatio,
  derniereSession,
  formatDerniereMaj,
  formatHeure,
  libelleJour,
  libelleRang,
  NOMS_FILES,
  NOMS_MODES,
  serieEnCours,
} from "../format";
import Avatar from "./Avatar";
import Compteur from "./Compteur";
import { Ecusson, IconeActualiser } from "./Icones";

function masquerImage(e) {
  e.currentTarget.style.visibility = "hidden";
}

function winrate(r) {
  const total = r.wins + r.losses;
  return total > 0 ? Math.round((r.wins / total) * 100) : 0;
}

/** Rang principal (Solo/Duo en priorité), affiché en grand comme sur le profil du client. */
function RangPrincipal({ rang }) {
  if (!rang) {
    return (
      <div className="rang-principal non-classe">
        <Ecusson className="embleme-non-classe" />
        <div className="rang-texte">
          <span className="rang-file">Classement</span>
          <span className="rang-valeur">Non classé</span>
          <span className="rang-detail">Aucune partie classée cette saison</span>
        </div>
      </div>
    );
  }
  return (
    <div className="rang-principal">
      <div className="embleme-cadre">
        <img className="grand-embleme" src={urlGrandEmblemeRang(rang.tier)} alt="" onError={masquerImage} />
      </div>
      <div className="rang-texte">
        <span className="rang-file">Classée {NOMS_FILES[rang.queue_type] || rang.queue_type}</span>
        <span className={`rang-valeur tier-${rang.tier.toLowerCase()}`}>{libelleRang(rang)}</span>
        <span className="rang-lp">
          <strong>
            <Compteur valeur={rang.league_points} />
          </strong>{" "}
          LP
        </span>
        <span className="rang-detail">
          {rang.wins}V {rang.losses}D · {winrate(rang)} %
        </span>
      </div>
    </div>
  );
}

/** Bilan de la dernière session : le résumé que le joueur vient chercher après avoir joué. */
function BilanSession({ historique, mode, dd }) {
  const session = derniereSession(historique);
  const serie = serieEnCours(historique);
  if (!session) return null;

  const periode =
    session.parties.length === 1
      ? `${libelleJour(session.debut)}, ${formatHeure(session.debut)}`
      : `${libelleJour(session.debut)}, depuis ${formatHeure(session.debut)}`;

  return (
    <section className="bilan-session" aria-labelledby="titre-bilan">
      <div className="bilan-entete">
        <h2 id="titre-bilan">Dernière session</h2>
        <span className="bilan-periode">
          {periode}
          {mode && ` · ${NOMS_MODES[mode]}`}
        </span>
      </div>

      <div className="bilan-chiffres">
        <p className="bilan-score">
          <span className="positif">{session.victoires}V</span>
          <span className="bilan-separateur" aria-hidden="true">–</span>
          <span className="negatif">{session.defaites}D</span>
        </p>
        <dl className="bilan-stats">
          <div>
            <dt>KDA</dt>
            <dd className={classeRatio(session.ratioKda)}>
              {session.ratioKda === null ? "Parfait" : session.ratioKda.toFixed(2)}
            </dd>
          </div>
          {serie && serie.longueur >= 2 && (
            <div>
              <dt>Série</dt>
              <dd className={serie.victoire ? "positif" : "negatif"}>
                {serie.longueur} {serie.victoire ? "victoires" : "défaites"}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <ol className="bilan-parties" aria-label="Parties de la session, de la plus ancienne à la plus récente">
        {[...session.parties].reverse().map((m, i) => (
          <li key={m.match_id} className={m.win ? "victoire" : "defaite"} style={{ "--i": i }}>
            <img src={urlIconeChampion(dd, m.champion_name)} alt="" />
            <span className="visuellement-cache">
              {m.champion_name} : {m.win ? "victoire" : "défaite"}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function ProfileBanner({ joueur, rangs, historique, mode, dd, derniereMaj, profil, synchro, onActualiser }) {
  const solo = rangs?.find((r) => r.queue_type === "RANKED_SOLO_5x5");
  const principal = solo ?? rangs?.[0] ?? null;
  const secondaires = (rangs ?? []).filter((r) => r !== principal);

  let etatMaj;
  if (synchro.enCours) etatMaj = "Synchronisation avec Riot…";
  else if (synchro.message) etatMaj = synchro.message;
  else etatMaj = `Mis à jour ${formatDerniereMaj(derniereMaj)}`;

  return (
    // « allumee » déclenche l'allumage du cadre quand les données du profil arrivent
    <header className={`banniere cadre ${rangs ? "allumee" : ""}`}>
      <div className="banniere-identite">
        <div className="identite-joueur">
          <span className={profil ? "" : "avatar-attente"}>
            <Avatar dd={dd} icone={profil?.icone ?? null} niveau={profil?.niveau ?? null} taille="grand" />
          </span>
          <h1 className="titre-joueur">
            {joueur.pseudo}
            <span className="tag-joueur">#{joueur.tag}</span>
          </h1>
        </div>
        <div className="bloc-maj">
          <span className="info-maj" role="status">
            {etatMaj}
          </span>
          <button className="bouton-secondaire" onClick={onActualiser} disabled={synchro.enCours}>
            <IconeActualiser className={`icone ${synchro.enCours ? "tourne" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      <div className="banniere-corps">
        {rangs ? <RangPrincipal rang={principal} /> : <div className="rang-principal squelette-bloc" />}

        {secondaires.length > 0 && (
          <ul className="rangs-secondaires">
            {secondaires.map((r) => (
              <li key={r.queue_type}>
                <img src={urlEmblemeRang(r.tier)} alt="" onError={masquerImage} />
                <span className="rang-file">{NOMS_FILES[r.queue_type] || r.queue_type}</span>
                <span className={`tier-${r.tier.toLowerCase()}`}>{libelleRang(r)}</span>
                <span className="rang-detail">
                  {r.league_points} LP · {r.wins}V {r.losses}D
                </span>
              </li>
            ))}
          </ul>
        )}

        {historique ? (
          historique.length > 0 && <BilanSession historique={historique} mode={mode} dd={dd} />
        ) : (
          <div className="bilan-session" aria-hidden="true">
            <div className="squelette-bloc" />
          </div>
        )}
      </div>
    </header>
  );
}
