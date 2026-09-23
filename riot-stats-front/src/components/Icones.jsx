// Icônes dessinées (trait 1.75, 20×20), pour ne pas dépendre de glyphes Unicode.

function Svg({ children, className = "icone" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function IconeRecherche(props) {
  return (
    <Svg {...props}>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <path d="M12.5 12.5 17 17" />
    </Svg>
  );
}

export function IconeActualiser(props) {
  return (
    <Svg {...props}>
      <path d="M16 10a6 6 0 1 1-1.8-4.3" />
      <path d="M16 3.5v3.5h-3.5" />
    </Svg>
  );
}

export function IconeChevron(props) {
  return (
    <Svg {...props}>
      <path d="m6 8 4 4 4-4" />
    </Svg>
  );
}

export function IconeFermer(props) {
  return (
    <Svg {...props}>
      <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
    </Svg>
  );
}

export function IconeRetour(props) {
  return (
    <Svg {...props}>
      <path d="M12 5 7 10l5 5" />
    </Svg>
  );
}

/** Écusson du logo, réutilisé comme emblème « non classé ». */
export function Ecusson({ className }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M24 3 L43 12 V26 C43 36 35 43 24 46 C13 43 5 36 5 26 V12 Z" fill="none" stroke="currentColor" strokeWidth="2.5" />
      <path d="M24 13 L26.5 21.5 L35 22 L28 27.5 L30 36 L24 31 L18 36 L20 27.5 L13 22 L21.5 21.5 Z" fill="currentColor" />
    </svg>
  );
}
