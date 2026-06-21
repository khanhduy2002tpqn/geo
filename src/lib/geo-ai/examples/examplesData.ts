// Re-export from central data store
export type { ExampleDef } from '@/lib/geo-ai/data/types'
export { getAllExamples as GEOMETRY_EXAMPLES_FN, getAllExamples, getExamplesByLevel } from '@/lib/geo-ai/data/index'

import { getAllExamples } from '@/lib/geo-ai/data/index'

// Backwards-compatible export for existing consumers
export const GEOMETRY_EXAMPLES = getAllExamples()
