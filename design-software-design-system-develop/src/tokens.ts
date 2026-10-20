/**
 * Public typed-token entrypoint for HU-SHELL-005.
 *
 * The implementation remains organized under `src/tokens/`; this facade keeps
 * the public API at `src/tokens.ts` and preserves literal token names.
 */
export { tokens } from './tokens/tokens';
export type { TokenKey, TokenValue, BusinessStateKey } from './tokens/tokens';
export {
  color,
  typography,
  space,
  radius,
  shadow,
  zIndex,
  breakpoints,
  businessState,
} from './tokens/tokens';
