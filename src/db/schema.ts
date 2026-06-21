import { sql } from 'drizzle-orm'
import { text, integer, real, sqliteTable } from 'drizzle-orm/sqlite-core'

export const geometryCache = sqliteTable('geometry_cache', {
  hash: text('hash').primaryKey(),
  prompt: text('prompt').notNull(),
  spec: text('spec').notNull(),      // JSON string
  model: text('model').notNull(),    // JSON string
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
})

export type GeometryCacheRow = typeof geometryCache.$inferSelect
export type GeometryCacheInsert = typeof geometryCache.$inferInsert

export const geometryExamples = sqliteTable('geometry_examples', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  level: text('level').notNull(), // 'basic' | 'intermediate' | 'advanced'
  geometryJson: text('geometry_json'),  // nullable — null means not yet generated
  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`).notNull(),
})

export type GeometryExampleRow = typeof geometryExamples.$inferSelect
export type GeometryExampleInsert = typeof geometryExamples.$inferInsert

// ── Shape library (persisted geometry shapes) ──────────────────────────────
// 1 row per library shape + normalized related tables. Source of truth for the
// runtime shape library (replaces static shapes-data.ts, which becomes an
// offline fallback). All JSON columns hold stringified objects.

export const geometryShapes = sqliteTable('geometry_shapes', {
  shapeKey: text('shape_key').primaryKey(),
  nameVi: text('name_vi').notNull(),
  type: text('type').notNull(),   // 'polyhedron' | 'curved' | 'flat'
  level: text('level').notNull(), // 'cap2' | 'cap3'

  topoVertices: integer('topo_vertices').notNull().default(0),
  topoEdges: integer('topo_edges').notNull().default(0),
  topoFaces: integer('topo_faces').notNull().default(0),
  topoEuler: integer('topo_euler'), // nullable

  // JSON columns (stringified) for non-coordinate nested content
  fallbackSpec: text('fallback_spec').notNull(),          // FallbackSpec
  formulas: text('formulas').notNull(),                   // FormulaSet
  lessonContent: text('lesson_content'),                  // LessonContent | null
  objectDescriptions: text('object_descriptions'),        // ObjectDescriptions | null
  suggestedQuestions: text('suggested_questions').notNull(), // string[]

  // Visibility: 1 = shown in student library (default), 0 = hidden
  visible: integer('visible').notNull().default(1),

  // GeometryModel-level extras
  surfaceType: text('surface_type'),                      // nullable
  modelConstructionSteps: text('model_construction_steps').notNull(), // ConstructionStep[]

  createdAt: integer('created_at').default(sql`(unixepoch())`).notNull(),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`).notNull(),
})

export const geometryShapeVertices = sqliteTable('geometry_shape_vertices', {
  id: text('id').primaryKey(),
  shapeKey: text('shape_key')
    .notNull()
    .references(() => geometryShapes.shapeKey, { onDelete: 'cascade' }),
  vertexId: text('vertex_id').notNull(), // "A", "S"
  x: real('x').notNull(),
  y: real('y').notNull(),
  z: real('z').notNull(),
  label: text('label').notNull(),
})

export const geometryShapeEdges = sqliteTable('geometry_shape_edges', {
  id: text('id').primaryKey(),
  shapeKey: text('shape_key')
    .notNull()
    .references(() => geometryShapes.shapeKey, { onDelete: 'cascade' }),
  edgeId: text('edge_id').notNull(),
  fromVertex: text('from_vertex').notNull(),
  toVertex: text('to_vertex').notNull(),
  edgeType: text('edge_type').notNull(), // base|lateral|diagonal|axis|radius|special
  length: real('length'),
  paramKey: text('param_key'),
})

export const geometryShapeFaces = sqliteTable('geometry_shape_faces', {
  id: text('id').primaryKey(),
  shapeKey: text('shape_key')
    .notNull()
    .references(() => geometryShapes.shapeKey, { onDelete: 'cascade' }),
  faceId: text('face_id').notNull(),
  vertices: text('vertices').notNull(), // JSON string[]
  faceType: text('face_type').notNull(), // base|lateral|top|cross_section
  area: real('area'),
  normal: text('normal'), // JSON Vector3D | null
})

export const geometryShapeSpecialPoints = sqliteTable('geometry_shape_special_points', {
  id: text('id').primaryKey(),
  shapeKey: text('shape_key')
    .notNull()
    .references(() => geometryShapes.shapeKey, { onDelete: 'cascade' }),
  pointId: text('point_id').notNull(),
  x: real('x').notNull(),
  y: real('y').notNull(),
  z: real('z').notNull(),
  label: text('label').notNull(),
  description: text('description').notNull(),
  onEdge: text('on_edge'),
})

export const geometryShapeMeasurements = sqliteTable('geometry_shape_measurements', {
  id: text('id').primaryKey(),
  shapeKey: text('shape_key')
    .notNull()
    .references(() => geometryShapes.shapeKey, { onDelete: 'cascade' }),
  metricKey: text('metric_key').notNull(), // volume|surfaceArea|...
  value: real('value').notNull(),
  unit: text('unit'),
})

export const geometryShapeKeywords = sqliteTable('geometry_shape_keywords', {
  id: text('id').primaryKey(),
  shapeKey: text('shape_key')
    .notNull()
    .references(() => geometryShapes.shapeKey, { onDelete: 'cascade' }),
  keyword: text('keyword').notNull(),
})

export const geometryShapeExamples = sqliteTable('geometry_shape_examples', {
  id: text('id').primaryKey(), // = ExampleDef.id
  shapeKey: text('shape_key')
    .notNull()
    .references(() => geometryShapes.shapeKey, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  level: text('level').notNull(),  // 'basic'|'intermediate'|'advanced'
  grade: text('grade').notNull(),  // 'lop6'|'lop7'|'lop8'|'lop9'
  prompt: text('prompt').notNull(),
  params: text('params'),          // JSON Record<string,number> | null
  givenParams: text('given_params'), // JSON string[] | null
})

// Original snapshot — the ENTIRE library as ONE JSON blob in a single row.
// data = JSON.stringify(Record<shapeKey, ShapeRecord>). Lets the admin restore a
// shape to its baseline after a wrong edit/delete, and edit the whole blob.
export const geometryShapeOriginals = sqliteTable('geometry_shape_originals', {
  id: text('id').primaryKey(), // constant 'originals'
  data: text('data').notNull(),
  updatedAt: integer('updated_at').default(sql`(unixepoch())`).notNull(),
})

// key/value meta — holds 'shapes_version' for frontend cache freshness
export const geometryMeta = sqliteTable('geometry_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})

export type GeometryShapeRow = typeof geometryShapes.$inferSelect
export type GeometryShapeInsert = typeof geometryShapes.$inferInsert
export type GeometryShapeVertexRow = typeof geometryShapeVertices.$inferSelect
export type GeometryShapeEdgeRow = typeof geometryShapeEdges.$inferSelect
export type GeometryShapeFaceRow = typeof geometryShapeFaces.$inferSelect
export type GeometryShapeSpecialPointRow = typeof geometryShapeSpecialPoints.$inferSelect
export type GeometryShapeMeasurementRow = typeof geometryShapeMeasurements.$inferSelect
export type GeometryShapeKeywordRow = typeof geometryShapeKeywords.$inferSelect
export type GeometryShapeExampleRow = typeof geometryShapeExamples.$inferSelect
export type GeometryShapeOriginalRow = typeof geometryShapeOriginals.$inferSelect
