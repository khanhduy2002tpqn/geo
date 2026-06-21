'use client'

// Thin client for the admin API. Basic Auth credentials are supplied by the
// browser automatically (the middleware challenge populates them for the realm),
// so no Authorization header is set here.

import type { ShapeRecord, ShapeSummary } from '@/db/shapeRecord'

async function jsonOrThrow<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = (data as { error?: string }).error ?? `Lỗi ${res.status}`
    throw new Error(message)
  }
  return data as T
}

export async function listShapes(): Promise<{ shapes: ShapeSummary[]; version: number }> {
  return jsonOrThrow(await fetch('/api/admin/shapes', { cache: 'no-store' }))
}

export async function getShape(shapeKey: string): Promise<ShapeRecord> {
  const data = await jsonOrThrow<{ record: ShapeRecord }>(
    await fetch(`/api/admin/shapes/${encodeURIComponent(shapeKey)}`, { cache: 'no-store' }),
  )
  return data.record
}

export async function createShape(record: ShapeRecord): Promise<{ shapeKey: string; version: number }> {
  return jsonOrThrow(
    await fetch('/api/admin/shapes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }),
  )
}

export async function updateShape(record: ShapeRecord): Promise<{ shapeKey: string; version: number }> {
  return jsonOrThrow(
    await fetch(`/api/admin/shapes/${encodeURIComponent(record.shapeKey)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    }),
  )
}

export async function deleteShape(shapeKey: string): Promise<void> {
  await jsonOrThrow(
    await fetch(`/api/admin/shapes/${encodeURIComponent(shapeKey)}`, { method: 'DELETE' }),
  )
}

export async function setShapeVisible(shapeKey: string, visible: boolean): Promise<void> {
  await jsonOrThrow(
    await fetch(`/api/admin/shapes/${encodeURIComponent(shapeKey)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible }),
    }),
  )
}

export async function rebuildShape(shapeKey: string): Promise<ShapeRecord> {
  const data = await jsonOrThrow<{ record: ShapeRecord }>(
    await fetch(`/api/admin/shapes/${encodeURIComponent(shapeKey)}/rebuild`, { method: 'POST' }),
  )
  return data.record
}

export async function resetShape(shapeKey: string): Promise<ShapeRecord> {
  const data = await jsonOrThrow<{ record: ShapeRecord }>(
    await fetch(`/api/admin/shapes/${encodeURIComponent(shapeKey)}/reset`, { method: 'POST' }),
  )
  return data.record
}

export async function getOriginals(): Promise<string> {
  const data = await jsonOrThrow<{ json: string }>(
    await fetch('/api/admin/originals', { cache: 'no-store' }),
  )
  return data.json
}

export async function saveOriginals(json: string): Promise<void> {
  await jsonOrThrow(
    await fetch('/api/admin/originals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ json }),
    }),
  )
}

export interface GenerateResponse {
  record: ShapeRecord
  usedAI: boolean
  warnings: string[]
}

export async function setCurriculumDefaults(): Promise<{ version: number; visible: string[]; hidden: string[] }> {
  return jsonOrThrow(
    await fetch('/api/admin/shapes/curriculum-defaults', { method: 'POST' }),
  )
}

export async function generateFromProblem(input: {
  prompt: string
  shapeKey?: string
  grade?: 'lop6' | 'lop7' | 'lop8' | 'lop9'
}): Promise<GenerateResponse> {
  return jsonOrThrow(
    await fetch('/api/admin/shapes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }),
  )
}
