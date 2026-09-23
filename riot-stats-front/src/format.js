export const MODES = [
  { id: "", label: "Tous les modes" },
  { id: "420", label: "Ranked Solo/Duo" },
  { id: "440", label: "Ranked Flex" },
  { id: "450", label: "ARAM" },
  { id: "400", label: "Normal Draft" },
  { id: "430", label: "Normal Blind" },
];

export const NOMS_MODES = Object.fromEntries(MODES.map((m) => [m.id, m.label]));

export const NOMS_FILES = {
  RANKED_SOLO_5x5: "Solo/Duo",
  RANKED_FLEX_SR: "Flex",
};

export function formatDuree(secondes) {
  const min = Math.floor(secondes / 60);
  const sec = secondes % 60;
  return `${min}m ${sec}s`;
}

export function formatDate(timestampMs) {
  return new Date(timestampMs).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatDerniereMaj(iso) {
  if (!iso) return "jamais";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  return `il y a ${diffH}h`;
}

export function ratioKda(kills, deaths, assists) {
  return deaths === 0 ? "Perfect" : ((kills + assists) / deaths).toFixed(2);
}

export function classeKda(kills, deaths, assists) {
  if (deaths === 0) return "kda-excellent";
  const ratio = (kills + assists) / deaths;
  if (ratio >= 4) return "kda-excellent";
  if (ratio >= 2) return "kda-bon";
  return "kda-faible";
}
