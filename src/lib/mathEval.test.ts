import { describe, expect, it } from 'vitest';
import { evalExpr, formatNumber, toLaTeX } from './mathEval';

describe('evalExpr', () => {
  it('basic arithmetic', () => {
    expect(evalExpr('1 + 2')).toBe(3);
    expect(evalExpr('10 - 3')).toBe(7);
    expect(evalExpr('4 * 5')).toBe(20);
    expect(evalExpr('10 / 4')).toBe(2.5);
  });

  it('order of operations', () => {
    expect(evalExpr('2 + 3 * 4')).toBe(14);
    expect(evalExpr('(2 + 3) * 4')).toBe(20);
    expect(evalExpr('10 - 2 * 3')).toBe(4);
  });

  it('power operator', () => {
    expect(evalExpr('2 ^ 3')).toBe(8);
    expect(evalExpr('3 ^ 2')).toBe(9);
    expect(evalExpr('2 ^ 3 ^ 2')).toBe(512); // right-associative: 2^(3^2) = 2^9
    expect(evalExpr('2 ^ -1')).toBeCloseTo(0.5, 5); // negative exponent
  });

  it('sqrt', () => {
    expect(evalExpr('sqrt(9)')).toBe(3);
    expect(evalExpr('sqrt(16)')).toBe(4);
    expect(evalExpr('sqrt(2)')).toBeCloseTo(1.4142, 4);
  });

  it('pi', () => {
    expect(evalExpr('pi')).toBeCloseTo(Math.PI, 8);
  });

  it('fraction formula', () => {
    expect(evalExpr('(1/2) * 4 * 4')).toBe(8);
    expect(evalExpr('(1/2) * 3 * 4')).toBe(6);
  });

  it('negative unary', () => {
    expect(evalExpr('-5 + 3')).toBe(-2);
    expect(evalExpr('-(3 + 2)')).toBe(-5);
    // unary minus has lower precedence than ^ : -2^2 = -(2^2) = -4, not (-2)^2 = 4
    expect(evalExpr('-2^2')).toBe(-4);
  });

  it('nested parentheses', () => {
    expect(evalExpr('((2 + 3) * (4 - 1))')).toBe(15);
  });

  it('decimal numbers', () => {
    expect(evalExpr('1.5 * 2')).toBe(3);
    expect(evalExpr('0.5 * 10')).toBe(5);
  });

  it('division by zero → null', () => {
    expect(evalExpr('1 / 0')).toBeNull();
    expect(evalExpr('5 / (3 - 3)')).toBeNull();
  });

  it('sqrt of negative → null', () => {
    expect(evalExpr('sqrt(-4)')).toBeNull();
  });

  it('invalid input → null', () => {
    expect(evalExpr('')).toBeNull();
    expect(evalExpr('abc')).toBeNull();
    expect(evalExpr('1 +')).toBeNull();
    expect(evalExpr('(1 + 2')).toBeNull();
    expect(evalExpr('1 + 2)')).toBeNull();
  });

  it('ignores whitespace', () => {
    expect(evalExpr('  3  *  4  ')).toBe(12);
  });
});

describe('formatNumber', () => {
  it('integer stays integer', () => {
    expect(formatNumber(8)).toBe('8');
    expect(formatNumber(0)).toBe('0');
  });

  it('decimal trimmed', () => {
    expect(formatNumber(1.5)).toBe('1.5');
    expect(formatNumber(1.2500)).toBe('1.25');
  });
});

describe('toLaTeX', () => {
  it('fraction in parens', () => {
    expect(toLaTeX('(1/2) * 4 * 4')).toBe('\\frac{1}{2} \\times 4 \\times 4');
  });

  it('multiplication', () => {
    expect(toLaTeX('3 * 4')).toBe('3 \\times 4');
  });

  it('power', () => {
    expect(toLaTeX('3^2')).toBe('3^{2}');
    expect(toLaTeX('x^2 + y^2')).toBeNull(); // x,y are unknown idents
  });

  it('sqrt', () => {
    expect(toLaTeX('sqrt(9)')).toBe('\\sqrt{9}');
    expect(toLaTeX('sqrt(3^2 + 4^2)')).toBe('\\sqrt{3^{2} + 4^{2}}');
  });

  it('pi', () => {
    expect(toLaTeX('pi')).toBe('\\pi');
  });

  it('complex expression', () => {
    expect(toLaTeX('(1/3) * 8 * 5')).toBe('\\frac{1}{3} \\times 8 \\times 5');
  });

  it('division becomes frac', () => {
    expect(toLaTeX('1/2')).toBe('\\frac{1}{2}');
  });

  it('invalid input → null', () => {
    expect(toLaTeX('')).toBeNull();
    expect(toLaTeX('1 +')).toBeNull();
  });
});
