const SUPERSCRIPTS: Record<string, string> = {
  '⁰': '0',
  '¹': '1',
  '²': '2',
  '³': '3',
  '⁴': '4',
  '⁵': '5',
  '⁶': '6',
  '⁷': '7',
  '⁸': '8',
  '⁹': '9',
}

export function normalizeMathAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\^\{([^}]+)\}/g, '^$1')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (chars) =>
      `^${[...chars].map((char) => SUPERSCRIPTS[char] ?? char).join('')}`,
    )
    .replace(/([a-z])\^1(?!\d)/g, '$1')
    .replace(/[×·*]/g, '')
    .replace(/\s+/g, '')
    .replace(/[.,;:!?]/g, '')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')')
}

export function isEquivalentMathAnswer(studentAnswer: string, expectedAnswer: string): boolean {
  return normalizeMathAnswer(studentAnswer) === normalizeMathAnswer(expectedAnswer)
}
