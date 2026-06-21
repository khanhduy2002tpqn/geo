'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { GeoGebraApi } from '@/types/ggb';
import type { GgbCategory, ObjectInfo } from '@/types/geogebra';
import { parseMaterialId } from '@/lib/parseMaterialId';
import {
  enumerateObjects,
  type ConstructionOverview,
  type ConstructionEntry,
} from '@/services/geogebra/enumerateObjects';
import { displayName } from '@/lib/nameUtils';
import { GeoGebraApplet, type ViewMode } from './GeoGebraApplet';
import {
  useConstructionDescription,
  type DescriptionState,
  type Formula,
} from './useConstructionDescription';
import { useTutorSpeech, type SpeechStatus } from './useTutorSpeech';
import { useExercises, type ExercisesState, type Exercise, type SolutionStep, type StructuredSolution } from './useExercises';
import katex from 'katex';
import { evalExpr, formatNumber, toLaTeX } from '@/lib/mathEval';

const CATEGORY_LABEL: Record<GgbCategory, string> = {
  point: 'Điểm',
  line: 'Đường thẳng',
  segment: 'Đoạn thẳng / Cạnh',
  ray: 'Tia',
  vector: 'Vectơ',
  circle: 'Đường tròn',
  arc: 'Cung tròn',
  equilateralTriangle: 'Tam giác đều',
  triangle: 'Tam giác',
  square: 'Hình vuông',
  rectangle: 'Hình chữ nhật',
  rhombus: 'Hình thoi',
  parallelogram: 'Hình bình hành',
  trapezoid: 'Hình thang',
  quadrilateral: 'Tứ giác',
  pentagon: 'Ngũ giác',
  hexagon: 'Lục giác',
  polygon: 'Đa giác',
  numeric: 'Số',
  angle: 'Góc',
  simpleFunction: 'Hàm số',
  plane: 'Mặt phẳng',
  solid: 'Hình khối',
  list: 'Danh sách',
  matrix: 'Ma trận',
  boolean: 'Đúng/Sai',
  text: 'Văn bản',
  vertex: 'Đỉnh',
  focus: 'Tiêu điểm',
  parabola: 'Parabol',
  ellipse: 'Elip',
  hyperbola: 'Hypebol',
  tangent: 'Tiếp tuyến',
  asymptote: 'Tiệm cận',
  intersection: 'Giao điểm',
  midpoint: 'Trung điểm',
  centroid: 'Trọng tâm',
  circumcenter: 'Tâm ngoại tiếp',
  incenter: 'Tâm nội tiếp',
  orthocenter: 'Trực tâm',
  altitude: 'Đường cao',
  median: 'Đường trung tuyến',
  angleBisector: 'Đường phân giác',
  perpendicularBisector: 'Đường trung trực',
  complexFunction: 'Hàm số',
  unknown: 'Đối tượng',
};

const STATUS_TEXT: Record<SpeechStatus, string> = {
  idle: 'Nhấn vào đối tượng trên hình để nghe giải thích',
  thinking: 'Đang phân tích đối tượng…',
  speaking: 'Đang giảng…',
  error: 'Có lỗi xảy ra',
};

// Set to true to auto-read the AI overview aloud when a material finishes loading.
const AUTO_READ_OVERVIEW = false;

export function GeoGebraTutor() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { state, speak, speakText, stop, unlock } = useTutorSpeech();

  // Initialise from URL ?url= param so shared links load directly.
  const initialUrl = searchParams.get('url') ?? '';
  const initialId = initialUrl ? parseMaterialId(initialUrl) : null;
  const [materialId, setMaterialId] = useState<string | null>(initialId);
  const [urlInput, setUrlInput] = useState(initialUrl);
  const [urlError, setUrlError] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('3d');
  const [activeTab, setActiveTab] = useState<'overview' | 'qa' | 'exercises'>('overview');
  const [construction, setConstruction] = useState<ConstructionOverview | null>(null);
  const [entries, setEntries] = useState<ConstructionEntry[] | null>(null);
  const [refreshExercisesWhenReady, setRefreshExercisesWhenReady] = useState(false);
  const { state: descriptionState, refresh: refreshDescription } = useConstructionDescription(entries, materialId);

  const objectData = entries?.slice(0, 60).map((e) => {
    const parts = [`${e.name} (${e.category})`];
    if (e.value && e.value !== e.name) parts.push(`= ${e.value}`);
    if (e.definition && e.definition !== e.name) parts.push(`[${e.definition}]`);
    return parts.join(' ');
  }).join('\n');

  const { state: exercisesState, refresh: refreshExercises } = useExercises(
    descriptionState.status === 'ready' ? descriptionState.description : undefined,
    objectData,
    materialId,
  );

  useEffect(() => {
    if (!refreshExercisesWhenReady) return;
    if (descriptionState.status === 'ready') {
      refreshExercises();
      setRefreshExercisesWhenReady(false);
    }
    if (descriptionState.status === 'idle' || descriptionState.status === 'error') {
      setRefreshExercisesWhenReady(false);
    }
  }, [descriptionState.status, refreshExercises, refreshExercisesWhenReady]);

  // Auto-read the construction overview as soon as AI generates it.
  // Controlled by AUTO_READ_OVERVIEW constant above.
  useEffect(() => {
    if (!AUTO_READ_OVERVIEW) return;
    if (descriptionState.status === 'ready' && descriptionState.description) {
      void speakText(descriptionState.description);
    }
  }, [descriptionState.status, descriptionState.description, speakText]);

  const handleObjectClick = useCallback(
    (info: ObjectInfo) => {
      void speak(info, descriptionState.status === 'ready' ? descriptionState.description : undefined);
    },
    [speak, descriptionState],
  );

  const handleReady = useCallback((api: GeoGebraApi) => {
    const overview = enumerateObjects(api);
    setConstruction(overview);
    setEntries(overview.entries);
  }, []);

  function handleUrlSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!urlInput.trim()) {
      // Empty input — clear current material.
      setUrlError('');
      stop();
      setConstruction(null);
      setEntries(null);
      setMaterialId(null);
      router.push('', { scroll: false });
      return;
    }
    const id = parseMaterialId(urlInput);
    if (!id) {
      setUrlError('Link không hợp lệ. Ví dụ: https://www.geogebra.org/classic/jyvesbjk');
      return;
    }
    setUrlError('');
    unlock();
    stop();
    // Same material — keep existing data, just stop audio.
    if (id === materialId) return;
    setConstruction(null);
    setEntries(null);
    setMaterialId(id);
    router.push(`?url=${encodeURIComponent(urlInput)}`, { scroll: false });
  }

  const isBusy = state.status === 'thinking' || state.status === 'speaking';

  return (
    <main className="flex h-dvh w-full flex-col gap-3 overflow-hidden px-3 py-4 lg:px-5 lg:py-5">
      {/* URL input bar */}
      <form
        onSubmit={handleUrlSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
        aria-label="Tải bài GeoGebra"
      >
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-black/10 shadow-sm backdrop-blur focus-within:ring-2 focus-within:ring-[var(--color-chalk)]">
          <svg
            className="h-4 w-4 shrink-0 text-[var(--color-ink)]/40"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden
          >
            <path d="M10 2a6 6 0 0 0-6 6c0 3.25 2.5 5.92 5.75 6.97l.25.08V17a1 1 0 0 0 2 0v-2.95l.25-.08C15.5 13.92 18 11.25 18 8a6 6 0 0 0-6-6H10Zm0 2h-.01A4 4 0 0 1 14 8c0 1.98-1.26 3.72-3.08 4.47L10 12.53l-.92-.06A4.4 4.4 0 0 1 6 8a4 4 0 0 1 4-4Z" />
          </svg>
          <input
            type="url"
            inputMode="url"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              if (urlError) setUrlError('');
            }}
            placeholder="Dán link GeoGebra… vd: geogebra.org/classic/jyvesbjk"
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink)]/40 outline-none"
            aria-describedby={urlError ? 'url-error' : undefined}
          />
        </div>
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-[var(--color-chalk)] px-5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--color-chalk-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-chalk)]"
        >
          Tải bài
        </button>
        <button
          type="button"
          onClick={() => {
            setRefreshExercisesWhenReady(true);
            refreshDescription();
          }}
          disabled={!materialId || descriptionState.status === 'loading' || exercisesState.status === 'loading'}
          className="shrink-0 cursor-pointer rounded-xl border border-black/10 bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--color-ink)]/70 shadow-sm transition hover:bg-white hover:text-[var(--color-ink)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Phân tích lại
        </button>

        {/* 2D / 3D view toggle */}
        <div
          role="group"
          aria-label="Chế độ xem"
          className="flex shrink-0 rounded-xl bg-black/8 p-1 gap-0.5"
        >
          {([
            { mode: '2d', label: '2D' },
            { mode: '3d', label: '3D' },
            { mode: '2d3d', label: '2D/3D' },
          ] as const).map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              aria-pressed={viewMode === mode}
              className={`cursor-pointer rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
                viewMode === mode
                  ? 'bg-white text-[var(--color-ink)] shadow-sm'
                  : 'text-[var(--color-ink)]/50 hover:text-[var(--color-ink)]/80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </form>

      {urlError && (
        <p id="url-error" role="alert" className="text-xs text-red-600">
          {urlError}
        </p>
      )}

      <TutorCard
        status={state.status}
        caption={state.caption}
        category={state.category}
        objectName={state.objectName}
        error={state.error}
        isBusy={isBusy}
        onStop={stop}
      />

      {/* Main grid — fills remaining viewport height */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_380px] lg:gap-5">
        {/* Applet column — fixed, never scrolls */}
        <section
          aria-label="Bảng vẽ tương tác"
          className="min-h-0 w-full overflow-hidden rounded-[var(--radius-card)] bg-white/80 p-1 shadow-[var(--shadow-soft)] ring-1 ring-black/5 backdrop-blur"
        >
          {materialId ? (
            <GeoGebraApplet
              key={`${materialId}-${viewMode}`}
              materialId={materialId}
              viewMode={viewMode}
              onObjectClick={handleObjectClick}
              onReady={handleReady}
            />
          ) : (
            <AppletPlaceholder />
          )}
        </section>

        {/* Tutor column — scrolls independently */}
        <aside className="flex min-h-0 flex-col overflow-y-auto pb-4">
          {/* Tab bar */}
          <div className="flex border-b border-black/8 mb-5">
            {([
              { key: 'overview', label: 'Tổng quan' },
              { key: 'qa', label: 'Hỏi đáp' },
              { key: 'exercises', label: 'Bài tập' },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`cursor-pointer flex-1 py-2 text-sm font-semibold transition ${
                  activeTab === key
                    ? 'border-b-2 border-[var(--color-chalk)] text-[var(--color-chalk)]'
                    : 'text-[var(--color-ink)]/50 hover:text-[var(--color-ink)]/80'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="flex flex-col gap-5">
              <OverviewPanel state={descriptionState} />
              {construction && (
                <ConstructionPanel
                  overview={construction}
                  panelContent={descriptionState.panelContent}
                />
              )}
              <FormulasPanel
                formulas={descriptionState.formulas}
                loading={descriptionState.status === 'loading'}
                analyzed={descriptionState.status === 'ready' || descriptionState.status === 'error'}
              />
            </div>
          )}

          {activeTab === 'qa' && (
            <QAPanel
              constructionContext={descriptionState.status === 'ready' ? descriptionState.description : undefined}
              entries={entries ?? undefined}
              disabled={!entries}
              materialId={materialId ?? undefined}
            />
          )}

          {activeTab === 'exercises' && (
            <ExercisesPanel state={exercisesState} />
          )}
        </aside>
      </div>
    </main>
  );
}

interface TutorCardProps {
  status: SpeechStatus;
  caption: string;
  category: GgbCategory | null;
  objectName: string | null;
  error: string | null;
  isBusy: boolean;
  onStop: () => void;
}

const CATEGORY_ICON: Partial<Record<string, string>> = {
  // Points
  'Điểm': '·',
  'Giao điểm': '✕',
  'Trung điểm': '⊙',
  'Đỉnh': '▲',
  'Tiêu điểm': '✦',
  'Trọng tâm': 'G',
  'Tâm ngoại tiếp': 'O',
  'Tâm nội tiếp': 'I',
  'Trực tâm': 'H',
  // Lines
  'Đường thẳng': '/',
  'Đoạn thẳng / Cạnh': '—',
  'Tia': '→',
  'Vectơ': '⇒',
  'Tiếp tuyến': '⌇',
  'Tiệm cận': '⋯',
  'Đường cao': 'h',
  'Đường trung tuyến': 'm',
  'Đường phân giác': 'd',
  'Đường trung trực': '⊥',
  // Circles/arcs
  'Đường tròn': '○',
  'Cung tròn': '◠',
  // Triangles
  'Tam giác đều': '△',
  'Tam giác': '△',
  // Quadrilateral family
  'Hình vuông': '□',
  'Hình chữ nhật': '▭',
  'Hình thoi': '◇',
  'Hình bình hành': '▱',
  'Hình thang': '⏢',
  'Tứ giác': '◻',
  // Other polygons
  'Ngũ giác': '⬠',
  'Lục giác': '⬡',
  'Đa giác': '⬡',
  // Conics
  'Parabol': '∪',
  'Elip': '⬭',
  'Hypebol': '⌒',
  // Functions
  'Hàm số': 'f',
  // 3D
  'Mặt phẳng': '⬜',
  'Hình khối': '▲',
  // Misc
  'Góc': '∠',
  'Số': '#',
  'Ma trận': '⊞',
  'Danh sách': '≡',
  'Đúng/Sai': '?',
  'Văn bản': 'T',
};

function OverviewPanel({ state }: { state: DescriptionState }) {
  if (state.status === 'idle') return null;

  return (
    <div className="rounded-[var(--radius-card)] bg-white/80 ring-1 ring-black/6 p-4 shadow-sm backdrop-blur">
      <div className="mb-2 flex items-center gap-2">
        <h2 className="text-xs font-bold text-[var(--color-chalk-deep)]">
          Tổng quan bài
        </h2>
      </div>

      {state.status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]/50">
          <span className="tutor-orb is-speaking" aria-hidden />
          Đang phân tích bài…
        </div>
      )}

      {state.status === 'ready' && (
        <p className="text-sm leading-relaxed text-[var(--color-ink)]/80">
          {state.description}
        </p>
      )}

      {state.status === 'error' && (
        <p className="text-sm text-[var(--color-ink)]/40">Không thể tải tổng quan.</p>
      )}
    </div>
  );
}

function parseBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.+?)\*\*/);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-[var(--color-ink)]/90">{part}</strong> : part
  );
}

function PanelLine({ line }: { line: string }) {
  if (line === '') return <div className="h-2" />;

  // **Tên hình chính** → header với accent border trái
  if (/^\*\*.+\*\*$/.test(line.trim())) {
    return (
      <div className="mb-1 mt-2 flex items-center gap-2 first:mt-0">
        <span className="h-4 w-1 shrink-0 rounded-full bg-[var(--color-chalk)]" />
        <p className="text-sm font-bold text-[var(--color-ink)]">
          {line.trim().slice(2, -2)}
        </p>
      </div>
    );
  }

  // • Key: value → tách key đậm / value nhạt
  if (line.trimStart().startsWith('•')) {
    const content = line.replace(/^\s*•\s*/, '');
    const colonIdx = content.indexOf(':');
    if (colonIdx > 0) {
      const key = content.slice(0, colonIdx).trim();
      const rawValue = content.slice(colonIdx + 1).trim();
      const value = rawValue.replace(/^(\**)([a-zàáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ])/, (_, stars, ch) => stars + ch.toUpperCase());
      return (
        <div className="flex items-baseline gap-2 rounded-lg px-2 py-1 text-sm hover:bg-black/4">
          <span className="w-20 shrink-0 font-medium text-[var(--color-ink)]/85">{key}</span>
          <span className="shrink-0 text-[var(--color-ink)]/30">·</span>
          <span className="text-[var(--color-ink)]/60">{parseBold(value)}</span>
        </div>
      );
    }
    return (
      <div className="rounded-lg px-2 py-1 text-sm text-[var(--color-ink)]/70 hover:bg-black/4">
        {parseBold(content)}
      </div>
    );
  }

  return <p className="px-2 text-sm leading-snug text-[var(--color-ink)]/65">{parseBold(line)}</p>;
}

function ConstructionPanel({ overview, panelContent }: { overview: ConstructionOverview; panelContent?: string }) {
  const hasRichPanel = Boolean(panelContent);

  return (
    <div className="rounded-[var(--radius-card)] bg-white/70 ring-1 ring-black/8 p-4 shadow-sm backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-bold text-[var(--color-chalk-deep)]">
          Mô tả hình học
        </h2>
        <span className="rounded-full bg-[var(--color-chalk)]/12 px-2 py-0.5 text-xs font-semibold text-[var(--color-chalk-deep)]">
          {overview.total} đối tượng
        </span>
      </div>

      {hasRichPanel && (
        <div className="flex max-h-80 flex-col overflow-y-auto pr-1">
          {panelContent!.split('\n').map((line, i) => (
            <PanelLine key={i} line={line} />
          ))}
        </div>
      )}
    </div>
  );
}

function FormulasPanel({ formulas, loading, analyzed }: { formulas: Formula[]; loading?: boolean; analyzed?: boolean }) {
  if (loading) {
    return (
      <div className="rounded-[var(--radius-card)] bg-white/70 p-4 shadow-sm ring-1 ring-black/8 backdrop-blur">
        <div className="mb-3 h-3 w-28 animate-pulse rounded bg-black/10" />
        <div className="flex flex-col gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-black/5 p-3">
              <div className="mb-2 h-3 w-36 rounded bg-black/10" />
              <div className="h-6 w-48 rounded bg-black/8" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (formulas.length === 0) {
    const msg = analyzed
      ? 'Bài này không có công thức cơ bản liên quan.'
      : 'Nhấn Phân tích lại để tải công thức.';
    return (
      <div className="rounded-[var(--radius-card)] bg-white/70 p-4 shadow-sm ring-1 ring-black/8 backdrop-blur">
        <h2 className="text-xs font-bold text-[var(--color-chalk-deep)]">Công thức cơ bản</h2>
        <p className="mt-2 text-sm text-[var(--color-ink)]/40">{msg}</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] bg-white/70 p-4 shadow-sm ring-1 ring-black/8 backdrop-blur">
      <h2 className="mb-3 text-xs font-bold text-[var(--color-chalk-deep)]">
        Công thức cơ bản
      </h2>
      <div className="flex flex-col gap-2">
        {formulas.map((f, i) => (
          <div key={i} className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="mb-1.5 text-xs font-semibold text-slate-600">{f.name}</div>
            <div className="rounded-lg bg-white px-3 py-2 font-mono text-sm font-bold tracking-wide text-slate-800 ring-1 ring-slate-200">
              {f.formula}
            </div>
            {f.note && (
              <div className="mt-1.5 text-[11px] leading-snug text-slate-400">{f.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppletPlaceholder() {
  return (
    <div className="flex min-h-[clamp(480px,calc(100dvh-160px),900px)] flex-col items-center justify-center gap-4 text-[var(--color-ink)]/40">
      <svg
        className="h-16 w-16 opacity-30"
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden
      >
        <rect x="8" y="8" width="48" height="48" rx="6" />
        <path d="M8 24h48M24 24v32" />
        <circle cx="40" cy="40" r="8" />
        <path d="M16 16h4M16 32h4" />
      </svg>
      <p className="text-center text-sm font-medium">
        Dán link GeoGebra vào ô trên
        <br />
        rồi nhấn <strong className="text-[var(--color-chalk-deep)]">Tải bài</strong> để bắt đầu.
      </p>
    </div>
  );
}

function TutorCard({
  status,
  caption,
  category,
  objectName,
  error,
  isBusy,
  onStop,
}: TutorCardProps) {
  const text = status === 'error'
    ? (error ?? STATUS_TEXT.error)
    : caption || STATUS_TEXT[status];

  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-700 px-4 py-2.5 shadow-sm">
      <span
        className={`tutor-orb shrink-0 ${status === 'speaking' ? 'is-speaking' : ''}`}
        aria-hidden
      />
      <p
        aria-live="polite"
        aria-atomic="true"
        className="min-w-0 flex-1 truncate text-sm text-white/90"
        role="status"
      >
        {text}
      </p>
      {category && objectName && (
        <span className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold text-white">
          {CATEGORY_LABEL[category]} {objectName}
        </span>
      )}
      <button
        type="button"
        onClick={onStop}
        disabled={!isBusy}
        className="shrink-0 cursor-pointer rounded-lg bg-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-30"
      >
        Dừng
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exercises Panel
// ---------------------------------------------------------------------------

const DIFFICULTY_BADGE: Record<Exercise['difficulty'], { label: string; className: string }> = {
  basic: { label: 'Cơ bản', className: 'bg-green-100 text-green-700' },
  medium: { label: 'Trung bình', className: 'bg-yellow-100 text-yellow-700' },
  advanced: { label: 'Nâng cao', className: 'bg-red-100 text-red-700' },
};

function ExercisesPanel({ state }: { state: ExercisesState }) {
  if (state.status === 'loading') {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-white p-4 ring-1 ring-black/8">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-black/8" />
              <div className="h-3 w-16 rounded bg-black/8" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-black/6" />
              <div className="h-3 w-3/4 rounded bg-black/6" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="rounded-2xl bg-red-50 p-4 ring-1 ring-red-200">
        <p className="text-sm text-red-700">Không thể tải bài tập. Thử nhấn Phân tích lại.</p>
      </div>
    );
  }

  if (state.status === 'ready' && state.exercises.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-black/8">
        <p className="text-sm text-[var(--color-ink)]/40">Chưa có bài tập. Nhấn Phân tích lại để tạo.</p>
      </div>
    );
  }

  if (state.status === 'ready' && state.exercises.length > 0) {
    return (
      <div className="flex flex-col gap-3">
        {state.exercises.map((ex, i) => {
          const badge = DIFFICULTY_BADGE[ex.difficulty] ?? DIFFICULTY_BADGE.basic;
          return (
            <details key={i} className="group rounded-2xl bg-white shadow-sm ring-1 ring-black/8">
              <summary className="flex cursor-pointer list-none items-start gap-3 p-4 select-none">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)]/8 text-[11px] font-bold text-[var(--color-ink)]/50">
                  {i + 1}
                </span>
                <div className="flex flex-1 flex-col gap-2">
                  <span
                    className={`w-fit rounded-full px-2.5 py-0.5 text-[10px] font-bold leading-none ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  {renderQuestion(ex.question)}
                </div>
                <svg className="mt-1 h-4 w-4 shrink-0 text-[var(--color-ink)]/30 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="border-t border-black/6 px-4 pb-4 pt-3">
                <div className="mb-2 text-[10px] font-bold  text-blue-500">Lời giải</div>
                <div className="flex flex-col">
                  {renderSolution(ex.solution)}
                </div>
              </div>
            </details>
          );
        })}
      </div>
    );
  }

  // idle — no material loaded yet
  return (
    <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-black/8">
      <p className="text-sm text-[var(--color-ink)]/40">Tải bài GeoGebra để xem bài tập.</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Q&A Panel
// ---------------------------------------------------------------------------

interface QAMessage { q: string; a: string }

/** Render a Q&A answer string, highlighting formula lines (starting with "="). */
/** Convert a line containing Unicode math symbols to a KaTeX-renderable LaTeX string. */
function lineToLatex(line: string): string {
  return line
    .replace(/\((\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\)/g, '\\frac{$1}{$2}') // (1/2) → \frac
    .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')   // √(...) → \sqrt{...}
    .replace(/√(\w+)/g, '\\sqrt{$1}')          // √x → \sqrt{x}
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/²/g, '^{2}')
    .replace(/³/g, '^{3}')
    .replace(/°/g, '^{\\circ}')
    .replace(/△/g, '\\triangle\\,')
    .replace(/∠/g, '\\angle ')
    .replace(/⊥/g, '\\perp')
    .replace(/∥/g, '\\parallel')
    .replace(/≅/g, '\\cong')
    .replace(/∼/g, '\\sim')
    .replace(/⟹/g, '\\Rightarrow ')
    .replace(/→/g, '\\rightarrow ')
    .replace(/π/g, '\\pi');
}

/** KaTeX inline render (for Q&A answer lines). Falls back to escaped text. */
function renderKatexInline(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: false, output: 'html' });
  } catch {
    return latex;
  }
}

/** Render a Q&A answer string, highlighting formula lines (starting with "="). */
function renderAnswer(text: string) {
  return text.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-1" />;
    if (t.startsWith('=')) {
      return (
        <div
          key={i}
          className="my-0.5 max-w-full overflow-x-auto rounded bg-[var(--color-chalk)]/10 px-2 py-1"
          dangerouslySetInnerHTML={{ __html: renderKatexInline(lineToLatex(t)) }}
        />
      );
    }
    return <div key={i} className="leading-snug">{t}</div>;
  });
}

/** Sanitize a unit string before embedding in LaTeX \text{...}. Only allow safe chars. */
function sanitizeUnit(unit: string): string {
  return unit.replace(/[^a-zA-ZÀ-ỹ0-9²³°/%·\s]/g, '').trim();
}

/**
 * Render a LaTeX string to HTML using KaTeX (inline mode).
 * KaTeX output is safe for dangerouslySetInnerHTML: it escapes HTML special characters
 * in text nodes and never produces executable markup. Falls back to the raw string.
 */
function renderKatex(latex: string): string {
  try {
    return katex.renderToString(latex, { throwOnError: false, displayMode: true, output: 'html' });
  } catch {
    return latex;
  }
}

/** Render a single structured solution step. */
function renderSolutionStep(step: SolutionStep, i: number) {
  if (step.isConclusion) {
    return (
      <div key={i} className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 ring-1 ring-green-200">
        {step.text}
      </div>
    );
  }

  if (step.expr) {
    const computed = evalExpr(step.expr);
    const latex = toLaTeX(step.expr);
    const unit = step.unit ? `\\text{ (${sanitizeUnit(step.unit)})}` : '';
    const resultLatex = computed !== null
      ? `${latex ?? step.expr} = \\boldsymbol{${formatNumber(computed)}}${unit}`
      : (latex ?? step.expr);
    return (
      <div key={i} className="my-1 rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200">
        <div className="mb-1 text-sm text-[var(--color-ink)]/80">{step.text}</div>
        <div
          className="max-w-full overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: renderKatex(resultLatex) }}
        />
      </div>
    );
  }

  const stepMatch = /^(Bước\s*\d+\s*:)(.*)/i.exec(step.text);
  if (stepMatch) {
    return (
      <div key={i} className="mt-3 first:mt-0">
        <span className="text-[11px] font-bold uppercase tracking-wide text-blue-600">{stepMatch[1]}</span>
        {stepMatch[2] && <span className="ml-1 text-sm text-[var(--color-ink)]/85">{stepMatch[2]}</span>}
      </div>
    );
  }

  if (/^Ta có\s*:/i.test(step.text)) {
    return (
      <div key={i} className="mt-2 text-sm italic text-[var(--color-ink)]/70">
        {step.text}
      </div>
    );
  }

  return (
    <div key={i} className="text-sm leading-relaxed text-[var(--color-ink)]/80">
      {step.text}
    </div>
  );
}

/** Render exercise solution — handles both StructuredSolution and legacy string. */
function renderSolution(solution: StructuredSolution | string) {
  if (typeof solution === 'string') {
    // Legacy string format (v2 cache)
    return solution.split('\n').map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} className="h-2" />;
      const stepMatch = /^(Bước\s*\d+\s*:)(.*)/i.exec(t);
      if (stepMatch) {
        return (
          <div key={i} className="mt-3 first:mt-0">
            <span className="text-[11px] font-bold uppercase tracking-wide text-blue-600">{stepMatch[1]}</span>
            {stepMatch[2] && <span className="ml-1 text-sm text-[var(--color-ink)]/85">{stepMatch[2]}</span>}
          </div>
        );
      }
      if (/^Kết luận\s*:/i.test(t)) {
        return (
          <div key={i} className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-800 ring-1 ring-green-200">
            {t}
          </div>
        );
      }
      if (t.startsWith('=') || /^\d+\s*[×x*/+\-]/.test(t)) {
        return <div key={i} className="my-0.5 rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">{t}</div>;
      }
      return <div key={i} className="text-sm leading-relaxed text-[var(--color-ink)]/80">{t}</div>;
    });
  }

  return solution.steps.map((step, i) => renderSolutionStep(step, i));
}

/** Split exercise question into context sentences + task sentence for visual clarity. */
function renderQuestion(text: string) {
  const sentences = text.split(/(?<=\.)\s+/).filter(Boolean);
  const taskKeywords = /^(Tính|Chứng minh|Hãy|Xác định|So sánh|Tìm|Giải|Biết rằng|Cho biết)/i;
  const taskIdx = sentences.findIndex((s) => taskKeywords.test(s.trim()));
  const contextSentences = taskIdx >= 0 ? sentences.slice(0, taskIdx) : sentences.slice(0, -1);
  const taskSentences = taskIdx >= 0 ? sentences.slice(taskIdx) : sentences.slice(-1);

  return (
    <div className="flex flex-col gap-2">
      {contextSentences.length > 0 && (
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm leading-relaxed text-blue-900 ring-1 ring-blue-100">
          {contextSentences.join(' ')}
        </div>
      )}
      {taskSentences.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold leading-relaxed text-amber-900 ring-1 ring-amber-200">
          {taskSentences.join(' ')}
        </div>
      )}
    </div>
  );
}

const FALLBACK_QUESTIONS = [
  'Hình này có đặc điểm gì nổi bật?',
  'Các cạnh có quan hệ gì với nhau?',
  'Góc ở đỉnh bằng bao nhiêu độ?',
  'Diện tích tính như thế nào?',
];

// Module-level cache: survives tab switches and component remounts.
const suggestionsCache = new Map<string, string[]>();

const SUGGESTIONS_CACHE_PREFIX = 'ggb-suggestions-v1::';

function loadSuggestionsFromStorage(materialId: string): string[] | null {
  try {
    const raw = sessionStorage.getItem(SUGGESTIONS_CACHE_PREFIX + materialId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
    return null;
  } catch {
    return null;
  }
}

function saveSuggestionsToStorage(materialId: string, questions: string[]): void {
  try {
    sessionStorage.setItem(SUGGESTIONS_CACHE_PREFIX + materialId, JSON.stringify(questions));
  } catch {
    // quota exceeded — skip
  }
}

const QA_CACHE_PREFIX = 'ggb-qa-v1::';

function loadQAFromStorage(materialId: string): QAMessage[] {
  try {
    const raw = sessionStorage.getItem(QA_CACHE_PREFIX + materialId);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as QAMessage[]).filter((m) => m.q && m.a && !m.a.startsWith('⚠'));
  } catch {
    return [];
  }
}

function saveQAToStorage(materialId: string, messages: QAMessage[]): void {
  try {
    const complete = messages.filter((m) => m.a !== '' && !m.a.startsWith('⚠'));
    sessionStorage.setItem(QA_CACHE_PREFIX + materialId, JSON.stringify(complete));
  } catch {
    // quota exceeded — skip
  }
}

function QAPanel({ constructionContext, entries, disabled, materialId }: {
  constructionContext?: string;
  entries?: ConstructionEntry[];
  disabled?: boolean;
  materialId?: string;
}) {
  const [messages, setMessages] = useState<QAMessage[]>(
    () => (materialId ? loadQAFromStorage(materialId) : []),
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const materialIdRef = useRef(materialId);

  useEffect(() => {
    if (materialId === materialIdRef.current) return;
    materialIdRef.current = materialId;
    setMessages(materialId ? loadQAFromStorage(materialId) : []);
    setInput('');
  }, [materialId]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(() => {
    if (constructionContext) {
      const l1 = suggestionsCache.get(constructionContext);
      if (l1) return l1;
    }
    if (materialId) {
      const l2 = loadSuggestionsFromStorage(materialId);
      if (l2) return l2;
    }
    return FALLBACK_QUESTIONS;
  });
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!constructionContext) return;

    const l1 = suggestionsCache.get(constructionContext);
    if (l1) { setSuggestedQuestions(l1); return; }

    if (materialId) {
      const l2 = loadSuggestionsFromStorage(materialId);
      if (l2) {
        suggestionsCache.set(constructionContext, l2);
        setSuggestedQuestions(l2);
        return;
      }
    }

    setLoadingSuggestions(true);
    const objectData = entriesRef.current
      ?.slice(0, 60)
      .map((e) => {
        const parts = [`${e.name} (${e.category})`];
        if (e.value && e.value !== e.name) parts.push(`= ${e.value}`);
        if (e.definition && e.definition !== e.name) parts.push(`[${e.definition}]`);
        return parts.join(' ');
      })
      .join('\n');

    fetch('/api/geogebra/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ constructionContext, objectData }),
    })
      .then((res) => res.json() as Promise<{ questions?: string[]; error?: string }>)
      .then((data) => {
        if (data.questions && data.questions.length > 0) {
          suggestionsCache.set(constructionContext, data.questions);
          if (materialId) saveSuggestionsToStorage(materialId, data.questions);
          setSuggestedQuestions(data.questions);
        }
      })
      .catch(() => { /* keep fallback */ })
      .finally(() => setLoadingSuggestions(false));
  }, [constructionContext, materialId]);

  useEffect(() => {
    if (materialId && messages.some((m) => m.a !== '')) {
      saveQAToStorage(materialId, messages);
    }
  }, [messages, materialId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading || disabled) return;
    setInput('');

    // Show question immediately; answer filled in when response arrives.
    const idx = messages.length;
    setMessages((prev) => [...prev, { q, a: '' }]);
    setLoading(true);

    try {
      const res = await fetch('/api/geogebra/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          constructionContext,
          objectData: entries
            ?.slice(0, 60)
            .map((e) => {
              const parts = [`${e.name} (${e.category})`];
              if (e.value && e.value !== e.name) parts.push(`= ${e.value}`);
              if (e.definition && e.definition !== e.name) parts.push(`[${e.definition}]`);
              return parts.join(' ');
            })
            .join('\n'),
          history: messages.filter((m) => m.a !== ''),
        }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (data.error) {
        setMessages((prev) => prev.map((m, i) => i === idx ? { ...m, a: `⚠ ${data.error}` } : m));
        return;
      }
      setMessages((prev) => prev.map((m, i) => i === idx ? { ...m, a: data.answer ?? '' } : m));
    } catch {
      setMessages((prev) => prev.map((m, i) => i === idx ? { ...m, a: '⚠ Không kết nối được. Thử lại nhé.' } : m));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-card)] bg-white/80 p-4 shadow-[var(--shadow-soft)] ring-1 ring-black/5 backdrop-blur">
      {messages.length === 0 && (
        <div className="mb-4">
          <p className="mb-1 text-sm font-semibold text-[var(--color-ink)]/80">Bạn muốn hỏi gì về bài này?</p>
          <p className="mb-3 text-xs text-[var(--color-ink)]/50">Đặt câu hỏi về hình học, tính chất, hoặc cách tính toán của bài đang xem.</p>
          <div className="flex flex-wrap gap-2">
            {loadingSuggestions
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-6 w-28 animate-pulse rounded-full bg-[var(--color-chalk)]/10"
                  />
                ))
              : suggestedQuestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={disabled}
                    onClick={() => setInput(q)}
                    className="rounded-full border border-[var(--color-chalk)]/30 bg-[var(--color-chalk)]/6 px-3 py-1 text-xs text-[var(--color-chalk-deep)] transition hover:bg-[var(--color-chalk)]/15 disabled:opacity-40"
                  >
                    {q}
                  </button>
                ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => {
              setMessages([]);
              if (materialId) {
                try { sessionStorage.removeItem(QA_CACHE_PREFIX + materialId); } catch { /* skip */ }
              }
            }}
            className="text-xs text-[var(--color-ink)]/40 transition hover:text-[var(--color-ink)]/70"
          >
            Xóa lịch sử
          </button>
        </div>
      )}

      <div className="mb-3 flex min-h-[180px] flex-col gap-3">
        {messages.map((m, i) => (
          <div key={i} className="flex flex-col gap-1">
            <div className="self-end rounded-2xl rounded-br-sm bg-[var(--color-chalk)] px-3 py-2 text-sm text-white">
              {m.q}
            </div>
            {m.a === '' ? (
              <div className="self-start rounded-2xl rounded-bl-sm bg-black/5 px-3 py-2 text-sm text-[var(--color-ink)]/50 italic">
                Đang xử lý…
              </div>
            ) : (
              <div className="self-start rounded-2xl rounded-bl-sm bg-black/5 px-3 py-2 text-sm text-[var(--color-ink)]">
                {renderAnswer(m.a)}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? 'Tải bài GeoGebra trước…' : 'Hỏi về bài hình học này…'}
          disabled={disabled || loading}
          className="min-w-0 flex-1 rounded-xl bg-black/5 px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink)]/40 outline-none focus:ring-2 focus:ring-[var(--color-chalk)] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !input.trim() || loading}
          className="cursor-pointer rounded-xl bg-[var(--color-chalk)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-chalk-deep)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Gửi
        </button>
      </form>
    </div>
  );
}
