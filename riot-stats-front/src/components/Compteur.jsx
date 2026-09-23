import { useEffect, useRef, useState } from "react";

function mouvementReduit() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Fait monter un nombre jusqu'à sa valeur (décélération douce), en repartant de la valeur affichée
 * quand la cible change. Avec « réduire les animations », la valeur finale s'affiche directement.
 */
function useCompteur(cible, duree = 700) {
  const reduit = mouvementReduit();
  const [affiche, setAffiche] = useState(0);
  const dernier = useRef(0);

  useEffect(() => {
    if (reduit || cible == null) return;
    if (document.hidden) {
      // Onglet en arrière-plan : le navigateur suspend requestAnimationFrame, on pose directement la valeur
      const id = setTimeout(() => {
        dernier.current = cible;
        setAffiche(cible);
      });
      return () => clearTimeout(id);
    }
    const depart = dernier.current;
    let debut = null;
    let id;
    const etape = (instant) => {
      debut ??= instant;
      const progression = Math.min((instant - debut) / duree, 1);
      const valeur = depart + (cible - depart) * (1 - (1 - progression) ** 4);
      dernier.current = valeur;
      setAffiche(valeur);
      if (progression < 1) id = requestAnimationFrame(etape);
    };
    id = requestAnimationFrame(etape);
    return () => cancelAnimationFrame(id);
  }, [cible, duree, reduit]);

  return reduit || cible == null ? cible : affiche;
}

/** Nombre animé, arrondi à `decimales`. */
export default function Compteur({ valeur, decimales = 0 }) {
  const affiche = useCompteur(valeur);
  return <>{affiche == null ? "–" : affiche.toFixed(decimales)}</>;
}
