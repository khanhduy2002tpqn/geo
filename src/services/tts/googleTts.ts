import type { TtsConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

const SYNTHESIZE_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

interface SynthesizeOptions {
  text: string;
  voice: string;
  config: TtsConfig;
}

interface GoogleTtsResponse {
  audioContent?: string;
}

/**
 * Synthesize Vietnamese speech via the Google Cloud Text-to-Speech REST API.
 *
 * We call REST (not the @google-cloud/text-to-speech Node SDK) because the SDK
 * relies on gRPC/Node internals that do not run on edge runtimes — keeping this
 * portable to Cloudflare Workers in Phase 3. Auth uses a restricted API key.
 *
 * @returns base64-encoded MP3 (the raw `audioContent` Google returns).
 */
/** Escape characters that are special in XML/SSML. */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function synthesizeSpeech({
  text,
  voice,
  config,
}: SynthesizeOptions): Promise<string> {
  if (!config.apiKey) {
    throw new Error('GOOGLE_TTS_API_KEY not configured');
  }

  // Prepend 400ms of silence via SSML. This silence is baked into the MP3 so
  // the OS audio driver finishes its cold-start initialisation during the
  // silence, and the first spoken word plays cleanly without being clipped.
  const ssml = `<speak><break time="400ms"/>${escapeXml(text)}</speak>`;

  const response = await fetch(SYNTHESIZE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey,
    },
    body: JSON.stringify({
      input: { ssml },
      voice: { languageCode: config.languageCode, name: voice },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0,
        pitch: 0,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.warn(`Google TTS upstream error ${response.status}`, detail.slice(0, 200));
    throw new Error(`Google TTS request failed with status ${response.status}`);
  }

  const data = (await response.json()) as GoogleTtsResponse;
  if (!data.audioContent) {
    throw new Error('Google TTS returned no audio content');
  }
  return data.audioContent;
}
