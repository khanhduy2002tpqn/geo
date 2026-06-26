import { describe, expect, it } from 'vitest'
import { isMatchingCorrect, matchingAnswerFromPairs, parseMatchingAnswer, type MatchingPair } from './matching'

const pairs: MatchingPair[] = [
  { left: 'Sxq', right: 'Diện tích xung quanh' },
  { left: 'Stp', right: 'Diện tích toàn phần' },
  { left: 'Sđáy', right: 'Diện tích đáy' },
  { left: 'V', right: 'Thể tích' },
]

describe('matching answer checking', () => {
  it('accepts all correct pairs', () => {
    const answer = parseMatchingAnswer(matchingAnswerFromPairs(pairs))
    expect(isMatchingCorrect(pairs, answer)).toBe(true)
  })

  it('rejects one wrong pair', () => {
    const answer = {
      Sxq: 'Diện tích toàn phần',
      Stp: 'Diện tích xung quanh',
      Sđáy: 'Diện tích đáy',
      V: 'Thể tích',
    }
    expect(isMatchingCorrect(pairs, answer)).toBe(false)
  })

  it('does not depend on answer object order', () => {
    const answer = {
      V: 'Thể tích',
      Sđáy: 'Diện tích đáy',
      Sxq: 'Diện tích xung quanh',
      Stp: 'Diện tích toàn phần',
    }
    expect(isMatchingCorrect(pairs, answer)).toBe(true)
  })
})
