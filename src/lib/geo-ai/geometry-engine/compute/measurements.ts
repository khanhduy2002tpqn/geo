import type { GeometrySpec, GeometryVertex, GeometryEdge, GeometryFace, ShapeMeasurements } from '@/types/geo-ai'

export function computeMeasurements(
  spec: GeometrySpec,
  _vertices: Record<string, GeometryVertex>,
  _edges: GeometryEdge[],
  _faces: GeometryFace[],
): ShapeMeasurements {
  // Measurements are computed by each shape builder.
  // This function provides a unified entry point for callers that want to
  // recompute or augment measurements independently of a full model rebuild.
  const a = spec.params.a ?? 1
  const b = spec.params.b ?? 1
  const h = spec.params.h ?? 1
  const r = spec.params.r ?? 1

  switch (spec.shape) {
    case 'square_pyramid':
    case 'general_pyramid': {
      const baseArea = a * a
      const half = a / 2
      const slantHeight = Math.sqrt(h * h + half * half)
      return {
        volume:      (baseArea * h) / 3,
        baseArea,
        lateralArea: 4 * (0.5 * a * slantHeight),
        surfaceArea: baseArea + 4 * (0.5 * a * slantHeight),
        height:      h,
        slantHeight,
      }
    }
    case 'triangular_pyramid': {
      const baseArea = (Math.sqrt(3) / 4) * a * a
      const slantHeight = Math.sqrt(h * h + (a / (2 * Math.sqrt(3))) ** 2)
      return {
        volume:      (baseArea * h) / 3,
        baseArea,
        lateralArea: 3 * (0.5 * a * slantHeight),
        surfaceArea: baseArea + 3 * (0.5 * a * slantHeight),
        height:      h,
        slantHeight,
      }
    }
    case 'cube': {
      const faceArea = a * a
      return {
        volume:      a ** 3,
        surfaceArea: 6 * faceArea,
        lateralArea: 4 * faceArea,
        baseArea:    faceArea,
        height:      a,
      }
    }
    case 'rectangular_prism': {
      const baseArea = a * b
      return {
        volume:      a * b * h,
        baseArea,
        lateralArea: 2 * (a + b) * h,
        surfaceArea: 2 * baseArea + 2 * (a + b) * h,
        height:      h,
      }
    }
    case 'triangular_prism': {
      const baseArea = (Math.sqrt(3) / 4) * a * a
      return {
        volume:      baseArea * h,
        baseArea,
        lateralArea: 3 * a * h,
        surfaceArea: 2 * baseArea + 3 * a * h,
        height:      h,
      }
    }
    case 'tetrahedron': {
      return {
        volume:      (a ** 3) / (6 * Math.sqrt(2)),
        surfaceArea: Math.sqrt(3) * a * a,
        baseArea:    (Math.sqrt(3) / 4) * a * a,
        height:      a * Math.sqrt(2 / 3),
      }
    }
    case 'cylinder': {
      return {
        volume:      Math.PI * r * r * h,
        lateralArea: 2 * Math.PI * r * h,
        baseArea:    Math.PI * r * r,
        surfaceArea: 2 * Math.PI * r * r + 2 * Math.PI * r * h,
        height:      h,
        radius:      r,
      }
    }
    case 'cone': {
      const slantHeight = Math.sqrt(r * r + h * h)
      return {
        volume:      (Math.PI * r * r * h) / 3,
        lateralArea: Math.PI * r * slantHeight,
        baseArea:    Math.PI * r * r,
        surfaceArea: Math.PI * r * r + Math.PI * r * slantHeight,
        height:      h,
        slantHeight,
        radius:      r,
      }
    }
    case 'sphere': {
      return {
        volume:      (4 / 3) * Math.PI * r ** 3,
        surfaceArea: 4 * Math.PI * r * r,
        radius:      r,
      }
    }
    default:
      return {}
  }
}

interface FormulaSet {
  volume: string
  surfaceArea: string
  lateralArea: string
}

export function formulaText(shape: GeometrySpec['shape']): FormulaSet {
  switch (shape) {
    case 'cylinder':
      return {
        volume:      'V = πr²h',
        surfaceArea: 'S = 2πr² + 2πrh',
        lateralArea: 'Sxq = 2πrh',
      }
    case 'cone':
      return {
        volume:      'V = πr²h/3',
        surfaceArea: 'S = πr² + πrl',
        lateralArea: 'Sxq = πrl',
      }
    case 'sphere':
      return {
        volume:      'V = (4/3)πr³',
        surfaceArea: 'S = 4πr²',
        lateralArea: 'S = 4πr²',
      }
    case 'cube':
      return {
        volume:      'V = a³',
        surfaceArea: 'S = 6a²',
        lateralArea: 'Sxq = 4a²',
      }
    case 'rectangular_prism':
      return {
        volume:      'V = abh',
        surfaceArea: 'S = 2(ab + ah + bh)',
        lateralArea: 'Sxq = 2(a + b)h',
      }
    case 'triangular_prism':
      return {
        volume:      'V = (√3/4)a²h',
        surfaceArea: 'S = 2 × (√3/4)a² + 3ah',
        lateralArea: 'Sxq = 3ah',
      }
    case 'square_pyramid':
    case 'general_pyramid':
      return {
        volume:      'V = (1/3)a²h',
        surfaceArea: 'S = a² + 2al',
        lateralArea: 'Sxq = 2al',
      }
    case 'triangular_pyramid':
      return {
        volume:      'V = (1/3) × S_đáy × h',
        surfaceArea: 'S = S_đáy + Sxq',
        lateralArea: 'Sxq = (3/2)al',
      }
    case 'tetrahedron':
      return {
        volume:      'V = a³/(6√2)',
        surfaceArea: 'S = √3 × a²',
        lateralArea: 'S = (3√3/4)a²',
      }
    case 'hyperboloid':
    case 'paraboloid':
      return {
        volume:      'V = ∫∫∫ dV',
        surfaceArea: 'S = ∫∫ dS',
        lateralArea: 'Sxq = ∫∫ dS',
      }
    // 2D flat shapes — return placeholder (flat shapes use area/perimeter, not volume)
    default:
      return {
        volume:      '',
        surfaceArea: '',
        lateralArea: '',
      }
  }
}
