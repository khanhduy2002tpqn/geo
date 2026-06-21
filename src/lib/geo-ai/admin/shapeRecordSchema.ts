// src/lib/geo-ai/admin/shapeRecordSchema.ts
// Zod validation for an incoming ShapeRecord (admin create/update). Strict on
// coordinate-bearing data (teacher-editable, must stay well-formed); permissive
// on rich JSON teaching content (edited as free-form JSON in the admin).

import { z } from 'zod'
import type { ShapeRecord } from '@/db/shapeRecord'

const vec3 = z.object({ x: z.number(), y: z.number(), z: z.number() })

const vertex = z.object({
  id: z.string().min(1),
  position: vec3,
  label: z.string(),
})

const edge = z.object({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(['base', 'lateral', 'diagonal', 'axis', 'radius', 'special']),
  length: z.number().optional(),
  paramKey: z.string().optional(),
})

const face = z.object({
  id: z.string().min(1),
  vertices: z.array(z.string()),
  type: z.enum(['base', 'lateral', 'top', 'cross_section']),
  area: z.number().optional(),
  normal: vec3.optional(),
})

const specialPoint = z.object({
  id: z.string().min(1),
  position: vec3,
  label: z.string(),
  description: z.string(),
  onEdge: z.string().optional(),
})

const example = z.object({
  id: z.string().min(1),
  shapeKey: z.string().min(1),
  title: z.string(),
  description: z.string(),
  level: z.enum(['basic', 'intermediate', 'advanced']),
  grade: z.enum(['lop6', 'lop7', 'lop8', 'lop9']),
  prompt: z.string(),
  params: z.record(z.string(), z.number()).optional(),
  givenParams: z.array(z.string()).optional(),
})

export const shapeRecordSchema = z.object({
  shapeKey: z
    .string()
    .min(1)
    .regex(/^[a-z0-9_]+$/, 'shapeKey chỉ gồm chữ thường, số và dấu gạch dưới'),
  nameVi: z.string().min(1),
  type: z.enum(['polyhedron', 'curved', 'flat']),
  level: z.enum(['cap2', 'cap3']),
  topology: z.object({
    vertices: z.number().int(),
    edges: z.number().int(),
    faces: z.number().int(),
    euler: z.number().int().nullable(),
  }),

  // Permissive JSON content (structured-but-free-form, edited as JSON)
  fallbackSpec: z.object({}).passthrough(),
  formulas: z.object({}).passthrough(),
  lessonContent: z.unknown().optional(),
  objectDescriptions: z.unknown().optional(),
  suggestedQuestions: z.array(z.string()),

  parserKeywords: z.array(z.string()),
  examples: z.array(example),

  // Strict coordinate-bearing geometry
  vertices: z.array(vertex),
  edges: z.array(edge),
  faces: z.array(face),
  specialPoints: z.array(specialPoint),
  measurements: z.record(z.string(), z.number()),

  modelConstructionSteps: z.array(z.unknown()),
  surfaceType: z.string().optional(),
})

/** Parse + cast an unknown body into a ShapeRecord. Throws ZodError on invalid. */
export function parseShapeRecord(body: unknown): ShapeRecord {
  return shapeRecordSchema.parse(body) as unknown as ShapeRecord
}
