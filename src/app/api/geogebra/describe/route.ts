import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import { sha256Hex } from '@/services/cache/keys';
import { explanationCache } from '@/services/cache/store';
import {
  describeConstructionWithAi,
  localFallbackDescription,
  type Formula,
} from '@/services/ai/describeConstruction';
import type { ConstructionEntry } from '@/services/geogebra/enumerateObjects';
import type { ExplanationSource } from '@/types/geogebra';

export const runtime = 'nodejs';

const EntrySchema = z.object({
  name: z.string().max(64),
  category: z.string().max(64),
  value: z.string().max(512).default(''),
  definition: z.string().max(512).default(''),
});

const DescribeSchema = z.object({
  objects: z.array(EntrySchema).max(200),
  force: z.boolean().optional(),
});

export interface DescribeResponse {
  description: string;
  panelContent: string;
  formulas: Formula[];
  source: ExplanationSource;
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = DescribeSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
  }

  const entries = parsed.data.objects as ConstructionEntry[];
  if (entries.length === 0) {
    return NextResponse.json({ description: 'Bài chưa có đối tượng nào.', panelContent: '', formulas: [], source: 'local' });
  }

  // Cache key: hash of all object signatures in order.
  const sig = entries.map((e) => `${e.name}|${e.category}|${e.definition}`).join(';;');
  const key = `describe-v3::${await sha256Hex(sig)}`;

  if (parsed.data.force) {
    explanationCache.delete(key);
  }

  const cached = explanationCache.get(key);
  if (cached !== undefined) {
    const { description, panelContent, formulas } = JSON.parse(cached) as { description: string; panelContent: string; formulas: Formula[] };
    return NextResponse.json({ description, panelContent, formulas: formulas ?? [], source: 'cache' } satisfies DescribeResponse);
  }

  const config = loadConfig();

  if (config.ai.enabled) {
    try {
      const { overview, panel, formulas } = await describeConstructionWithAi(entries, config.ai);
      explanationCache.set(key, JSON.stringify({ description: overview, panelContent: panel, formulas }));
      return NextResponse.json({ description: overview, panelContent: panel, formulas, source: 'ai' } satisfies DescribeResponse);
    } catch (error: unknown) {
      logger.warn('AI describe failed, using local fallback', error);
    }
  }

  const { overview, panel, formulas } = localFallbackDescription(entries);
  explanationCache.set(key, JSON.stringify({ description: overview, panelContent: panel, formulas }));
  return NextResponse.json({ description: overview, panelContent: panel, formulas, source: 'local' } satisfies DescribeResponse);
}
