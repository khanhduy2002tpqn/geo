'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ConstructionEntry } from '@/services/geogebra/enumerateObjects';
import type { ExplanationSource } from '@/types/geogebra';
import type { Formula } from '@/services/ai/describeConstruction';

export type { Formula };

export interface DescriptionState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  description: string;
  panelContent: string;
  formulas: Formula[];
  source: ExplanationSource | null;
}

const CACHE_VERSION = 'v3';

function cacheKey(materialId: string): string {
  return `ggb-desc-${CACHE_VERSION}::${materialId}`;
}

interface CacheEntry {
  description: string;
  panelContent: string;
  formulas: Formula[];
  source: ExplanationSource;
}

function loadCache(materialId: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(materialId));
    if (!raw) return null;
    return JSON.parse(raw) as CacheEntry;
  } catch {
    return null;
  }
}

function saveCache(materialId: string, entry: CacheEntry): void {
  try {
    localStorage.setItem(cacheKey(materialId), JSON.stringify(entry));
  } catch {
    // Storage quota exceeded or unavailable — silently skip.
  }
}

function clearCache(materialId: string): void {
  try {
    localStorage.removeItem(cacheKey(materialId));
  } catch {
    // Best-effort.
  }
}

/**
 * Fetches an AI description of the whole construction.
 * Results are cached in localStorage by materialId to avoid redundant API calls.
 * Call refresh() to force re-analysis and update the cache.
 */
export function useConstructionDescription(
  entries: ConstructionEntry[] | null,
  materialId?: string | null,
) {
  const [state, setState] = useState<DescriptionState>({
    status: 'idle',
    description: '',
    panelContent: '',
    formulas: [],
    source: null,
  });
  const controllerRef = useRef<AbortController | null>(null);
  // refreshCount > 0 bypasses cache for one fetch cycle.
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    if (!entries || entries.length === 0) {
      setState({ status: 'idle', description: '', panelContent: '', formulas: [], source: null });
      return;
    }

    // Check localStorage cache (skip when force-refreshing).
    if (materialId && refreshCount === 0) {
      const cached = loadCache(materialId);
      if (cached) {
        setState({ status: 'ready', ...cached });
        return;
      }
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setState({ status: 'loading', description: '', panelContent: '', formulas: [], source: null });

    void (async () => {
      try {
        const response = await fetch('/api/geogebra/describe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objects: entries.map((e) => ({
              name: e.name,
              category: e.category,
              value: e.value,
              definition: e.definition,
            })),
            force: refreshCount > 0,
          }),
          signal: controller.signal,
        });

        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(`describe failed: ${response.status}`);

        const data = (await response.json()) as {
          description: string;
          panelContent?: string;
          formulas?: Formula[];
          source: ExplanationSource;
        };
        if (controller.signal.aborted) return;

        const entry: CacheEntry = {
          description: data.description,
          panelContent: data.panelContent ?? '',
          formulas: data.formulas ?? [],
          source: data.source,
        };

        if (materialId) saveCache(materialId, entry);
        setState({ status: 'ready', ...entry });
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setState({ status: 'error', description: '', panelContent: '', formulas: [], source: null });
      }
    })();

    return () => { controller.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, refreshCount]);

  const refresh = useCallback(() => {
    if (materialId) clearCache(materialId);
    setRefreshCount((c) => c + 1);
  }, [materialId]);

  return { state, refresh };
}
