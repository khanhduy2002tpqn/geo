export type MatchingPair = {
  left: string
  right: string
}

function normalizeMatchingValue(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function matchingAnswerFromPairs(pairs: MatchingPair[]): string {
  return JSON.stringify(Object.fromEntries(pairs.map((pair) => [pair.left, pair.right])))
}

export function parseMatchingAnswer(value: string | undefined): Record<string, string> {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).map(([key, item]) => [key, String(item)]),
    )
  } catch {
    return {}
  }
}

export function parseMatchingPairs(lines: string[], blockLabel = 'Matching'): MatchingPair[] {
  const pairs = lines.map((line) => {
    const separator = line.indexOf('=>')
    if (separator === -1) {
      throw new Error(`${blockLabel} cần dùng dạng Vế trái => Vế phải.`)
    }
    const left = line.slice(0, separator).trim()
    const right = line.slice(separator + 2).trim()
    if (!left || !right) {
      throw new Error(`${blockLabel} cần đủ vế trái và vế phải.`)
    }
    return { left, right }
  })

  if (pairs.length < 4) {
    throw new Error(`${blockLabel} cần tối thiểu 4 cặp để giao diện đủ 4 đáp án.`)
  }
  return pairs
}

export function isMatchingCorrect(pairs: MatchingPair[], answers: Record<string, string>): boolean {
  return pairs.every((pair) =>
    normalizeMatchingValue(answers[pair.left] ?? '') === normalizeMatchingValue(pair.right),
  )
}
