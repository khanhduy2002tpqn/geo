import type { GeoGebraApi } from '@/types/ggb';
import { logger } from '@/lib/logger';

/**
 * A sample construction that exercises every explanation path: simple objects
 * (point, circle, line, segment), concept points (midpoint, intersection,
 * vertex), and functions (simple + quadratic).
 *
 * Built at runtime via evalCommand instead of shipping a binary .ggb — this is
 * versionable, reviewable, and easy to extend. To use a real .ggb instead, drop
 * it in /public and pass `filename` / `ggbBase64` to the applet parameters.
 *
 * Each command runs independently so one unsupported command never aborts the
 * rest of the construction.
 */
const SAMPLE_COMMANDS: readonly string[] = [
  'O=(0,0)',
  'A=(2,3)',
  'B=(6,1)',
  'c=Circle(O,3)',
  'd=Line(A,B)',
  's=Segment(A,B)',
  'M=Midpoint(A,B)',
  'P=Intersect(c,d)',
  'f(x)=x^2-4',
  'g(x)=0.5x+2',
  'p1=Parabola((0,2),y=0)',
  'V=Vertex(p1)',
];

export function seedConstruction(api: GeoGebraApi): void {
  for (const command of SAMPLE_COMMANDS) {
    const ok = api.evalCommand(command);
    if (!ok) {
      logger.warn(`seedConstruction: command failed "${command}"`);
    }
  }
}
