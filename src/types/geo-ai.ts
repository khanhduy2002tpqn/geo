// src/types/geo-ai.ts - all shared types for Geometry AI Studio

export interface Vector3D { x: number; y: number; z: number }

export interface GeometryVertex {
  id: string        // "A", "B", "S", "M" etc
  position: Vector3D
  label: string
}

export interface GeometryEdge {
  id: string        // "AB", "SA", "SM" etc
  from: string      // vertex id
  to: string        // vertex id
  type: 'base' | 'lateral' | 'diagonal' | 'axis' | 'radius' | 'special'
  length?: number
  paramKey?: string // which spec param this edge represents (e.g. 'a', 'b', 'h', 'r')
}

export interface GeometryFace {
  id: string        // "ABCD", "SAB" etc
  vertices: string[] // vertex ids in order
  type: 'base' | 'lateral' | 'top' | 'cross_section'
  area?: number
  normal?: Vector3D
}

export type UnfoldMode = 'closed' | 'full' | 'strip'

export interface SpecialPoint {
  id: string
  position: Vector3D
  label: string
  description: string
  onEdge?: string   // edge id if midpoint
}

export interface GeometrySpec {
  shape: 'square_pyramid' | 'triangular_pyramid' | 'cube' | 'rectangular_prism' |
         'triangular_prism' | 'cylinder' | 'cone' | 'tetrahedron' | 'sphere' |
         'hyperboloid' | 'paraboloid' | 'general_pyramid' |
         // 2D flat shapes
         'point' | 'segment' | 'line' | 'ray' | 'angle' |
         'triangle' | 'equilateral_triangle' | 'isosceles_triangle' |
         'right_triangle' | 'right_isosceles_triangle' |
         'rectangle' | 'square' |
         'parallelogram' | 'rhombus' |
         'trapezoid' | 'isosceles_trapezoid' |
         'parallel_lines' | 'perpendicular_lines' |
         'perpendicular_bisector' | 'angle_bisector' |
         'circle' | 'sector'
  baseShape?: 'square' | 'rectangle' | 'triangle' | 'hexagon' | 'circle'
  vertices: string[]
  apex?: string
  params: {
    a?: number    // base side / length, default 1
    b?: number    // second side (rectangle, isosceles leg), default 1
    h?: number    // height, default 1
    r?: number    // radius, default 1
    a2?: number   // angle in degrees (for angle / sector), default 60
    d1?: number   // first diagonal (rhombus), default 1
    d2?: number   // second diagonal (rhombus), default 1
    unit?: string // length unit: 'cm' | 'dm' | 'm' | 'mm' — undefined means abstract
  }
  conditions?: string[]   // e.g. "SA ⊥ đáy", "M là trung điểm BC"
  specialPoints?: Array<{ id: string; description: string; onEdge?: string }>
}

export interface ConstructionStep {
  index: number
  description: string
  narration: string
  highlightVertices?: string[]
  highlightEdges?: string[]
  highlightFaces?: string[]
  // Cumulative visibility: all geometry visible UP TO this step (inclusive).
  // When undefined → show all geometry.
  visibleVertices?: string[]
  visibleEdges?: string[]
  visibleFaces?: string[]
}

export interface StepVisibility {
  vertices: string[]
  edges: string[]
  faces: string[]
}

export interface ShapeMeasurements {
  volume?: number
  surfaceArea?: number
  lateralArea?: number
  baseArea?: number
  height?: number
  perimeter?: number
  slantHeight?: number
  [key: string]: number | undefined
}

export interface GeometryModel {
  spec: GeometrySpec
  vertices: Record<string, GeometryVertex>
  edges: GeometryEdge[]
  faces: GeometryFace[]
  specialPoints: SpecialPoint[]
  measurements: ShapeMeasurements
  constructionSteps: ConstructionStep[]
  // New: for AI-generated rich geometry
  surfaceType?: 'sphere' | 'cylinder' | 'cone' | 'hyperboloid' | 'paraboloid' | 'revolution'
}

export interface GeoAICacheEntry {
  hash: string
  prompt: string
  spec: GeometrySpec
  model: GeometryModel
  createdAt: number
}

export interface ExperimentFrame {
  time: number      // 0-1 progress
  narration: string
  waterLevel?: number   // 0-1 fill level
  highlightVertices?: string[]
  highlightEdges?: string[]
  highlightFaces?: string[]
  visibleVertices?: string[]
  visibleEdges?: string[]
  visibleFaces?: string[]
  showFormula?: string
  pourCount?: number    // for cone experiment
}

export interface VirtualExperiment {
  type: 'cylinder_volume' | 'cone_volume' | 'sphere_volume' | 'prism_volume' | 'cube_volume' | 'pyramid_volume' | 'triangular_prism_volume'
  shapeName: string
  frames: ExperimentFrame[]
  finalFormula: string
  finalFormulaLatex: string
}

export interface GeoAIState {
  prompt: string
  model: GeometryModel | null
  loading: boolean
  error: string | null
  selectedObjectId: string | null
  selectedObjectType: 'vertex' | 'edge' | 'face' | 'special' | null
  currentStep: number
  mode: 'explore' | 'construct' | 'experiment' | 'formula'
  isSpeaking: boolean
  unfoldProgress: number  // 0-1
}
