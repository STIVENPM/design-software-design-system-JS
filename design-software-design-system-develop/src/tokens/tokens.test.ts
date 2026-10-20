import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { buildArtifacts, parseCanonicalCss, parseSpec } from '../../scripts/generate-tokens.mjs';
import {
  tokens,
  color,
  businessState,
  space,
  radius,
  shadow,
  typography,
  zIndex,
  type TokenKey,
} from '../tokens';
import type { TokenKey as PublicTokenKey } from '../index';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..', '..');
const VENDORED_SPEC = join(REPO_ROOT, 'spec', 'design-tokens.md');
const VENDORED_CSS = join(REPO_ROOT, 'spec', 'tokens.css');
const SOURCE_METADATA = join(REPO_ROOT, 'spec', 'source-metadata.json');
const UPSTREAM_DOCS = join(
  REPO_ROOT,
  '..',
  'design-software-docs',
  '12-ux-ui',
  'mockup-ddd',
);
const UPSTREAM_SPEC = join(UPSTREAM_DOCS, 'design-tokens.md');
const UPSTREAM_CSS = join(UPSTREAM_DOCS, 'mockups', 'app', 'assets', 'tokens.css');
const normalizeLineEndings = (content: string) => content.replace(/\r\n/g, '\n');

describe('E1 tokens migrados desde el spec', () => {
  it('genera exclusivamente desde la copia versionada que valida CI', () => {
    const artifacts = buildArtifacts();

    expect(existsSync(artifacts.specPath)).toBe(true);
    expect(existsSync(artifacts.cssPath)).toBe(true);
    expect(artifacts.specPath).toBe(VENDORED_SPEC);
    expect(artifacts.cssPath).toBe(VENDORED_CSS);
  });

  it('la copia vendorizada coincide con la fuente UX cuando esta disponible', () => {
    if (!existsSync(UPSTREAM_SPEC) || !existsSync(UPSTREAM_CSS)) return;

    expect(normalizeLineEndings(readFileSync(VENDORED_SPEC, 'utf8'))).toBe(
      normalizeLineEndings(readFileSync(UPSTREAM_SPEC, 'utf8')),
    );
    expect(normalizeLineEndings(readFileSync(VENDORED_CSS, 'utf8'))).toBe(
      normalizeLineEndings(readFileSync(UPSTREAM_CSS, 'utf8')),
    );
  });

  it('registra commit, hashes y politica LF/CRLF de la fuente UX', () => {
    const metadata = JSON.parse(readFileSync(SOURCE_METADATA, 'utf8')) as {
      sourceCommit: string;
      files: { designTokens: { sha256: string }; canonicalCss: { sha256: string } };
      lineEndings: { versionedCopy: string; hash: string; parser: string };
    };

    expect(metadata.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(metadata.files.designTokens.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(metadata.files.canonicalCss.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(metadata.lineEndings).toEqual({
      versionedCopy: 'LF normalized during sync',
      hash: 'LF/CRLF normalized to LF before SHA-256',
      parser: 'LF/CRLF normalized by parser',
    });

    if (existsSync(UPSTREAM_SPEC) && existsSync(UPSTREAM_CSS)) {
      const upstreamCommit = execFileSync(
        'git',
        ['-c', `safe.directory=${join(REPO_ROOT, '..', 'design-software-docs').replaceAll('\\', '/')}`, '-C', join(REPO_ROOT, '..', 'design-software-docs'), 'rev-parse', 'HEAD'],
        { encoding: 'utf8' },
      ).trim();
      expect(metadata.sourceCommit).toBe(upstreamCommit);
    }
  });

  it('los tokens coinciden 1:1 con el spec y su css canonico', () => {
    const artifacts = buildArtifacts();
    const byKey = new Map<string, string>();
    for (const token of [...artifacts.specTokens, ...artifacts.cssTokens]) {
      if (!byKey.has(token.key)) byKey.set(token.key, token.value);
    }

    // El css canonico manda sobre el subconjunto del spec (asi lo declara el doc).
    for (const [key, value] of byKey) {
      expect(tokens, `falta el token ${key}`).toHaveProperty(key);
      const actual = tokens[key as TokenKey];
      expect(actual, `${key} diverge`).toBe(value);
    }
  });

  it('no deja placeholders vacios', () => {
    const vacios = Object.entries(tokens).filter(([, value]) => value.trim().length === 0);
    expect(vacios).toEqual([]);
  });

  it('los grupos del spec estan completos', () => {
    const requeridos = [
      'color_brand',
      'color_text',
      'color_text_muted',
      'color_border',
      'color_danger',
      'color_warning',
      'color_success',
      'color_info',
      'font_family_base',
      'font_size_md',
      'space_1',
      'space_8',
      'radius_sm',
      'radius_lg',
      'shadow_sm',
      'z_dropdown',
    ];
    for (const key of requeridos) {
      expect(tokens, `falta ${key}`).toHaveProperty(key);
    }
  });
});

describe('E3 tipado estricto', () => {
  it('tokens expone claves, no un Record generico', () => {
    // Estas aserciones solo compilan si TokenKey es una union de literales y
    // el entrypoint publico vuelve a exportar ese mismo tipo.
    const clave: keyof typeof tokens = 'color_brand';
    const clavePublica: PublicTokenKey = 'color_brand';
    expect(tokens[clave]).toBe('#007832');
    expect(clavePublica).toBe('color_brand');
  });

  it('un typo de token falla durante la compilacion', () => {
    const claveValida: TokenKey = 'color_brand';
    // @ts-expect-error `color_brnad` no pertenece a la union de TokenKey.
    const claveInvalida: TokenKey = 'color_brnad';

    expect(claveValida).toBe('color_brand');
    expect(claveInvalida).toBe('color_brnad');
  });

  it('los grupos exponen los valores del spec', () => {
    expect(color.brand).toBe('#007832');
    expect(color.textMuted).toBe('#475467');
    expect(color.border).toBe('#eaecf0');
    expect(space[4]).toBe('16px');
    expect(radius.md).toBe('10px');
    expect(zIndex.toast).toBe('1030');
  });
});

describe('Estados de negocio (spec: color + icono + texto, nunca solo color)', () => {
  it('cubre los cuatro estados del catalogo', () => {
    expect(Object.keys(businessState)).toEqual([
      'BORRADOR',
      'EN_REVISION',
      'PUBLICADO',
      'CONFLICTO',
    ]);
  });

  it('CONFLICTO usa color-conflict sobre danger-surface', () => {
    expect(businessState.CONFLICTO).toEqual({
      color: '#b42318',
      surface: '#fef3f2',
    });
  });

  it('PUBLICADO y EN_REVISION tienen superficies distintas', () => {
    expect(businessState.PUBLICADO.surface).not.toBe(businessState.EN_REVISION.surface);
  });
});

describe('DoD: test que falla si tokens divergen de la fuente', () => {
  it('los archivos generados estan al dia con el generador', () => {
    const artifacts = buildArtifacts();
    const tsPath = join(HERE, 'tokens.generated.ts');
    const cssPath = join(HERE, 'tokens.generated.css');

    expect(readFileSync(tsPath, 'utf8'), 'tokens.generated.ts desactualizado, corre npm run generate:tokens').toBe(
      artifacts.ts,
    );
    expect(readFileSync(cssPath, 'utf8'), 'tokens.generated.css desactualizado, corre npm run generate:tokens').toBe(
      artifacts.css,
    );
  });

  it('el parser ignora filas de resumen que no son tokens', () => {
    // "regular 400 · medium 500 · bold 700" describe un grupo, no un token.
    const parsed = parseSpec('| `font-weight` | `regular 400 · medium 500 · bold 700` |');
    expect(parsed).toEqual([]);

    const css = parseCanonicalCss(':root {\n  --shadow-sm: 0 1px 2px rgba(0,0,0,.06);\n}\n');
    expect(css).toHaveLength(1);
  });

  it('parsea LF y CRLF de la misma forma', () => {
    const markdown = readFileSync(VENDORED_SPEC, 'utf8');
    const css = readFileSync(VENDORED_CSS, 'utf8');

    expect(parseSpec(markdown)).toEqual(parseSpec(markdown.replace(/\n/g, '\r\n')));
    expect(parseCanonicalCss(css)).toEqual(parseCanonicalCss(css.replace(/\n/g, '\r\n')));
  });

  it('la escala de espaciado del spec es la base 4px', () => {
    expect(space[1]).toBe('4px');
    expect(space[2]).toBe('8px');
    expect(space[3]).toBe('12px');
    expect(space[4]).toBe('16px');
    expect(space[5]).toBe('24px');
    expect(space[6]).toBe('32px');
    expect(space[7]).toBe('40px');
    expect(space[8]).toBe('48px');
  });

  it('la tipografia cubre la escala del spec', () => {
    expect(typography.sizeXs).toBe('12px');
    expect(typography.sizeMd).toBe('16px');
    expect(typography.size3xl).toBe('30px');
    expect(typography.weightBold).toBe('700');
    expect(typography.lineHeightRelaxed).toBe('1.7');
  });

  it('las sombras y el layout vienen del css canonico', () => {
    expect(shadow.sm).toContain('rgba(16, 24, 40');
    expect(tokens.topbar_height).toBe('72px');
    expect(tokens.sidebar_width).toBe('264px');
  });
});
