/**
 * Componentes base del design-system — HU-SHELL-006.
 *
 * Todos son Web Components (ADR-009 §1: `design-system` es framework-agnostico,
 * TypeScript puro, sin React). Cada componente se autoregistra al importarse, de
 * modo que basta con `import '@sena/design-system/components'` en el entrypoint
 * de la app para que `<sena-remote-unavailable>` exista en el DOM.
 *
 * Para usarlos desde JSX hace falta declarar los intrinsic elements en el
 * consumidor; el contrato publico y un ejemplo para React estan en el README.
 */

// E1/E2: estados de carga y error de un remote (ADR-009 §8).
export { RemoteUnavailable, register as registerRemoteUnavailable } from './remote-unavailable';
export type { RemoteUnavailableDetail } from './remote-unavailable';

export { LoadingRemote, register as registerLoadingRemote } from './loading-remote';

// E3: primitivos base.
export { StatusBadge, TONES, normalizeTone, register as registerStatusBadge } from './status-badge';
export type { Tone } from './status-badge';

export { SenaButton, VARIANTS, normalizeVariant, register as registerButton } from './button';
export type { Variant } from './button';

export { SenaField, register as registerField } from './field';

// Base compartida, exportada para que un MFE pueda extenderla.
export { SenaElement, define } from './base-element';

/**
 * Registra todos los componentes de una vez.
 *
 * Los modulos ya se autoregistran al importarse, asi que esta funcion es
 * idempotente y solo sirve como punto de entrada explicito y legible.
 */
export const registerAll = (): void => {
  /* los imports de arriba ya ejecutan `define()` */
};