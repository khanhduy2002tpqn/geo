import type {
  ExplanationSource,
  GgbCategory,
  GradeLevel,
  ObjectInfo,
} from '@/types/geogebra';
import { loadConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import { buildLocalExplanation } from '@/services/ai/localTemplates';
import { explainWithAi } from '@/services/ai/openrouter';
import { explanationKey, sha256Hex } from '@/services/cache/keys';
import { explanationCache } from '@/services/cache/store';
import { classify } from './classify';

export interface ExplanationResult {
  text: string;
  category: GgbCategory;
  source: ExplanationSource;
}

/**
 * Produce a Vietnamese explanation for a clicked object.
 *
 * Routing:
 *   1. Cache hit -> return immediately (source: 'cache').
 *   2. constructionContext provided && AI enabled -> build local text first,
 *      then call AI with context to improve it; fall back to local on error.
 *   3. needsAi && AI enabled -> try AI, fall back to local on any error.
 *   4. Otherwise -> deterministic local template.
 *
 * Phase 1 (no OPENROUTER_API_KEY) always lands on the local template path.
 */
export async function explainObject(
  info: ObjectInfo,
  level: GradeLevel | undefined,
  constructionContext?: string,
): Promise<ExplanationResult> {
  const { category, needsAi } = classify(info);
  const baseKey = await explanationKey(info, level);
  const key = constructionContext
    ? await sha256Hex(`${baseKey}::ctx:${constructionContext.slice(0, 200)}`)
    : baseKey;

  const cached = explanationCache.get(key);
  if (cached !== undefined) {
    return { text: cached, category, source: 'cache' };
  }

  const config = loadConfig();
  let text: string;
  let source: ExplanationSource;

  if (constructionContext && config.ai.enabled) {
    const localText = buildLocalExplanation(info, category);
    try {
      text = await explainWithAi({ info, level, config: config.ai, constructionContext, localText });
      source = 'ai';
    } catch (error: unknown) {
      logger.warn(`AI explanation with context failed for "${info.name}", using local template`, error);
      text = localText;
      source = 'local';
    }
  } else if (needsAi && config.ai.enabled) {
    try {
      text = await explainWithAi({ info, level, config: config.ai });
      source = 'ai';
    } catch (error: unknown) {
      logger.warn(`AI explanation failed for "${info.name}", using local template`, error);
      text = buildLocalExplanation(info, category);
      source = 'local';
    }
  } else {
    text = buildLocalExplanation(info, category);
    source = 'local';
  }

  explanationCache.set(key, text);
  return { text, category, source };
}
