/**
 * Tiny server-side logger seam. Swap for pino/winston in production without
 * touching call sites. Intentionally not `console.log` (reserved for debugging).
 */
export const logger = {
  warn(message: string, context?: unknown): void {
    console.warn(`[geogebra] ${message}`, context ?? '');
  },
  error(message: string, error?: unknown): void {
    console.error(`[geogebra] ${message}`, error ?? '');
  },
};
