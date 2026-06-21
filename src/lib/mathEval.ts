/**
 * Safe arithmetic expression evaluator for exercise solution steps.
 *
 * Recursive descent parser — no eval(), no new Function(), CSP-safe.
 * Supports: + - * / ^ (power)  sqrt(...)  pi  parentheses  decimals
 * Returns null on invalid input, division by zero, or parse error.
 */

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type OpChar = '+' | '-' | '*' | '/' | '^';

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'op';  value: OpChar }
  | { kind: 'lparen' }
  | { kind: 'rparen' }
  | { kind: 'ident'; value: string };

function tokenize(src: string): Token[] | null {
  const out: Token[] = [];
  let i = 0;

  while (i < src.length) {
    const ch = src[i]!;
    if (/\s/.test(ch)) { i++; continue; }

    if (/\d/.test(ch) || (ch === '.' && /\d/.test(src[i + 1] ?? ''))) {
      let raw = '';
      while (i < src.length && /[\d.]/.test(src[i]!)) raw += src[i++]!;
      const v = parseFloat(raw);
      if (isNaN(v)) return null;
      out.push({ kind: 'num', value: v });
      continue;
    }

    if (/[a-z]/i.test(ch)) {
      let id = '';
      while (i < src.length && /[a-z]/i.test(src[i]!)) id += src[i++]!;
      out.push({ kind: 'ident', value: id.toLowerCase() });
      continue;
    }

    if (ch === '(') { out.push({ kind: 'lparen' });     i++; continue; }
    if (ch === ')') { out.push({ kind: 'rparen' });     i++; continue; }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^') {
      out.push({ kind: 'op', value: ch as OpChar });     i++; continue;
    }

    return null; // unknown character — reject
  }

  return out;
}

// ---------------------------------------------------------------------------
// Recursive descent parser
//
// Grammar (standard precedence, low→high):
//   expr    := term    ( ('+' | '-') term )*
//   term    := unary   ( ('*' | '/') unary )*
//   unary   := '-' unary | power
//   power   := primary ( '^' unary )*   right-associative; RHS via unary allows -2 exponent
//   primary := NUMBER | 'pi' | 'sqrt' '(' expr ')' | '(' expr ')'
// ---------------------------------------------------------------------------

interface State { tokens: Token[]; pos: number }

const peek  = (s: State): Token | undefined => s.tokens[s.pos];
const next  = (s: State): Token | undefined => s.tokens[s.pos++];

function parseExpr(s: State): number | null {
  let v = parseTerm(s);
  if (v === null) return null;

  for (;;) {
    const t = peek(s);
    if (t?.kind !== 'op' || (t.value !== '+' && t.value !== '-')) break;
    next(s);
    const r = parseTerm(s);
    if (r === null) return null;
    v = t.value === '+' ? v + r : v - r;
  }
  return v;
}

function parseTerm(s: State): number | null {
  let v = parseUnary(s);
  if (v === null) return null;

  for (;;) {
    const t = peek(s);
    if (t?.kind !== 'op' || (t.value !== '*' && t.value !== '/')) break;
    next(s);
    const r = parseUnary(s);
    if (r === null) return null;
    if (t.value === '/' && r === 0) return null; // division by zero
    v = t.value === '*' ? v * r : v / r;
  }
  return v;
}

// parsePower uses parsePrimary as base so that unary minus binds LESS tightly
// than exponentiation: -2^2 = -(2^2) = -4, not (-2)^2 = 4.
// RHS uses parseUnary so that negative exponents (2^-3) are valid.
function parsePower(s: State): number | null {
  const base = parsePrimary(s);
  if (base === null) return null;

  const t = peek(s);
  if (t?.kind === 'op' && t.value === '^') {
    next(s);
    const exp = parseUnary(s); // parseUnary allows negative exponent; right-assoc via unary→power chain
    if (exp === null) return null;
    return Math.pow(base, exp);
  }
  return base;
}

function parseUnary(s: State): number | null {
  const t = peek(s);
  if (t?.kind === 'op' && t.value === '-') {
    next(s);
    const v = parseUnary(s);
    return v === null ? null : -v;
  }
  return parsePower(s);
}

function parsePrimary(s: State): number | null {
  const t = peek(s);
  if (!t) return null;

  if (t.kind === 'num') { next(s); return t.value; }

  if (t.kind === 'ident') {
    next(s);
    if (t.value === 'pi') return Math.PI;

    if (t.value === 'sqrt') {
      if (peek(s)?.kind !== 'lparen') return null;
      next(s);
      const arg = parseExpr(s);
      if (arg === null || arg < 0) return null;
      if (peek(s)?.kind !== 'rparen') return null;
      next(s);
      return Math.sqrt(arg);
    }

    return null; // unknown identifier
  }

  if (t.kind === 'lparen') {
    next(s);
    const v = parseExpr(s);
    if (v === null) return null;
    if (peek(s)?.kind !== 'rparen') return null;
    next(s);
    return v;
  }

  return null;
}

// ---------------------------------------------------------------------------
// LaTeX emitter — same tokenizer/State, emits LaTeX strings instead of numbers
// ---------------------------------------------------------------------------

function numToken(n: number): string {
  return Number.isInteger(n) ? String(n) : String(n);
}

function parsePrimaryLatex(s: State): string | null {
  const t = peek(s);
  if (!t) return null;

  if (t.kind === 'num') { next(s); return numToken(t.value); }

  if (t.kind === 'ident') {
    next(s);
    if (t.value === 'pi') return '\\pi';

    if (t.value === 'sqrt') {
      if (peek(s)?.kind !== 'lparen') return null;
      next(s);
      const arg = parseExprLatex(s);
      if (!arg) return null;
      if (peek(s)?.kind !== 'rparen') return null;
      next(s);
      return `\\sqrt{${arg}}`;
    }

    return null;
  }

  if (t.kind === 'lparen') {
    next(s);
    const inner = parseExprLatex(s);
    if (!inner) return null;
    if (peek(s)?.kind !== 'rparen') return null;
    next(s);
    // Omit wrapping parens for bare fractions: (1/2) → \frac{1}{2}
    if (inner.startsWith('\\frac{')) return inner;
    return `\\left(${inner}\\right)`;
  }

  return null;
}

function parsePowerLatex(s: State): string | null {
  const base = parsePrimaryLatex(s);
  if (!base) return null;

  const t = peek(s);
  if (t?.kind === 'op' && t.value === '^') {
    next(s);
    const exp = parseUnaryLatex(s);
    if (!exp) return null;
    return `${base}^{${exp}}`;
  }
  return base;
}

function parseUnaryLatex(s: State): string | null {
  const t = peek(s);
  if (t?.kind === 'op' && t.value === '-') {
    next(s);
    const v = parseUnaryLatex(s);
    return v ? `-${v}` : null;
  }
  return parsePowerLatex(s);
}

function parseTermLatex(s: State): string | null {
  let v = parseUnaryLatex(s);
  if (!v) return null;

  for (;;) {
    const t = peek(s);
    if (t?.kind !== 'op' || (t.value !== '*' && t.value !== '/')) break;
    next(s);
    const r = parseUnaryLatex(s);
    if (!r) return null;

    if (t.value === '*') {
      v = `${v} \\times ${r}`;
    } else {
      v = `\\frac{${v}}{${r}}`;
    }
  }
  return v;
}

function parseExprLatex(s: State): string | null {
  let v = parseTermLatex(s);
  if (!v) return null;

  for (;;) {
    const t = peek(s);
    if (t?.kind !== 'op' || (t.value !== '+' && t.value !== '-')) break;
    next(s);
    const r = parseTermLatex(s);
    if (!r) return null;
    v = t.value === '+' ? `${v} + ${r}` : `${v} - ${r}`;
  }
  return v;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function evalExpr(expr: string): number | null {
  if (typeof expr !== 'string' || !expr.trim()) return null;

  const tokens = tokenize(expr.trim());
  if (!tokens) return null;

  const s: State = { tokens, pos: 0 };
  const result = parseExpr(s);

  if (s.pos !== s.tokens.length) return null; // unconsumed trailing tokens
  if (result === null || !isFinite(result) || isNaN(result)) return null;

  return parseFloat(result.toPrecision(10));
}

/** Format a computed number: trim trailing decimal zeros. */
export function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(4)).toString();
}

/**
 * Convert a JS arithmetic expression string to a LaTeX string.
 * Returns null if the expression cannot be parsed.
 * Examples:
 *   "(1/2) * 4 * 4"    →  "\frac{1}{2} \times 4 \times 4"
 *   "sqrt(3^2 + 4^2)"  →  "\sqrt{3^{2} + 4^{2}}"
 *   "pi * r^2"         →  "\pi \times r^{2}"
 */
export function toLaTeX(expr: string): string | null {
  if (typeof expr !== 'string' || !expr.trim()) return null;

  const tokens = tokenize(expr.trim());
  if (!tokens) return null;

  const s: State = { tokens, pos: 0 };
  const result = parseExprLatex(s);

  if (s.pos !== s.tokens.length) return null;
  return result;
}
