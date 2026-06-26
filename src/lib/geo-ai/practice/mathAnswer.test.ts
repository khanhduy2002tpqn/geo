import { describe, expect, it } from 'vitest'
import { isEquivalentMathAnswer, normalizeMathAnswer } from './mathAnswer'

describe('math answer normalization', () => {
  it('accepts caret exponent for unicode squared answers', () => {
    expect(isEquivalentMathAnswer('6a^2', '6a²')).toBe(true)
    expect(isEquivalentMathAnswer('6a^{2}', '6a²')).toBe(true)
  })

  it('ignores common multiplication symbols and spaces', () => {
    expect(isEquivalentMathAnswer('6*a^2', '6a²')).toBe(true)
    expect(isEquivalentMathAnswer('6 × a²', '6a^2')).toBe(true)
    expect(isEquivalentMathAnswer('2 * (a + b) * h', '2(a+b)h')).toBe(true)
    expect(isEquivalentMathAnswer('2\\cdot(a+b)\\times h', '2(a+b)h')).toBe(true)
  })

  it('normalizes first-power variables', () => {
    expect(isEquivalentMathAnswer('a^1b', 'ab')).toBe(true)
    expect(isEquivalentMathAnswer('2a^1h', '2ah')).toBe(true)
  })

  it('keeps genuinely different formulas different', () => {
    expect(isEquivalentMathAnswer('4a^2', '6a²')).toBe(false)
    expect(isEquivalentMathAnswer('2(a+b)', '2(a+b)h')).toBe(false)
  })

  it('produces stable canonical strings', () => {
    expect(normalizeMathAnswer(' 6 × a^{2}. ')).toBe('6a^2')
    expect(normalizeMathAnswer('2 * (a + b) * h')).toBe('2(a+b)h')
  })
})
