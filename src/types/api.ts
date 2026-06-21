import type {
  ExplanationSource,
  GgbCategory,
  GradeLevel,
  ObjectInfo,
} from './geogebra';

/**
 * Request body for POST /api/geogebra/speak.
 * Merged endpoint: classify -> explain -> synthesize in one roundtrip.
 */
export interface SpeakRequest extends ObjectInfo {
  /** Optional student grade band (Phase 2 adapts explanation style). */
  level?: GradeLevel;
  /** Optional voice override (defaults to env TTS_VOICE). */
  voice?: string;
  /** Optional AI-generated construction overview (tổng quan bài) for richer TTS text. */
  constructionContext?: string;
}

/** Successful response from POST /api/geogebra/speak. */
export interface SpeakResponse {
  /** Vietnamese explanation text (also used as on-screen caption). */
  text: string;
  /** Base64-encoded MP3 audio (audio/mpeg). Empty string if TTS disabled. */
  audioContent: string;
  /** Resolved semantic category. */
  category: GgbCategory;
  /** Whether the text came from a local template, the AI, or cache. */
  source: ExplanationSource;
}

/** Consistent error envelope for API routes. */
export interface ApiError {
  error: string;
}
