/**
 * `<sena-status-badge>` — E3 de HU-SHELL-006.
 *
 * Badge de estado. Unifica los 5 StatusBadge duplicados que el inventario de
 * HU-006 encontro repartidos en los MFEs:
 *
 *   - `academic-management-mfe` `FichaStatusBadge` (6 estados de ficha)
 *   - `academic-management-mfe` `ProgramActiveBadge` (Activo/Inactivo)
 *   - `document-mfe` `StatusBadge` (6 estados de documento)
 *   - `document-mfe` `TemplateStateBadge` (4 estados de plantilla)
 *   - `monitoring-mfe` `StatusBadge` (KPI por regex)
 *
 * El tono es el contrato: `success | info | warning | danger | neutral | unknown`.
 * Los MFEs ya usaban exactamente esos nombres en minusculas, asi que la
 * migracion es cambiar el import, no reescribir la logica.
 *
 * Uso:
 *
 *   <sena-status-badge tone="success" label="Publicado" icon="check" />
 *
 * Contrato de atributos:
 *   - `tone`   Requerido. Uno de los seis tonos. `unknown` es el default.
 *   - `label`  Requerido. Texto. **Siempre**: el spec exige color + icono + texto,
 *              nunca solo color (design-tokens.md §Estados de negocio).
 *   - `icon`   Opcional. Glifo. Si se omite, el tono decide su icono por defecto.
 *
 * Accesible: si no recibe `icon` explicito se inyecta `title` con el tono, para
 * que el color nunca sea el unico portador de significado.
 */
import { SenaElement, define } from './base-element';

const TAG = 'sena-status-badge';

/**
 * Los seis tonos que circulan hoy en los MFEs. El nombre es el contrato publico:
 * cambiarlo rompe los 5 badges migrados.
 */
export const TONES = ['success', 'info', 'warning', 'danger', 'neutral', 'unknown'] as const;

export type Tone = (typeof TONES)[number];

/**
 * Icono por defecto de cada tono. Un glifo, no un SVG: mantiene el componente
 * sin dependencias y alineado con el `Icon.tsx` del shell.
 */
const DEFAULT_ICON: Record<Tone, string> = {
  success: '✓',
  info: 'ℹ',
  warning: '!',
  danger: '×',
  neutral: '○',
  unknown: '?',
};

/** Normaliza el `tone` recibido. Cualquier valor no reconocido cae en `unknown`. */
export const normalizeTone = (value: string | null | undefined): Tone =>
  TONES.includes(value as Tone) ? (value as Tone) : 'unknown';

export class StatusBadge extends SenaElement {
  static get observedAttributes(): string[] {
    return ['tone', 'label', 'icon'];
  }

  get tone(): Tone {
    return normalizeTone(this.attr('tone', 'unknown'));
  }

  set tone(value: Tone) {
    this.setAttribute('tone', value);
  }

  get label(): string {
    return this.attr('label');
  }

  set label(value: string) {
    this.setAttribute('label', value);
  }

  connectedCallback(): void {
    this.update();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.update();
  }

  protected attributeChangedCallbackFor(): void {
    /* no-op */
  }

  protected render(): string {
    const tone = this.tone;
    // Un icono explicito gana; si no, el del tono. Nunca se omite.
    const icon = this.escape(this.attr('icon') || DEFAULT_ICON[tone]);
    // `tone` va como clase Y como atributo: el atributo permite estilizar desde
    // fuera y testear sin entrar al shadow.
    this.setAttribute('data-tone', tone);
    this.syncLabel();

    return `
      <span class="badge" part="badge" data-tone="${tone}">
        <span class="icon" part="icon" aria-hidden="true">${icon}</span>
        <slot></slot>
      </span>
    `;
  }

  /**
   * El texto vive en el light DOM, no en el shadow: asi el `label` es visible
   * para el consumidor, los tests y las herramientas que no atraviesan shadow
   * roots, sin duplicar el contenido. El icono sigue en el shadow.
   */
  private syncLabel(): void {
    let element = Array.from(this.children).find((child) =>
      child.hasAttribute('data-sena-status-badge-label'),
    ) as HTMLElement | undefined;
    if (this.label === '') {
      element?.remove();
      return;
    }
    if (element === undefined) {
      element = document.createElement('span');
      element.setAttribute('data-sena-status-badge-label', '');
      this.appendChild(element);
    }
    if (element.textContent !== this.label) element.textContent = this.label;
  }

  protected styles(): string {
    // E4: ni un color ni un espaciado literal. Cada tono compone
    // foreground + surface a partir de los tokens del spec.
    return `
      :host {
        display: inline-flex;
        font-family: var(--font-family-base);
      }

      .badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-1) var(--space-3);
        border: var(--space-1) solid transparent;
        border-radius: var(--radius-lg);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        line-height: var(--line-height-normal);
        white-space: nowrap;
      }

      .icon { font-weight: var(--font-weight-bold); }

      ::slotted([data-sena-status-badge-label]) {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-medium);
        line-height: var(--line-height-normal);
        white-space: nowrap;
      }

      :host([data-tone='success']) ::slotted([data-sena-status-badge-label]) {
        color: var(--color-success);
      }

      :host([data-tone='info']) ::slotted([data-sena-status-badge-label]) {
        color: var(--color-info);
      }

      :host([data-tone='warning']) ::slotted([data-sena-status-badge-label]) {
        color: var(--color-warning);
      }

      :host([data-tone='danger']) ::slotted([data-sena-status-badge-label]) {
        color: var(--color-danger);
      }

      :host([data-tone='neutral']) ::slotted([data-sena-status-badge-label]) {
        color: var(--color-text-muted);
      }

      :host([data-tone='unknown']) ::slotted([data-sena-status-badge-label]) {
        color: var(--color-text-muted);
      }

      [data-tone='success'] {
        color: var(--color-success);
        background: var(--color-success-surface);
        border-color: var(--color-success-surface);
      }

      [data-tone='info'] {
        color: var(--color-info);
        background: var(--color-info-surface);
        border-color: var(--color-info-surface);
      }

      [data-tone='warning'] {
        color: var(--color-warning);
        background: var(--color-warning-surface);
        border-color: var(--color-warning-surface);
      }

      [data-tone='danger'] {
        color: var(--color-danger);
        background: var(--color-danger-surface);
        border-color: var(--color-danger-surface);
      }

      [data-tone='neutral'] {
        color: var(--color-text-muted);
        background: var(--color-surface-muted);
        border-color: var(--color-border);
      }

      /* Estado desconocido: borde punteado, para que se lea como "no sabemos",
         no como "esta en un estado mas". */
      [data-tone='unknown'] {
        color: var(--color-text-muted);
        background: transparent;
        border-color: var(--color-text-muted);
        border-style: dashed;
      }
    `;
  }
}

define(TAG, StatusBadge);

/** Registra el elemento. Idempotente. */
export const register = (): void => {
  define(TAG, StatusBadge);
};

declare global {
  interface HTMLElementTagNameMap {
    'sena-status-badge': StatusBadge;
  }
}
