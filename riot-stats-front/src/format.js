// Modes filtrables (queue_id Riot). Libellés courts : ils servent d'onglets.
export const MODES = [
  { id: "", label: "Tous" },
  { id: "420", label: "Solo/Duo" },
  { id: "440", label: "Flex" },
  { id: "450", label: "ARAM" },
  { id: "400", label: "Draft" },
  { id: "430", label: "Aveugle" },
];

// Libellés longs, pour l'historique et les messages
export const NOMS_MODES = {
  "": "tous les modes",
  420: "Classée Solo/Duo",
  440: "Classée Flex",
  450: "ARAM",
  400: "Normale (draft)",
  430: "Normale (aveugle)",
  490: "Partie rapide",
  1700: "Arena",
  1900: "URF",
};

export const NOMS_FILES = {
  RANKED_SOLO_5x5: "Solo/Duo",
  RANKED_FLEX_SR: "Flex",
};

const NOMS_TIERS = {
  IRON: "Fer",
  BRONZE: "Bronze",
  SILVER: "Argent",
  GOLD: "Or",
  PLATINUM: "Platine",
  EMERALD: "Émeraude",
  DIAMOND: "Diamant",
  MASTER: "Maître",
  GRANDMASTER: "Grand Maître",
  CHALLENGER: "Challenger",
};

export function nomTier(tier) {
  return NOMS_TIERS[tier] || tier;
}

/** Les tiers Maître et au-dessus n'ont pas de division. */
export function libelleRang(r) {
  const sansDivision = ["MASTER", "GRANDMASTER", "CHALLENGER"].includes(r.tier);
  return sansDivision ? nomTier(r.tier) : `${nomTier(r.tier)} ${r.rank}`;
}

/** 1911 s -> "31:51" (convention du client League). */
export function formatDuree(secondes) {
  const min = Math.floor(secondes / 60);
  const sec = String(secondes % 60).padStart(2, "0");
  return `${min}:${sec}`;
}

export function formatHeure(timestampMs) {
  return new Date(timestampMs).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function debutDuJour(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "Aujourd'hui", "Hier", puis "lundi 21 septembre". */
export function libelleJour(timestampMs) {
  const date = new Date(timestampMs);
  const ecartJours = Math.round((debutDuJour(new Date()) - debutDuJour(date)) / 86400000);
  if (ecartJours === 0) return "Aujourd'hui";
  if (ecartJours === 1) return "Hier";
  return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

/** Regroupe l'historique (du plus récent au plus ancien) par jour. */
export function grouperParJour(historique) {
  const groupes = [];
  for (const match of historique) {
    const jour = debutDuJour(new Date(match.game_creation));
    const dernier = groupes[groupes.length - 1];
    if (dernier && dernier.jour === jour) dernier.matchs.push(match);
    else groupes.push({ jour, libelle: libelleJour(match.game_creation), matchs: [match] });
  }
  return groupes;
}

// Au-delà de cet écart entre deux parties, on considère qu'une nouvelle session commence
const PAUSE_MAX_SESSION_MS = 90 * 60 * 1000;

/**
 * Dernière session de jeu : les parties les plus récentes enchaînées sans pause de plus de 90 min.
 * L'historique arrive trié du plus récent au plus ancien.
 */
export function derniereSession(historique) {
  if (historique.length === 0) return null;
  const parties = [historique[0]];
  for (let i = 1; i < historique.length; i++) {
    const precedente = historique[i];
    const finPrecedente = precedente.game_creation + precedente.game_duration * 1000;
    if (parties[parties.length - 1].game_creation - finPrecedente > PAUSE_MAX_SESSION_MS) break;
    parties.push(precedente);
  }
  const victoires = parties.filter((m) => m.win).length;
  const totaux = parties.reduce(
    (t, m) => ({ k: t.k + m.kills, d: t.d + m.deaths, a: t.a + m.assists }),
    { k: 0, d: 0, a: 0 }
  );
  return {
    parties,
    victoires,
    defaites: parties.length - victoires,
    ratioKda: totaux.d === 0 ? null : (totaux.k + totaux.a) / totaux.d,
    debut: parties[parties.length - 1].game_creation,
  };
}

/** Série en cours : nombre de victoires (ou défaites) consécutives depuis la dernière partie. */
export function serieEnCours(historique) {
  if (historique.length === 0) return null;
  const victoire = historique[0].win;
  let longueur = 0;
  while (longueur < historique.length && historique[longueur].win === victoire) longueur++;
  return { victoire, longueur };
}

export function formatDerniereMaj(iso) {
  if (!iso) return "jamais";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 48) return `il y a ${diffH} h`;
  return `il y a ${Math.floor(diffH / 24)} jours`;
}

export function ratioKda(kills, deaths, assists) {
  return deaths === 0 ? "Parfait" : ((kills + assists) / deaths).toFixed(2);
}

export function classeRatio(ratio) {
  if (ratio === null || ratio >= 4) return "kda-excellent";
  if (ratio >= 2) return "kda-bon";
  return "kda-faible";
}

export function classeKda(kills, deaths, assists) {
  return classeRatio(deaths === 0 ? null : (kills + assists) / deaths);
}

/** "Faker#KR1" -> { pseudo: "Faker", tag: "KR1" } ; tag vide si absent. */
export function decouperRiotId(texte) {
  const propre = texte.trim();
  const position = propre.lastIndexOf("#");
  if (position === -1) return { pseudo: propre, tag: "" };
  return { pseudo: propre.slice(0, position).trim(), tag: propre.slice(position + 1).trim() };
}
