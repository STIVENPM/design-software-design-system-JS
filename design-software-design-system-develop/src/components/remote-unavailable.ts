/**
 * `<sena-remote-unavailable>` — E1 de HU-SHELL-006.
 *
 * Pantalla de error de un remote. Reemplaza al `RemoteUnavailable` que el shell
 * llevaba duplicado en `src/shell/components/RemoteUnavailable/`.
 *
 * Uso (ADR-009 §8):
 *
 *   <ErrorBoundary fallback={<sena-remote-unavailable domain="iam" />} />
 *
 * Contrato de atributos:
 *   - `domain`  Requerido. Nombre del remote. Si falta, el componente lo indica
 *               en el mensaje y deshabilita el reintento: nunca inventa un
 *               dominio como "remote".
 *   - `reason`  Opcional. Detalle del error. Se escapa, no se interpola en HTML.
 *   - `retry-label` Opcional. Texto del boton. Por defecto "Reintentar".
 *
 * Interaccion: el boton emite `sena-retry` (`CustomEvent`, `composed: true` para
 * que salga del shadow DOM). Quien lo escucha decide como reintentar, porque solo
 * el host conoce la funcion de carga del remote:
 *
 *   <sena-remote-unavailable
 *     domain="iam"
 *     onSenaRetry={() => retryIam()}
 *   />
 *
 * Accesible: `role="alert"` para que el fallo se anuncie de inmediato, y el boton
 * tiene un área táctil de 44px derivada de la escala canónica de espaciado.
 */
import { SenaElement, define } from './base-element';

const TAG = 'sena-remote-unavailable';

export interface RemoteUnavailableDetail {
  domain: string;
  reason?: string;
}

export class RemoteUnavailable extends SenaElement {
  static get observedAttributes(): string[] {
    return ['domain', 'reason', 'retry-label'];
  }

  get domain(): string {
    return this.attr('domain');
  }

  set domain(value: string) {
    this.setAttribute('domain', value);
  }

  /** `domain` es obligatorio para contextualizar el estado y reintentar. */
  get hasDomain(): boolean {
    return this.domain !== '';
  }

  get reason(): string {
    return this.attr('reason');
  }

  set reason(value: string) {
    this.setAttribute('reason', value);
  }

  connectedCallback(): void {
    this.update();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.update();
  }

  protected attributeChangedCallbackFor(): void {
    /* no-op: no hay estado interno */
  }

  /** Reintento. El listener decide que significa reintentar. */
  protected onRetry(): void {
    // Sin dominio no hay a que reintentar: no se emite un evento ambiguo.
    if (!this.hasDomain) return;

    this.emit<RemoteUnavailableDetail>('sena-retry', {
      domain: this.domain,
      ...(this.reason !== '' ? { reason: this.reason } : {}),
    });
  }

  protected render(): string {
    const hasDomain = this.hasDomain;
    const domain = this.escape(this.domain);
    const reason = this.reason;
    const retryLabel = this.attr('retry-label', 'Reintentar');

    const title = hasDomain
      ? `No se pudo cargar ${domain}`
      : 'No se pudo cargar el remote';

    const missingBlock = hasDomain
      ? ''
      : '<p class="missing" part="missing">No se informó el dominio del remote; no es posible reintentar.</p>';

    const reasonBlock =
      reason !== ''
        ? `<p class="reason" part="reason">${this.escape(reason)}</p>`
        : '';

    return `
      <div class="wrapper" part="wrapper" role="alert">
        <span class="icon" part="icon" aria-hidden="true">!</span>
        <h2 class="title" part="title">${title}</h2>
        ${missingBlock}
        ${reasonBlock}
        <button class="retry" part="retry" type="button" ${hasDomain ? '' : 'disabled aria-disabled="true"'}>
          ${this.escape(retryLabel)}
        </button>
      </div>
    `;
  }

  protected styles(): string {
    // Ningun color ni espaciado literal: todo sale de tokens (E4).
    return `
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-8);
        font-family: var(--font-family-base);
      }

      .wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-3);
        max-inline-size: calc(var(--space-8) * 10 + var(--space-6));
        text-align: center;
        color: var(--color-text);
      }

      .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        inline-size: calc(var(--space-8) - var(--space-1));
        block-size: calc(var(--space-8) - var(--space-1));
        border-radius: 50%;
        background: var(--color-danger-surface);
        color: var(--color-danger);
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-bold);
      }

      .title {
        margin: 0;
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-bold);
      }

      .reason,
      .missing {
        margin: 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-xs);
      }

      .missing { font-weight: var(--font-weight-medium); }

      .retry {
        min-block-size: calc(var(--space-8) - var(--space-1));
        margin-block-start: var(--space-2);
        padding: var(--space-2) var(--space-5);
        border: var(--space-1) solid var(--color-brand);
        border-radius: var(--radius-md);
        background: var(--color-brand);
        color: var(--color-background);
        font: inherit;
        font-weight: var(--font-weight-medium);
        cursor: pointer;
      }

      .retry:hover { background: var(--color-brand-hover); border-color: var(--color-brand-hover); }
      .retry:active { background: var(--color-brand-hover); border-color: var(--color-brand-hover); }
      .retry:focus-visible { outline: var(--space-1) solid var(--color-info); outline-offset: var(--space-1); }

      .retry:disabled {
        border-color: var(--color-border);
        background: var(--color-surface-muted);
        color: var(--color-text-muted);
        cursor: not-allowed;
      }
    `;
  }

  /**
   * Delegacion de eventos en lugar de `addEventListener` por render: el listener
   * se registra una vez en el shadow root y sobrevive a cada repintado.
   *
   * Va en `this.root` y no en `this` a proposito: un click que viene de dentro
   * del shadow se re-targetea al host al cruzar la frontera, asi que escuchando
   * en el host `event.target` seria el propio `<sena-remote-unavailable>` y
   * `closest('.retry')` no encontraria nada.
   */
  protected override initialize(): void {
    this.root.addEventListener('click', (event) => {
      const target = event.target as HTMLElement | null;
      if (target === null) return;
      if (target.closest('.retry') === null) return;
      this.onRetry();
    });
  }
}

define(TAG, RemoteUnavailable);

/** Registra el elemento. Idempotente. */
export const register = (): void => {
  define(TAG, RemoteUnavailable);
};

declare global {
  interface HTMLElementTagNameMap {
    'sena-remote-unavailable': RemoteUnavailable;
  }
}
