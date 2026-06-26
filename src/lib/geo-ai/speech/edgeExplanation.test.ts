import { describe, expect, it } from 'vitest'
import { edgeExplanation, measuredEdgeExplanation } from './edgeExplanation'

describe('edgeExplanation', () => {
  it('reads an integer length with its unit', () => {
    expect(edgeExplanation({ id: 'AB', from: 'A', to: 'B', type: 'base', length: 6 }, 'cm'))
      .toBe('Cạnh AB có độ dài là 6 cm.')
  })

  it('formats decimal lengths naturally in Vietnamese', () => {
    expect(edgeExplanation({ id: 'AC', from: 'A', to: 'C', type: 'diagonal', length: Math.sqrt(18) }, 'cm'))
      .toBe('Cạnh AC có độ dài là 4,243 cm.')
  })

  it('uses a generic unit when the model has none', () => {
    expect(edgeExplanation({ id: 'AB', from: 'A', to: 'B', type: 'base', length: 2 }))
      .toBe('Cạnh AB có độ dài là 2 đơn vị.')
  })

  it('formats a measurement result with the same sentence', () => {
    expect(measuredEdgeExplanation('AB', 6, 'cm')).toBe('Cạnh AB có độ dài là 6 cm.')
  })
})
