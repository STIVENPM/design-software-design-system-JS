/**
 * Generador de tokens — HU-SHELL-005 (DoR #2, mecanismo de sincronización).
 *
 * FUENTE CANÓNICA: `design-software-docs/12-ux-ui/mockup-ddd/design-tokens.md`.
 * Ese `.md` está *locked* y verificado WCAG AA. Este script lo parsea y produce:
 *
 *   - `src/tokens/tokens.generated.ts`  → tokens tipados para consumo en TS
 *   - `src/tokens/tokens.generated.css` → custom properties para consumo en CSS
 *
 * Uso:
 *   node scripts/generate-tokens.mjs          escribe los archivos
 *   node scripts/generate-tokens.mjs --check  falla si están desactualizados (CI)
 *
 * Los archivos generados NO se editan a mano: se regeneran. El test
 * `src/tokens/tokens.test.ts` corre el mismo parser y falla si divergen.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');

/** Raíz del monorepo: este repo vive junto a `design-software-docs`. */
const MONOREPO_ROOT = resolve(REPO_ROOT, '..');

/**
 * Candidatos upstream usados exclusivamente por `sync:spec`.
 *
 * El generador siempre lee `spec/`, igual que CI. Esto evita que un repositorio
 * hermano o un override oculten una copia versionada desactualizada.
 */
const UPSTREAM_DOCS_CANDIDATES = [
  process.env.SENA_SPEC_DOCS_DIR ? resolve(process.env.SENA_SPEC_DOCS_DIR) : null,
  join(MONOREPO_ROOT, 'design-software-docs'),
].filter((dir) => dir !== null);

const UPSTREAM_SPEC_RELATIVE = join('12-ux-ui', 'mockup-ddd', 'design-tokens.md');
const UPSTREAM_CSS_RELATIVE = join('12-ux-ui', 'mockup-ddd', 'mockups', 'app', 'assets', 'tokens.css');
const VENDORED_SPEC_RELATIVE = join('spec', 'design-tokens.md');
const VENDORED_CSS_RELATIVE = join('spec', 'tokens.css');
const SOURCE_METADATA_RELATIVE = join('spec', 'source-metadata.json');

/** Busca la fuente en los candidatos y devuelve la primera que exista. */
const locate = (candidates, relative) => {
  for (const base of candidates) {
    const path = join(base, relative);
    if (existsSync(path)) return path;
  }
  return null;
};

const findSpec = () => locate([REPO_ROOT], VENDORED_SPEC_RELATIVE);
const findCanonicalCss = () => locate([REPO_ROOT], VENDORED_CSS_RELATIVE);
const sourceMetadataPath = () => join(REPO_ROOT, SOURCE_METADATA_RELATIVE);

const TS_OUT = join(REPO_ROOT, 'src', 'tokens', 'tokens.generated.ts');
const CSS_OUT = join(REPO_ROOT, 'src', 'tokens', 'tokens.generated.css');

/**
 * Git conserva los archivos versionados de este repositorio con LF. La fuente UX
 * puede estar en CRLF en un checkout de Windows, por lo que la procedencia se
 * calcula sobre el mismo contenido lógico con LF normalizado. De este modo el
 * hash tiene el mismo valor en Windows y en el runner Ubuntu de CI.
 */
const normalizeLineEndings = (content) => content.replace(/\r\n/g, '\n');
const sha256 = (path) =>
  createHash('sha256').update(normalizeLineEndings(readFileSync(path, 'utf8')), 'utf8').digest('hex');

/** La procedencia versionada que hace auditable la copia que consume el CI. */
const readSourceMetadata = () => {
  const path = sourceMetadataPath();
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8'));
};

const sourceMetadataProblems = (specPath, cssPath) => {
  const metadata = readSourceMetadata();
  if (metadata === null) return [`falta ${SOURCE_METADATA_RELATIVE}`];

  const problems = [];
  if (!/^[0-9a-f]{40}$/.test(metadata.sourceCommit ?? '')) {
    problems.push('sourceCommit debe ser un SHA completo de 40 caracteres');
  }
  if (metadata.files?.designTokens?.sha256 !== sha256(specPath)) {
    problems.push('el hash de design-tokens.md no coincide con la copia versionada');
  }
  if (metadata.files?.canonicalCss?.sha256 !== sha256(cssPath)) {
    problems.push('el hash de tokens.css no coincide con la copia versionada');
  }
  if (
    metadata.lineEndings?.versionedCopy !== 'LF normalized during sync' ||
    metadata.lineEndings?.hash !== 'LF/CRLF normalized to LF before SHA-256' ||
    metadata.lineEndings?.parser !== 'LF/CRLF normalized by parser'
  ) {
    problems.push('falta la politica explicita de saltos de linea LF/CRLF');
  }
  return problems;
};

/** Quita acentos y pasa a snake_case, para derivar la clave TS de una tabla markdown. */
const toKey = (name) =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();

const isSeparatorRow = (line) => /^\|[\s:|-]+\|$/.test(line);
const isTableRow = (line) => line.trim().startsWith('|') && !isSeparatorRow(line);

/**
 * Un valor de token debe ser un valor CSS concreto. Las filas del spec que son
 * resúmenes ("regular 400 · medium 500 · bold 700", "escala base 4px: 4 · 8 · 12")
 * no son un token: describen un grupo. Esas las deja el `tokens.css` canonico.
 */
const isConcreteValue = (value) => {
  if (value.length === 0) return false;
  if (value.startsWith('—')) return false;
  // Lista de valores o prosa: la cubre el css canonico con nombres propios.
  if (/[·•|]/.test(value)) return false;
  if (/^(escala|base|ratificado|valor)/i.test(value)) return false;
  if (/\s{2,}/.test(value)) return false;
  return true;
};

/**
 * Quita la prosa que el spec anade entre parentesis al valor.
 * `system-ui, ... , sans-serif (rendimiento en conectividad baja)` → la familia sola.
 */
const stripProse = (value) => value.replace(/\s*\([^)]*\)\s*$/, '').trim();

/**
 * Normaliza un valor para que la comparacion entre fuentes sea estable.
 *
 * El spec markdown usa mayusculas en los hex (`#93370D`) y el `tokens.css`
 * canonico minusculas (`#93370d`). Son el mismo color, pero sin normalizar el
 * `tokens.css` generado heredaba la caja del spec y el shell, que compara
 * literales, fallaba. Se baja a minusculas porque es la convencion de CSS.
 */
const normalizeValue = (value) =>
  value.replace(/^#([0-9a-fA-F]{3,8})$/, (_, hex) => `#${hex.toLowerCase()}`);

/**
 * Parsea las tablas del spec markdown.
 * Devuelve `[{ cssVar, key, value }]` en el orden en que aparecen.
 */
export const parseSpec = (markdown) => {
  const lines = markdown.split(/\r?\n/);
  const found = new Map();
  const order = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!isTableRow(line)) continue;

    const cells = line
      .split('|')
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);
    if (cells.length < 2) continue;

    const nameCell = cells[0] ?? '';
    const valueCell = cells[1] ?? '';

    // Filas cuyo primer token es un nombre de token con forma `--x` o `color-x`.
    const named = nameCell.match(/`([a-z0-9-]+(?:\s*\/\s*[a-z0-9-]+)*)`/i);
    if (named === null) continue;

    const names = (named[1] ?? '').split('/').map((part) => part.trim());
    const value = stripProse(valueCell.replace(/`/g, '').trim());
    if (!isConcreteValue(value)) continue;

    for (const name of names) {
      const cssVar = name.startsWith('--') ? name : `--${name}`;
      if (found.has(cssVar)) continue;
      found.set(cssVar, {
        cssVar,
        key: toKey(name.replace(/^--/, '')),
        value: normalizeValue(value),
      });
      order.push(cssVar);
    }
  }

  return order.map((cssVar) => found.get(cssVar));
};

/**
 * Parsea el `tokens.css` canónico del mockup, que el spec declara como fuente de
 * los valores exactos (tipografía completa, escala de espaciado, sombras, layout).
 */
export const parseCanonicalCss = (css) => {
  const tokens = [];
  const seen = new Set();

  for (const line of css.split(/\r?\n/)) {
    const match = line.match(/^\s*(--[a-z0-9-]+)\s*:\s*(.+?);/);
    if (match === null) continue;

    const cssVar = match[1];
    const value = (match[2] ?? '').trim();
    if (seen.has(cssVar)) continue;
    seen.add(cssVar);
    tokens.push({ cssVar, key: toKey(cssVar.replace(/^--/, '')), value });
  }

  return tokens;
};

const BANNER = `/**
 * ARCHIVO GENERADO — NO EDITAR A MANO.
 *
 * Generado por \`npm run generate:tokens\` desde la fuente canonica
 * \`design-software-docs/12-ux-ui/mockup-ddd/design-tokens.md\` y su implementacion
 * canonica \`design-software-docs/12-ux-ui/mockup-ddd/mockups/app/assets/tokens.css\`.
 *
 * E1 de HU-SHELL-005 exige que estos tokens reflejen 1:1 el spec. Editarlos a mano
 * rompe esa garantia; el test \`src/tokens/tokens.test.ts\` falla si divergen.
 *
 * Edita la fuente y vuelve a correr el generador.
 */`;

const toTsLiteral = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const renderTs = (specTokens, cssTokens) => {
  const byKey = new Map();
  for (const token of [...specTokens, ...cssTokens]) {
    // El `tokens.css` canónico manda sobre el subconjunto del spec (asi lo declara el doc).
    if (!byKey.has(token.key)) byKey.set(token.key, token);
  }
  const ordered = [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key));

  const lines = [
    BANNER,
    '',
    'export const tokens = {',
  ];

  let group = '';
  for (const token of ordered) {
    const [head] = token.key.split('_');
    if (head !== group) {
      if (group !== '') lines.push('');
      group = head ?? '';
    }
    lines.push(`  ${token.key}: ${toTsLiteral(token.value)},`);
  }

  lines.push('} as const;');
  lines.push('');
  lines.push('export type TokenKey = keyof typeof tokens;');
  lines.push('');
  lines.push('export type TokenValue = (typeof tokens)[TokenKey];');
  lines.push('');

  return lines.join('\n');
};

const renderCss = (specTokens, cssTokens) => {
  const byVar = new Map();
  for (const token of [...cssTokens, ...specTokens]) {
    // Aqui el orden es el inverso: el spec manda sobre el css para no perder lo ratified.
    byVar.set(token.cssVar, token.value);
  }

  const lines = [
    '/*',
    ' * ARCHIVO GENERADO — NO EDITAR A MANO.',
    ' *',
    " * Generado por `npm run generate:tokens` desde design-tokens.md (spec ratificado) y",
    ' * design-software-docs/12-ux-ui/mockup-ddd/mockups/app/assets/tokens.css (implementacion canonica).',
    ' *',
    ' * Edita la fuente y vuelve a correr el generador.',
    ' */',
    '',
    ':root {',
  ];

  for (const [cssVar, value] of byVar) {
    lines.push(`  ${cssVar}: ${value};`);
  }

  lines.push('}');
  lines.push('');
  return lines.join('\n');
};

export const buildArtifacts = () => {
  const specPath = findSpec();
  const cssPath = findCanonicalCss();

  if (specPath === null) {
    throw new Error(
      `No se encontro la copia versionada del spec:\n` +
        `  ${join(REPO_ROOT, VENDORED_SPEC_RELATIVE)}\n\n` +
        'Restaura spec/design-tokens.md o ejecuta `npm run sync:spec` con design-software-docs disponible.',
    );
  }
  if (cssPath === null) {
    throw new Error(
      `No se encontro la copia versionada del CSS canonico:\n` +
        `  ${join(REPO_ROOT, VENDORED_CSS_RELATIVE)}\n\n` +
        'Restaura spec/tokens.css o ejecuta `npm run sync:spec` con design-software-docs disponible.',
    );
  }

  const specTokens = parseSpec(readFileSync(specPath, 'utf8'));
  const cssTokens = parseCanonicalCss(readFileSync(cssPath, 'utf8'));

  return {
    specPath,
    cssPath,
    specTokens,
    cssTokens,
    ts: renderTs(specTokens, cssTokens),
    css: renderCss(specTokens, cssTokens),
  };
};

const isMain = process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

/**
 * `sync:spec` — refresca la copia en `spec/` desde los repos de origen.
 *
 * Los repos son privados, asi que el CI no puede leerlos: la copia versionada es la
 * fuente del CI. Cuando el spec cambie arriba, alguien con acceso corre esto y
 * commit. El test de divergencia sigue detectando ediciones manuales de los tokens.
 */
const syncSpec = () => {
  const spec = locate(UPSTREAM_DOCS_CANDIDATES, UPSTREAM_SPEC_RELATIVE);
  const css = locate(UPSTREAM_DOCS_CANDIDATES, UPSTREAM_CSS_RELATIVE);

  if (spec === null || css === null) {
    console.error('Se necesitan las dos fuentes oficiales para actualizar spec/ sin dejar una copia parcial.');
    if (spec === null) console.error(`No se encontro el origen del spec: ${UPSTREAM_SPEC_RELATIVE}`);
    if (css === null) console.error(`No se encontro el origen del CSS: ${UPSTREAM_CSS_RELATIVE}`);
    console.error('Se necesita design-software-docs clonado como repositorio hermano.');
    process.exit(1);
  }

  const sources = [
    [spec, join(REPO_ROOT, VENDORED_SPEC_RELATIVE)],
    [css, join(REPO_ROOT, VENDORED_CSS_RELATIVE)],
  ];

  for (const [from, to] of sources) {
    writeFileSync(to, normalizeLineEndings(readFileSync(from, 'utf8')), 'utf8');
    console.log(`Actualizado ${to.replace(`${REPO_ROOT}${sep}`, '')} (LF normalizado)`);
  }

  const sourceDocsDir = UPSTREAM_DOCS_CANDIDATES.find(
    (base) => join(base, UPSTREAM_SPEC_RELATIVE) === spec && join(base, UPSTREAM_CSS_RELATIVE) === css,
  );
  if (sourceDocsDir === undefined) {
    throw new Error('No se pudo determinar el repositorio de la fuente UX sincronizada.');
  }
  // El checkout del workspace puede pertenecer a otro usuario de Windows. La
  // excepcion se limita a esta invocacion; nunca se altera la configuracion global.
  const sourceCommit = execFileSync(
    'git',
    ['-c', `safe.directory=${sourceDocsDir.replaceAll('\\', '/')}`, '-C', sourceDocsDir, 'rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  ).trim();
  const metadata = {
    sourceRepository: 'code-sena/design-software-docs',
    sourceCommit,
    files: {
      designTokens: { path: UPSTREAM_SPEC_RELATIVE.replaceAll('\\', '/'), sha256: sha256(spec) },
      canonicalCss: { path: UPSTREAM_CSS_RELATIVE.replaceAll('\\', '/'), sha256: sha256(css) },
    },
    lineEndings: {
      versionedCopy: 'LF normalized during sync',
      hash: 'LF/CRLF normalized to LF before SHA-256',
      parser: 'LF/CRLF normalized by parser',
    },
  };
  writeFileSync(sourceMetadataPath(), `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  console.log(`Registrada procedencia de ${metadata.sourceRepository}@${sourceCommit}.`);

  // Genera desde `spec/`, no directamente desde upstream, para que el resultado
  // sea exactamente el mismo que `check:tokens` verificará en CI.
  const { ts, css: generatedCss } = buildArtifacts();
  writeFileSync(TS_OUT, ts, 'utf8');
  writeFileSync(CSS_OUT, generatedCss, 'utf8');
  console.log('Regenerados src/tokens/tokens.generated.{ts,css}.');
};

if (isMain) {
  if (process.argv.includes('--sync-spec')) {
    syncSpec();
  } else {
    const { ts, css, specTokens, cssTokens, specPath, cssPath } = buildArtifacts();
    const check = process.argv.includes('--check');

    if (check) {
      const problems = [];
      for (const [path, expected] of [
        [TS_OUT, ts],
        [CSS_OUT, css],
      ]) {
        const current = existsSync(path) ? readFileSync(path, 'utf8') : '';
        if (current !== expected) problems.push(path);
      }

      if (problems.length > 0) {
        console.error('Los tokens generados estan desactualizados:');
        for (const path of problems) console.error(`  - ${path}`);
        console.error('\nCorre `npm run generate:tokens`.');
        process.exit(1);
      }

      const provenanceProblems = sourceMetadataProblems(specPath, cssPath);
      if (provenanceProblems.length > 0) {
        console.error('La procedencia de spec/ no es verificable:');
        for (const problem of provenanceProblems) console.error(`  - ${problem}`);
        console.error('\nCorre npm run sync:spec desde un workspace con design-software-docs.');
        process.exit(1);
      }

      console.log(`Tokens al dia (${specTokens.length} del spec, ${cssTokens.length} del css canonico).`);
    } else {
      writeFileSync(TS_OUT, ts, 'utf8');
      writeFileSync(CSS_OUT, css, 'utf8');
      console.log(
        `Generados tokens desde el spec (${specTokens.length}) y el css canonico (${cssTokens.length}).`,
      );
    }
  }
}
