import { LruCache } from './memoryCache';

/**
 * Process-wide cache singletons. Stored on globalThis so they survive Next.js
 * dev hot-reloads (module re-import) and stay warm across requests on a
 * long-lived server.
 *
 * Two tiers because reuse differs:
 *   - explanationCache: object signature -> Vietnamese text (small, cheap).
 *   - audioCache: explanation text -> base64 MP3 (larger; identical text from
 *     different objects reuses the same audio).
 */
const MAX_EXPLANATIONS = 500;
const MAX_AUDIO_CLIPS = 200;

interface CacheBundle {
  explanation: LruCache<string>;
  audio: LruCache<string>;
}

const globalForCache = globalThis as unknown as {
  __ggbCaches?: CacheBundle;
};

const caches: CacheBundle =
  globalForCache.__ggbCaches ??
  (globalForCache.__ggbCaches = {
    explanation: new LruCache<string>(MAX_EXPLANATIONS),
    audio: new LruCache<string>(MAX_AUDIO_CLIPS),
  });

export const explanationCache = caches.explanation;
export const audioCache = caches.audio;
