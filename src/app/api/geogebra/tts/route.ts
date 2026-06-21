import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import { synthesizeSpeech } from '@/services/tts/googleTts';
import { audioKey } from '@/services/cache/keys';
import { audioCache } from '@/services/cache/store';
import { formatTextForTts } from '@/lib/ttsFormat';

export const runtime = 'nodejs';

const VOICE_PATTERN = /^vi-VN-(?:Neural2|Standard|Wavenet)-[A-Z]$/;

const TtsSchema = z.object({
  text: z.string().min(1).max(2000),
  voice: z.string().regex(VOICE_PATTERN).optional(),
});

/**
 * POST /api/geogebra/tts
 * Synthesize arbitrary Vietnamese text to MP3.
 * Used for auto-reading the construction overview.
 */
export async function POST(request: Request): Promise<NextResponse> {
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
