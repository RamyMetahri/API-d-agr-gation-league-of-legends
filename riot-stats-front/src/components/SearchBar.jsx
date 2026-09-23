import { useRef, useState } from "react";
import { API, lireJson } from "../api";
import { MODES } from "../format";

/**
 * Barre de recherche pseudo#tag + mode de jeu, avec autocomplétion sur les joueurs déjà en base.
 * variante : "accueil" (grande barre centrale) ou "navbar" (compacte).
 */
export default function SearchBar({ variante, pseudo, tag, mode, onPseudo, onTag, onMode, onRechercher, chargement }) {
  const [suggestions, setSuggestions] = useState([]);
  const derniereRequete = useRef(0);

  async function chercherSuggestions(valeur) {
    onPseudo(valeur);
    if (valeur.length < 1) {
      setSuggestions([]);
      return;
    }
    // Si l'utilisateur tape vite, une ancienne réponse peut arriver après une plus récente : on l'ignore
    const numeroRequete = ++derniereRequete.current;
    try {
      const data = await lireJson(await fetch(`${API}/joueurs/recherche?q=${encodeURIComponent(valeur)}`));
      if (numeroRequete === derniereRequete.current) setSuggestions(data.resultats);
    } catch {
      if (numeroRequete === derniereRequete.current) setSuggestions([]);
    }
  }

  function choisirSuggestion(s) {
    onPseudo(s.pseudo);
    onTag(s.tag);
    setSuggestions([]);
  }

  function gererTouche(e) {
    if (e.key === "Enter") {
      setSuggestions([]);
      onRechercher();
    }
  }

  const champPseudo = (
    <div className="champ-autocomplete">
      <input
        type="text"
        placeholder="Pseudo"
        value={pseudo}
        onChange={(e) => chercherSuggestions(e.target.value)}
        onKeyDown={gererTouche}
        onBlur={() => setTimeout(() => setSuggestions([]), 150)}
        autoComplete="off"
      />
      {suggestions.length > 0 && (
        <ul className="dropdown-suggestions">
          {suggestions.map((s) => (
            <li key={s.pseudo + s.tag} onClick={() => choisirSuggestion(s)}>
              {s.pseudo}
              <span className="tag-suggestion">#{s.tag}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const champTag = (
    <input
      type="text"
      placeholder={variante === "accueil" ? "Tag (ex: EUW)" : "Tag"}
      value={tag}
      onChange={(e) => onTag(e.target.value)}
      onKeyDown={gererTouche}
    />
  );

  const choixMode = (
    <select value={mode} onChange={(e) => onMode(e.target.value)}>
      {MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
    </select>
  );

  if (variante === "accueil") {
    return (
      <div className="barre-recherche">
        {champPseudo}
        <span className="separateur-hashtag">#</span>
        {champTag}
        {choixMode}
        <button className="bouton-recherche-rond" onClick={() => onRechercher()} aria-label="Rechercher" disabled={chargement}>
          {chargement ? <span className="spinner" /> : "⚔"}
        </button>
      </div>
    );
  }

  return (
    <div className="navbar-recherche">
      {champPseudo}
      {champTag}
      {choixMode}
      <button onClick={() => onRechercher()} disabled={chargement}>
        {chargement ? "..." : "Rechercher"}
      </button>
    </div>
  );
}
