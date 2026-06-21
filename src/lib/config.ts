/**
 * Centralized server-side configuration, read from environment variables.
 *
 * `enabled` flags let the app degrade gracefully:
 *   - No GOOGLE_TTS_API_KEY  -> /speak returns text only (no audio), no crash.
 *   - No OPENROUTER_API_KEY  -> AI path is dormant; everything uses local
 *     templates. This is exactly Phase 1 behaviour.
 *
 * Never read process.env directly elsewhere — import from here so the seams
 * are explicit and testable.
 */

const DEFAULT_VOICE = 'vi-VN-Neural2-A';
const DEFAULT_LANGUAGE = 'vi-VN';
const DEFAULT_MODEL = 'deepseek/deepseek-chat';
const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export interface TtsConfig {
  apiKey: string;
  voice: string;
  languageCode: string;
  enabled: boolean;
}

export interface AiConfig {
  apiKey: string;
  model: string;
  baseUrl: string;
  enabled: boolean;
}

export interface AppConfig {
  tts: TtsConfig;
  ai: AiConfig;
}

export function loadConfig(): AppConfig {
  const ttsApiKey = process.env.GOOGLE_TTS_API_KEY ?? '';
  const aiApiKey = process.env.OPENROUTER_API_KEY ?? '';

  return {
    tts: {
      apiKey: ttsApiKey,
      voice: process.env.TTS_VOICE || DEFAULT_VOICE,
      languageCode: process.env.TTS_LANGUAGE || DEFAULT_LANGUAGE,
      enabled: ttsApiKey.length > 0,
    },
    ai: {
      apiKey: aiApiKey,
      model: process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
      baseUrl: process.env.OPENROUTER_BASE_URL || DEFAULT_OPENROUTER_BASE_URL,
      enabled: aiApiKey.length > 0,
    },
  };
}
