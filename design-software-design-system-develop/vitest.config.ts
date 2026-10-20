import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Los componentes de HU-SHELL-006 son Web Components: `HTMLElement`,
    // `customElements` y `attachShadow` solo existen en un DOM. Los tokens, en
    // cambio, son datos puros y se testean sin DOM; cada archivo elige con
    // `@vitest-environment` o con el entorno por defecto.
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});