# design-software-design-system

Paquete compartido de tokens y componentes visuales. Su núcleo es framework-agnóstico
(TS puro, sin React), conforme a ADR-009 §1.

## Estado actual

| Capa | Estado | HU |
|---|---|---|
| **Tokens** | ✅ Implementado | `HU-SHELL-005` |
| **Componentes base** | ✅ Implementado | `HU-SHELL-006` |

> `NotificationBell`, `NotificationPanel` y `OfflineBanner` **no** son alcance de HU-SHELL-006:
> la HU solo pide `RemoteUnavailable`, `LoadingRemote` y los primitivos. Siguen duplicados en el
> shell y quedan para una HU posterior.

## Componentes (HU-SHELL-006)

Son **Web Components** (Custom Elements), no componentes React. ADR-009 §1 exige que este
paquete sea framework-agnóstico, y un remote puede ser React hoy y otro framework mañana.

| Etiqueta | Cubre | HU |
|---|---|---|
| `<sena-remote-unavailable domain="iam">` | Pantalla de error de un remote | E1 |
| `<sena-loading-remote domain="iam">` | Estado de carga de un remote | E2 |
| `<sena-status-badge tone="success" label="Publicado">` | Badge de estado | E3 |
| `<sena-button variant="primary">` | Botón base | E3 |
| `<sena-field label="Correo" error="...">` | Campo de formulario | E3 |

### Registrar

```ts
import '@sena/design-system/components';
```

Cada componente se autoregistra al importarse. El import es **explícito** y no ocurre en el
entrypoint principal, para que importar los tokens en un test de Node no toque
`customElements`.

### Usar desde React

Como JSX no conoce los intrinsic elements, hay que declararlos una vez:

```tsx
// src/vite-env.d.ts
import type { SenaButton, SenaField, LoadingRemote, RemoteUnavailable, StatusBadge } from '@sena/design-system/components';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'sena-button': React.DetailedHTMLProps<React.HTMLAttributes<SenaButton>, SenaButton> & { variant?: string };
      'sena-field': React.DetailedHTMLProps<React.HTMLAttributes<SenaField>, SenaField> & { label: string; error?: string };
      'sena-loading-remote': React.DetailedHTMLProps<React.HTMLAttributes<LoadingRemote>, LoadingRemote>;
      'sena-remote-unavailable': React.DetailedHTMLProps<React.HTMLAttributes<RemoteUnavailable>, RemoteUnavailable>;
      'sena-status-badge': React.DetailedHTMLProps<React.HTMLAttributes<StatusBadge>, StatusBadge> & { tone?: string; label: string };
    }
  }
}
```

### Contratos

| Componente | Atributos | Evento |
|---|---|---|
| `sena-remote-unavailable` | `domain` (req.), `reason`, `retry-label` | `sena-retry` al pulsar Reintentar |
| `sena-loading-remote` | `domain` (opc.), `label` | — |
| `sena-status-badge` | `tone`, `label` (req.), `icon` | — |
| `sena-button` | `variant`, `disabled`, `type` | — (envuelve un `<button>` nativo) |
| `sena-field` | `label` (req.), `help`, `error`, `required`, `id` | — (el control va en light DOM) |

`domain` en `sena-remote-unavailable` es obligatorio. Si falta, el componente
**no inventa** un dominio (`remote`), muestra que el dato no se informó y deja el
reintento deshabilitado; no emite `sena-retry` sin un dominio válido.
En `sena-loading-remote` es opcional (API mínima de la HU): sin dominio muestra
"Cargando contenido".

`sena-field` estiliza con tokens el control nativo deshabilitado
(`<input disabled>`, `<select disabled>`, `<textarea disabled>`). El estado vive
en el control del light DOM, no se duplica en el host.

`tone` es el contrato público del badge: `success | info | warning | danger | neutral | unknown`.
Un valor desconocido cae en `unknown`, nunca rompe el render.

### E4: nada de valores literales

Ningún componente hardcodea un color ni un espaciado: todo sale de `var(--token)`. El CI lo
verifica:

```bash
npm run check:no-hardcode
```

El script falla ante un color literal, una medida literal, o un `var(--x)` que apunte a un
token que el design-system no publica.

### Accesibilidad

- `sena-loading-remote`: `role="status"` + `aria-live="polite"`.
- `sena-remote-unavailable`: `role="alert"`; el error se anuncia al aparecer.
- `sena-status-badge`: siempre **color + icono + texto**, nunca solo color (lo exige el spec).
  Un tono desconocido se dibuja con borde punteado para que no se lea como "un estado más".
- `sena-button` y `sena-field`: área táctil de `44px`, derivada de la escala canónica de espaciado, y `:focus-visible`.
- `prefers-reduced-motion` respetado en los dos componentes con animación.

## Tokens

The canonical CSS source has 52 published CSS custom properties. The typed TypeScript object has 55 keys: those same 52 plus `mobile`, `tablet`, and `desktop`, which are responsive descriptors from the Markdown spec rather than CSS value tokens.

### Fuente canónica

```text
design-software-docs/12-ux-ui/mockup-ddd/design-tokens.md   ← fuente UX aceptada y locked para el mockup (WCAG AA)
design-software-docs/12-ux-ui/mockup-ddd/mockups/app/assets/tokens.css
                                                               ← implementación canónica de valores
```

Ambos son **solo lectura**: este repo no los modifica.

Los valores están bloqueados para mantener consistente el mockup y la fuente está aceptada para
ese uso. La ratificación formal del lineamiento de marca SENA continúa pendiente, tal como
indica `design-tokens.md`; si se oficializa un cambio de color o tipografía, se sincroniza y se
regeneran los artefactos.

Los repos son privados y el `GITHUB_TOKEN` de GitHub Actions no puede leerlos, así que
`spec/` guarda una **copia versionada** de los dos. Esa copia es lo que usa el CI.

| | Repos de origen | Copia del CI |
|---|---|---|
| Spec | `design-software-docs/12-ux-ui/mockup-ddd/design-tokens.md` | `spec/design-tokens.md` |
| Tokens canónicos | `design-software-docs/12-ux-ui/mockup-ddd/mockups/app/assets/tokens.css` | `spec/tokens.css` |

The current vendored source is `code-sena/design-software-docs` commit
`e1d9b06a8710f97b7f5361b46af98a6ba257ca39`. `spec/source-metadata.json` stores that exact
commit and SHA-256 of both copied files. `npm run check:tokens` fails if either file no longer
matches its recorded hash. Synchronization normalizes the versioned copy to LF, and SHA-256 is
calculated after LF/CRLF normalization to LF. The parser also accepts both formats with
`split(/\\r?\\n/)`; this makes provenance deterministic in Windows and Ubuntu CI while preserving
the exact source commit and logical source content.

### Refrescar la copia

```bash
npm run sync:spec    # actualiza spec/ desde el repo hermano y regenera los artefactos
```

Requiere `design-software-docs` clonado junto a este repo.
**Hay que correrlo cuando el spec cambie arriba**, y commitear el resultado: el CI no
detecta esa deriva por sí solo.

### Generar

```bash
npm run generate:tokens   # regenera desde las copias versionadas en spec/
npm run check:tokens      # valida spec/ y falla si los artefactos generados están desactualizados (CI)
```

**Los archivos `tokens.generated.*` no se editan a mano.** Se edita la fuente y se regenera.

### Consumir

```ts
import { color, space, radius, tokens } from '@sena/design-system';

color.brand;        // '#007832'
space[4];           // '16px'
radius.md;          // '10px'
tokens.color_brand; // '#007832'
```

En CSS:

```css
@import '@sena/design-system/tokens.css';

.miClase {
  color: var(--color-brand);
  padding: var(--space-4);
}
```

### Tipado estricto (E3)

Los tokens se exportan como unión de literales, no como `Record<string, string>`. Un nombre
mal escrito **falla en `tsc`**, no en runtime:

```ts
tokens.color_brnad   // ❌ error de compilación
tokens.color_brand    // ✅
```

### Estados de negocio

`businessState` expone los cuatro estados del catálogo con su color y superficie:

| Estado | Color | Superficie |
|---|---|---|
| `BORRADOR` | `color-text-muted` | `color-surface-muted` |
| `EN_REVISION` | `color-warning` | `color-warning-surface` |
| `PUBLICADO` | `color-success` | `color-success-surface` |
| `CONFLICTO` | `color-conflict` | `color-danger-surface` |

La UI **no debe hardcodear la lista**: viene del catálogo parametrizable `status` de
backend. Aquí está solo la representación visual. El spec exige siempre
**color + icono + texto**, nunca solo color.

## Scripts

```bash
npm run generate:tokens   # regenera los tokens desde spec/
npm run check:tokens      # valida spec/ y verifica que los artefactos no estén desactualizados
npm run check:no-hardcode # E4: ningún componente con color/espaciado literal
npm run sync:spec         # refresca spec/ desde los repos de origen
npm run typecheck
npm test                  # incluye el test de divergencia contra el spec
npm run lint
npm run verify            # todo lo anterior, en orden
```

## E2: consumer adoption validation

HU-SHELL-005 now validates the nine remotes and both hosts in the workspace. Each consumer
declares `@sena/design-system` through the local published package, imports its CSS bridge from
its federated entrypoint, and exposes a `check:tokens` script. The shared verifier is executed
from this repository:

```bash
npm run check:consumers
```

It fails if any registered consumer is absent, has no real dependency or bridge import, declares
a local CSS custom property/alias, references an unpublished `var(--token)`, or duplicates a
published canonical color, size, radius, shadow, type scale, z-index, or layout value. Run the
same check in one consumer with `npm run check:tokens`.

The verifier intentionally lists the 11 consumers from ADR-009 and `micro-frontends.md`; adding
a new host or remote requires updating the verifier in the same change. This is E2 evidence for
the current workspace snapshot, not a claim about arbitrary branches that have not run the check.

## Deuda

- **Falta acceso al spec privado desde el CI**, para automatizar la detección de deriva
  upstream. No hay un workflow de deriva activo: sin una credencial de solo lectura para
  `design-software-docs`, activarlo produciría un check fallido. Mientras se define esa
  credencial, `npm run sync:spec` mantiene la copia versionada y `npm run check:tokens`
  verifica los artefactos generados a partir de ella.

  La fuente UX se mantiene en `design-software-docs`; la copia vendorizada permite que el CI
  valide los artefactos generados cuando el repositorio fuente no está disponible.

  Un PAT fine-grained **no** se puede scoped a `code-sena` desde una cuenta que no es
  miembro de la organización: GitHub solo ofrece en *Resource owner* las orgs con
  fine-grained PATs habilitado. Alternativas a decidir con arquitectura: deploy key SSH
  de solo lectura (recomendado), PAT clásico de scope `repo`, o publicar la fuente UX aceptada.

  Paso a paso completo: **`DEUDA-spec-repo-access.md`** (raíz de `Propuesta-arquitectura-front`).

- **La validación E2 es de workspace:** `npm run check:consumers` inspecciona los 11 consumidores
  registrados en este checkout. Cada consumidor también publica `npm run check:tokens`; sus HUs
  posteriores pueden ampliar la adopción, pero no deben reintroducir tokens locales.
- `mockup-ddd/design-tokens.md` marca pendientes la ratificación oficial de marca SENA. Si
  cambia el verde o la tipografía, hay que correr `npm run sync:spec` y regenerar.
