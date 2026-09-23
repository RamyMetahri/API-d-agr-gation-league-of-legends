import { useState } from "react";
import { urlIconeProfil } from "../ddragon";
import { Ecusson } from "./Icones";

/**
 * Icône de profil du joueur dans un anneau doré, comme dans le client.
 * Sans icône connue (joueur jamais synchronisé) ou si l'image échoue : l'écusson Riot Stats.
 */
export default function Avatar({ dd, icone, niveau, taille = "moyen" }) {
  const [enErreur, setEnErreur] = useState(null); // icône dont le chargement a échoué
  const afficherImage = icone != null && enErreur !== icone;

  return (
    <span className={`avatar avatar-${taille}`}>
      <span className="avatar-anneau">
        {afficherImage ? (
          <img src={urlIconeProfil(dd, icone)} alt="" onError={() => setEnErreur(icone)} />
        ) : (
          <Ecusson className="avatar-defaut" />
        )}
      </span>
      {niveau != null && (
        <span className="avatar-niveau" title="Niveau d'invocateur">
          {niveau}
        </span>
      )}
    </span>
  );
}
