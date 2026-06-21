export type { Vector3D, GeometryVertex, GeometryEdge, GeometryFace, SpecialPoint, GeometrySpec, GeometryModel, ConstructionStep, ShapeMeasurements } from '@/types/geo-ai'

export function vec3(x: number, y: number, z: number): import('@/types/geo-ai').Vector3D {
  return { x, y, z }
}

export function edgeLength(a: import('@/types/geo-ai').Vector3D, b: import('@/types/geo-ai').Vector3D): number {
  return Math.sqrt((b.x-a.x)**2 + (b.y-a.y)**2 + (b.z-a.z)**2)
}

export function midpoint(a: import('@/types/geo-ai').Vector3D, b: import('@/types/geo-ai').Vector3D): import('@/types/geo-ai').Vector3D {
  return { x: (a.x+b.x)/2, y: (a.y+b.y)/2, z: (a.z+b.z)/2 }
}

export function triangleArea(a: import('@/types/geo-ai').Vector3D, b: import('@/types/geo-ai').Vector3D, c: import('@/types/geo-ai').Vector3D): number {
  const ab = { x: b.x-a.x, y: b.y-a.y, z: b.z-a.z }
  const ac = { x: c.x-a.x, y: c.y-a.y, z: c.z-a.z }
  const cross = {
    x: ab.y*ac.z - ab.z*ac.y,
    y: ab.z*ac.x - ab.x*ac.z,
    z: ab.x*ac.y - ab.y*ac.x,
  }
  return 0.5 * Math.sqrt(cross.x**2 + cross.y**2 + cross.z**2)
}
