/**
 * Verificacion reproducible de E2 — HU-SHELL-005.
 *
 * Ejecuta la misma politica sobre los nueve remotes y los dos hosts que viven
 * junto a este repositorio. Cada consumidor debe declarar la dependencia,
 * importar el puente CSS publicado y usar exclusivamente los tokens que este
 * paquete genera. No se permite declarar aliases ni variables CSS locales.
 *
 * Uso:
 *   node scripts/check-consumer-tokens.mjs
 *   node scripts/check-consumer-tokens.mjs --consumer web-shell
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WORKSPACE_ROOT = resolve(REPO_ROOT, '..');
const TOKENS_CSS = join(REPO_ROOT, 'src', 'tokens', 'tokens.generated.css');
const PACKAGE_NAME = '@sena/design-system';

/** Los consumidores definidos por ADR-009 y micro-frontends.md. */
const CONSUMERS = [
  { id: 'academic-management-mfe', repo: 'design-software-academic-management-mfe', entry: 'src/App.tsx' },
  { id: 'actors-mfe', repo: 'design-software-actors-mfe', entry: 'src/ui/App.tsx' },
  { id: 'audit-mfe', repo: 'design-software-audit-mfe', entry: 'src/App.tsx' },
  { id: 'document-mfe', repo: 'design-software-document-mfe', entry: 'src/App.tsx' },
  { id: 'iam-mfe', repo: 'design-software-iam-mfe', entry: 'src/App.tsx' },
  { id: 'monitoring-mfe', repo: 'design-software-monitoring-mfe', entry: 'src/App.tsx' },
  { id: 'reference-data-mfe', repo: 'design-software-reference-data-mfe', entry: 'src/App.tsx' },
  { id: 'scheduling-mfe', repo: 'design-software-scheduling-mfe', entry: 'src/App.tsx', bridge: 'src/styles/tokens.css' },
  { id: 'training-environment-mfe', repo: 'design-software-training-environment-mfe', entry: 'src/App.tsx' },
  { id: 'web-shell', repo: 'design-software-web-shell', entry: 'src/main.tsx', bridge: 'src/styles/tokens.css' },
  { id: 'mobile-shell', repo: 'design-software-mobile-shell', entry: 'src/bootstrap.tsx' },
];

const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const allCssFiles = (directory) => {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const name of readdirSync(directory)) {
    if (name === 'node_modules' || name === 'dist' || name === 'coverage') continue;
    const path = join(directory, name);
    if (statSync(path).isDirectory()) {
      files.push(...allCssFiles(path));
    } else if (name.endsWith('.css')) {
      files.push(path);
    }
  }
  return files;
};

const publishedTokens = () => {
  const source = readFileSync(TOKENS_CSS, 'utf8');
  const names = new Set();
  const values = new Set();

  for (const match of source.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*(.+?);$/gm)) {
    const [, name, value] = match;
    names.add(name);
    // mobile/tablet/desktop are responsive descriptors from the Markdown table,
    // not CSS values that a consumer can duplicate in a declaration.
    if (!['--mobile', '--tablet', '--desktop'].includes(name)) values.add(value.trim());
  }
  return { names, values };
};

const toFullHex = (value) => {
  const hex = value.toLowerCase();
  if (hex.length === 4) return `#${[...hex.slice(1)].map((part) => part + part).join('')}`;
  return hex;
};

const packageDependency = (packageJson) =>
  packageJson.dependencies?.[PACKAGE_NAME] ?? packageJson.devDependencies?.[PACKAGE_NAME];

const consumerBridge = (consumer) => consumer.bridge ?? 'src/design-system-tokens.css';

const checkConsumer = (consumer, { names, values }) => {
  const repoRoot = join(WORKSPACE_ROOT, consumer.repo);
  const label = consumer.repo;
  const problems = [];
  const rel = (path) => relative(WORKSPACE_ROOT, path).replaceAll('\\', '/');

  if (!existsSync(repoRoot)) {
    problems.push(`${label}: repositorio ausente en ${rel(repoRoot)}`);
    return problems;
  }

  const packagePath = join(repoRoot, 'package.json');
  if (!existsSync(packagePath)) {
    problems.push(`${label}: falta package.json`);
    return problems;
  }
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  const dependency = packageDependency(packageJson);
  if (dependency !== 'file:../design-software-design-system') {
    problems.push(
      `${label}: ${PACKAGE_NAME} debe declarar exactamente file:../design-software-design-system (actual: ${dependency ?? 'ausente'})`,
    );
  }

  const bridge = join(repoRoot, consumerBridge(consumer));
  if (!existsSync(bridge)) {
    problems.push(`${label}: falta el puente ${rel(bridge)}`);
  } else if (!/@import\s+['"]@sena\/design-system\/tokens\.css['"]\s*;/.test(readFileSync(bridge, 'utf8'))) {
    problems.push(`${label}: ${rel(bridge)} no importa ${PACKAGE_NAME}/tokens.css`);
  }

  const entry = join(repoRoot, consumer.entry);
  if (!existsSync(entry)) {
    problems.push(`${label}: falta el entrypoint de consumo ${rel(entry)}`);
  } else {
    const bridgeImport = consumerBridge(consumer).startsWith('src/styles/')
      ? "./styles/tokens.css"
      : consumer.entry.startsWith('src/ui/')
        ? "../design-system-tokens.css"
        : "./design-system-tokens.css";
    const entrySource = readFileSync(entry, 'utf8');
    if (!entrySource.includes(`'${bridgeImport}'`) && !entrySource.includes(`"${bridgeImport}"`)) {
      problems.push(`${label}: ${rel(entry)} no importa el puente ${bridgeImport}`);
    }
  }

  const canonicalHexes = new Set(
    [...values].filter((value) => /^#[0-9a-f]{6}$/i.test(value)).map(toFullHex),
  );
  const literalValues = [...values].filter((value) => !/^#[0-9a-f]{6}$/i.test(value));
  const literalMatchers = literalValues.map((value) => ({
    value,
    re: new RegExp(`(?<![a-z0-9.-])${escapeRegExp(value)}(?![a-z0-9.-])`, 'gi'),
  }));

  for (const cssPath of allCssFiles(join(repoRoot, 'src'))) {
    const source = stripComments(readFileSync(cssPath, 'utf8'));
    const where = (index) => `${rel(cssPath)}:${source.slice(0, index).split('\n').length}`;

    for (const match of source.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) {
      problems.push(`${where(match.index)} declara ${match[1]}; los consumidores no pueden definir tokens o aliases CSS`);
    }

    // Una sustitucion mecanica de un alias nunca debe poder dejar un valor como
    // nombre de propiedad (por ejemplo, `448px: 448px`).
    for (const match of source.matchAll(/^\s*\d[^:{]*:\s*/gim)) {
      problems.push(`${where(match.index)} contiene una declaracion CSS invalida`);
    }

    for (const match of source.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) {
      if (!names.has(match[1])) {
        problems.push(`${where(match.index)} usa ${match[1]}, que ${PACKAGE_NAME} no publica`);
      }
    }

    for (const match of source.matchAll(/var\(\s*(?!--)[^)]+\)/g)) {
      problems.push(`${where(match.index)} contiene var(...) sin un custom property publicado`);
    }

    for (const match of source.matchAll(/#[0-9a-f]{3,8}\b/gi)) {
      if (canonicalHexes.has(toFullHex(match[0]))) {
        problems.push(`${where(match.index)} duplica el color canonico ${match[0]}; usa var(--color-...)`);
      }
    }

    for (const { value, re } of literalMatchers) {
      for (const match of source.matchAll(re)) {
        problems.push(`${where(match.index)} duplica el valor canonico ${value}; usa el token publicado`);
      }
    }
  }

  return problems;
};

const selectedIds = (() => {
  const index = process.argv.indexOf('--consumer');
  return index === -1 ? null : [process.argv[index + 1]];
})();

const selected = selectedIds === null ? CONSUMERS : CONSUMERS.filter((consumer) => selectedIds.includes(consumer.id));
if (selected.length === 0) {
  console.error(`Consumidor desconocido. Valores validos: ${CONSUMERS.map(({ id }) => id).join(', ')}`);
  process.exit(1);
}

const allProblems = selected.flatMap((consumer) => checkConsumer(consumer, publishedTokens()));
if (allProblems.length > 0) {
  console.error('E2 no cumple el contrato de adopcion de tokens:\n');
  for (const problem of allProblems) console.error(`  - ${problem}`);
  console.error(`\nImporta ${PACKAGE_NAME}/tokens.css y usa solo sus nombres publicados.`);
  process.exit(1);
}

console.log(`E2 en verde: ${selected.length} consumidores importan ${PACKAGE_NAME} sin tokens locales, referencias inexistentes ni valores canonicos duplicados.`);
