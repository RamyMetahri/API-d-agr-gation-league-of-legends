export const API = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000";

/**
 * Lit la réponse JSON, ou lève une erreur avec le message ("detail") renvoyé par l'API.
 * L'erreur porte aussi le code HTTP (err.status) pour adapter le message affiché.
 */
export async function lireJson(res) {
  if (res.ok) return res.json();
  let detail = null;
  try {
    detail = (await res.json()).detail;
  } catch {
    // corps vide ou non-JSON : on garde le message générique
  }
  const erreur = new Error(typeof detail === "string" ? detail : `Erreur ${res.status}`);
  erreur.status = res.status;
  throw erreur;
}

export function urlJoueur(pseudo, tag) {
  return `${API}/joueur/${encodeURIComponent(pseudo)}/${encodeURIComponent(tag)}`;
}
