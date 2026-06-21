// src/db/repositories/shapesRepository.ts
// Repository for the persisted shape library. Assembles/decomposes a ShapeRecord
// across the main `geometry_shapes` table + normalized related tables.
// Server-only (nodejs runtime + scripts). All methods throw if Turso is not
// configured — callers decide whether to fall back to the static file.

import { eq, ne } from 'drizzle-orm'
import { db } from '@/db/client'
import {
  geometryShapes,
  geometryShapeVertices,
  geometryShapeEdges,
  geometryShapeFaces,
  geometryShapeSpecialPoints,
  geometryShapeMeasurements,
  geometryShapeKeywords,
  geometryShapeExamples,
  geometryShapeOriginals,
  geometryMeta,
} from '@/db/schema'
import {
  measurementEntries,
  measurementsFromEntries,
  type ShapeRecord,
  type ShapeSummary,
} from '@/db/shapeRecord'
import type { ExampleDef, ShapeLevel, ShapeType } from '@/lib/geo-ai/data/types'

const VERSION_KEY = 'shapes_version'
const ORIGINALS_ID = 'originals'

function requireDb(): NonNullable<typeof db> {
  if (!db) {
    throw new Error('Turso is not configured (TURSO_URL missing) — shape repository unavailable')
  }
  return db
}

const j = (value: unknown): string => JSON.stringify(value ?? null)
function p<T>(value: string | null | undefined, fallback: T): T {
  if (value == null) return fallback
  try {
    const parsed = JSON.parse(value)
    return parsed == null ? fallback : (parsed as T)
  } catch {
    return fallback
  }
}

// Deterministic child ids → re-seed/re-save stays idempotent
const childId = (shapeKey: string, kind: string, suffix: string | number): string =>
  `${shapeKey}::${kind}::${suffix}`

export const shapesRepository = {
  async findAllSummaries(): Promise<ShapeSummary[]> {
    const rows = await requireDb()
      .select({
        shapeKey: geometryShapes.shapeKey,
        nameVi: geometryShapes.nameVi,
        type: geometryShapes.type,
        level: geometryShapes.level,
        visible: geometryShapes.visible,
      })
      .from(geometryShapes)
    return rows.map((r) => ({
      shapeKey: r.shapeKey,
      nameVi: r.nameVi,
      type: r.type as ShapeType,
      level: r.level as ShapeLevel,
      visible: r.visible !== 0,
    }))
  },

  async findAllExamples(): Promise<ExampleDef[]> {
    const rows = await requireDb()
      .select({
        id: geometryShapeExamples.id,
        shapeKey: geometryShapeExamples.shapeKey,
        shapeNameVi: geometryShapes.nameVi,
        title: geometryShapeExamples.title,
        description: geometryShapeExamples.description,
        level: geometryShapeExamples.level,
        grade: geometryShapeExamples.grade,
        prompt: geometryShapeExamples.prompt,
        params: geometryShapeExamples.params,
        givenParams: geometryShapeExamples.givenParams,
      })
      .from(geometryShapeExamples)
      .innerJoin(geometryShapes, eq(geometryShapeExamples.shapeKey, geometryShapes.shapeKey))
      .where(ne(geometryShapes.visible, 0))
    return rows.map((e) => ({
      id: e.id,
      shapeKey: e.shapeKey,
      shapeNameVi: e.shapeNameVi,
      title: e.title,
      description: e.description,
      level: e.level as ExampleDef['level'],
      grade: e.grade as ExampleDef['grade'],
      prompt: e.prompt,
      params: e.params ? p(e.params, undefined) : undefined,
      givenParams: e.givenParams ? p(e.givenParams, undefined) : undefined,
    }))
  },

  /** Ordered list of visible shapes for the 3×3 showcase grid. */
  async findShowcase(): Promise<Array<{ shapeKey: string; nameVi: string; params: Record<string, number> }>> {
    const SHOWCASE_ORDER = [
      'cube', 'cylinder', 'cone',
      'sphere', 'square_pyramid', 'rectangular_prism',
      'triangular_prism', 'triangular_pyramid', 'tetrahedron',
    ]
    const rows = await requireDb()
      .select({
        shapeKey: geometryShapes.shapeKey,
        nameVi: geometryShapes.nameVi,
        fallbackSpec: geometryShapes.fallbackSpec,
      })
      .from(geometryShapes)
      .where(ne(geometryShapes.visible, 0))
    return SHOWCASE_ORDER
      .map((key) => rows.find((r) => r.shapeKey === key))
      .filter((r): r is NonNullable<typeof r> => r != null)
      .map((r) => {
        const spec = p(r.fallbackSpec, {} as { params?: Record<string, number> })
        return { shapeKey: r.shapeKey, nameVi: r.nameVi, params: spec.params ?? {} }
      })
  },

  async findByKey(shapeKey: string): Promise<ShapeRecord | null> {
    const database = requireDb()
    const [main] = await database
      .select()
      .from(geometryShapes)
      .where(eq(geometryShapes.shapeKey, shapeKey))
      .limit(1)
    if (!main) return null

    const [vertices, edges, faces, specialPoints, measurements, keywords, examples] =
      await Promise.all([
        database.select().from(geometryShapeVertices).where(eq(geometryShapeVertices.shapeKey, shapeKey)),
        database.select().from(geometryShapeEdges).where(eq(geometryShapeEdges.shapeKey, shapeKey)),
        database.select().from(geometryShapeFaces).where(eq(geometryShapeFaces.shapeKey, shapeKey)),
        database.select().from(geometryShapeSpecialPoints).where(eq(geometryShapeSpecialPoints.shapeKey, shapeKey)),
        database.select().from(geometryShapeMeasurements).where(eq(geometryShapeMeasurements.shapeKey, shapeKey)),
        database.select().from(geometryShapeKeywords).where(eq(geometryShapeKeywords.shapeKey, shapeKey)),
        database.select().from(geometryShapeExamples).where(eq(geometryShapeExamples.shapeKey, shapeKey)),
      ])

    return {
      shapeKey: main.shapeKey,
      nameVi: main.nameVi,
      type: main.type as ShapeType,
      level: main.level as ShapeLevel,
      visible: main.visible !== 0,
      topology: {
        vertices: main.topoVertices,
        edges: main.topoEdges,
        faces: main.topoFaces,
        euler: main.topoEuler,
      },
      fallbackSpec: p(main.fallbackSpec, { shape: '', vertices: [], params: {}, conditions: [] }),
      formulas: p(main.formulas, {}),
      lessonContent: main.lessonContent ? p(main.lessonContent, undefined) : undefined,
      objectDescriptions: main.objectDescriptions ? p(main.objectDescriptions, undefined) : undefined,
      suggestedQuestions: p(main.suggestedQuestions, [] as string[]),
      parserKeywords: keywords.map((k) => k.keyword),
      examples: examples.map((e) => ({
        id: e.id,
        shapeKey: e.shapeKey,
        shapeNameVi: main.nameVi,
        title: e.title,
        description: e.description,
        level: e.level as ExampleDef['level'],
        grade: e.grade as ExampleDef['grade'],
        prompt: e.prompt,
        params: e.params ? p(e.params, undefined) : undefined,
        givenParams: e.givenParams ? p(e.givenParams, undefined) : undefined,
      })),
      vertices: vertices.map((v) => ({
        id: v.vertexId,
        position: { x: v.x, y: v.y, z: v.z },
        label: v.label,
      })),
      edges: edges.map((e) => ({
        id: e.edgeId,
        from: e.fromVertex,
        to: e.toVertex,
        type: e.edgeType as ShapeRecord['edges'][number]['type'],
        length: e.length ?? undefined,
        paramKey: e.paramKey ?? undefined,
      })),
      faces: faces.map((f) => ({
        id: f.faceId,
        vertices: p(f.vertices, [] as string[]),
        type: f.faceType as ShapeRecord['faces'][number]['type'],
        area: f.area ?? undefined,
        normal: f.normal ? p(f.normal, undefined) : undefined,
      })),
      specialPoints: specialPoints.map((sp) => ({
        id: sp.pointId,
        position: { x: sp.x, y: sp.y, z: sp.z },
        label: sp.label,
        description: sp.description,
        onEdge: sp.onEdge ?? undefined,
      })),
      measurements: measurementsFromEntries(
        measurements.map((m) => ({ metricKey: m.metricKey, value: m.value })),
      ),
      modelConstructionSteps: p(main.modelConstructionSteps, []),
      surfaceType: (main.surfaceType as ShapeRecord['surfaceType']) ?? undefined,
    }
  },

  /** Insert or fully replace a shape (main row + all children). Idempotent. */
  async upsert(record: ShapeRecord): Promise<void> {
    const database = requireDb()
    const { shapeKey } = record

    const mainValues = {
      shapeKey,
      nameVi: record.nameVi,
      type: record.type,
      level: record.level,
      visible: record.visible === false ? 0 : 1,
      topoVertices: record.topology.vertices,
      topoEdges: record.topology.edges,
      topoFaces: record.topology.faces,
      topoEuler: record.topology.euler,
      fallbackSpec: j(record.fallbackSpec),
      formulas: j(record.formulas),
      lessonContent: record.lessonContent ? j(record.lessonContent) : null,
      objectDescriptions: record.objectDescriptions ? j(record.objectDescriptions) : null,
      suggestedQuestions: j(record.suggestedQuestions),
      surfaceType: record.surfaceType ?? null,
      modelConstructionSteps: j(record.modelConstructionSteps),
      updatedAt: Math.floor(Date.now() / 1000),
    }

    await database.transaction(async (tx) => {
      await tx
        .insert(geometryShapes)
        .values(mainValues)
        .onConflictDoUpdate({ target: geometryShapes.shapeKey, set: mainValues })

      // Replace children
      await Promise.all([
        tx.delete(geometryShapeVertices).where(eq(geometryShapeVertices.shapeKey, shapeKey)),
        tx.delete(geometryShapeEdges).where(eq(geometryShapeEdges.shapeKey, shapeKey)),
        tx.delete(geometryShapeFaces).where(eq(geometryShapeFaces.shapeKey, shapeKey)),
        tx.delete(geometryShapeSpecialPoints).where(eq(geometryShapeSpecialPoints.shapeKey, shapeKey)),
        tx.delete(geometryShapeMeasurements).where(eq(geometryShapeMeasurements.shapeKey, shapeKey)),
        tx.delete(geometryShapeKeywords).where(eq(geometryShapeKeywords.shapeKey, shapeKey)),
        tx.delete(geometryShapeExamples).where(eq(geometryShapeExamples.shapeKey, shapeKey)),
      ])

      if (record.vertices.length) {
        await tx.insert(geometryShapeVertices).values(
          record.vertices.map((v) => ({
            id: childId(shapeKey, 'v', v.id),
            shapeKey,
            vertexId: v.id,
            x: v.position.x,
            y: v.position.y,
            z: v.position.z,
            label: v.label,
          })),
        )
      }
      if (record.edges.length) {
        await tx.insert(geometryShapeEdges).values(
          record.edges.map((e) => ({
            id: childId(shapeKey, 'e', e.id),
            shapeKey,
            edgeId: e.id,
            fromVertex: e.from,
            toVertex: e.to,
            edgeType: e.type,
            length: e.length ?? null,
            paramKey: e.paramKey ?? null,
          })),
        )
      }
      if (record.faces.length) {
        await tx.insert(geometryShapeFaces).values(
          record.faces.map((f) => ({
            id: childId(shapeKey, 'f', f.id),
            shapeKey,
            faceId: f.id,
            vertices: j(f.vertices),
            faceType: f.type,
            area: f.area ?? null,
            normal: f.normal ? j(f.normal) : null,
          })),
        )
      }
      if (record.specialPoints.length) {
        await tx.insert(geometryShapeSpecialPoints).values(
          record.specialPoints.map((sp) => ({
            id: childId(shapeKey, 'sp', sp.id),
            shapeKey,
            pointId: sp.id,
            x: sp.position.x,
            y: sp.position.y,
            z: sp.position.z,
            label: sp.label,
            description: sp.description,
            onEdge: sp.onEdge ?? null,
          })),
        )
      }
      const measRows = measurementEntries(record.measurements)
      if (measRows.length) {
        await tx.insert(geometryShapeMeasurements).values(
          measRows.map((m) => ({
            id: childId(shapeKey, 'm', m.metricKey),
            shapeKey,
            metricKey: m.metricKey,
            value: m.value,
            unit: null,
          })),
        )
      }
      if (record.parserKeywords.length) {
        await tx.insert(geometryShapeKeywords).values(
          record.parserKeywords.map((keyword, i) => ({
            id: childId(shapeKey, 'kw', i),
            shapeKey,
            keyword,
          })),
        )
      }
      if (record.examples.length) {
        await tx.insert(geometryShapeExamples).values(
          record.examples.map((ex) => ({
            id: ex.id,
            shapeKey,
            title: ex.title,
            description: ex.description,
            level: ex.level,
            grade: ex.grade,
            prompt: ex.prompt,
            params: ex.params ? j(ex.params) : null,
            givenParams: ex.givenParams ? j(ex.givenParams) : null,
          })),
        )
      }
    })
  },

  async delete(shapeKey: string): Promise<void> {
    // FK cascade removes children
    await requireDb().delete(geometryShapes).where(eq(geometryShapes.shapeKey, shapeKey))
  },

  async setVisible(shapeKey: string, visible: boolean): Promise<void> {
    await requireDb()
      .update(geometryShapes)
      .set({ visible: visible ? 1 : 0, updatedAt: Math.floor(Date.now() / 1000) })
      .where(eq(geometryShapes.shapeKey, shapeKey))
  },

  // ── Original snapshot (whole library as ONE JSON blob, single row) ───────

  /** Raw originals JSON blob (`{}` if none yet). */
  async getOriginalsRaw(): Promise<string> {
    const [row] = await requireDb()
      .select()
      .from(geometryShapeOriginals)
      .where(eq(geometryShapeOriginals.id, ORIGINALS_ID))
      .limit(1)
    return row?.data ?? '{}'
  },

  async getOriginalsMap(): Promise<Record<string, ShapeRecord>> {
    try {
      return JSON.parse(await this.getOriginalsRaw()) as Record<string, ShapeRecord>
    } catch {
      return {}
    }
  },

  /** One original record (for reset). */
  async getOriginal(shapeKey: string): Promise<ShapeRecord | null> {
    const map = await this.getOriginalsMap()
    return map[shapeKey] ?? null
  },

  /** Overwrite the whole blob (admin edit, or seed). */
  async saveOriginalsRaw(json: string): Promise<void> {
    const values = { id: ORIGINALS_ID, data: json, updatedAt: Math.floor(Date.now() / 1000) }
    await requireDb()
      .insert(geometryShapeOriginals)
      .values(values)
      .onConflictDoUpdate({ target: geometryShapeOriginals.id, set: values })
  },

  /** Seed the blob with the file baseline, only if no snapshot exists yet. */
  async seedOriginalsIfAbsent(map: Record<string, ShapeRecord>): Promise<boolean> {
    const [row] = await requireDb()
      .select({ id: geometryShapeOriginals.id })
      .from(geometryShapeOriginals)
      .where(eq(geometryShapeOriginals.id, ORIGINALS_ID))
      .limit(1)
    if (row) return false
    await this.saveOriginalsRaw(JSON.stringify(map))
    return true
  },

  async getVersion(): Promise<number> {
    const [row] = await requireDb()
      .select()
      .from(geometryMeta)
      .where(eq(geometryMeta.key, VERSION_KEY))
      .limit(1)
    return row ? Number.parseInt(row.value, 10) || 0 : 0
  },

  async bumpVersion(): Promise<number> {
    const database = requireDb()
    const current = await this.getVersion()
    const next = current + 1
    await database
      .insert(geometryMeta)
      .values({ key: VERSION_KEY, value: String(next) })
      .onConflictDoUpdate({ target: geometryMeta.key, set: { value: String(next) } })
    return next
  },
}
