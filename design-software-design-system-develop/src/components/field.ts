/**
 * `<sena-field>` — E3 de HU-SHELL-006.
 *
 * Campo de formulario (input, select, textarea) con etiqueta, ayuda y error.
 * El inventario encontro `.field` / `.fieldError` duplicados en
 * `academic-management-mfe` (11 usos), `document-mfe` (3 copias),
 * `monitoring-mfe` (18 usos) y `reference-data-mfe`.
 *
 * Uso:
 *
 *   <sena-field label="Correo" name="email" required>
 *     <input type="email" />
 *   </sena-field>
 *
 *   <sena-field label="Estado" error="Este campo es obligatorio">
 *     <select><option>...</option></select>
 *   </sena-field>
 *
 * El control real va en el **light DOM** dentro de `<sena-field>`, no en el
 * shadow: asi se conserva el binding de React y el `name` real del formulario
 * sin necesidad de proxies. El componente solo aporta el marco, la etiqueta, la
 * ayuda y el error.
 *
 * Contrato de atributos:
 *   - `label`      Requerido. Texto de la etiqueta.
 *   - `help`       Opcional. Texto de ayuda.
 *   - `error`      Opcional. Mensaje de error. Su presencia marca el campo como invalido.
 *   - `required`   Booleano. Muestra el asterisco y `aria-required`.
 *   - `id`         Base de los ids. Por defecto se deriva de `name` o del orden.
 *
 * El estado `disabled` lo aporta el control nativo (`<input disabled>`) y el
 * campo lo estiliza con los tokens compartidos, sin duplicar el estado en el host.
 *
 * Accesible: `aria-describedby` apunta a la ayuda o al error segun corresponda,
 * y `aria-invalid` se activa solo cuando hay error. Como el `<label>` vive en el
 * shadow DOM y el control en el light DOM, el nombre accesible se entrega al
 * control con `aria-label` (salvo que el consumidor ya use `aria-labelledby` o
 * un `aria-label` propio): la asociacion `for`/`id` no cruza el shadow.
 */
import { SenaElement, define } from './base-element';

const TAG = 'sena-field';

let counter = 0;

export class SenaField extends SenaElement {
  private generatedId = '';
  static get observedAttributes(): string[] {
    return ['label', 'help', 'error', 'required'];
  }

  get label(): string {
    return this.attr('label');
  }

  set label(value: string) {
    this.setAttribute('label', value);
  }

  get help(): string {
    return this.attr('help');
  }

  get error(): string {
    return this.attr('error');
  }

  set error(value: string) {
    if (value === '') this.removeAttribute('error');
    else this.setAttribute('error', value);
  }

  get required(): boolean {
    return this.hasAttribute('required');
  }

  /** Id estable del campo, para enlazar label y control. */
  get fieldId(): string {
    return this.attr('id') || this.attr('name') || this.control()?.getAttribute('id') || (this.generatedId ||= `sena-field-${(counter += 1)}`);
  }

  connectedCallback(): void {
    this.addEventListener('slotchange', this.syncSlottedControl);
    this.root.addEventListener('click', this.focusControlFromLabel);
    this.update();
  }

  disconnectedCallback(): void {
    this.removeEventListener('slotchange', this.syncSlottedControl);
    this.root.removeEventListener('click', this.focusControlFromLabel);
  }

  private readonly syncSlottedControl = (): void => {
    this.update();
  };

  private readonly focusControlFromLabel = (event: Event): void => {
    if ((event.target as Element | null)?.closest('label')) this.control()?.focus();
  };

  attributeChangedCallback(): void {
    if (this.isConnected) this.update();
  }

  protected attributeChangedCallbackFor(): void {
    /* no-op */
  }

  /**
   * El control vive en el light DOM. Necesita heredar el id y los atributos ARIA
   * que el marco calcula, asi que se ajustan aqui en vez de(slotearlo.
   */
  private control(): HTMLElement | null {
    for (const child of Array.from(this.children)) {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(child.tagName)) return child as HTMLElement;
    }
    return null;
  }

  protected render(): string {
    const id = this.fieldId;
    const control = this.control();
    const hasError = this.error !== '' || (control?.getAttribute('aria-invalid') === 'true' && !control.hasAttribute('data-sena-field-invalid'));
    const help = this.help;
    const error = this.error;
    const required = this.required;

    const controlId = control?.getAttribute('id') || `${id}-control`;
    if (control !== null) {
      if (!control.hasAttribute('id')) control.setAttribute('id', controlId);
      // El `<label>` vive en el shadow DOM y el control en el light DOM: la
      // asociacion `for`/`id` no cruza el limite de shadow, asi que el control
      // quedaria sin nombre accesible. Se lo damos con `aria-label`, salvo que
      // el consumidor ya gestione el nombre (aria-labelledby o su propio
      // aria-label). El marcador `data-sena-field-name` distingue el nuestro.
      const ours = control.hasAttribute('data-sena-field-name');
      const consumerNamed = control.hasAttribute('aria-labelledby') || (control.hasAttribute('aria-label') && !ours);
      if (this.label !== '' && !consumerNamed) {
        control.setAttribute('aria-label', this.label);
        control.setAttribute('data-sena-field-name', '');
      } else if (ours) {
        control.removeAttribute('aria-label');
        control.removeAttribute('data-sena-field-name');
      }
      if (required) {
        if (!control.hasAttribute('required')) {
          control.setAttribute('required', '');
          control.setAttribute('data-sena-field-required', '');
        }
      } else if (control.hasAttribute('data-sena-field-required')) {
        control.removeAttribute('required');
        control.removeAttribute('data-sena-field-required');
      }

      // Solo se gestiona lo que el componente marco, para no borrar atributos
      // de accesibilidad que el consumidor ponga en el control (p. ej. un
      // `aria-invalid` derivado de su propia validacion).
      const consumerInvalid = control.getAttribute('aria-invalid') === 'true' && !control.hasAttribute('data-sena-field-invalid');
      if (hasError && !consumerInvalid) {
        control.setAttribute('aria-invalid', 'true');
        control.setAttribute('data-sena-field-invalid', '');
      } else if (!hasError && control.hasAttribute('data-sena-field-invalid')) {
        control.removeAttribute('aria-invalid');
        control.removeAttribute('data-sena-field-invalid');
      }

      const ownsDescription = control.hasAttribute('data-sena-field-describedby');
      const consumerDescription = control.hasAttribute('aria-describedby') && !ownsDescription;
      const describedBy = error !== '' ? `${id}-error` : help !== '' ? `${id}-help` : '';
      if (!consumerDescription && describedBy !== '') {
        control.setAttribute('aria-describedby', describedBy);
        control.setAttribute('data-sena-field-describedby', '');
      } else if (!consumerDescription && ownsDescription) {
        control.removeAttribute('aria-describedby');
        control.removeAttribute('data-sena-field-describedby');
      }
    }

    this.setAttribute('data-invalid', String(hasError));
    this.syncMessage(
      hasError
        ? { tone: 'error', text: error, id: `${id}-error` }
        : help !== ''
          ? { tone: 'help', text: help, id: `${id}-help` }
          : null,
    );

    return `
      <div class="wrapper" part="wrapper">
        <label class="label" part="label" for="${this.escape(controlId)}">
          ${this.escape(this.label)}${required ? '<span class="required" part="required" aria-hidden="true">*</span>' : ''}
        </label>
        <slot></slot>
      </div>
    `;
  }

  /**
   * La ayuda/error vive en el light DOM, junto al control. Es necesario para que
   * `aria-describedby` (un IDREF) resuelva dentro del mismo arbol y para que el
   * mensaje sea visible sin atravesar el shadow root. El texto no se duplica: el
   * shadow solo aporta el slot.
   */
  private syncMessage(message: { tone: 'error' | 'help'; text: string; id: string } | null): void {
    let element = Array.from(this.children).find((child) =>
      child.hasAttribute('data-sena-field-message'),
    ) as HTMLElement | undefined;
    if (message === null) {
      element?.remove();
      return;
    }
    if (element === undefined) {
      element = document.createElement('p');
      element.setAttribute('data-sena-field-message', '');
      this.appendChild(element);
    }
    if (element.id !== message.id) element.id = message.id;
    if (element.getAttribute('data-tone') !== message.tone) element.setAttribute('data-tone', message.tone);
    if (message.tone === 'error') element.setAttribute('role', 'alert');
    else element.removeAttribute('role');
    if (element.textContent !== message.text) element.textContent = message.text;
  }

  protected styles(): string {
    // `:host` usa `--field-border` para que el light DOM (que no atraviesa el
    // shadow) herede el mismo borde que el marco.
    return `
      :host {
        display: block;
        font-family: var(--font-family-base);
        --field-border: var(--color-border);
        --field-border-focus: var(--color-info);
        --field-border-error: var(--color-danger);
      }

      :host([data-invalid='true']) { --field-border: var(--color-danger); }

      .wrapper {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
      }

      .label {
        color: var(--color-text);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        line-height: var(--line-height-normal);
      }

      .required { color: var(--color-danger); margin-inline-start: var(--space-1); }

      .help {
        margin: 0;
        color: var(--color-text-muted);
        font-size: var(--font-size-xs);
        line-height: var(--line-height-normal);
      }

      .error {
        margin: 0;
        color: var(--color-danger);
        font-size: var(--font-size-xs);
        line-height: var(--line-height-normal);
      }

      ::slotted([data-sena-field-message]) {
        margin: 0;
        font-size: var(--font-size-xs);
        line-height: var(--line-height-normal);
      }

      ::slotted([data-sena-field-message][data-tone='error']) {
        color: var(--color-danger);
      }

      ::slotted([data-sena-field-message][data-tone='help']) {
        color: var(--color-text-muted);
      }

      /* Estilo del control que el consumidor pone en el light DOM. El shadow no
         alcanza al light DOM, asi que se aplica desde el host. */
      :host ::slotted(input),
      :host ::slotted(select),
      :host ::slotted(textarea) {
        min-block-size: calc(var(--space-8) - var(--space-1));
        padding: var(--space-2) var(--space-3);
        border: var(--space-1) solid var(--field-border);
        border-radius: var(--radius-md);
        background: var(--color-background);
        color: var(--color-text);
        font: inherit;
        font-size: var(--font-size-sm);
        line-height: var(--line-height-normal);
      }

      :host ::slotted(input[type='checkbox']) {
        inline-size: var(--space-4);
        min-block-size: var(--space-4);
        padding: 0;
        accent-color: var(--color-brand);
      }

      :host ::slotted(input:focus-visible),
      :host ::slotted(select:focus-visible),
      :host ::slotted(textarea:focus-visible) {
        border-color: var(--field-border-focus);
        outline: var(--space-1) solid var(--field-border-focus);
        outline-offset: var(--space-1);
      }

      :host([data-invalid='true']) ::slotted(input),
      :host([data-invalid='true']) ::slotted(select),
      :host([data-invalid='true']) ::slotted(textarea) {
        border-color: var(--field-border-error);
      }

      /* CA-06: el control nativo deshabilitado conserva la apariencia comun. */
      :host ::slotted(input:disabled),
      :host ::slotted(select:disabled),
      :host ::slotted(textarea:disabled) {
        border-color: var(--color-border);
        background: var(--color-surface-muted);
        color: var(--color-text-muted);
        cursor: not-allowed;
      }
    `;
  }
}

define(TAG, SenaField);

export const register = (): void => {
  define(TAG, SenaField);
};

declare global {
  interface HTMLElementTagNameMap {
    'sena-field': SenaField;
  }
}
