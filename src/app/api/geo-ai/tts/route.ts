import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import { synthesizeSpeech } from '@/services/tts/googleTts';
import { audioKey } from '@/services/cache/keys';
import { audioCache } from '@/services/cache/store';
import { formatTextForTts } from '@/lib/ttsFormat';
import { LruCache } from '@/services/cache/memoryCache';

export const runtime = 'nodejs';

// ---------------------------------------------------------------------------
// Rate limiting — per-IP sliding window to prevent unbounded TTS API calls.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30; // requests per minute per IP

const globalForRate = globalThis as unknown as { __geoAiTtsRateCache?: LruCache<number[]> };
const rateCounts: LruCache<number[]> =
  globalForRate.__geoAiTtsRateCache ??
  (globalForRate.__geoAiTtsRateCache = new LruCache(2000));

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

const VOICE_PATTERN = /^vi-VN-(?:Neural2|Standard|Wavenet)-[A-Z]$/;

const TtsSchema = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().regex(VOICE_PATTERN).optional(),
});

/**
 * POST /api/geo-ai/tts
 * Synthesize arbitrary Vietnamese text to MP3.
 * Used for narrating geometry construction steps and tutor answers.
 */
export async function POST(request: Request): Promise<NextResponse> {
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

  const parsed = TtsSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ');
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { text, voice: voiceOverride } = parsed.data;
  const config = loadConfig();

  if (!config.tts.enabled) {
    return NextResponse.json({ audioContent: '' });
  }

  const ttsText = formatTextForTts(text);
  const voice = voiceOverride ?? config.tts.voice;
  const key = await audioKey(ttsText, voice);

  const cached = audioCache.get(key);
  if (cached !== undefined) {
    return NextResponse.json({ audioContent: cached });
  }

  try {
    const audioContent = await synthesizeSpeech({ text: ttsText, voice, config: config.tts });
    audioCache.set(key, audioContent);
    return NextResponse.json({ audioContent });
  } catch (error: unknown) {
    logger.error('TTS synthesis failed', error);
    return NextResponse.json({ audioContent: '' });
  }
}
