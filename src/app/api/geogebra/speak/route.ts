import { NextResponse } from 'next/server';
import { z } from 'zod';
import type { ObjectInfo } from '@/types/geogebra';
import type { SpeakResponse } from '@/types/api';
import { loadConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import { explainObject } from '@/services/geogebra/explainObject';
import { synthesizeSpeech } from '@/services/tts/googleTts';
import { audioKey } from '@/services/cache/keys';
import { audioCache } from '@/services/cache/store';
import { LruCache } from '@/services/cache/memoryCache';
import { formatTextForTts } from '@/lib/ttsFormat';

// Node runtime: uses fetch to Google/OpenRouter and base64 audio handling.
// (Phase 3 migrates this to the Workers runtime with KV/R2 bindings.)
export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Rate limiting — simple per-IP sliding window stored in process memory.
// Bounds unbounded IP growth with an LRU eviction on the backing store.
// For production with multiple instances, replace with Upstash Redis.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30; // requests per minute per IP

const globalForRate = globalThis as unknown as { __ggbRateCache?: LruCache<number[]> };
const rateCounts: LruCache<number[]> =
  globalForRate.__ggbRateCache ?? (globalForRate.__ggbRateCache = new LruCache(2000));

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = (rateCounts.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (timestamps.length >= RATE_MAX) {
    rateCounts.set(ip, timestamps);
    return true;
  }
  timestamps.push(now);
  rateCounts.set(ip, timestamps);
  return false;
}

// Allowed Google TTS voice name pattern — vi-VN voices only.
const VOICE_PATTERN = /^vi-VN-(?:Neural2|Standard|Wavenet)-[A-Z]$/;

const SpeakSchema = z.object({
  name: z.string().min(1, 'name is required').max(64),
  type: z.string().min(1, 'type is required').max(64),
  value: z.string().max(512).default(''),
  definition: z.string().max(512).default(''),
  command: z.string().max(512).optional(),
  // xml accepted for future use but stripped before any AI/TTS call.
  xml: z.string().max(8192).optional(),
  level: z.enum(['primary', 'secondary', 'highschool']).optional(),
  // Restrict voice to known vi-VN Google TTS voice names.
  voice: z.string().regex(VOICE_PATTERN, 'invalid voice name').optional(),
  constructionContext: z.string().max(3000).optional(),
});

/**
 * POST /api/geogebra/speak
 *
 * One roundtrip: classify -> explain (local or AI) -> synthesize speech.
 * Returns { text, audioContent(base64 MP3), category, source }.
 * Audio is omitted (empty string) when TTS is not configured — text still works.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Prefer x-real-ip (platform-set, single trusted value) over x-forwarded-for.
  // When using x-forwarded-for, take the rightmost value — it is the last hop
  // added by a trusted proxy, not the leftmost client-controlled value.
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SpeakSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ');
    return NextResponse.json({ error: message }, { status: 400 });
  }

  // xml is accepted for client convenience but never forwarded to AI or TTS.
  const { level, voice, xml: _xml, constructionContext, ...rest } = parsed.data;
  const info: ObjectInfo = rest;

  try {
    const explanation = await explainObject(info, level, constructionContext);
    const audioContent = await resolveAudio(explanation.text, voice);

    const body: SpeakResponse = {
      text: explanation.text,
      audioContent,
      category: explanation.category,
      source: explanation.source,
    };
    return NextResponse.json(body);
  } catch (error: unknown) {
    logger.error('speak route failed', error);
    return NextResponse.json(
      { error: 'Failed to generate explanation' },
      { status: 500 },
    );
  }
}

/** Synthesize (or reuse cached) MP3 for the given text. Empty if TTS disabled. */
async function resolveAudio(text: string, voiceOverride?: string): Promise<string> {
  const config = loadConfig();
  if (!config.tts.enabled || text.length === 0) return '';

  // Format for TTS: space out uppercase letter runs so each letter is
  // spoken separately (e.g. "CE" → "C E", "BCE" → "B C E").
  const ttsText = formatTextForTts(text);
  const voice = voiceOverride || config.tts.voice;
  const key = await audioKey(ttsText, voice);

  const cached = audioCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const audio = await synthesizeSpeech({ text: ttsText, voice, config: config.tts });
    audioCache.set(key, audio);
    return audio;
  } catch (error: unknown) {
    // Non-fatal: return text-only so the student still gets the caption.
    logger.error('TTS synthesis failed; returning text only', error);
    return '';
  }
}
