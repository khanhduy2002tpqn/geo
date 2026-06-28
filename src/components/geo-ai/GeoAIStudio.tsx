'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import type { Scene3DHandle } from './viewer/Scene3D'
import { useGeoAICache } from '@/hooks/geo-ai/useGeoAICache'
import { useVoiceTutor } from '@/hooks/geo-ai/useVoiceTutor'
import { useConstructionSteps } from '@/hooks/geo-ai/useConstructionSteps'
import { useVirtualExperiment } from '@/hooks/geo-ai/useVirtualExperiment'
import { useDisplaySettings } from '@/hooks/geo-ai/useDisplaySettings'
import { useMeasurementTool } from '@/hooks/geo-ai/useMeasurementTool'
import { useKeyboardShortcuts } from '@/hooks/geo-ai/useKeyboardShortcuts'
import { CYLINDER_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/cylinderVolume'
import { CONE_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/coneVolume'
import { SPHERE_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/sphereVolume'
import { CUBE_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/cubeVolume'
import { RECTANGULAR_PRISM_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/rectangularPrismVolume'
import { TRIANGULAR_PRISM_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/triangularPrismVolume'
import { PYRAMID_VOLUME_EXPERIMENT } from '@/lib/geo-ai/experiments/pyramidVolume'
import { GeometryEngine } from '@/lib/geo-ai/geometry-engine'
import { edgeExplanation, measuredEdgeExplanation } from '@/lib/geo-ai/speech/edgeExplanation'
import { getShape } from '@/lib/geo-ai/data'
import type { ExampleDef } from '@/lib/geo-ai/data/types'
import { useShapeData, useExamples } from '@/hooks/geo-ai/useShapeData'
import { useShowcaseShapes } from '@/hooks/geo-ai/useShowcaseShapes'
import { usePathParam } from '@/hooks/usePathParam'
import { GeoAIHeader } from './layout/GeoAIHeader'
import { ThreePanelLayout } from './layout/ThreePanelLayout'
import { ExampleLibraryPanel } from './layout/ExampleLibraryPanel'
import ConstructionSteps from './construction/ConstructionSteps'
import StepNavigator from './construction/StepNavigator'
import VoiceTutorOverlay from './voice/VoiceTutorOverlay'
import { FloatingChat } from './FloatingChat'
import { ViewerTopToolbar } from './viewer/ViewerTopToolbar'
import FormulaDiscovery from './educational/FormulaDiscovery'
import VirtualExperiment from './educational/VirtualExperiment'
import { DisplaySettingsPanel } from '@/components/geo-ai/viewer/DisplaySettings'
import { GeometryInfoPanel } from '@/components/geo-ai/viewer/GeometryInfoPanel'
import { MeasurementPanel } from '@/components/geo-ai/viewer/MeasurementPanel'
import type { ConstructionStep, GeometryModel, GeometrySpec, StepVisibility, UnfoldMode } from '@/types/geo-ai'
import type { VirtualExperiment as VirtualExperimentType } from '@/types/geo-ai'

const Scene3D = dynamic(
  () => import('./viewer/Scene3D').then((m) => ({ default: m.Scene3D })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-slate-500">
        Đang tải 3D...
      </div>
    ),
  },
)

const PracticePanel = dynamic(
  () => import('./educational/PracticePanel').then((m) => ({ default: m.PracticePanel })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-950 text-slate-400">
        Đang tải bài tập...
      </div>
    ),
  },
)

const TeacherWorkspacePanel = dynamic(
  () => import('./educational/FormulaDiscovery').then((m) => ({ default: m.TeacherWorkspace })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-slate-950 text-slate-400">
        Đang tải quản lý bài tập...
      </div>
    ),
  },
)

type Mode = 'explore' | 'construct' | 'experiment' | 'qa' | 'info' | 'measure'
type ConstructSection = 'shape' | 'formula' | null
type FormulaKind = 'total' | 'lateral' | 'volume'
type FormulaSurfaceKind = Exclude<FormulaKind, 'volume'>

// Max time to hold the deep-link loading state while waiting for the
// examples catalog before falling back to the homepage.
const DEEP_LINK_TIMEOUT_MS = 10_000

const MODE_LABELS: Record<Mode, string> = {
  explore: 'Tổng quan',
  construct: 'Xây dựng',
  experiment: 'Ảo nghiệm',
  qa: 'Hỏi đáp',
  info: 'Thông tin',
  measure: 'Đo lường',
}

function buildObjectExplanation(
  id: string,
  type: 'vertex' | 'edge' | 'face',
  model: GeometryModel | null,
): string {
  if (!model) return ''

  // Use pre-generated descriptions from shapes-data when available
  const shapeDesc = getShape(model.spec.shape)
  const objDesc = shapeDesc?.objectDescriptions

  if (type === 'vertex') {
    const rich = objDesc?.vertices?.[id]
    return rich ?? `Đây là đỉnh ${id}.`
  }
  if (type === 'edge') {
    const edge = model.edges.find((e) => e.id === id)
    return edge
      ? edgeExplanation(edge, model.spec.params.unit)
      : objDesc?.edges?.[id] ?? `Đây là cạnh ${id}.`
  }
  if (type === 'face') {
    const rich = objDesc?.faces?.[id]
    return rich ?? `Đây là mặt ${id}.`
  }
  return id
}

function getExperiment(shape: string | undefined): VirtualExperimentType | null {
  if (shape === 'cylinder') return CYLINDER_VOLUME_EXPERIMENT
  if (shape === 'cone') return CONE_VOLUME_EXPERIMENT
  if (shape === 'sphere') return SPHERE_VOLUME_EXPERIMENT
  if (shape === 'cube') return CUBE_VOLUME_EXPERIMENT
  if (shape === 'rectangular_prism') return RECTANGULAR_PRISM_VOLUME_EXPERIMENT
  if (shape === 'triangular_prism') return TRIANGULAR_PRISM_VOLUME_EXPERIMENT
  if (
    shape === 'square_pyramid' ||
    shape === 'triangular_pyramid' ||
    shape === 'tetrahedron' ||
    shape === 'general_pyramid'
  ) return PYRAMID_VOLUME_EXPERIMENT
  return null
}

function FormulaConstructionCard({
  model,
  params,
  canUnfold,
  is2D,
  unfoldMode,
  onUnfoldFull,
  onUnfoldStrip,
  onFold,
  onFormulaFaceLabelsChange,
  onVolumeUnitCubesChange,
}: {
  model: GeometryModel
  params: Record<string, number | undefined>
  canUnfold: boolean
  is2D: boolean
  unfoldMode: UnfoldMode
  onUnfoldFull: () => void
  onUnfoldStrip: () => void
  onFold: () => void
  onFormulaFaceLabelsChange: (mode: 'total' | 'lateral' | null) => void
  onVolumeUnitCubesChange: (progress: number | null) => void
}) {
  const [formulaKind, setFormulaKind] = useState<FormulaKind>('total')
  const [currentFormulaStep, setCurrentFormulaStep] = useState(0)
  const shape = model.spec.shape
  if (shape !== 'cube' && shape !== 'rectangular_prism') return null

  const unit = model.spec.params.unit ?? 'cm'
  const a = params.a ?? model.spec.params.a
  const b = params.b ?? model.spec.params.b
  const c = params.h ?? model.spec.params.h
  const isCube = shape === 'cube'
  const squareUnit = unit ? `${unit}²` : 'đv²'
  const cubeUnit = unit ? `${unit}³` : 'đv³'
  const format = (value: number | undefined) => (
    typeof value === 'number' && Number.isFinite(value)
      ? value.toLocaleString('vi-VN', { maximumFractionDigits: 3 })
      : '?'
  )

  const lateralFormula = isCube
    ? 'Sxq = 4a²'
    : 'Sxq = 2(a + b)c'
  const totalFormula = isCube
    ? 'Stp = 6a²'
    : 'Stp = Sxq + 2ab = 2(ab + ac + bc)'
  const volumeFormula = isCube
    ? 'V = a³'
    : 'V = a · b · c'
  const lateralValue = isCube && typeof a === 'number'
    ? 4 * a * a
    : !isCube && typeof a === 'number' && typeof b === 'number' && typeof c === 'number'
      ? 2 * (a + b) * c
      : undefined
  const totalValue = isCube && typeof a === 'number'
    ? 6 * a * a
    : !isCube && typeof a === 'number' && typeof b === 'number' && typeof c === 'number'
      ? 2 * (a * b + a * c + b * c)
      : undefined
  const volumeValue = isCube && typeof a === 'number'
    ? a * a * a
    : !isCube && typeof a === 'number' && typeof b === 'number' && typeof c === 'number'
      ? a * b * c
      : undefined
  const sideRectangleSize = isCube
    ? 'chiều rộng là a và chiều dài là 4a'
    : 'chiều rộng là c và chiều dài là 2(a+b)'
  const lateralFormulaSteps: ConstructionStep[] = [
    {
      index: 0,
      description: 'Trải phẳng các mặt và bỏ 2 mặt đáy.',
      narration: 'Trải phẳng các mặt và bỏ hai mặt đáy.',
    },
    {
      index: 1,
      description: isCube
        ? 'Diện tích xung quanh của hình lập phương bằng diện tích hình chữ nhật được triển khai từ 4 mặt bên, có chiều rộng là a và chiều dài là 4a.'
        : 'Diện tích xung quanh của hình hộp chữ nhật bằng diện tích của hình chữ nhật được triển khai từ các mặt bên (1), (2), (3), (4) có chiều rộng là c và chiều dài là 2(a+b).',
      narration: isCube
        ? 'Diện tích xung quanh của hình lập phương bằng diện tích hình chữ nhật được triển khai từ bốn mặt bên.'
        : 'Diện tích xung quanh của hình hộp chữ nhật bằng diện tích hình chữ nhật được triển khai từ bốn mặt bên.',
    },
    {
      index: 2,
      description: `Từ đó ta có công thức: ${lateralFormula}.`,
      narration: `Từ đó ta có công thức ${lateralFormula}.`,
    },
  ]
  const totalFormulaSteps: ConstructionStep[] = [
    {
      index: 0,
      description: 'Trải phẳng toàn bộ 6 mặt của hình.',
      narration: 'Trải phẳng toàn bộ sáu mặt của hình.',
    },
    {
      index: 1,
      description: isCube
        ? 'Diện tích toàn phần của hình lập phương bằng tổng diện tích 6 mặt vuông bằng nhau.'
        : 'Diện tích toàn phần của hình hộp chữ nhật bằng tổng diện tích 2 mặt đáy, 2 mặt trước sau và 2 mặt bên.',
      narration: isCube
        ? 'Diện tích toàn phần của hình lập phương bằng tổng diện tích sáu mặt vuông bằng nhau.'
        : 'Diện tích toàn phần của hình hộp chữ nhật bằng tổng diện tích các cặp mặt đối diện.',
    },
    {
      index: 2,
      description: `Từ đó ta có công thức: ${totalFormula}.`,
      narration: `Từ đó ta có công thức ${totalFormula}.`,
    },
  ]
  const volumeFormulaSteps: ConstructionStep[] = [
    {
      index: 0,
      description: isCube
        ? 'Xếp các hình lập phương nhỏ cạnh 1 đơn vị vào trong hình lập phương.'
        : 'Xếp các hình lập phương nhỏ cạnh 1 đơn vị vào trong một hình hộp chữ nhật.',
      narration: isCube
        ? 'Ta xếp các khối lập phương đơn vị vào trong hình lập phương.'
        : 'Ta xếp các khối lập phương đơn vị vào trong hình hộp chữ nhật.',
    },
    {
      index: 1,
      description: isCube
        ? 'Đếm 1 khối lập phương đơn vị: cạnh 1 đơn vị nên thể tích của khối đó là 1 đơn vị khối.'
        : 'Đếm 1 khối lập phương đơn vị: cạnh 1 đơn vị nên thể tích của khối đó là 1 đơn vị khối.',
      narration: isCube
        ? 'Ta bắt đầu bằng một khối lập phương đơn vị.'
        : 'Ta bắt đầu bằng một khối lập phương đơn vị.',
    },
    {
      index: 2,
      description: isCube
        ? `Đếm các khối còn lại theo lớp: mỗi lớp có a · a khối, có a lớp. Từ đó có công thức ${volumeFormula}.`
        : `Đếm các khối còn lại theo lớp: mỗi lớp có a · b khối, có c lớp. Từ đó có công thức ${volumeFormula}.`,
      narration: `Đếm các khối còn lại theo lớp, từ đó ta có công thức thể tích ${volumeFormula}.`,
    },
  ]
  const formulaSteps = formulaKind === 'total'
    ? totalFormulaSteps
    : formulaKind === 'lateral'
      ? lateralFormulaSteps
      : volumeFormulaSteps
  const isFirstFormulaStep = currentFormulaStep === 0
  const isLastFormulaStep = currentFormulaStep === formulaSteps.length - 1
  const volumeProgressForStep = (step: number) => (
    step <= 0 ? 0 : step === 1 ? 0.001 : 1
  )

  function applyUnfoldForFormula(kind: FormulaSurfaceKind) {
    if (!canUnfold || is2D) return
    if (kind === 'total') onUnfoldFull()
    else onUnfoldStrip()
  }

  function selectFormulaKind(kind: FormulaKind) {
    const isChangingKind = kind !== formulaKind
    setFormulaKind(kind)
    setCurrentFormulaStep(0)
    onFormulaFaceLabelsChange(null)
    if (kind === 'volume') {
      onFold()
      onVolumeUnitCubesChange(volumeProgressForStep(0))
    } else {
      onVolumeUnitCubesChange(null)
      if (isChangingKind && unfoldMode !== 'closed') {
        onFold()
      }
    }
  }

  function goToFormulaStep(step: number) {
    const nextStep = Math.min(Math.max(step, 0), formulaSteps.length - 1)
    setCurrentFormulaStep(nextStep)
    if (formulaKind === 'volume') {
      onFormulaFaceLabelsChange(null)
      onFold()
      onVolumeUnitCubesChange(volumeProgressForStep(nextStep))
      return
    }
    onVolumeUnitCubesChange(null)
    onFormulaFaceLabelsChange(nextStep === 2 ? formulaKind : null)
    applyUnfoldForFormula(formulaKind)
  }

  return (
    <section className="rounded-2xl border border-indigo-500/25 bg-indigo-950/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">2. Xây dựng công thức</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Chọn công thức rồi quan sát hình trải phẳng hoặc khối đơn vị tương ứng.
          </p>
        </div>
        <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] font-medium text-indigo-200">
          {formulaKind === 'total' ? 'Stp' : formulaKind === 'lateral' ? 'Sxq' : 'V'}
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          onClick={() => selectFormulaKind('total')}
          className={[
            'rounded-xl border px-3 py-2 text-left transition',
            formulaKind === 'total'
              ? 'border-indigo-400/70 bg-indigo-600/20 text-white'
              : 'border-slate-800 bg-slate-950/45 text-slate-300 hover:border-slate-600',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">1. Công thức diện tích toàn phần</span>
            <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] text-indigo-200">Stp</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Trải đủ 6 mặt để thấy toàn bộ diện tích bề mặt.
          </p>
        </button>

        <button
          type="button"
          onClick={() => selectFormulaKind('lateral')}
          className={[
            'rounded-xl border px-3 py-2 text-left transition',
            formulaKind === 'lateral'
              ? 'border-indigo-400/70 bg-indigo-600/20 text-white'
              : 'border-slate-800 bg-slate-950/45 text-slate-300 hover:border-slate-600',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">2. Công thức diện tích xung quanh</span>
            <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] text-indigo-200">Sxq</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Bỏ 2 mặt đáy, chỉ giữ các mặt bên (1), (2), (3), (4).
          </p>
        </button>

        <button
          type="button"
          onClick={() => selectFormulaKind('volume')}
          className={[
            'rounded-xl border px-3 py-2 text-left transition',
            formulaKind === 'volume'
              ? 'border-emerald-400/70 bg-emerald-600/20 text-white'
              : 'border-slate-800 bg-slate-950/45 text-slate-300 hover:border-slate-600',
          ].join(' ')}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">3. Công thức thể tích</span>
            <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-[11px] text-emerald-200">V</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Xếp các khối lập phương đơn vị để thấy số khối bằng a · b · c.
          </p>
        </button>
      </div>

      {formulaKind !== 'volume' && canUnfold && (
        <div className="mt-3">
          {unfoldMode === 'closed' ? (
            <button
              type="button"
              disabled={is2D}
              onClick={() => applyUnfoldForFormula(formulaKind)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-2 text-xs font-medium text-slate-100 transition hover:border-indigo-400 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {formulaKind === 'total' ? 'Trải phẳng 6 mặt' : 'Trải phẳng mặt bên'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onFormulaFaceLabelsChange(null)
                onFold()
              }}
              className="w-full rounded-lg border border-indigo-400/60 bg-indigo-600/80 px-2 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              Ghép lại hình
            </button>
          )}
        </div>
      )}

      {formulaKind === 'volume' && (
        <div className="mt-3">
          <button
            type="button"
            disabled={is2D}
            onClick={() => onVolumeUnitCubesChange(volumeProgressForStep(currentFormulaStep))}
            className="w-full rounded-lg border border-emerald-500/50 bg-emerald-600/15 px-2 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300 hover:bg-emerald-600/25 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Hiện khối lập phương đơn vị
          </button>
        </div>
      )}

      {is2D && (
        <p className="mt-2 text-[11px] text-amber-300">
          Tắt chế độ 2D để dùng hoạt cảnh xây dựng công thức.
        </p>
      )}

      <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/35">
        <ConstructionSteps steps={formulaSteps} currentStep={currentFormulaStep} />
        <StepNavigator
          total={formulaSteps.length}
          current={currentFormulaStep}
          onPrev={() => goToFormulaStep(currentFormulaStep - 1)}
          onNext={() => goToFormulaStep(currentFormulaStep + 1)}
          onShowAll={() => goToFormulaStep(formulaSteps.length - 1)}
        />
      </div>

      <div className="mt-3 space-y-2 text-xs leading-relaxed text-slate-300">
        <div className="rounded-xl border border-indigo-500/20 bg-slate-950/55 p-3">
          <p className="font-medium text-slate-100">
            {formulaKind === 'total'
              ? isFirstFormulaStep ? 'B1. Trải phẳng 6 mặt' : isLastFormulaStep ? 'B3. Công thức toàn phần' : 'B2. Cộng diện tích các mặt'
              : formulaKind === 'lateral'
                ? isFirstFormulaStep ? 'B1. Trải phẳng mặt bên' : isLastFormulaStep ? 'B3. Công thức xung quanh' : 'B2. Quy về diện tích hình chữ nhật'
                : isFirstFormulaStep ? 'B1. Xếp khối đơn vị' : isLastFormulaStep ? 'B3. Đếm các khối còn lại' : 'B2. Đếm 1 khối đơn vị'}
          </p>
          <p className="mt-1">
            {formulaKind === 'total' && currentFormulaStep === 0 && 'Khi trải đủ 6 mặt, ta nhìn thấy toàn bộ phần bề mặt của hình.'}
            {formulaKind === 'total' && currentFormulaStep === 1 && (
              isCube
                ? 'Có 6 mặt vuông bằng nhau, mỗi mặt có diện tích a².'
                : 'Có 2 mặt diện tích ab, 2 mặt diện tích ac và 2 mặt diện tích bc.'
            )}
            {formulaKind === 'total' && currentFormulaStep === 2 && 'Diện tích toàn phần bằng tổng diện tích tất cả các mặt.'}
            {formulaKind === 'lateral' && currentFormulaStep === 0 && 'Khi bỏ hai mặt đáy, phần còn lại chính là các mặt bên tạo nên diện tích xung quanh.'}
            {formulaKind === 'lateral' && currentFormulaStep === 1 && (
              <>
                Các mặt bên (1), (2), (3), (4) ghép thành một hình chữ nhật có {sideRectangleSize}.
              </>
            )}
            {formulaKind === 'lateral' && currentFormulaStep === 2 && 'Diện tích xung quanh bằng diện tích hình chữ nhật sau khi triển khai.'}
            {formulaKind === 'volume' && currentFormulaStep === 0 && (
              isCube
                ? 'Ta xếp các hình lập phương nhỏ cạnh 1 đơn vị vào trong hình lập phương lớn.'
                : 'Ta xếp các hình lập phương nhỏ cạnh 1 đơn vị vào trong chiếc hộp dạng hình hộp chữ nhật.'
            )}
            {formulaKind === 'volume' && currentFormulaStep === 1 && (
              isCube
                ? 'Trước hết hiển thị 1 khối lập phương đơn vị. Khối này có cạnh 1 đơn vị nên thể tích là 1 đơn vị khối.'
                : 'Trước hết hiển thị 1 khối lập phương đơn vị. Khối này có cạnh 1 đơn vị nên thể tích là 1 đơn vị khối.'
            )}
            {formulaKind === 'volume' && currentFormulaStep === 2 && (
              isCube
                ? 'Sau đó đếm các khối còn lại theo từng lớp: mỗi lớp có a · a khối, có a lớp nên tổng số khối là a · a · a.'
                : 'Sau đó đếm các khối còn lại theo từng lớp: mỗi lớp có a · b khối, có c lớp nên tổng số khối là a · b · c.'
            )}
          </p>
          {currentFormulaStep === 2 && (
            <>
              <p className="mt-2 font-mono text-indigo-200">
                {formulaKind === 'total' ? totalFormula : formulaKind === 'lateral' ? lateralFormula : volumeFormula}
              </p>
              {(formulaKind === 'total' ? totalValue : formulaKind === 'lateral' ? lateralValue : volumeValue) !== undefined && (
                <p className="mt-1 text-emerald-300">
                  = {format(formulaKind === 'total' ? totalValue : formulaKind === 'lateral' ? lateralValue : volumeValue)} {formulaKind === 'volume' ? cubeUnit : squareUnit}
                </p>
              )}
            </>
          )}
        </div>

        <div className="rounded-xl bg-slate-950/45 p-2 text-[11px] text-slate-400">
          Công thức liên quan:{' '}
          <span className="font-mono text-indigo-200">
            {formulaKind === 'total' ? lateralFormula : formulaKind === 'lateral' ? totalFormula : volumeFormula}
          </span>
          {(formulaKind === 'total' ? lateralValue : formulaKind === 'lateral' ? totalValue : volumeValue) !== undefined && (
            <span className="text-emerald-300">
              {' '}= {format(formulaKind === 'total' ? lateralValue : formulaKind === 'lateral' ? totalValue : volumeValue)} {formulaKind === 'volume' ? cubeUnit : squareUnit}
            </span>
          )}
        </div>
      </div>
    </section>
  )
}

export function GeoAIStudio() {
  const [showAllSteps, setShowAllSteps] = useState(false)
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null)
  const [selectedObjectType, setSelectedObjectType] = useState<
    'vertex' | 'edge' | 'face' | null
  >(null)
  const [mode, setMode] = useState<Mode>('explore')
  const [slideDir, setSlideDir] = useState<'right' | 'left'>('right')
  const [animKey, setAnimKey] = useState(0)
  const [centerPanel, setCenterPanel] = useState<'practice' | 'teacher-workspace' | null>(null)
  const [unfoldMode, setUnfoldMode] = useState<UnfoldMode>('closed')
  const [activeUnfoldMode, setActiveUnfoldMode] = useState<Exclude<UnfoldMode, 'closed'>>('full')
  const [unfoldProgress, setUnfoldProgress] = useState(0)
  const [formulaFaceLabels, setFormulaFaceLabels] = useState<'total' | 'lateral' | null>(null)
  const [volumeUnitCubeProgress, setVolumeUnitCubeProgress] = useState<number | null>(null)
  const unfoldProgressRef = useRef(0)
  const [isStepPlaying, setIsStepPlaying] = useState(false)
  const [constructSection, setConstructSection] = useState<ConstructSection>(null)
  const [isAutoRotating, setIsAutoRotating] = useState(false)
  const [activeExample, setActiveExample] = useState<ExampleDef | null>(null)
  const [is2D, setIs2D] = useState(false)
  const [exampleParam, setExampleParam] = usePathParam()
  // Deep link (?example=…): examples load async from Turso, so on a cold load
  // the homepage (library + showcase) would flash before the example restores.
  // Suppress it until the restore effect below resolves the param.
  const [isDeepLinkPending, setIsDeepLinkPending] = useState(() => Boolean(exampleParam))
  const examples = useExamples()
  const showcaseItems = useShowcaseShapes()
  const { model, loading: isResolving, resolve, setModel } = useGeoAICache()

  useEffect(() => {
    if (unfoldMode !== 'closed') setActiveUnfoldMode(unfoldMode)

    const from = unfoldProgressRef.current
    const target = unfoldMode === 'closed' ? 0 : 1
    if (Math.abs(target - from) < 0.001) return

    const startedAt = performance.now()
    const duration = 1400 * Math.abs(target - from)
    let frame = 0

    const animate = (now: number) => {
      const elapsed = Math.min(1, (now - startedAt) / duration)
      const next = from + (target - from) * elapsed
      unfoldProgressRef.current = next
      setUnfoldProgress(next)
      if (elapsed < 1) frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [unfoldMode])

  useEffect(() => {
    unfoldProgressRef.current = 0
    setUnfoldProgress(0)
    setUnfoldMode('closed')
    setActiveUnfoldMode('full')
    setFormulaFaceLabels(null)
    setVolumeUnitCubeProgress(null)
    setConstructSection(null)
  }, [model])

  // Refresh the active shape's data from Turso (hydrates the sync registry so
  // getShape(...) below returns Turso values; re-renders on arrival).
  useShapeData(model?.spec.shape)
  const { speak, stop, isSpeaking, currentText } = useVoiceTutor()
  const { steps, currentStep, prev, next, reset } = useConstructionSteps(model)
  const { settings, toggle: toggleSetting, update: updateSetting } = useDisplaySettings()
  const measurement = useMeasurementTool()
  const scene3dRef = useRef<Scene3DHandle>(null)
  const pre2DSnapshot = useRef<{ showFaces: boolean; hiddenEdges: boolean; showAxes: boolean } | null>(null)

  useEffect(() => {
    function openPractice() {
      if (!model) return
      setCenterPanel('practice')
      setIsStepPlaying(false)
      setFormulaFaceLabels(null)
      setVolumeUnitCubeProgress(null)
      setUnfoldMode('closed')
      measurement.deactivate()
      stop()
    }

    window.addEventListener('geo-ai-open-practice', openPractice)
    return () => window.removeEventListener('geo-ai-open-practice', openPractice)
  }, [model, measurement, stop])

  useEffect(() => {
    function openTeacherWorkspace() {
      if (!model) return
      setCenterPanel('teacher-workspace')
      setIsStepPlaying(false)
      setFormulaFaceLabels(null)
      setVolumeUnitCubeProgress(null)
      setUnfoldMode('closed')
      measurement.deactivate()
      stop()
    }

    window.addEventListener('geo-ai-open-teacher-workspace', openTeacherWorkspace)
    return () => window.removeEventListener('geo-ai-open-teacher-workspace', openTeacherWorkspace)
  }, [model, measurement, stop])

  useEffect(() => {
    setCenterPanel(null)
  }, [model])

  const handlePrev = useCallback(() => { setShowAllSteps(false); prev() }, [prev])
  const handleNext = useCallback(() => { setShowAllSteps(false); next() }, [next])

  const handleToggle2D = useCallback(() => {
    const next2D = !is2D
    setIs2D(next2D)
    if (next2D) {
      setFormulaFaceLabels(null)
      setVolumeUnitCubeProgress(null)
      setUnfoldMode('closed')
      // Save snapshot then apply 2D presets
      pre2DSnapshot.current = {
        showFaces: settings.showFaces,
        hiddenEdges: settings.hiddenEdges,
        showAxes: settings.showAxes,
      }
      if (settings.showFaces) toggleSetting('showFaces')     // hide faces
      if (!settings.hiddenEdges) toggleSetting('hiddenEdges') // show hidden edges dashed
      if (!settings.showAxes) toggleSetting('showAxes')       // show axes
      // Fit after OrthographicCamera mounts
      setTimeout(() => { if (model) scene3dRef.current?.fitToModel(model) }, 80)
    } else {
      // Restore snapshot
      const snap = pre2DSnapshot.current
      if (snap) {
        if (settings.showFaces !== snap.showFaces) toggleSetting('showFaces')
        if (settings.hiddenEdges !== snap.hiddenEdges) toggleSetting('hiddenEdges')
        if (settings.showAxes !== snap.showAxes) toggleSetting('showAxes')
        pre2DSnapshot.current = null
      }
      setTimeout(() => { if (model) scene3dRef.current?.resetToDefaultView(model) }, 50)
    }
  }, [is2D, settings.showFaces, settings.hiddenEdges, settings.showAxes, toggleSetting, model])

  useKeyboardShortcuts({
    onPrevStep: handlePrev,
    onNextStep: handleNext,
    onResetCamera: () => scene3dRef.current?.resetCamera(),
    onDistanceTool: measurement.activateDistance,
    onAngleTool: measurement.activateAngle,
  })

  const currentExperiment = getExperiment(model?.spec.shape)
  const canUnfold = model?.spec.shape === 'cube' || model?.spec.shape === 'rectangular_prism'
  const formulaParams = useMemo<Record<string, number | undefined>>(() => ({
    a: activeExample?.params?.a ?? model?.spec.params.a,
    b: activeExample?.params?.b ?? model?.spec.params.b,
    h: activeExample?.params?.h ?? model?.spec.params.h,
  }), [activeExample?.params, model?.spec.params])
  const { progress, isPlaying, currentFrame: experimentFrame, play, pause, reset: resetExperiment } = useVirtualExperiment(currentExperiment)

  const stepHighlight = useMemo(() => {
    if (mode === 'experiment' && experimentFrame) {
      return {
        vertices: experimentFrame.highlightVertices ?? [],
        edges: experimentFrame.highlightEdges ?? [],
        faces: experimentFrame.highlightFaces ?? [],
      }
    }
    const step = steps[currentStep]
    if (!step) return undefined
    return {
      vertices: step.highlightVertices ?? [],
      edges: step.highlightEdges ?? [],
      faces: step.highlightFaces ?? [],
    }
  }, [steps, currentStep, mode, experimentFrame])

  const stepVisibility = useMemo<StepVisibility | undefined>(() => {
    if (mode === 'experiment' && experimentFrame) {
      if (!experimentFrame.visibleVertices && !experimentFrame.visibleEdges && !experimentFrame.visibleFaces) return undefined
      return {
        vertices: experimentFrame.visibleVertices ?? [],
        edges: experimentFrame.visibleEdges ?? [],
        faces: experimentFrame.visibleFaces ?? [],
      }
    }
    // Only filter geometry after the user opens "Xây dựng hình".
    if (mode !== 'construct' || constructSection !== 'shape') return undefined
    if (showAllSteps || !model) return undefined
    const step = steps[currentStep]
    if (!step) return undefined
    if (!step.visibleVertices && !step.visibleEdges && !step.visibleFaces) return undefined
    return {
      vertices: step.visibleVertices ?? [],
      edges: step.visibleEdges ?? [],
      faces: step.visibleFaces ?? [],
    }
  }, [steps, currentStep, showAllSteps, model, mode, constructSection, experimentFrame])

  // Auto-play: speak narration when step starts (or auto-play begins)
  useEffect(() => {
    if (!isStepPlaying) return
    const narration = steps[currentStep]?.narration
    if (!narration) return
    speak(narration)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStepPlaying, currentStep])

  // Auto-play: advance step only after TTS finishes + 1s pause
  useEffect(() => {
    if (!isStepPlaying) return
    if (isSpeaking) return  // wait until narration done
    if (currentStep >= steps.length - 1) {
      setIsStepPlaying(false)
      return
    }
    const timer = setTimeout(() => {
      setShowAllSteps(false)
      next()
    }, 1000)
    return () => clearTimeout(timer)
  }, [isStepPlaying, isSpeaking, currentStep, steps.length, next])

  // Speak measurement result when it changes
  const prevMeasureResult = useRef<number | null>(null)
  useEffect(() => {
    if (measurement.result === null || measurement.result === prevMeasureResult.current) return
    prevMeasureResult.current = measurement.result
    const { mode: mMode, points, result } = measurement
    if (mMode === 'distance' && points.length >= 2) {
      speak(measuredEdgeExplanation(
        `${points[0]}${points[1]}`,
        result,
        model?.spec.params.unit,
      ))
    } else if (mMode === 'angle' && points.length >= 3) {
      speak(`Góc ${points[0]}${points[1]}${points[2]} bằng ${result.toFixed(1)} độ.`)
    }
  }, [measurement.result, measurement.mode, measurement.points, model, speak])

  const handleAxisClick = useCallback((axis: 'X' | 'Y' | 'Z' | 'O') => {
    const messages: Record<'X' | 'Y' | 'Z' | 'O', string> = {
      X: 'Đây là trục X. Trục X chạy theo chiều ngang.',
      Y: 'Đây là trục Y. Trục Y chạy theo chiều dọc.',
      Z: 'Đây là trục Z. Trục Z chạy theo chiều sâu.',
      O: 'Đây là gốc tọa độ O. Ba trục X, Y, Z giao nhau tại điểm O tạo thành hệ trục tọa độ không gian OXYZ.',
    }
    speak(messages[axis])
  }, [speak])

  const handleObjectSelect = useCallback(
    (id: string, type: 'vertex' | 'edge' | 'face') => {
      if (measurement.mode !== 'none' && type === 'edge') {
        const edge = model?.edges.find((item) => item.id === id)
        if (!edge) return
        const from = model?.vertices[edge.from]?.position
        const to = model?.vertices[edge.to]?.position
        if (!from || !to) return

        if (measurement.mode === 'distance') {
          measurement.setSelectedPoints([edge.from, edge.to])
          measurement.compute([from, to])
          return
        }

        // Angle mode: click two edges that share a vertex. The common vertex
        // becomes the angle's middle point.
        if (measurement.points.length === 2) {
          const [firstA, firstB] = measurement.points
          const shared = [edge.from, edge.to].find((point) => point === firstA || point === firstB)
          if (shared) {
            const firstOuter = firstA === shared ? firstB : firstA
            const secondOuter = edge.from === shared ? edge.to : edge.from
            const ids = [firstOuter!, shared, secondOuter]
            const positions = ids
              .map((vertexId) => model?.vertices[vertexId]?.position)
              .filter(Boolean) as Array<{ x: number; y: number; z: number }>
            measurement.setSelectedPoints(ids)
            if (positions.length === 3) measurement.compute(positions)
            return
          }
        }

        measurement.setSelectedPoints([edge.from, edge.to])
        return
      }

      // If measurement tool is active and it's a vertex, add to measurement points
      if (measurement.mode !== 'none' && type === 'vertex') {
        const pos = model?.vertices[id]?.position
        if (!pos) return

        // Add point and recompute when we have enough
        const newPoints = measurement.points.includes(id)
          ? measurement.points.filter((p) => p !== id)
          : [...measurement.points, id].slice(0, measurement.requiredPoints)

        measurement.selectPoint(id, pos)

        // Compute if we have enough points
        const allPoints = newPoints
          .map((pid) => model?.vertices[pid]?.position)
          .filter(Boolean) as Array<{ x: number; y: number; z: number }>
        if (allPoints.length === measurement.requiredPoints) {
          measurement.compute(allPoints)
        }
        return // Don't trigger voice in measurement mode
      }

      // Normal mode: voice explanation
      setSelectedObjectId(id)
      setSelectedObjectType(type)
      const explanation = buildObjectExplanation(id, type, model)
      speak(explanation)
    },
    [model, measurement, speak],
  )


  const handleClearExample = useCallback(() => {
    stop()
    reset()
    setModel(null)
    setActiveExample(null)
    setExampleParam(null)
    setMode('explore')
    setIsAutoRotating(false)
    // Always return to 3D mode so the showcase uses PerspectiveCamera
    if (is2D) {
      setIs2D(false)
      const snap = pre2DSnapshot.current
      if (snap) {
        if (settings.showFaces !== snap.showFaces) toggleSetting('showFaces')
        if (settings.hiddenEdges !== snap.hiddenEdges) toggleSetting('hiddenEdges')
        if (settings.showAxes !== snap.showAxes) toggleSetting('showAxes')
        pre2DSnapshot.current = null
      }
    }
  }, [stop, reset, setModel, setExampleParam, is2D, settings, toggleSetting])

  const handleExampleSelect = useCallback(
    (example: ExampleDef) => {
      stop()
      reset()
      updateSetting('showAxes', false)
      setActiveExample(example)
      setExampleParam(example.id)
      setMode('explore')
      setIsAutoRotating(false)

      // Direct build: if example has params, skip API and build instantly.
      // Don't require getShape() — on a cold deep-link load (?example=…) the
      // Turso shape registry may not be populated yet; example.shapeKey +
      // example.params alone are enough for the engine to build the model.
      if (example.params) {
        const shapeData = getShape(example.shapeKey)
        const baseSpec =
          shapeData?.fallbackSpec ??
          ({ shape: example.shapeKey, vertices: [], conditions: [] } as Partial<GeometrySpec>)
        try {
          const spec = { ...baseSpec, params: { ...example.params, unit: 'cm' } } as GeometrySpec
          const directModel = GeometryEngine.build(spec)
          setModel(directModel)
          return
        } catch {
          // fall through to API
        }
      }

      resolve(example.prompt)
    },
    [resolve, stop, reset, setModel, updateSetting, setExampleParam, setMode],
  )

  const handleShowcaseClick = useCallback((shapeKey: string) => {
    stop()
    reset()
    setActiveExample(null)
    updateSetting('showAxes', false)
    setMode('explore')
    setIsAutoRotating(false)

    const ex = examples.find((e) => e.shapeKey === shapeKey)
    if (ex) {
      setExampleParam(ex.id)
      if (ex.params) {
        const shapeData = getShape(ex.shapeKey)
        const baseSpec =
          shapeData?.fallbackSpec ??
          ({ shape: ex.shapeKey, vertices: [], conditions: [] } as Partial<GeometrySpec>)
        try {
          const spec = { ...baseSpec, params: { ...ex.params, unit: 'cm' } } as GeometrySpec
          setModel(GeometryEngine.build(spec))
          return
        } catch { /* fall through */ }
      }
      resolve(ex.prompt)
      return
    }

    const item = showcaseItems.find((i) => i.shapeKey === shapeKey)
    if (item) {
      // Pre-position camera BEFORE setModel so the first rendered frame
      // already shows the shape at the correct size (no flash/zoom effect).
      scene3dRef.current?.resetToDefaultView(item.model)
      setModel(item.model)
    }
  }, [examples, showcaseItems, stop, reset, setModel, setActiveExample, updateSetting, resolve, setExampleParam])

  // Restore selection from URL (?example=<id>) on first load / F5.
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    if (activeExample) {
      restoredRef.current = true
      setIsDeepLinkPending(false)
      return
    }
    if (!exampleParam) {
      setIsDeepLinkPending(false)
      return
    }
    if (examples.length === 0) return
    // Examples loaded — resolve the param now, even if it matches nothing
    // (invalid id falls back to the homepage instead of loading forever).
    restoredRef.current = true
    const match = examples.find((e) => e.id === exampleParam)
    if (match) handleExampleSelect(match)
    setIsDeepLinkPending(false)
  }, [exampleParam, examples, activeExample, handleExampleSelect])

  // Safety net: if the examples catalog never loads (offline, Turso down),
  // give up on the deep link and show the homepage instead of a spinner.
  useEffect(() => {
    if (!isDeepLinkPending) return
    const timer = setTimeout(() => setIsDeepLinkPending(false), DEEP_LINK_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isDeepLinkPending])

  const handlePlaySteps = useCallback(() => {
    setMode('construct')
    setConstructSection('shape')
    setShowAllSteps(false)
    setFormulaFaceLabels(null)
    setVolumeUnitCubeProgress(null)
    setUnfoldMode('closed')
    if (currentStep >= steps.length - 1) reset()
    setIsStepPlaying(true)
  }, [currentStep, steps.length, reset])

  const handlePauseSteps = useCallback(() => setIsStepPlaying(false), [])

  const handleRestartSteps = useCallback(() => {
    setMode('construct')
    setConstructSection('shape')
    setShowAllSteps(false)
    setFormulaFaceLabels(null)
    setVolumeUnitCubeProgress(null)
    setUnfoldMode('closed')
    reset()
    setIsStepPlaying(true)
  }, [reset])

  const handleConstructMode = useCallback(() => {
    if (mode === 'construct' && constructSection === 'shape') {
      setIsStepPlaying(false)
      stop()
      setConstructSection(null)
      setShowAllSteps(true)
      setFormulaFaceLabels(null)
      setVolumeUnitCubeProgress(null)
      setUnfoldMode('closed')
      return
    }
    setMode('construct')
    setConstructSection('shape')
    setShowAllSteps(false)
    setFormulaFaceLabels(null)
    setVolumeUnitCubeProgress(null)
    setUnfoldMode('closed')
    reset()
    setIsStepPlaying(true)
  }, [mode, constructSection, reset, stop])

  const TAB_ORDER: Mode[] = ['explore', 'construct', 'info', 'qa']

  function triggerSlide(dir: 'right' | 'left') {
    setSlideDir(dir)
    setAnimKey((k) => k + 1)
  }

  function handleTabClick(newMode: Mode) {
    const cur = TAB_ORDER.indexOf(mode)
    const next = TAB_ORDER.indexOf(newMode)
    triggerSlide(next >= cur ? 'right' : 'left')
    setIsStepPlaying(false)
    setConstructSection(null)
    if (newMode !== 'construct') {
      setFormulaFaceLabels(null)
      setVolumeUnitCubeProgress(null)
      setUnfoldMode('closed')
    }
    setMode(newMode)
  }

  function renderRightPanel() {
    const tabModes = (['explore', 'construct', 'info', 'qa'] as const)

    return (
      <div className="flex flex-col h-full">
        {/* Tab bar — hidden (no layout space) when no model */}
        <div
          className="flex-shrink-0 border-b border-slate-800"
          style={{ display: model ? undefined : 'none' }}
        >
          <div className="flex">
            {tabModes.map((m) => (
              <button
                key={m}
                type="button"
                disabled={!model}
                onClick={() => handleTabClick(m)}
                className={[
                  'flex-1 py-2.5 text-sm font-medium transition-colors disabled:cursor-default',
                  (mode === m || (mode === 'measure' && m === 'info'))
                    ? 'border-b-2 border-indigo-500 text-white'
                    : 'text-slate-500 hover:text-slate-200',
                ].join(' ')}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Breadcrumb — hidden (no layout space) when no model */}
        <div
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border-b border-slate-800/60 bg-slate-950/40"
          style={{ display: model ? undefined : 'none' }}
        >
          <button
            type="button"
            onClick={handleClearExample}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-white transition-colors"
          >
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 flex-shrink-0">
              <path fillRule="evenodd" d="M13.5 8a.5.5 0 0 1-.5.5H4.707l3.147 3.146a.5.5 0 0 1-.708.708l-4-4a.5.5 0 0 1 0-.708l4-4a.5.5 0 0 1 .708.708L4.707 7.5H13a.5.5 0 0 1 .5.5z" clipRule="evenodd" />
            </svg>
            Thư viện
          </button>
          {activeExample && (
            <>
              <span className="text-slate-700 text-xs">/</span>
              <span className="text-xs text-slate-400 truncate">{activeExample.shapeNameVi}</span>
            </>
          )}
        </div>

        {/* Main content — scrollable, with slide-in animation on tab change */}
        <div className="flex-1 min-h-0 overflow-hidden">
        <div key={animKey} className={`h-full overflow-y-auto ${slideDir === 'right' ? 'tab-slide-right' : 'tab-slide-left'}`}>
          {/* Deep-link restore in flight: hold a quiet loading state so the
              library doesn't flash before the example takes over */}
          {!model && isDeepLinkPending && (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              Đang tải...
            </div>
          )}
          {/* Library: no model → always show. Model + explore → show detail or library */}
          {!model && !isDeepLinkPending && (
            <ExampleLibraryPanel onSelectExample={handleExampleSelect} selectedId={activeExample?.id} isResolving={isResolving} />
          )}
          {model && mode === 'explore' && (
            <div className="flex flex-col">
              {activeExample && (
                <div className="p-4 pb-0">
                  <h3 className="text-base font-semibold text-white leading-snug mb-2">
                    {activeExample.title}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {activeExample.description}
                  </p>
                </div>
              )}
              <div className="p-3">
                <FormulaDiscovery shape={model?.spec.shape ?? null} />
              </div>
            </div>
          )}

          {mode === 'construct' && !model && null}
          {mode === 'construct' && model && (
            <div className="p-3 space-y-3">
              <section className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3">
                <button
                  type="button"
                  onClick={() => {
                    const isClosing = constructSection === 'shape'
                    setConstructSection(isClosing ? null : 'shape')
                    setFormulaFaceLabels(null)
                    setVolumeUnitCubeProgress(null)
                    setUnfoldMode('closed')
                    setIsStepPlaying(false)
                    stop()
                    setShowAllSteps(isClosing)
                  }}
                  className="mb-3 flex w-full items-start justify-between gap-2 text-left"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-white">1. Xây dựng hình</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Theo dõi từng bước dựng các đỉnh, cạnh và mặt của hình.
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
                    {constructSection === 'shape'
                      ? `Thu lại · ${steps.length > 0 ? `${currentStep + 1}/${steps.length}` : '0/0'}`
                      : 'Mở'}
                  </span>
                </button>

                {constructSection === 'shape' && (
                  <>
                    <ConstructionSteps steps={steps} currentStep={currentStep} />
                    <StepNavigator
                      total={steps.length}
                      current={currentStep}
                      onPrev={handlePrev}
                      onNext={handleNext}
                      onShowAll={() => setShowAllSteps(true)}
                    />
                    {steps.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isStepPlaying || isSpeaking) {
                            setIsStepPlaying(false)
                            stop()
                          } else {
                            stop()
                            setShowAllSteps(false)
                            reset()
                            // Delay so viewer renders bước 1 before narration starts
                            setTimeout(() => setIsStepPlaying(true), 200)
                          }
                        }}
                        className={[
                          'w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
                          isStepPlaying
                            ? 'bg-red-900/30 text-red-300 border border-red-700/40 hover:bg-red-900/50'
                            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700',
                        ].join(' ')}
                      >
                        <span>{isStepPlaying ? '⏹' : '🔊'}</span>
                        {isStepPlaying ? 'Dừng giảng' : 'Nghe giảng'}
                      </button>
                    )}
                  </>
                )}
              </section>

              <section className="rounded-2xl border border-indigo-500/25 bg-indigo-950/20">
                <button
                  type="button"
                  onClick={() => {
                    setConstructSection((current) => current === 'formula' ? null : 'formula')
                    setShowAllSteps(true)
                    setFormulaFaceLabels(null)
                    setVolumeUnitCubeProgress(null)
                    setIsStepPlaying(false)
                    stop()
                  }}
                  className="flex w-full items-start justify-between gap-2 p-3 text-left"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-white">2. Xây dựng công thức</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">
                      Trải hình hoặc xếp khối đơn vị để xây dựng công thức.
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[11px] font-medium text-indigo-200">
                    {constructSection === 'formula' ? 'Đang mở' : 'Mở'}
                  </span>
                </button>

                {constructSection === 'formula' && (
                  <div className="border-t border-indigo-500/15 p-3 pt-0">
                    <FormulaConstructionCard
                      model={model}
                      params={formulaParams}
                      canUnfold={Boolean(canUnfold)}
                      is2D={is2D}
                      unfoldMode={unfoldMode}
                      onUnfoldFull={() => {
                        setSelectedObjectId(null)
                        setIsAutoRotating(false)
                        setUnfoldMode('full')
                      }}
                      onUnfoldStrip={() => {
                        setSelectedObjectId(null)
                        setIsAutoRotating(false)
                        setUnfoldMode('strip')
                      }}
                      onFold={() => {
                        setFormulaFaceLabels(null)
                        setVolumeUnitCubeProgress(null)
                        setUnfoldMode('closed')
                      }}
                      onFormulaFaceLabelsChange={setFormulaFaceLabels}
                      onVolumeUnitCubesChange={setVolumeUnitCubeProgress}
                    />
                  </div>
                )}
              </section>
            </div>
          )}


          {mode === 'info' && <GeometryInfoPanel model={model} />}

          {/* Hỏi đáp — chưa có nội dung */}
          {mode === 'qa' && <div className="p-4" />}

          {mode === 'measure' && (
            <MeasurementPanel
              mode={measurement.mode}
              points={measurement.points}
              result={measurement.result}
              requiredPoints={measurement.requiredPoints}
              onActivateDistance={measurement.activateDistance}
              onActivateAngle={measurement.activateAngle}
              onDeactivate={measurement.deactivate}
              onClear={measurement.clearPoints}
            />
          )}
        </div>
        </div>

        {/* Display settings — fixed at bottom; hidden until a shape is loaded */}
        <div
          className="p-3 border-t border-slate-800"
          style={{ display: model ? undefined : 'none' }}
        >
          <DisplaySettingsPanel settings={settings} onToggle={toggleSetting} />
        </div>

      </div>
    )
  }

  // suppress unused variable warning — selectedObjectType used implicitly via setSelectedObjectType
  void selectedObjectType

  return (
    <>
      <ThreePanelLayout
        header={<GeoAIHeader />}
        left={renderRightPanel()}
        center={
          <div id="geo-ai-viewer" className="relative h-full">
            {model && centerPanel === 'practice' ? (
              <PracticePanel
                shape={model.spec.shape}
                onClose={() => setCenterPanel(null)}
              />
            ) : model && centerPanel === 'teacher-workspace' ? (
              <TeacherWorkspacePanel
                shapeKey={model.spec.shape}
                onClose={() => setCenterPanel(null)}
              />
            ) : (
              <>
                {model && (
                  <ViewerTopToolbar
                    containerId="geo-ai-viewer"
                    shapeName={getShape(model.spec.shape)?.nameVi ?? model.spec.shape}
                    measurementMode={measurement.mode}
                    measurementPoints={measurement.points}
                    measurementResult={measurement.result}
                    requiredPoints={measurement.requiredPoints}
                    onDistanceTool={() => { measurement.activateDistance(); setMode('measure') }}
                    onAngleTool={() => { measurement.activateAngle(); setMode('measure') }}
                    onDeactivateMeasure={measurement.deactivate}
                    onClearMeasure={measurement.clearPoints}
                    showFaces={settings.showFaces}
                    showAxes={settings.showAxes}
                    hiddenEdges={settings.hiddenEdges}
                    onToggleFaces={() => toggleSetting('showFaces')}
                    onToggleAxes={() => toggleSetting('showAxes')}
                    onToggleHiddenEdges={() => toggleSetting('hiddenEdges')}
                    onResetCamera={() => scene3dRef.current?.resetCamera()}
                    isStepPlaying={isStepPlaying}
                    onConstructMode={handleConstructMode}
                    constructModeActive={mode === 'construct'}
                    autoRotate={isAutoRotating}
                    onToggleRotate={() => setIsAutoRotating((v) => !v)}
                    disabled={false}
                  />
                )}
                <Scene3D
                  ref={scene3dRef}
                  model={model}
                  autoFit
                  selectedObjectId={selectedObjectId}
                  onObjectSelect={handleObjectSelect}
                  unfoldProgress={unfoldProgress}
                  unfoldMode={activeUnfoldMode}
                  stepHighlight={stepHighlight}
                  stepVisibility={stepVisibility}
                  waterLevel={mode === 'experiment' ? (experimentFrame?.waterLevel ?? 0) : 0}
                  showAxes={settings.showAxes}
                  showAxisTicks={settings.showAxisTicks}
                  showGrid={settings.showGrid}
                  showLabels={settings.showLabels}
                  showFaces={settings.showFaces}
                  hiddenEdges={settings.hiddenEdges}
                  measurementMode={measurement.mode}
                  measurementPoints={measurement.points}
                  onAxisClick={handleAxisClick}
                  autoRotate={isAutoRotating}
                  givenParams={activeExample?.givenParams}
                  params={activeExample?.params}
                  unit={model?.spec?.params?.unit ?? 'cm'}
                  formulaFaceLabels={formulaFaceLabels}
                  volumeUnitCubeProgress={volumeUnitCubeProgress}
                  is2D={is2D}
                  onToggle2D={handleToggle2D}
                  showcaseItems={!model && !isDeepLinkPending ? showcaseItems : undefined}
                  onShowcaseClick={handleShowcaseClick}
                />
              </>
            )}
          </div>
        }
      />
      <VoiceTutorOverlay
        text={currentText}
        isSpeaking={isSpeaking}
        onStop={stop}
      />
      <FloatingChat
        currentShape={model?.spec.shape ?? null}
        contextObject={selectedObjectId}
      />
    </>
  )
}
