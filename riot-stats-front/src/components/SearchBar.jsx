import { useId, useRef, useState } from "react";
import { API, lireJson } from "../api";
import { decouperRiotId } from "../format";
import Avatar from "./Avatar";
import { IconeFermer, IconeRecherche } from "./Icones";

/**
 * Recherche par Riot ID ("Pseudo#TAG" dans un seul champ, collable tel quel),
 * avec autocomplétion clavier sur les joueurs déjà en base.
 * Choisir une suggestion remplit seulement le champ : la recherche part avec le bouton ou Entrée.
 * variante : "accueil" (grand champ central) ou "navbar" (compact, repliable sur mobile).
 */
export default function SearchBar({ variante, dd, onRechercher, chargement }) {
  const [texte, setTexte] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [indexActif, setIndexActif] = useState(-1);
  const [aide, setAide] = useState(null);
  const [deplie, setDeplie] = useState(false); // navbar mobile : champ affiché ou non
  const derniereRequete = useRef(0);
  const champ = useRef(null);
  const id = useId();
  const idListe = `${id}-suggestions`;
  const idAide = `${id}-aide`;

  async function changerTexte(valeur) {
    setTexte(valeur);
    setAide(null);
    setIndexActif(-1);
    const { pseudo } = decouperRiotId(valeur);
    if (pseudo.length < 1) {
      setSuggestions([]);
      return;
    }
    // Si l'utilisateur tape vite, une ancienne réponse peut arriver après une plus récente : on l'ignore
    const numeroRequete = ++derniereRequete.current;
    try {
      const data = await lireJson(await fetch(`${API}/joueurs/recherche?q=${encodeURIComponent(pseudo)}`));
      if (numeroRequete === derniereRequete.current) setSuggestions(data.resultats.slice(0, 6));
    } catch {
      if (numeroRequete === derniereRequete.current) setSuggestions([]);
    }
  }

  /** Remplit le champ avec le Riot ID complet, sans lancer la recherche. */
  function choisirSuggestion(s) {
    derniereRequete.current++; // une réponse encore en route ne doit pas rouvrir la liste
    setTexte(`${s.pseudo}#${s.tag}`);
    setSuggestions([]);
    setIndexActif(-1);
    setAide(null);
    champ.current?.focus();
  }

  function lancer(pseudo, tag) {
    setSuggestions([]);
    setIndexActif(-1);
    setTexte("");
    setDeplie(false);
    champ.current?.blur();
    onRechercher(pseudo, tag);
  }

  function valider() {
    const { pseudo, tag } = decouperRiotId(texte);
    if (!pseudo) {
      setAide("Tape un Riot ID, par exemple Faker#KR1.");
      return;
    }
    if (!tag) {
      setAide(`Ajoute le tag après # : ${pseudo}#EUW, par exemple.`);
      return;
    }
    lancer(pseudo, tag);
  }

  function gererTouche(e) {
    if (e.key === "ArrowDown" && suggestions.length > 0) {
      e.preventDefault();
      setIndexActif((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp" && suggestions.length > 0) {
      e.preventDefault();
      setIndexActif((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Entrée sur une suggestion surlignée la choisit ; sinon elle lance la recherche, comme le bouton
      if (indexActif >= 0 && suggestions[indexActif]) choisirSuggestion(suggestions[indexActif]);
      else valider();
    } else if (e.key === "Escape") {
      if (suggestions.length > 0) setSuggestions([]);
      else if (variante === "navbar") setDeplie(false);
    }
  }

  const listeOuverte = suggestions.length > 0;
  const riotIdComplet = decouperRiotId(texte);
  const pret = riotIdComplet.pseudo !== "" && riotIdComplet.tag !== "";

  return (
    <div className={`recherche recherche-${variante} ${deplie ? "deplie" : ""}`}>
      {variante === "navbar" && (
        <button
          type="button"
          className="bouton-deplier-recherche"
          aria-label={deplie ? "Fermer la recherche" : "Rechercher un joueur"}
          aria-expanded={deplie}
          onClick={() => {
            setDeplie(!deplie);
            if (!deplie) setTimeout(() => champ.current?.focus(), 0);
          }}
        >
          {deplie ? <IconeFermer /> : <IconeRecherche />}
        </button>
      )}

      <form
        className="recherche-formulaire"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          valider();
        }}
      >
        <div className="champ-riot-id">
          <label className="visuellement-cache" htmlFor={`${id}-champ`}>Riot ID</label>
          <input
            ref={champ}
            id={`${id}-champ`}
            type="text"
            inputMode="text"
            placeholder={variante === "accueil" ? "Riot ID, ex : Faker#KR1" : "Pseudo#TAG"}
            value={texte}
            onChange={(e) => changerTexte(e.target.value)}
            onKeyDown={gererTouche}
            onBlur={() => setTimeout(() => setSuggestions([]), 150)}
            autoComplete="off"
            spellCheck="false"
            role="combobox"
            aria-expanded={listeOuverte}
            aria-controls={idListe}
            aria-autocomplete="list"
            aria-activedescendant={indexActif >= 0 ? `${idListe}-${indexActif}` : undefined}
            aria-describedby={aide ? idAide : undefined}
            aria-invalid={aide ? true : undefined}
          />
          <ul id={idListe} className="suggestions" role="listbox" aria-label="Joueurs déjà consultés" hidden={!listeOuverte}>
            {suggestions.map((s, i) => (
              <li
                key={s.pseudo + s.tag}
                id={`${idListe}-${i}`}
                role="option"
                aria-selected={i === indexActif}
                className={i === indexActif ? "actif" : ""}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choisirSuggestion(s)}
              >
                <Avatar dd={dd} icone={s.icone_profil ?? null} taille="mini" />
                <span className="suggestion-texte">
                  <span className="suggestion-pseudo">{s.pseudo}</span>
                  <span className="suggestion-tag">#{s.tag}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <button type="submit" className={`bouton-rechercher ${pret ? "pret" : ""}`} disabled={chargement}>
          {chargement ? <span className="spinner" aria-hidden="true" /> : <IconeRecherche />}
          <span className={variante === "navbar" ? "visuellement-cache" : ""}>
            {chargement ? "Recherche en cours" : "Rechercher"}
          </span>
        </button>
      </form>

      {aide && (
        <p id={idAide} className="aide-saisie" role="alert">
          {aide}
        </p>
      )}
    </div>
  );
}
