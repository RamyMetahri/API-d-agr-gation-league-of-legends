import { MODES } from "../format";

/** Filtre de mode de jeu : un clic recharge immédiatement les stats, l'historique et les champions. */
export default function ModeFilter({ mode, onMode, chargement }) {
  return (
    <div className="filtre-modes" role="group" aria-label="Mode de jeu">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          className="onglet-mode"
          aria-pressed={mode === m.id}
          disabled={chargement && mode !== m.id}
          onClick={() => mode !== m.id && onMode(m.id)}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
