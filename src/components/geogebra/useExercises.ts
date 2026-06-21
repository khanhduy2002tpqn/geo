'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Exercise } from '@/types/exercise';

export type { Exercise };
export type { SolutionStep, StructuredSolution, ExerciseSolution } from '@/types/exercise';

export interface ExercisesState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  exercises: Exercise[];
}

type ExerciseDifficulty = Exercise['difficulty'];

const CACHE_KEY_PREFIX = 'ggb-exercises-v4';
const EXERCISE_DIFFICULTIES: ExerciseDifficulty[] = ['basic', 'medium', 'advanced'];
const EXERCISES_PER_DIFFICULTY = 3;
const DIFFICULTY_ORDER: Record<ExerciseDifficulty, number> = {
  basic: 0,
  medium: 1,
  advanced: 2,
};

function sortExercises(exercises: Exercise[]): Exercise[] {
  return [...exercises].sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]);
}

function cacheKey(materialId: string, difficulty: ExerciseDifficulty): string {
  return `${CACHE_KEY_PREFIX}::${materialId}::${difficulty}`;
}

function loadCache(materialId: string, difficulty: ExerciseDifficulty): Exercise[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(materialId, difficulty));
    if (!raw) return null;
    return JSON.parse(raw) as Exercise[];
  } catch {
    return null;
  }
}

function saveCache(materialId: string, difficulty: ExerciseDifficulty, exercises: Exercise[]): void {
  try {
    localStorage.setItem(cacheKey(materialId, difficulty), JSON.stringify(exercises));
  } catch {
    // Storage quota exceeded or unavailable — silently skip.
  }
}

function clearCache(materialId: string): void {
  try {
    for (const difficulty of EXERCISE_DIFFICULTIES) {
      localStorage.removeItem(cacheKey(materialId, difficulty));
    }
  } catch {
    // Best-effort.
  }
}

/**
 * Fetches AI-generated exercises for the current construction.
 * Results are cached in localStorage by materialId.
 * Call refresh() to force re-generation and update the cache.
 */
export function useExercises(
  constructionContext: string | undefined,
  objectData: string | undefined,
  materialId: string | null | undefined,
) {
  const [state, setState] = useState<ExercisesState>({
    status: 'idle',
    exercises: [],
  });
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!constructionContext || !materialId) {
      setState({ status: 'idle', exercises: [] });
      return;
    }

    const cachedByDifficulty =
      refreshCount === 0
        ? EXERCISE_DIFFICULTIES.map((difficulty) => ({
            difficulty,
            exercises: loadCache(materialId, difficulty),
          }))
        : [];
    const cachedExercises = cachedByDifficulty.flatMap((entry) => entry.exercises ?? []);
    const missingDifficulties =
      refreshCount === 0
        ? cachedByDifficulty
            .filter((entry) => !entry.exercises)
            .map((entry) => entry.difficulty)
        : EXERCISE_DIFFICULTIES;

    if (missingDifficulties.length === 0) {
      setState({ status: 'ready', exercises: sortExercises(cachedExercises) });
      return;
    }

    setState({
      status: cachedExercises.length > 0 ? 'ready' : 'loading',
      exercises: sortExercises(cachedExercises),
    });

    let cancelled = false;

    void (async () => {
      // One map entry per difficulty, accumulates exercises as calls complete
      const fetchedByDifficulty = new Map<ExerciseDifficulty, Exercise[]>();
      for (const d of missingDifficulties) fetchedByDifficulty.set(d, []);

      // Expand to 9 independent jobs: 3 difficulties × 3 indexes
      const jobs = missingDifficulties.flatMap((difficulty) =>
        Array.from({ length: EXERCISES_PER_DIFFICULTY }, (_, index) => ({ difficulty, index })),
      );

      await Promise.all(
        jobs.map(async ({ difficulty, index }) => {
          try {
            const response = await fetch('/api/geogebra/exercises', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ constructionContext, objectData, difficulty, index }),
            });

            if (!response.ok) return;

            const data = (await response.json()) as { exercises?: Exercise[] };
            const exercise = Array.isArray(data.exercises) ? data.exercises[0] : undefined;
            if (!exercise) return;

            fetchedByDifficulty.get(difficulty)!.push(exercise);

            if (!cancelled) {
              const all = [
                ...cachedExercises,
                ...Array.from(fetchedByDifficulty.values()).flat(),
              ];
              setState({ status: 'ready', exercises: sortExercises(all) });
            }
          } catch {
            return;
          }
        }),
      );

      if (cancelled) return;

      // Save cache per difficulty after all fetches complete
      for (const [difficulty, exercises] of fetchedByDifficulty.entries()) {
        if (exercises.length > 0) saveCache(materialId, difficulty, exercises);
      }

      const total = [
        ...cachedExercises,
        ...Array.from(fetchedByDifficulty.values()).flat(),
      ];

      if (total.length === 0) {
        setState({ status: 'error', exercises: [] });
        return;
      }

      setState({ status: 'ready', exercises: sortExercises(total) });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [constructionContext, materialId, refreshCount]);

  const refresh = useCallback(() => {
    if (materialId) clearCache(materialId);
    setRefreshCount((c) => c + 1);
  }, [materialId]);

  return { state, refresh };
}
