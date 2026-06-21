/**
 * Local Vietnamese keyword → GeometrySpec mapping.
 * Keywords and fallback specs are sourced from the Turso shape library
 * (serverShapes), which itself falls back to shapes-data.ts when Turso is
 * unavailable. Used when DeepSeek is unavailable.
 */

import type { GeometrySpec } from '@/types/geo-ai'
import { getShapeRecord } from '@/lib/geo-ai/data/serverShapes'

interface KeywordEntry {
  keywords: string[]
  spec: GeometrySpec
}

// Specific shapes first — order matters for matching.
const ORDER = [
  'square_pyramid', 'triangular_pyramid', 'tetrahedron',
  'cube', 'rectangular_prism', 'triangular_prism',
  'cylinder', 'cone', 'sphere',
  'hyperboloid', 'paraboloid',
  'general_pyramid',
]

let cachedMap: KeywordEntry[] | null = null

async function buildKeywordMap(): Promise<KeywordEntry[]> {
  const entries: KeywordEntry[] = []
  for (const key of ORDER) {
    const record = await getShapeRecord(key)
    if (!record) continue
    const fallback = record.fallbackSpec
    entries.push({
      keywords: record.parserKeywords,
      spec: {
        shape: fallback.shape as GeometrySpec['shape'],
        baseShape: fallback.baseShape as GeometrySpec['baseShape'],
        apex: fallback.apex,
        vertices: fallback.vertices,
        params: { ...fallback.params, unit: 'cm' } as GeometrySpec['params'],
        conditions: fallback.conditions,
        specialPoints: [],
      },
    })
  }
  return entries
}

async function getKeywordMap(): Promise<KeywordEntry[]> {
  if (!cachedMap) cachedMap = await buildKeywordMap()
  return cachedMap
}

function normalizePrompt(prompt: string): string {
  return prompt.toLowerCase().replace(/\s+/g, ' ').trim()
}

export async function matchFallback(prompt: string): Promise<GeometrySpec | null> {
  const map = await getKeywordMap()
  const normalized = normalizePrompt(prompt)
  for (const entry of map) {
    if (entry.keywords.some((kw) => normalized.includes(kw))) {
      return entry.spec
    }
  }
  return null
}
