/**
 * Base comun de los Web Components — HU-SHELL-006.
 *
 * ADR-009 §1: `design-system` es framework-agnostico (TypeScript puro, sin React).
 * Por eso los componentes son Custom Elements nativos, no `.tsx`. Un remote puede
 * ser React hoy y otro framework manana; `<sena-remote-unavailable>` funciona igual
 * en todos, y desde React se usa con un wrapper thin.
 *
 * Decisiones que esta base fija para todos los componentes:
 *
 *  - Shadow DOM con `mode: 'open'`: el CSS de cada componente no se filtra al host
 *    ni recibe el CSS de la pagina. Es el aislamiento que ADR-009 §7bis exige.
 *  - Los estilos leen SIEMPRE `var(--token)`. Como los tokens llegan por
 *    `:root` del documento y el shadow DOM hereda las custom properties, los
 *    valores del design-system atraviesan el shadow sin esfuerzo. Asi un MFE que
 *    cambia un token en `:root` repinta todos los componentes.
 *  - Ningun color ni espaciado literal en el CSS. E4 lo verifica con grep.
 */

/** Token de CSS que el componente expone como atributo reflectido. */
export type ToneAttribute = string;

/**
 * Base de todos los Web Components del design-system.
 *
 * Se extiende con `extends SenaElement`. Los componentes implementan
 * `render()` y opcionalmente `onAttributeChanged()`.
 */
export abstract class SenaElement extends HTMLElement {
  /** Raiz del shadow DOM, creada una vez en el constructor. */
  protected readonly root: ShadowRoot;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    // Delegacion de eventos: se registra UNA vez en el constructor, no en cada
    // render, para que sobreviva a los repintados del shadow.
    this.initialize();
  }

  /**
   * Punto de extension para listeners que deben vivir fuera del shadow.
   * Se invoca una sola vez, desde el constructor, antes del primer render.
   */
  protected initialize(): void {
    /* las subclases que necesiten eventos lo sobrescriben */
  }

  /**
   * Devuelve el markup del componente.
   *
   * Se llama en el constructor y en cada cambio de atributo observado, asi que
   * debe ser una funcion pura y barata: no lee del DOM ni hace fetch.
   */
  protected abstract render(): string;

  /**
   * Callback para cuando cambia un atributo declarado en `observedAttributes`.
   * Por defecto no hace nada.
   */
  protected attributeChangedCallbackFor(): void {
    /* subclasses lo sobrescriben si lo necesitan */
  }

  /**
   * Stylesheet del componente, con los tokens ya resueltos a `var(--...)`.
   * Se expone para que los tests puedan verificar E4 sin montar el componente.
   */
  protected abstract styles(): string;

  /** Repinta el shadow DOM. Idempotente y barato. */
  protected update(): void {
    this.root.innerHTML = `<style>${this.styles()}</style>${this.render()}`;
  }

  /**
   * Sincroniza los atributos del host al markup.
   * Se llama tras el primer render, para que `domain`/`tone` se lean igual
   * desde el atributo y desde la property.
   */
  protected syncAttributes(attributes: Record<string, string | undefined>): void {
    for (const [name, value] of Object.entries(attributes)) {
      if (value === undefined) continue;
      if (this.getAttribute(name) === value) continue;
      this.setAttribute(name, value);
    }
  }

  /** Lee un atributo, con fallback. */
  protected attr(name: string, fallback = ''): string {
    return this.getAttribute(name)?.trim() || fallback;
  }

  /**
   * Escapa texto que venga de fuera antes de interpolarlo en el shadow DOM.
   * `domain` y `label` los fija el consumidor: sin esto, un `domain` con
   * `<script>` se ejecutaria dentro del shadow.
   */
  protected escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Dispara un evento `CustomEvent` hacia el exterior del shadow DOM. */
  protected emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
  }
}

/**
 * Registra un Custom Element, ignorando el re-registro.
 *
 * Vite recarga los modulos en HMR y los tests importan varias veces: sin este
 * guard, la segunda llamada a `customElements.define` lanza
 * `NotSupportedError` y tumba la suite.
 */
export const define = (tagName: string, ctor: CustomElementConstructor): void => {
  if (customElements.get(tagName) !== undefined) return;
  customElements.define(tagName, ctor);
};