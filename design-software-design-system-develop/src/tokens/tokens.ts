import { tokens } from './tokens.generated';

export { tokens };
export type { TokenKey, TokenValue } from './tokens.generated';

/**
 * E3 de HU-SHELL-005: los tokens se exportan tipados, no como `Record<string, string>`.
 *
 * Un nombre equivocado falla en `tsc`, no en runtime:
 *
 * ```ts
 * tokens.color_brnad   // ❌ error de compilacion
 * tokens.color_brand    // ✅
 * ```
 *
 * Los valores vienen de `design-tokens.md`, verificados WCAG AA en el spec.
 */

/** Grupo de color del spec, para consumo semántico. */
export const color = {
  brand: tokens.color_brand,
  brandHover: tokens.color_brand_hover,
  brandSoft: tokens.color_brand_soft,
  background: tokens.color_background,
  surface: tokens.color_surface,
  surfaceMuted: tokens.color_surface_muted,
  text: tokens.color_text,
  textMuted: tokens.color_text_muted,
  border: tokens.color_border,
  danger: tokens.color_danger,
  dangerSurface: tokens.color_danger_surface,
  conflict: tokens.color_conflict,
  warning: tokens.color_warning,
  warningSurface: tokens.color_warning_surface,
  success: tokens.color_success,
  successSurface: tokens.color_success_surface,
  info: tokens.color_info,
  infoSurface: tokens.color_info_surface,
} as const;

/**
 * Estados de negocio. El spec exige color + icono + texto, nunca solo color.
 *
 * | Estado | Color | Superficie |
 * |---|---|---|
 * | BORRADOR | `color-text-muted` | `color-surface-muted` |
 * | EN_REVISIÓN | `color-warning` | `color-warning-surface` |
 * | PUBLICADO | `color-success` | `color-success-surface` |
 * | CONFLICTO | `color-conflict` | `color-danger-surface` |
 *
 * Nota: la lista de estados viene del catálogo parametrizable `status` de backend.
 * Aquí está solo la representación visual; la UI no debe hardcodearla.
 */
export const businessState = {
  BORRADOR: { color: color.textMuted, surface: color.surfaceMuted },
  EN_REVISION: { color: color.warning, surface: color.warningSurface },
  PUBLICADO: { color: color.success, surface: color.successSurface },
  CONFLICTO: { color: color.conflict, surface: color.dangerSurface },
} as const;

export type BusinessStateKey = keyof typeof businessState;

export const typography = {
  fontFamilyBase: tokens.font_family_base,
  sizeXs: tokens.font_size_xs,
  sizeSm: tokens.font_size_sm,
  sizeMd: tokens.font_size_md,
  sizeLg: tokens.font_size_lg,
  sizeXl: tokens.font_size_xl,
  size2xl: tokens.font_size_2xl,
  size3xl: tokens.font_size_3xl,
  weightRegular: tokens.font_weight_regular,
  weightMedium: tokens.font_weight_medium,
  weightBold: tokens.font_weight_bold,
  lineHeightTight: tokens.line_height_tight,
  lineHeightNormal: tokens.line_height_normal,
  lineHeightRelaxed: tokens.line_height_relaxed,
} as const;

/**
 * Escala de espaciado del spec: base 4px, `space-1…8` = 4 · 8 · 12 · 16 · 24 · 32 · 40 · 48.
 *
 * Los consumidores deben usar estos nombres canónicos: los MFEs no declaran
 * escalas, aliases ni tokens propios fuera de este design-system (E2).
 */
export const space = {
  1: tokens.space_1,
  2: tokens.space_2,
  3: tokens.space_3,
  4: tokens.space_4,
  5: tokens.space_5,
  6: tokens.space_6,
  7: tokens.space_7,
  8: tokens.space_8,
} as const;

export const radius = {
  sm: tokens.radius_sm,
  md: tokens.radius_md,
  lg: tokens.radius_lg,
} as const;

export const shadow = {
  sm: tokens.shadow_sm,
  md: tokens.shadow_md,
} as const;

export const zIndex = {
  dropdown: tokens.z_dropdown,
  overlay: tokens.z_overlay,
  modal: tokens.z_modal,
  toast: tokens.z_toast,
} as const;

/** Breakpoints del spec. En CSS se usan como media queries. */
export const breakpoints = {
  mobile: 768,
  tablet: 1024,
} as const;
