/**
 * ARCHIVO GENERADO — NO EDITAR A MANO.
 *
 * Generado por `npm run generate:tokens` desde la fuente canonica
 * `design-software-docs/12-ux-ui/mockup-ddd/design-tokens.md` y su implementacion
 * canonica `design-software-docs/12-ux-ui/mockup-ddd/mockups/app/assets/tokens.css`.
 *
 * E1 de HU-SHELL-005 exige que estos tokens reflejen 1:1 el spec. Editarlos a mano
 * rompe esa garantia; el test `src/tokens/tokens.test.ts` falla si divergen.
 *
 * Edita la fuente y vuelve a correr el generador.
 */

export const tokens = {
  color_background: '#ffffff',
  color_border: '#eaecf0',
  color_brand: '#007832',
  color_brand_hover: '#00652b',
  color_brand_soft: '#ecf7f0',
  color_conflict: '#b42318',
  color_danger: '#b42318',
  color_danger_surface: '#fef3f2',
  color_info: '#175cd3',
  color_info_surface: '#eff8ff',
  color_success: '#067647',
  color_success_surface: '#ecfdf3',
  color_surface: '#ffffff',
  color_surface_muted: '#f2f4f7',
  color_text: '#101828',
  color_text_muted: '#475467',
  color_warning: '#93370d',
  color_warning_surface: '#fffaeb',

  desktop: '> 1024px',

  font_family_base: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  font_size_2xl: '24px',
  font_size_3xl: '30px',
  font_size_lg: '18px',
  font_size_md: '16px',
  font_size_sm: '14px',
  font_size_xl: '20px',
  font_size_xs: '12px',
  font_weight_bold: '700',
  font_weight_medium: '500',
  font_weight_regular: '400',

  line_height_normal: '1.5',
  line_height_relaxed: '1.7',
  line_height_tight: '1.25',

  mobile: '< 768px',

  radius_lg: '16px',
  radius_md: '10px',
  radius_sm: '6px',

  shadow_md: '0 4px 8px rgba(16, 24, 40, .08)',
  shadow_sm: '0 1px 2px rgba(16, 24, 40, .06)',

  sidebar_collapsed_width: '76px',
  sidebar_width: '264px',

  space_1: '4px',
  space_2: '8px',
  space_3: '12px',
  space_4: '16px',
  space_5: '24px',
  space_6: '32px',
  space_7: '40px',
  space_8: '48px',

  tablet: '768–1024px',

  topbar_height: '72px',

  z_dropdown: '1000',
  z_modal: '1020',
  z_overlay: '1010',
  z_toast: '1030',
} as const;

export type TokenKey = keyof typeof tokens;

export type TokenValue = (typeof tokens)[TokenKey];
