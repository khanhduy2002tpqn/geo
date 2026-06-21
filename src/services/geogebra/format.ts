import type { ObjectInfo } from '@/types/geogebra';

/** Collapse whitespace; used to tidy value strings before speaking. */
export function tidy(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/**
 * Normalize a coordinate value for natural speech, e.g. "(2, 3)" stays
 * "(2, 3)" but stray spacing is cleaned. Returns empty string if not present.
 */
export function cleanCoordinates(value: string): string {
  const v = tidy(value);
  return v;
}

interface CircleParts {
  center?: string;
  radius?: string;
}

/**
 * Best-effort extraction of center/radius from a circle's command/definition,
 * e.g. "Circle(O, 5)" -> { center: "O", radius: "5" }.
 * A radius is only reported when the second argument is numeric.
 */
export function parseCircleParts(info: ObjectInfo): CircleParts {
  const source = info.command?.trim() || info.definition.trim();
  // Use a balanced-paren scan instead of a regex. The naive regex /\(([^)]*)\)/
  // stops at the FIRST ')' — it breaks for Circle((0,0), 3) because the
  // coordinate center contains its own closing paren.
  const inner = extractOutermostArgs(source);
  if (inner === null) return {};

  const args = splitTopLevel(inner);
  if (args.length === 0) return {};

  const center = args[0]?.trim();
  const second = args[1]?.trim();
  const radius = second && /^-?\d+(?:[.,]\d+)?$/.test(second) ? second : undefined;

  return { center: center || undefined, radius };
}

/**
 * Walk `source` to find the outermost balanced parentheses and return what is
 * inside them, e.g. "Circle((0,0), 3)" → "(0,0), 3".
 * Returns null if no balanced pair is found.
 */
function extractOutermostArgs(source: string): string | null {
  const start = source.indexOf('(');
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '(') depth++;
    else if (source[i] === ')') {
      depth--;
      if (depth === 0) return source.slice(start + 1, i);
    }
  }
  return null; // unbalanced parens
}

/** Split argument list on commas that are not nested inside brackets. */
function splitTopLevel(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim() !== '') parts.push(current);
  return parts;
}
