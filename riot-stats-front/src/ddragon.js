import { useEffect, useState } from "react";

// Version de secours si Data Dragon est injoignable ; la vraie est chargée au démarrage
const VERSION_SECOURS = "14.19.1";
const CDN = "https://ddragon.leagueoflegends.com/cdn";

const DONNEES_INITIALES = { version: VERSION_SECOURS, sorts: {}, runes: {}, items: {} };

let chargement = null; // promesse partagée : les données ne sont téléchargées qu'une fois

async function chargerDonnees() {
  const version = await fetch("https://ddragon.leagueoflegends.com/api/versions.json")
    .then((res) => res.json())
    .then((versions) => versions[0])
    .catch(() => VERSION_SECOURS);

  const base = `${CDN}/${version}/data/fr_FR`;
  const [sorts, runes, items] = await Promise.all([
    // id numérique du sort -> image et nom (ex : 4 -> "SummonerFlash.png", "Saut éclair")
    fetch(`${base}/summoner.json`)
      .then((res) => res.json())
      .then((d) =>
        Object.fromEntries(Object.values(d.data).map((s) => [Number(s.key), { image: s.image.full, nom: s.name }]))
      )
      .catch(() => ({})),
    // id d'une rune ou d'un arbre de runes -> chemin de l'icône et nom
    fetch(`${base}/runesReforged.json`)
      .then((res) => res.json())
      .then((arbres) => {
        const runes = {};
        for (const arbre of arbres) {
          runes[arbre.id] = { icone: arbre.icon, nom: arbre.name };
          for (const ligne of arbre.slots) {
            for (const rune of ligne.runes) runes[rune.id] = { icone: rune.icon, nom: rune.name };
          }
        }
        return runes;
      })
      .catch(() => ({})),
    // id d'un objet -> nom (pour l'infobulle des icônes)
    fetch(`${base}/item.json`)
      .then((res) => res.json())
      .then((d) => Object.fromEntries(Object.entries(d.data).map(([id, item]) => [Number(id), item.name])))
      .catch(() => ({})),
  ]);

  return { version, sorts, runes, items };
}

/** Version courante de Data Dragon + tables des sorts, runes et objets. */
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

export function urlIconeProfil(dd, idIcone) {
  return `${CDN}/${dd.version}/img/profileicon/${idIcone}.png`;
}

export function urlIconeItem(dd, idItem) {
  return `${CDN}/${dd.version}/img/item/${idItem}.png`;
}

export function nomItem(dd, idItem) {
  return dd.items[idItem] ?? "";
}

export function urlIconeSort(dd, idSort) {
  const sort = dd.sorts[idSort];
  return sort ? `${CDN}/${dd.version}/img/spell/${sort.image}` : null;
}

export function nomSort(dd, idSort) {
  return dd.sorts[idSort]?.nom ?? "";
}

export function urlIconeRune(dd, idRune) {
  const rune = dd.runes[idRune];
  return rune ? `${CDN}/img/${rune.icone}` : null;
}

export function nomRune(dd, idRune) {
  return dd.runes[idRune]?.nom ?? "";
}

const STATIQUES_RANG = "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images";

/** Petit écusson du rang (liste, file secondaire). */
/** Toutes les icônes affichées dans le détail d'un match (champions, sorts, runes, objets). */
export function urlsIconesDetail(dd, detail) {
  const urls = [];
  for (const equipe of detail.equipes) {
    for (const j of equipe.joueurs) {
      urls.push(urlIconeChampion(dd, j.champion));
      for (const id of j.sorts) urls.push(urlIconeSort(dd, id));
      urls.push(urlIconeRune(dd, j.rune_principale), urlIconeRune(dd, j.rune_secondaire));
      for (const id of j.items) if (id) urls.push(urlIconeItem(dd, id));
    }
  }
  return [...new Set(urls.filter(Boolean))];
}

/**
 * Télécharge et décode des images avant de les afficher, pour qu'elles apparaissent d'un bloc.
 * Ne bloque jamais plus de `delaiMax` ms : au-delà, les images finiront de charger à l'écran.
 */
export function prechargerImages(urls, delaiMax = 400) {
  const decodages = urls.map((url) => {
    const image = new Image();
    image.src = url;
    return image.decode().catch(() => {});
  });
  return Promise.race([Promise.all(decodages), new Promise((resolve) => setTimeout(resolve, delaiMax))]);
}

export function urlEmblemeRang(tier) {
  return `${STATIQUES_RANG}/ranked-mini-crests/${tier.toLowerCase()}.png`;
}

/** Grand emblème du rang, comme sur la bannière de profil du client. */
export function urlGrandEmblemeRang(tier) {
  return `${STATIQUES_RANG}/ranked-emblem/emblem-${tier.toLowerCase()}.png`;
}
