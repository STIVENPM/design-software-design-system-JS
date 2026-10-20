/**
 * `<sena-button>` — E3 de HU-SHELL-006.
 *
 * Boton base. El inventario encontro que los MFEs no duplican componentes React
 * de boton, sino **clases CSS**: `.primaryButton` / `.secondaryButton` /
 * `.dangerButton` en `academic-management-mfe`, mas 8 juegos mas en
 * `document-mfe`, `reference-data-mfe` y `monitoring-mfe`. Este componente es el
 * unico lugar donde eso deberia vivir.
 *
 * Uso:
 *
 *   <sena-button variant="primary">Guardar</sena-button>
 *   <sena-button variant="danger" disabled>Eliminar</sena-button>
 *
 * Contrato de atributos:
 *   - `variant`  `primary` (default) | `secondary` | `danger`.
 *   - `disabled` Booleano. Reflejado a `aria-disabled`.
 *   - `type`     `button` (default) | `submit` | `reset`.
 *
 * Accesible: los tres estados que los MFEs duplicaban a mano quedan aqui —
 * `:hover`, `:disabled` y `:focus-visible` — con area tactil de 44px.
 *
 * NOTA de alcance: `<button>` nativo ya ofrece casi todo esto. Este componente
 * existe para **unificar el token de color** entre MFEs, no para reimplementar
 * el elemento. Por eso envuelve un `<button>` real en vez de sustituirlo.
 */
import { SenaElement, define } from './base-element';

const TAG = 'sena-button';

export const VARIANTS = ['primary', 'secondary', 'danger'] as const;
export type Variant = (typeof VARIANTS)[number];

export const normalizeVariant = (value: string | null | undefined): Variant =>
  VARIANTS.includes(value as Variant) ? (value as Variant) : 'primary';

export class SenaButton extends SenaElement {
  static get observedAttributes(): string[] {
    return ['variant', 'disabled', 'type'];
  }

  get variant(): Variant {
    return normalizeVariant(this.attr('variant', 'primary'));
  }

  set variant(value: Variant) {
    this.setAttribute('variant', value);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    if (value) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  /** Contenido provisto por el consumidor via slot. */
  get label(): string {
    return this.textContent ?? '';
  }

  connectedCallback(): void {
    this.addEventListener('click', this.suppressDisabledClick, true);
    this.addEventListener('click', this.handleClick);
    this.addEventListener('keydown', this.handleKeyDown);
    this.addEventListener('keyup', this.handleKeyUp);
    this.addEventListener('slotchange', this.syncAccessibleName);
    this.update();
    this.syncAccessibleName();
  }

  disconnectedCallback(): void {
    this.removeEventListener('click', this.suppressDisabledClick, true);
    this.removeEventListener('click', this.handleClick);
    this.removeEventListener('keydown', this.handleKeyDown);
    this.removeEventListener('keyup', this.handleKeyUp);
    this.removeEventListener('slotchange', this.syncAccessibleName);
  }

  /**
   * A native disabled button never reaches consumer click listeners. The host
   * must offer the same guarantee, so this runs in the capture phase before
   * React's delegated handler (or any host bubble listener) sees the event.
   */
  private readonly suppressDisabledClick = (event: Event): void => {
    if (!this.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  /**
   * A button inside a shadow root is not associated with a form outside that
   * root. Preserve the public submit/reset contract after consumer click
   * handlers have had a chance to call preventDefault().
   */
  private readonly handleClick = (event: Event): void => {
    const internalButton = this.shadowRoot?.querySelector('button');
    if (!internalButton || this.disabled) return;
    // Forward programmatic/React Testing Library clicks dispatched on the host
    // to the real native control. A physical pointer click targets the shadow
    // button and follows the regular path below.
    const originatedInInternalButton = event.composedPath().includes(internalButton);
    if (!originatedInInternalButton && event.target === this) {
      event.stopPropagation();
      internalButton.click();
      return;
    }
    if (!originatedInInternalButton) return;

    const type = this.attr('type', 'button');
    if (type !== 'submit' && type !== 'reset') return;

    queueMicrotask(() => {
      if (event.defaultPrevented) return;
      const form = this.closest('form');
      if (!form) return;
      if (type === 'submit') form.requestSubmit();
      else form.reset();
    });
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.shadowRoot?.querySelector('button')?.click();
    } else {
      event.preventDefault();
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    if (!this.disabled && event.key === ' ') {
      event.preventDefault();
      this.shadowRoot?.querySelector('button')?.click();
    }
  };

  /**
   * El host expone rol, foco y estado, pero **no** fabrica un `aria-label`.
   *
   * Un `<button>` nativo toma su nombre accesible del contenido en vivo; si el
   * componente cacheara ese texto en `aria-label`, quedaria obsoleto cada vez
   * que el consumidor cambia el texto y el nombre no se actualizaria.
   * Por eso solo se refleja el `aria-label` que provee el consumidor; el resto
   * del nombre lo resuelve el algoritmo accesible a partir del light DOM.
   */
  private readonly syncAccessibleName = (): void => {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    this.setAttribute('tabindex', this.disabled ? '-1' : '0');
    this.setAttribute('aria-disabled', String(this.disabled));
  };

  attributeChangedCallback(): void {
    if (this.isConnected) {
      this.update();
      this.syncAccessibleName();
    }
  }

  protected attributeChangedCallbackFor(): void {
    /* no-op */
  }

  protected render(): string {
    const variant = this.variant;
    const type = this.attr('type', 'button');
    const disabled = this.disabled;

    this.setAttribute('data-variant', variant);

    return `
      <button
        class="button"
        part="button"
        type="${this.escape(type)}"
        tabindex="-1"
        aria-hidden="true"
        ${disabled ? 'disabled' : ''}
        ${this.hasAttribute('aria-label') ? `aria-label="${this.escape(this.attr('aria-label'))}"` : ''}
      ><slot></slot></button>
    `;
  }

  protected styles(): string {
    return `
      :host { display: inline-block; font-family: var(--font-family-base); }
      :host([hidden]) { display: none; }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-2);
        min-block-size: calc(var(--space-8) - var(--space-1));
        padding: var(--space-2) var(--space-5);
        border: var(--space-1) solid transparent;
        border-radius: var(--radius-md);
        font: inherit;
        font-weight: var(--font-weight-medium);
        line-height: var(--line-height-normal);
        cursor: pointer;
        /* Sin token de transicion en el spec: se usa una duracion corta fija y
           prefers-reduced-motion la anula abajo. Asi el componente no depende
           de un token que el design-system todavia no publica. */
        transition: background-color 150ms, border-color 150ms;
      }

      /* primary */
      :host([data-variant='primary']) .button {
        background: var(--color-brand);
        border-color: var(--color-brand);
        color: var(--color-background);
      }
      :host([data-variant='primary']) .button:hover:not(:disabled) {
        background: var(--color-brand-hover);
        border-color: var(--color-brand-hover);
      }
      :host([data-variant='primary']) .button:active:not(:disabled) {
        background: var(--color-brand-hover);
        border-color: var(--color-brand-hover);
      }

      /* secondary */
      :host([data-variant='secondary']) .button {
        background: transparent;
        border-color: var(--color-border);
        color: var(--color-text);
      }
      :host([data-variant='secondary']) .button:hover:not(:disabled) {
        background: var(--color-surface-muted);
        border-color: var(--color-text-muted);
      }

      /* danger */
      :host([data-variant='danger']) .button {
        background: var(--color-danger);
        border-color: var(--color-danger);
        color: var(--color-background);
      }
      :host([data-variant='danger']) .button:hover:not(:disabled) {
        background: var(--color-danger);
        border-color: var(--color-danger);
        filter: brightness(0.92);
      }

      .button:focus-visible {
        outline: var(--space-1) solid var(--color-info);
        outline-offset: var(--space-1);
      }

      /* Keyboard focus lands on the host, not on the aria-hidden inner button. */
      :host(:focus-visible) {
        outline: var(--space-1) solid var(--color-info);
        outline-offset: var(--space-1);
      }

      .button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      @media (prefers-reduced-motion: reduce) {
        .button { transition: none; }
      }
    `;
  }
}

define(TAG, SenaButton);

export const register = (): void => {
  define(TAG, SenaButton);
};

declare global {
  interface HTMLElementTagNameMap {
    'sena-button': SenaButton;
  }
}
