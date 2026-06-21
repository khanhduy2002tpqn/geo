'use client';

import { useCallback, useEffect, useRef } from 'react';
import Script from 'next/script';
import type { GeoGebraApi, GGBAppletParameters } from '@/types/ggb';
import type { ObjectInfo } from '@/types/geogebra';
import { extractObject } from '@/services/geogebra/extractObject';
import { seedConstruction } from '@/services/geogebra/seedConstruction';

export type ViewMode = '2d' | '3d' | '2d3d';

interface GeoGebraAppletProps {
  onObjectClick: (info: ObjectInfo) => void;
  /** Called once the applet is ready; receives the live API for object enumeration. */
  onReady?: (api: GeoGebraApi) => void;
  /** GeoGebra material ID — if set, loads that construction; otherwise seeds a sample. */
  materialId?: string;
  /** Which view to show: '2d' = Graphics only (no Algebra), '3d' = 3D view (no Algebra). */
  viewMode?: ViewMode;
}

function applyFitView(api: GeoGebraApi, is3d: boolean): void {
  if (is3d) {
    api.evalCommand('ZoomIn[1]');
    return;
  }
  const points = api.getAllObjectNames('point');
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const name of points) {
    const x = api.getXcoord(name);
    const y = api.getYcoord(name);
    if (!isFinite(x) || !isFinite(y)) continue;
    xMin = Math.min(xMin, x); xMax = Math.max(xMax, x);
    yMin = Math.min(yMin, y); yMax = Math.max(yMax, y);
  }
  if (!isFinite(xMin)) { api.evalCommand('ZoomIn[1]'); return; }
  const dx = Math.max(xMax - xMin, 0.5);
  const dy = Math.max(yMax - yMin, 0.5);
  const pad = Math.max(dx, dy) * 0.35;
  const cx = (xMin + xMax) / 2;
  const cy = (yMin + yMax) / 2;
  api.setCoordSystem(cx - dx / 2 - pad, cx + dx / 2 + pad, cy - dy / 2 - pad, cy + dy / 2 + pad);
}

const CONTAINER_ID = 'ggb-applet-host';
// Note: deployggb.js is loaded from the GeoGebra CDN. Subresource Integrity
// (SRI) is intentionally not applied because GeoGebra serves a dynamically
// assembled bundle without publishing stable hashes. Mitigate at the network
// level by restricting the CSP `script-src` to `https://www.geogebra.org`.
const DEPLOY_SCRIPT = 'https://www.geogebra.org/apps/deployggb.js';
const ASPECT = 0.72; // height / width

export function GeoGebraApplet({ onObjectClick, onReady, materialId, viewMode = '3d' }: GeoGebraAppletProps) {
  const injectedRef = useRef(false);
  const apiRef = useRef<GeoGebraApi | null>(null);
  const listenerRef = useRef<((name: string) => void) | null>(null);
  // Stable refs for latest callbacks — updated on every render without
  // triggering a re-inject of the expensive GeoGebra applet.
  const clickHandlerRef = useRef(onObjectClick);
  clickHandlerRef.current = onObjectClick;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;

  useEffect(() => {
    void injectAsync();
    return () => {
      injectedRef.current = false;
      if (apiRef.current && listenerRef.current) {
        apiRef.current.unregisterClickListener(listenerRef.current);
      }
      apiRef.current = null;
      listenerRef.current = null;
      const host = document.getElementById(CONTAINER_ID);
      if (host) host.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function injectAsync(): Promise<void> {
    if (injectedRef.current) return;
    if (typeof window === 'undefined' || !window.GGBApplet) return;

    injectedRef.current = true;

    const host = document.getElementById(CONTAINER_ID);
    if (!host) { injectedRef.current = false; return; }

    const width = Math.max(320, Math.round(host.clientWidth || 800));
    const height = Math.round(width * ASPECT);

    // For 3D mode with a material: fetch server-modified GGB (algebra view hidden in XML).
    // For 2D mode: use material_id + perspective:'G' which hides algebra via GeoGebra param.
    let ggbSource: Pick<GGBAppletParameters, 'material_id' | 'ggbBase64'> = {};
    if (materialId && viewMode !== '2d') {
      try {
        const resp = await fetch(`/api/geogebra/material?id=${materialId}`);
        const data = await resp.json() as { ggbBase64?: string };
        ggbSource = data.ggbBase64
          ? { ggbBase64: data.ggbBase64 }
          : { material_id: materialId };
      } catch {
        ggbSource = { material_id: materialId };
      }
    } else if (materialId) {
      ggbSource = { material_id: materialId };
    }

    // Abort if component unmounted while fetching.
    if (!injectedRef.current) return;

    const perspectiveParams: Pick<GGBAppletParameters, 'perspective'> =
      viewMode === '2d3d' ? {} : { perspective: viewMode === '3d' ? 'T' : 'G' };

    const params: GGBAppletParameters = {
      appName: viewMode === '3d' ? '3d' : materialId ? 'classic' : 'graphing',
      ...ggbSource,
      width,
      height,
      showToolBar: false,
      showAlgebraInput: false,
      showMenuBar: false,
      showResetIcon: false,
      enableRightClick: false,
      enableShiftDragZoom: true,
      enableLabelDrags: false,
      language: 'vi',
      // 2D: 'G' perspective hides Algebra + 3D in classic app.
      // 3D: algebra is already hidden inside the modified ggbBase64 XML.
      ...perspectiveParams,
      appletOnLoad: (api: GeoGebraApi) => {
        apiRef.current = api;
        const listener = (name: string) => {
          clickHandlerRef.current(extractObject(api, name));
        };
        listenerRef.current = listener;
        api.registerClickListener(listener);
        if (!materialId) seedConstruction(api);
        readyRef.current?.(api);
        // Auto-center after material fully renders.
        setTimeout(() => applyFitView(api, viewMode === '3d'), 1200);
      },
    };

    const applet = new window.GGBApplet(params, true);
    applet.inject(CONTAINER_ID);
  }

  const zoom = useCallback((factor: number) => {
    if (!apiRef.current) return;
    apiRef.current.evalCommand(`ZoomIn[${factor}]`);
  }, []);

  const fitView = useCallback(() => {
    if (!apiRef.current) return;
    applyFitView(apiRef.current, viewMode === '3d');
  }, [viewMode]);

  return (
    <>
      <Script
        src={DEPLOY_SCRIPT}
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onLoad={() => void injectAsync()}
      />
      <div className="relative h-full w-full">
        {/*
          role="application" + tabIndex lets keyboard users focus the board.
          Full keyboard navigation depends on GeoGebra's built-in accessibility
          support (Tab to cycle objects, Enter to select). The aria-label and
          keyboard-hint text below ensure screen-reader users know it's interactive.
        */}
        <div
          id={CONTAINER_ID}
          role="application"
          tabIndex={0}
          className="ggb-host h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-chalk)]"
          aria-label="Bảng vẽ GeoGebra tương tác — nhấn Tab để điều hướng, Enter để chọn đối tượng"
        />
        {/* Zoom controls — bottom-right overlay */}
        <div className="absolute bottom-3 right-3 flex flex-col gap-1">
          <button
            type="button"
            title="Căn giữa hình"
            onClick={fitView}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-xs font-bold text-[var(--color-ink)]/70 shadow ring-1 ring-black/10 transition hover:bg-white hover:text-[var(--color-ink)]"
          >
            ⊙
          </button>
          {[
            { label: '+', factor: 2, title: 'Phóng to' },
            { label: '−', factor: 1 / 2, title: 'Thu nhỏ' },
          ].map(({ label, factor, title }) => (
            <button
              key={label}
              type="button"
              title={title}
              onClick={() => zoom(factor)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-sm font-bold text-[var(--color-ink)]/70 shadow ring-1 ring-black/10 transition hover:bg-white hover:text-[var(--color-ink)]"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
