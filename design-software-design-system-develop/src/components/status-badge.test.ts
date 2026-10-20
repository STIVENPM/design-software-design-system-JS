/**
 * Tests de `<sena-status-badge>` — E3 de HU-SHELL-006.
 *
 * El foco es el contrato de tonos, porque es lo que los 5 StatusBadge duplicados
 * de los MFEs tienen que poder expresar sin reescribir su logica.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import './status-badge';
import { normalizeTone, TONES } from './status-badge';
import { cssTokens, localAliases, publishedTokens, shadowCss } from '../../test/component-helpers';

const mount = (attrs: Record<string, string> = {}) => {
  const el = document.createElement('sena-status-badge');
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  document.body.append(el);
  return el;
};

describe('sena-status-badge', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('se registra como custom element', () => {
    expect(customElements.get('sena-status-badge')).toBeTypeOf('function');
  });

  it('expone los seis tonos que ya usan los MFEs', () => {
    expect(TONES).toEqual(['success', 'info', 'warning', 'danger', 'neutral', 'unknown']);
  });

  it.each(TONES)('acepta el tono %s', (tone) => {
    const el = mount({ tone, label: 'Algo' });
    expect(el.tone).toBe(tone);
    expect(el.getAttribute('data-tone')).toBe(tone);
  });

  it('cae en unknown con un tono no reconocido', () => {
    // Un MFE que mande un estado nuevo no debe romper el render.
    expect(normalizeTone('inventado')).toBe('unknown');
    expect(normalizeTone(null)).toBe('unknown');
    expect(normalizeTone(undefined)).toBe('unknown');
    const el = mount({ tone: 'inventado', label: 'X' });
    expect(el.tone).toBe('unknown');
  });

  it('muestra siempre texto (spec: nunca solo color)', () => {
    for (const tone of TONES) {
      const el = mount({ tone, label: 'Etiqueta' });
      expect(el.querySelector('[data-sena-status-badge-label]')?.textContent).toBe('Etiqueta');
    }
  });

  it('muestra siempre icono, incluso sin icono explicito', () => {
    for (const tone of TONES) {
      const el = mount({ tone, label: 'Etiqueta' });
      const icon = el.shadowRoot?.querySelector('.icon');
      expect(icon?.textContent?.trim().length).toBeGreaterThan(0);
    }
  });

  it('el icono por defecto es distinto por tono', () => {
    const icons = TONES.map((tone) =>
      mount({ tone, label: 'X' }).shadowRoot?.querySelector('.icon')?.textContent?.trim(),
    );
    expect(new Set(icons).size).toBe(TONES.length);
  });

  it('permite sobrescribir el icono (HU-ACAD-016 usa simbolos)', () => {
    const el = mount({ tone: 'neutral', label: 'Finalizada', icon: '✓' });
    expect(el.shadowRoot?.querySelector('.icon')?.textContent).toBe('✓');
  });

  it('unknown se distingue visualmente de neutral', () => {
    // Todos los tonos comparten una sola hoja de estilos, asi que la distincion
    // esta en la regla de cada `data-tone`, no en hojas distintas.
    const css = Array.from(mount({ tone: 'neutral', label: 'X' }).shadowRoot?.querySelectorAll('style') ?? [])
      .map((s) => s.textContent ?? '')
      .join('\n');

    const regla = (tone: string) => {
      const match = css.match(new RegExp(`\\[data-tone='${tone}'\\]\\s*\\{([^}]*)\\}`));
      expect(match, `no existe la regla de ${tone}`).not.toBeNull();
      return match?.[1] ?? '';
    };

    // unknown lleva borde punteado; neutral, borde solido.
    expect(regla('unknown')).toContain('border-style: dashed');
    expect(regla('neutral')).not.toContain('dashed');
    // Y unknown no se paints como un tono mas: superficie transparente.
    expect(regla('unknown')).toContain('background: transparent');
  });

  it('escapa label e icon', () => {
    const el = mount({ tone: 'neutral', label: '<script>x</script>', icon: '<img>' });
    expect(el.shadowRoot?.querySelector('script')).toBeNull();
    expect(el.shadowRoot?.querySelector('img')).toBeNull();
  });

  it('reacciona a cambios de tone', () => {
    const el = mount({ tone: 'neutral', label: 'X' });
    el.setAttribute('tone', 'success');
    expect(el.getAttribute('data-tone')).toBe('success');
  });

  it('E4: sin colores ni espaciados literales', () => {
    const css = shadowCss(mount({ tone: 'success', label: 'X' }));
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
    expect(css).not.toMatch(/:\s*[\d.]+(px|rem|em)\b/);
  });

  it('E4: todo var(--x) apunta a un token publicado', () => {
    const css = shadowCss(mount({ tone: 'info', label: 'X' }));
    const publicados = publishedTokens();
    const usados = cssTokens(css);
    expect(usados.length).toBeGreaterThan(0);
    for (const token of usados) {
      if (localAliases(css).has(token)) continue;
      expect(publicados.has(token), token + ' no esta publicado').toBe(true);
    }
  });
});