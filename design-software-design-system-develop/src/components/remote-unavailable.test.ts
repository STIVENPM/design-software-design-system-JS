/**
 * Tests de `<sena-remote-unavailable>` — E1 de HU-SHELL-006.
 *
 * Se monta el elemento real en jsdom y se verifica el shadow DOM, porque lo
 * que importa es lo que el host ve: atributos, texto y el evento de reintento.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import './remote-unavailable';
import { cssTokens, localAliases, publishedTokens, shadowCss } from '../../test/component-helpers';

/** Monta el elemento y devuelve referencias utiles. */
const mount = (attrs: Record<string, string> = {}) => {
  const el = document.createElement('sena-remote-unavailable');
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  document.body.append(el);
  return el;
};

describe('sena-remote-unavailable', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('se registra como custom element', () => {
    expect(customElements.get('sena-remote-unavailable')).toBeTypeOf('function');
  });

  it('E1: es parametrizable por domain', () => {
    const el = mount({ domain: 'iam' });
    expect(el.domain).toBe('iam');
    expect(el.shadowRoot?.textContent).toContain('iam');
    expect(el.shadowRoot?.textContent).toContain('No se pudo cargar');
  });

  it('no inventa un dominio cuando domain falta', () => {
    const el = mount();
    expect(el.domain).toBe('');
    expect(el.hasDomain).toBe(false);
    expect(el.shadowRoot?.textContent).not.toContain('No se pudo cargar remote');
    expect(el.shadowRoot?.textContent).toContain('No se informó el dominio del remote');
    expect(el.shadowRoot?.querySelector('.missing')).not.toBeNull();
  });

  it('deshabilita el reintento cuando domain falta', () => {
    const el = mount();
    const boton = el.shadowRoot?.querySelector('.retry') as HTMLButtonElement;

    expect(boton.disabled).toBe(true);
    expect(boton.getAttribute('aria-disabled')).toBe('true');
  });

  it('no emite sena-retry sin un domain valido', () => {
    const el = mount();
    let count = 0;
    el.addEventListener('sena-retry', () => (count += 1));

    (el.shadowRoot?.querySelector('.retry') as HTMLButtonElement).click();

    expect(count).toBe(0);
  });

  it('muestra reason solo si viene', () => {
    const sinReason = mount({ domain: 'iam' });
    expect(sinReason.shadowRoot?.querySelector('.reason')).toBeNull();

    const conReason = mount({ domain: 'iam', reason: 'Timeout de red' });
    expect(conReason.shadowRoot?.querySelector('.reason')?.textContent).toBe('Timeout de red');
  });

  it('escapa reason en vez de interpolarlo como HTML', () => {
    const el = mount({ domain: 'iam', reason: '<img src=x onerror=alert(1)>' });
    const reason = el.shadowRoot?.querySelector('.reason');
    // El texto llega literal, no como elemento inyectado.
    expect(reason?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(reason?.querySelector('img')).toBeNull();
  });

  it('escapa domain', () => {
    const el = mount({ domain: '<script>x</script>' });
    expect(el.shadowRoot?.querySelector('script')).toBeNull();
  });

  it('emite sena-retry al pulsar el boton', () => {
    const el = mount({ domain: 'iam' });
    const detalle: unknown[] = [];
    el.addEventListener('sena-retry', (event) => detalle.push((event as CustomEvent).detail));

    (el.shadowRoot?.querySelector('.retry') as HTMLButtonElement).click();

    expect(detalle).toHaveLength(1);
    expect(detalle[0]).toMatchObject({ domain: 'iam' });
  });

  it('no emite sena-retry al pulsar fuera del boton', () => {
    const el = mount({ domain: 'iam' });
    let count = 0;
    el.addEventListener('sena-retry', () => (count += 1));

    (el.shadowRoot?.querySelector('.title') as HTMLElement).click();

    expect(count).toBe(0);
  });

  it('el evento sale del shadow DOM (composed) y sube', () => {
    const el = mount({ domain: 'iam' });
    const padre = document.createElement('div');
    document.body.append(padre);
    padre.append(el);

    const capturado: unknown[] = [];
    // Escucha en el padre: si `composed` no estuviera, no llegaria.
    padre.addEventListener('sena-retry', (event) => capturado.push(event));

    (el.shadowRoot?.querySelector('.retry') as HTMLButtonElement).click();
    expect(capturado).toHaveLength(1);
  });

  it('el boton es un <button> real y accesible', () => {
    const el = mount({ domain: 'iam' });
    const boton = el.shadowRoot?.querySelector('button');
    expect(boton?.tagName).toBe('BUTTON');
    expect(boton?.getAttribute('type')).toBe('button');
    expect(el.shadowRoot?.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('permite personalizar el texto del boton', () => {
    const el = mount({ domain: 'iam', 'retry-label': 'Cargar de nuevo' });
    expect(el.shadowRoot?.querySelector('.retry')?.textContent?.trim()).toBe('Cargar de nuevo');
  });

  it('reacciona a cambios de atributo en caliente', () => {
    const el = mount({ domain: 'iam' });
    el.setAttribute('domain', 'scheduling');
    expect(el.shadowRoot?.textContent).toContain('scheduling');
  });

  it('el listener de reintento sobrevive a los repintados', () => {
    const el = mount({ domain: 'iam' });
    let count = 0;
    el.addEventListener('sena-retry', () => (count += 1));

    // Fuerza dos repintados changing atributos.
    el.setAttribute('domain', 'a');
    el.setAttribute('reason', 'r');
    (el.shadowRoot?.querySelector('.retry') as HTMLButtonElement).click();

    expect(count).toBe(1);
  });

  it('E4: el CSS no contiene colores ni espaciados literales', () => {
    const css = shadowCss(mount({ domain: 'iam' }));
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
    expect(css).not.toMatch(/:\s*[\d.]+(px|rem|em)\b/);
  });

  it('E4: todo var(--x) apunta a un token publicado', () => {
    const css = shadowCss(mount({ domain: 'iam' }));
    const publicados = publishedTokens();
    const usados = cssTokens(css);
    expect(usados.length).toBeGreaterThan(0);
    for (const token of usados) {
      if (localAliases(css).has(token)) continue;
      expect(publicados.has(token), token + ' no esta publicado').toBe(true);
    }
  });
});