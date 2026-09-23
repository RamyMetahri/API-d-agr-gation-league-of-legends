import { useEffect, useState } from "react";

// Version de secours si Data Dragon est injoignable ; la vraie est chargée au démarrage
const VERSION_SECOURS = "14.19.1";
const CDN = "https://ddragon.leagueoflegends.com/cdn";

const DONNEES_INITIALES = { version: VERSION_SECOURS, sorts: {}, runes: {} };

let chargement = null; // promesse partagée : les données ne sont téléchargées qu'une fois

async function chargerDonnees() {
  const version = await fetch("https://ddragon.leagueoflegends.com/api/versions.json")
    .then((res) => res.json())
    .then((versions) => versions[0])
    .catch(() => VERSION_SECOURS);

  const base = `${CDN}/${version}/data/fr_FR`;
  const [sorts, runes] = await Promise.all([
    // id numérique du sort -> nom du fichier image (ex : 4 -> "SummonerFlash.png")
    fetch(`${base}/summoner.json`)
      .then((res) => res.json())
      .then((d) => Object.fromEntries(Object.values(d.data).map((s) => [Number(s.key), s.image.full])))
      .catch(() => ({})),
    // id d'une rune ou d'un arbre de runes -> chemin de l'icône
    fetch(`${base}/runesReforged.json`)
      .then((res) => res.json())
      .then((arbres) => {
        const icones = {};
        for (const arbre of arbres) {
          icones[arbre.id] = arbre.icon;
          for (const ligne of arbre.slots) for (const rune of ligne.runes) icones[rune.id] = rune.icon;
        }
        return icones;
      })
      .catch(() => ({})),
  ]);

  return { version, sorts, runes };
}

/** Version courante de Data Dragon + tables des sorts et runes. */
export function useDdragon() {
  const [donnees, setDonnees] = useState(DONNEES_INITIALES);
  useEffect(() => {
    chargement ??= chargerDonnees();
    let actif = true;
    chargement.then((d) => actif && setDonnees(d));
    return () => {
      actif = false;
    };
  }, []);
  return donnees;
}

export function urlIconeChampion(dd, nomChampion) {
  // L'API renvoie "FiddleSticks" mais l'image Data Dragon s'appelle "Fiddlesticks"
  const nom = nomChampion === "FiddleSticks" ? "Fiddlesticks" : nomChampion;
  return `${CDN}/${dd.version}/img/champion/${nom}.png`;
}

export function urlIconeItem(dd, idItem) {
  return `${CDN}/${dd.version}/img/item/${idItem}.png`;
}

export function urlIconeSort(dd, idSort) {
  const image = dd.sorts[idSort];
  return image ? `${CDN}/${dd.version}/img/spell/${image}` : null;
}

export function urlIconeRune(dd, idRune) {
  const icone = dd.runes[idRune];
  return icone ? `${CDN}/img/${icone}` : null;
}

export function urlEmblemeRang(tier) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tier.toLowerCase()}.png`;
}
