// src/lib/geo-ai/admin/generateShapeRecord.ts
// Admin "tạo từ đề bài": turn a Vietnamese problem statement into a draft
// ShapeRecord (geometry + metadata) for the teacher to review and save.
// Geometry comes from the existing resolve pipeline; suggested questions from an
// LLM (DeepSeek/OpenRouter). Degrades gracefully when no API key is configured.

import { resolveGeometry } from '@/lib/geo-ai/cache/geoAICache'
import { getShapeRecord } from '@/lib/geo-ai/data/serverShapes'
import { recordFromModel, shapeDataFromRecord } from '@/db/shapeRecord'
import type { ShapeRecord } from '@/db/shapeRecord'
import type { ExampleDef, ShapeData, ShapeLevel, ShapeType } from '@/lib/geo-ai/data/types'
import type { GeometryModel } from '@/types/geo-ai'

export interface GenerateInput {
  prompt: string
  shapeKey?: string
  grade?: ExampleDef['grade']
}

export interface GenerateResult {
  record: ShapeRecord
  usedAI: boolean
  warnings: string[]
}

const CONTENT_SYSTEM_PROMPT =
  'Bạn là giáo viên Toán Việt Nam giàu kinh nghiệm. ' +
  'Trả về JSON THUẦN TÚY duy nhất — không markdown, không giải thích, không code block.'

const LEVEL_CONTEXT: Record<ShapeLevel, string> = {
  cap2: 'Đối tượng: học sinh THCS (lớp 6–9). Ngôn ngữ đơn giản, trực quan.',
  cap3: 'Đối tượng: học sinh THPT (lớp 10–12). Có thể dùng thuật ngữ hình học không gian.',
}

function buildContentPrompt(shape: ShapeData, problem: string): string {
  return `${LEVEL_CONTEXT[shape.level]}

Đề bài giáo viên nhập: "${problem}"
Hình: ${shape.nameVi}

Tạo các câu hỏi học sinh thường hỏi, bám sát đề bài. Trả về JSON đúng cấu trúc:
{ "suggestedQuestions": ["câu hỏi 1?", "câu hỏi 2?", "câu hỏi 3?"] }`
}

/** Ask the chat LLM for suggested questions. Throws if no key / bad response. */
async function generateSuggestedQuestions(shape: ShapeData, problem: string): Promise<string[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

  const baseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://api.deepseek.com'
  const model = process.env.OPENROUTER_MODEL ?? 'deepseek-chat'

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CONTENT_SYSTEM_PROMPT },
        { role: 'user', content: buildContentPrompt(shape, problem) },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  })
  if (!response.ok) {
    throw new Error(`Content LLM failed: ${response.status} ${(await response.text()).slice(0, 200)}`)
  }
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Content LLM returned empty response')

  const raw = JSON.parse(text) as { suggestedQuestions?: string[] }
  return raw.suggestedQuestions ?? []
}

function inferType(model: GeometryModel): ShapeType {
  if (model.surfaceType) return 'curved'
  if (model.faces.length === 0) return 'flat'
  return 'polyhedron'
}

function buildExample(
  shapeKey: string,
  shapeNameVi: string,
  prompt: string,
  model: GeometryModel,
  grade: ExampleDef['grade'],
): ExampleDef {
  const params: Record<string, number> = {}
  for (const [k, v] of Object.entries(model.spec.params)) {
    if (typeof v === 'number' && Number.isFinite(v)) params[k] = v
  }
  return {
    id: `gen-${shapeKey}-${Date.now()}`,
    shapeKey,
    shapeNameVi,
    title: prompt.slice(0, 60),
    description: prompt,
    level: 'intermediate',
    grade,
    prompt,
    params: Object.keys(params).length ? params : undefined,
    givenParams: Object.keys(params).filter((k) => k !== 'unit'),
  }
}

/** Generate a draft ShapeRecord from a Vietnamese problem statement. */
export async function generateShapeRecord(input: GenerateInput): Promise<GenerateResult> {
  const warnings: string[] = []
  const prompt = input.prompt.trim()
  if (!prompt) throw new Error('Đề bài trống')

  // 1. Geometry from the existing resolve pipeline (parse → build).
  const model = await resolveGeometry(prompt)
  const shapeKey = input.shapeKey?.trim() || model.spec.shape

  // 2. Baseline metadata from Turso (defaults for non-AI fields).
  const existingRecord = await getShapeRecord(shapeKey)
  const baseline: ShapeData | undefined = existingRecord ? shapeDataFromRecord(existingRecord) : undefined
  if (!baseline) {
    warnings.push(`Không có mẫu sẵn cho "${shapeKey}" — dùng giá trị mặc định, kiểm tra kỹ trước khi lưu.`)
  }

  const level: ShapeLevel =
    baseline?.level ??
    (input.grade === 'lop6' || input.grade === 'lop7' || input.grade === 'lop8' ? 'cap2' : 'cap3')

  // 3. Suggested questions via LLM (graceful fallback to baseline).
  let usedAI = false
  let suggestedQuestions: string[]
  const shapeForPrompt: ShapeData =
    baseline ?? {
      nameVi: shapeKey,
      type: inferType(model),
      level,
      parserKeywords: [],
      fallbackSpec: { shape: shapeKey, vertices: [], params: {}, conditions: [] },
      topology: { vertices: 0, edges: 0, faces: 0, euler: null },
      formulas: {},
      suggestedQuestions: [],
    }

  try {
    suggestedQuestions = await generateSuggestedQuestions(shapeForPrompt, prompt)
    usedAI = true
  } catch (error) {
    warnings.push(
      `AI nội dung không khả dụng (${error instanceof Error ? error.message : 'lỗi'}) — dùng nội dung mẫu.`,
    )
    suggestedQuestions = baseline?.suggestedQuestions ?? []
  }

  // 4. Merge into a ShapeData, using freshly built spec/topology.
  const euler =
    model.faces.length > 0
      ? Object.keys(model.vertices).length - model.edges.length + model.faces.length
      : null
  const shapeData: ShapeData = {
    nameVi: baseline?.nameVi ?? shapeKey,
    type: baseline?.type ?? inferType(model),
    level,
    parserKeywords: baseline?.parserKeywords ?? [],
    fallbackSpec: {
      shape: model.spec.shape,
      vertices: model.spec.vertices,
      apex: model.spec.apex,
      baseShape: model.spec.baseShape,
      params: Object.fromEntries(
        Object.entries(model.spec.params).filter(([, v]) => typeof v === 'number'),
      ) as Record<string, number>,
      conditions: model.spec.conditions ?? [],
    },
    topology: {
      vertices: Object.keys(model.vertices).length,
      edges: model.edges.length,
      faces: model.faces.length,
      euler,
    },
    formulas: baseline?.formulas ?? {},
    lessonContent: baseline?.lessonContent,
    objectDescriptions: baseline?.objectDescriptions,
    suggestedQuestions,
  }

  const example = buildExample(shapeKey, shapeData.nameVi, prompt, model, input.grade ?? 'lop9')
  const record = recordFromModel(shapeKey, shapeData, model, [example])

  return { record, usedAI, warnings }
}
