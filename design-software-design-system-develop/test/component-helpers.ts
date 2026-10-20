/**
 * Helpers de los tests de componentes — HU-SHELL-006.
 *
 * Evitan repetir en cada archivo el armado del set de tokens publicados y la
 * extraccion del CSS del shadow DOM, que son la misma comprobacion en E1..E4.
 */
import { tokens } from '../src/tokens';

/** Custom properties que el design-system publica de verdad. */
export const publishedTokens = (): Set<string> =>
  new Set(Object.keys(tokens).map((key) => `--${key.replace(/_/g, '-')}`));

/** Texto de todos los `<style>` del shadow DOM de un elemento. */
export const shadowCss = (el: Element): string =>
  Array.from(el.shadowRoot?.querySelectorAll('style') ?? [])
    .map((style) => style.textContent ?? '')
    .join('\n');

/** Tokens referenciados con `var(--x)` en un bloque de CSS. */
export const cssTokens = (css: string): string[] =>
  Array.from(css.matchAll(/var\((--[a-z0-9-]+)\)/g)).map((match) => match[1] ?? '');

/**
 * Alias locales que un componente declara en su propio `:host`
 * (por ejemplo `--field-border`). Se validan por separado: tienen que existir
 * y resolver a un token publicado.
 */
export const localAliases = (css: string): Set<string> =>
  new Set(Array.from(css.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)).map((match) => match[1] ?? ''));

/** Monta un custom element con atributos y lo anade al body. */
export const mount = <T extends HTMLElement>(
  tag: string,
  attrs: Record<string, string> = {},
): T => {
  const el = document.createElement(tag) as T;
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  document.body.append(el);
  return el;
};