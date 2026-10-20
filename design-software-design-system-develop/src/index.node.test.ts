// @vitest-environment node
/**
 * Regression test for the package root contract: importing
 * `@sena/design-system` in Node must not evaluate browser-only code.
 */
import { describe, expect, it } from 'vitest';

import { color, tokens } from './index';

describe('root entrypoint in Node', () => {
  it('imports without browser globals', () => {
    expect(tokens.color_brand).toBeDefined();
    expect(color.brand).toBe(tokens.color_brand);
  });

  it('does not register custom elements', () => {
    expect((globalThis as { customElements?: unknown }).customElements).toBeUndefined();
  });
});
