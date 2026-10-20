/**
 * `@sena/design-system` — entrypoint principal.
 *
 * HU-SHELL-005 aporto los tokens; HU-SHELL-006 aporta los componentes.
 *
 * IMPORTANTE: este entrypoint **no** registra los Web Components a proposito.
 * Importarlo desde un test de tokens (o desde una tool de Node) no debe tocar
 * `customElements`, que no existe fuera del navegador. Para activar los
 * componentes hay que importar el subpath explicito:
 *
 *   import '@sena/design-system/components'
 *
 * asi los consumidores eligen cuando pagar el costo de registrar elementos.
 */
export { tokens } from './tokens';
export type { TokenKey, TokenValue, BusinessStateKey } from './tokens';
export {
  color,
  typography,
  space,
  radius,
  shadow,
  zIndex,
  breakpoints,
  businessState,
} from './tokens';

export type {
  Tone,
  Variant,
  RemoteUnavailableDetail,
} from './components';

// `TONES`, `VARIANTS` and `normalize*` intentionally live in
// `@sena/design-system/components`. Re-exporting runtime values here would
// evaluate the component module graph (and `HTMLElement`) in Node.
