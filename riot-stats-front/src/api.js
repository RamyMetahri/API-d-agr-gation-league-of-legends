export const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

/** Lit la réponse JSON, ou lève une erreur avec le message ("detail") renvoyé par l'API. */
export async function lireJson(res) {
  if (res.ok) return res.json();
  let detail = null;
  try {
    detail = (await res.json()).detail;
  } catch {
    // corps vide ou non-JSON : on garde le message générique
  }
  throw new Error(typeof detail === "string" ? detail : `Erreur ${res.status}`);
}

export function urlJoueur(pseudo, tag) {
  return `${API}/joueur/${encodeURIComponent(pseudo)}/${encodeURIComponent(tag)}`;
}
