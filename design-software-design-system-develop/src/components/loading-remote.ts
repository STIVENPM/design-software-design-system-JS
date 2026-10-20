/**
 * `<sena-loading-remote>` — E2 de HU-SHELL-006.
 *
 * Estado de carga de un remote. Reemplaza al `LoadingRemote` que el shell
 * llevaba duplicado en `src/shell/components/LoadingRemote/`.
 *
 * Uso (ADR-009 §8):
 *
 *   <Suspense fallback={<sena-loading-remote domain="iam" />} />
 *
 * Contrato de atributos:
 *   - `domain`  Opcional (API minima de la HU). Nombre del remote, se muestra
 *               como texto. Si falta no se inventa un dominio: el mensaje pasa
 *               a "Cargando contenido".
 *   - `label`   Opcional. Sobrescribe el texto por defecto.
 *
 * Accesible: `role="status"` + `aria-live="polite"` para que un lector de
 * pantalla anuncie la carga, y la animacion respeta
 * `prefers-reduced-motion` desde el propio CSS.
 */
import { SenaElement, define } from './base-element';

const TAG = 'sena-loading-remote';

export class LoadingRemote extends SenaElement {
  static get observedAttributes(): string[] {
    return ['domain', 'label'];
  }

  /** Permite `<sena-loading-remote .domain>` sin atributo. */
  get domain(): string {
    return this.attr('domain');
  }

  /** `domain` es opcional: sin el, no se inventa un remote. */
  get hasDomain(): boolean {
    return this.domain !== '';
  }

  set domain(value: string) {
    this.setAttribute('domain', value);
  }

  connectedCallback(): void {
    this.update();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.update();
  }

  protected attributeChangedCallbackFor(): void {
    /* no-op: este componente no tiene estado interno */
  }

  protected render(): string {
    const domain = this.domain;
    const label = this.attr('label');
    const defaultText = this.hasDomain ? `Cargando ${this.escape(domain)}` : 'Cargando contenido';
    const text = label !== '' ? this.escape(label) : defaultText;

    return `
      <div class="wrapper" part="wrapper" role="status" aria-live="polite">
        <span class="spinner" part="spinner" aria-hidden="true"></span>
        <p class="text" part="text">${text}</p>
      </div>
    `;
  }

  protected styles(): string {
    // Todos los valores vienen de tokens. E4 lo verifica con grep: no debe
    // aparecer ni un color ni un espaciado literal aqui.
    return `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-8);
        color: var(--color-text-muted);
        font-family: var(--font-family-base);
      }

      .wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-4);
      }

      .spinner {
        inline-size: calc(var(--space-8) - var(--space-1));
        block-size: calc(var(--space-8) - var(--space-1));
        border: var(--space-1) solid var(--color-border);
        border-block-start-color: var(--color-brand);
        border-radius: 50%;
        animation: spin 900ms linear infinite;
      }

      .text {
        margin: 0;
        font-size: var(--font-size-xs);
        text-align: center;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .spinner { animation: none; }
      }
    `;
  }
}

define(TAG, LoadingRemote);

/** Registra el elemento. Idempotente. */
export const register = (): void => {
  define(TAG, LoadingRemote);
};

declare global {
  interface HTMLElementTagNameMap {
    'sena-loading-remote': LoadingRemote;
  }
}
