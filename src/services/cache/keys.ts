import type { GradeLevel, ObjectInfo } from '@/types/geogebra';

/**
 * SHA-256 hex digest via Web Crypto. Web Crypto (not node:crypto) keeps these
 * helpers portable to the Cloudflare Workers runtime in Phase 3.
 */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Stable signature for an object: name + type + definition (per spec). */
export function objectSignature(info: ObjectInfo): string {
  return [info.name, info.type, info.definition].join('|');
}

/**
 * Cache key for an explanation. Includes the grade level because Phase 2
 * adapts wording to the student's level — a Grade 3 and Grade 12 explanation
 * of the same object must not collide.
 */
export function explanationKey(
  info: ObjectInfo,
  level: GradeLevel | undefined,
): Promise<string> {
  return sha256Hex(`${objectSignature(info)}::${level ?? 'default'}`);
}

/**
 * Cache key for synthesized audio.
 * Version prefix "ssml1" busts any entries cached before SSML silence was added —
 * old entries lack the 400ms leading break and would cause first-word clipping.
 */
export function audioKey(text: string, voice: string): Promise<string> {
  return sha256Hex(`ssml1::${text}::${voice}`);
}
