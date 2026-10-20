export interface ParsedToken {
  cssVar: string;
  key: string;
  value: string;
}

export interface BuildArtifacts {
  specPath: string;
  cssPath: string;
  specTokens: ParsedToken[];
  cssTokens: ParsedToken[];
  ts: string;
  css: string;
}

/** Parsea las tablas del spec markdown y devuelve sus tokens de valor concreto. */
export const parseSpec: (markdown: string) => ParsedToken[];

/** Parsea el `tokens.css` canónico del mockup. */
export const parseCanonicalCss: (css: string) => ParsedToken[];

/** Genera los artefactos de `tokens.generated.ts` y `tokens.generated.css`. */
export const buildArtifacts: () => BuildArtifacts;