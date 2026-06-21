'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ExplanationSource,
  GgbCategory,
  GradeLevel,
  ObjectInfo,
} from '@/types/geogebra';
import type { SpeakResponse } from '@/types/api';
import { AudioManager } from '@/components/audio/AudioManager';

export type SpeechStatus = 'idle' | 'thinking' | 'speaking' | 'error';

export interface TutorSpeechState {
  status: SpeechStatus;
  caption: string;
  category: GgbCategory | null;
  source: ExplanationSource | null;
  objectName: string | null;
  error: string | null;
}

const INITIAL_STATE: TutorSpeechState = {
  status: 'idle',
  caption: '',
  category: null,
  source: null,
  objectName: null,
  error: null,
};

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Drives the click -> explain -> speak pipeline.
 *
 * On every new request it cancels the in-flight fetch AND stops current
 * playback before starting again, so clicking a new object interrupts the
 * previous explanation instantly (spec requirement).
 */
export function useTutorSpeech(level?: GradeLevel) {
  const [state, setState] = useState<TutorSpeechState>(INITIAL_STATE);
  const audioRef = useRef<AudioManager | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    audioRef.current = new AudioManager();
    return () => {
      controllerRef.current?.abort();
      audioRef.current?.stop();
    };
  }, []);

  const speak = useCallback(
    async (info: ObjectInfo, constructionContext?: string) => {
      // Interrupt previous request + playback.
      controllerRef.current?.abort();
      audioRef.current?.stop();
      const controller = new AbortController();
      controllerRef.current = controller;

      // Unlock audio synchronously within the user-gesture call stack, BEFORE
      // any async operation. The gesture token expires after the first await,
      // so this must happen here to satisfy Safari/Chrome autoplay policy.
      audioRef.current?.unlockWithGesture();

      setState((prev) => ({
        ...prev,
        status: 'thinking',
        objectName: info.name,
        error: null,
      }));

      try {
        const response = await fetch('/api/geogebra/speak', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...info, level, constructionContext }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`speak failed: ${response.status}`);
        }
        const data = (await response.json()) as SpeakResponse;
        if (controller.signal.aborted) return;

        // Show text caption immediately; status depends on whether audio follows.
        setState({
          status: data.audioContent ? 'speaking' : 'idle',
          caption: data.text,
          category: data.category,
          source: data.source,
          objectName: info.name,
          error: null,
        });

        if (data.audioContent) {
          try {
            const played = await audioRef.current?.play(data.audioContent, () => {
              // Only settle to idle if this request is still the active one.
              if (controllerRef.current === controller) {
                setState((prev) => ({ ...prev, status: 'idle' }));
              }
            });
            if (played === false) {
              // Autoplay blocked — fall back to text-only silently.
              setState((prev) => ({ ...prev, status: 'idle' }));
            }
          } catch (playError: unknown) {
            // Distinguish our own abort (controller already aborted — the next
            // speak() call owns the state) from a browser-initiated AbortError
            // (e.g. the browser interrupting playback itself). For the latter
            // we must still reset to idle or the status gets stuck at 'speaking'.
            const ourAbort = isAbort(playError) && controller.signal.aborted;
            if (!ourAbort) {
              setState((prev) => ({ ...prev, status: 'idle' }));
            }
          }
        }
      } catch (error: unknown) {
        if (controller.signal.aborted || isAbort(error)) return;
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: 'Không tạo được lời giải thích. Hãy thử lại nhé.',
        }));
      }
    },
    [level],
  );

  /** Auto-read arbitrary text (e.g. construction overview). Not a user gesture — no unlock needed. */
  const speakText = useCallback(async (text: string) => {
    controllerRef.current?.abort();
    audioRef.current?.stop();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState((prev) => ({ ...prev, status: 'thinking', objectName: null, error: null }));

    try {
      const response = await fetch('/api/geogebra/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`tts failed: ${response.status}`);
      const data = (await response.json()) as { audioContent: string };
      if (controller.signal.aborted) return;

      setState((prev) => ({ ...prev, status: data.audioContent ? 'speaking' : 'idle', caption: text }));

      if (data.audioContent) {
        try {
          await audioRef.current?.play(data.audioContent, () => {
            if (controllerRef.current === controller) {
              setState((prev) => ({ ...prev, status: 'idle' }));
            }
          });
        } catch {
          setState((prev) => ({ ...prev, status: 'idle' }));
        }
      }
    } catch (error: unknown) {
      if (controller.signal.aborted || isAbort(error)) return;
      setState((prev) => ({ ...prev, status: 'idle' }));
    }
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    audioRef.current?.stop();
    setState((prev) => ({ ...prev, status: 'idle' }));
  }, []);

  const unlock = useCallback(() => {
    audioRef.current?.unlockWithGesture();
  }, []);

  return { state, speak, speakText, stop, unlock };
}
