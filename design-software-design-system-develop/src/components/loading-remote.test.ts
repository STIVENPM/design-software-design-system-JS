/**
 * Tests de `<sena-loading-remote>` — E2 de HU-SHELL-006.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import './loading-remote';
import { cssTokens, localAliases, publishedTokens, shadowCss } from '../../test/component-helpers';

const mount = (attrs: Record<string, string> = {}) => {
  const el = document.createElement('sena-loading-remote');
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  document.body.append(el);
  return el;
};

describe('sena-loading-remote', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('se registra como custom element', () => {
    expect(customElements.get('sena-loading-remote')).toBeTypeOf('function');
  });

  it('E2: comparte patron de props con RemoteUnavailable (domain)', () => {
    const el = mount({ domain: 'iam' });
    expect(el.domain).toBe('iam');
    expect(el.shadowRoot?.textContent).toContain('iam');
  });

  it('no inventa un dominio cuando domain falta', () => {
    const el = mount();
    expect(el.domain).toBe('');
    expect(el.hasDomain).toBe(false);
    expect(el.shadowRoot?.querySelector('.text')?.textContent).toBe('Cargando contenido');
  });

  it('sigue funcionando sin domain (API opcional de la HU)', () => {
    const el = mount({ label: 'Conectando' });
    expect(el.shadowRoot?.querySelector('.text')?.textContent).toBe('Conectando');
  });

  it('permite sobrescribir el texto con label', () => {
    const el = mount({ domain: 'iam', label: 'Conectando' });
    expect(el.shadowRoot?.querySelector('.text')?.textContent).toBe('Conectando');
  });

  it('es announced como estado de carga', () => {
    const el = mount({ domain: 'iam' });
    const wrapper = el.shadowRoot?.querySelector('.wrapper');
    expect(wrapper?.getAttribute('role')).toBe('status');
    expect(wrapper?.getAttribute('aria-live')).toBe('polite');
  });

  it('el spinner es decorativo para lectores de pantalla', () => {
    const spinner = mount({ domain: 'iam' }).shadowRoot?.querySelector('.spinner');
    expect(spinner?.getAttribute('aria-hidden')).toBe('true');
  });

  it('escapa domain y label', () => {
    const el = mount({ domain: '<b>iam</b>', label: '<script>x</script>' });
    expect(el.shadowRoot?.querySelector('b')).toBeNull();
    expect(el.shadowRoot?.querySelector('script')).toBeNull();
  });

  it('reacciona a cambios de atributo', () => {
    const el = mount({ domain: 'iam' });
    el.setAttribute('domain', 'audit');
    expect(el.shadowRoot?.textContent).toContain('audit');
  });

  it('E4: sin colores ni espaciados literales en el CSS', () => {
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