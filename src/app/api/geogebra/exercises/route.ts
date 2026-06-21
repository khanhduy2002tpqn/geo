import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadConfig, type AiConfig } from '@/lib/config';
import { logger } from '@/lib/logger';
import type { Exercise, ExerciseSolution, SolutionStep, StructuredSolution } from '@/types/exercise';

export const runtime = 'nodejs';

const MAX_TOKENS = 1200;
const TEMPERATURE = 0.4;
const REQUEST_TIMEOUT_MS = 20000;
const ERROR_DETAIL_MAX_LENGTH = 300;
const EXERCISES_PER_DIFFICULTY = 3;

const DIFFICULTY_CONFIG = {
  basic: {
    label: 'căn bản',
    instruction: 'Mức lớp 6–7: nhận biết hình, áp dụng trực tiếp 1 định nghĩa/tính chất đơn giản. Bài giải 2–3 bước.',
  },
  medium: {
    label: 'trung bình',
    instruction: 'Mức lớp 7–8: vận dụng 1–2 tính chất hình học, có tính toán hoặc lập luận trung gian.',
  },
  advanced: {
    label: 'nâng cao',
    instruction: 'Mức lớp 8–9: tổng hợp nhiều quan hệ, chứng minh nhiều bước hoặc kết hợp định lý Pythagoras / tính chất đường tròn.',
  },
} as const;

// Vary question type by index so 3 exercises per difficulty cover different aspects
const INDEX_HINT = [
  'Ưu tiên câu hỏi TÍNH TOÁN (diện tích, chu vi, độ dài, góc).',
  'Ưu tiên câu hỏi TÍNH CHẤT / QUAN HỆ (so sánh, chứng minh bằng nhau, song song, vuông góc).',
  'Ưu tiên câu hỏi CHỨNG MINH hoặc kết hợp nhiều bước (suy luận chuỗi).',
] as const;

const ExercisesSchema = z.object({
  constructionContext: z.string().max(3000),
  objectData: z.string().max(4000).optional(),
  difficulty: z.enum(['basic', 'medium', 'advanced']),
  index: z.number().int().min(0).max(2).optional().default(0),
});

export type { Exercise } from '@/types/exercise';

export interface ExercisesResponse {
  exercises: Exercise[];
}

type ExerciseDifficulty = Exercise['difficulty'];

const SYSTEM_PROMPT = `Bạn là giáo viên Toán cấp 2 (THCS, lớp 6–9) Việt Nam. Sinh bài tập hình học và lời giải chi tiết đúng chương trình cấp 2.

━━━ CHƯƠNG TRÌNH CẤP 2 — ĐƯỢC PHÉP ━━━

Công thức diện tích & chu vi:
  Tam giác:       S = (1/2) × đáy × chiều cao
  Tam giác vuông: S = (1/2) × 2 cạnh góc vuông
  Hình chữ nhật:  S = dài × rộng,  P = 2(dài + rộng)
  Hình vuông:     S = cạnh²,        P = 4 × cạnh
  Hình bình hành: S = đáy × chiều cao
  Hình thang:     S = (đáy lớn + đáy nhỏ)/2 × chiều cao
  Hình thoi:      S = (d1 × d2)/2
  Đường tròn:     S = π × r²,       C = 2πr

Định lý & tính chất:
  Định lý Pythagoras:  BC² = AB² + AC²  (tam giác vuông tại A)
  Tổng góc tam giác:   ∠A + ∠B + ∠C = 180°
  Tam giác cân:        hai cạnh bằng nhau → hai góc đáy bằng nhau
  Tam giác đều:        3 cạnh bằng nhau, mỗi góc = 60°
  Đường cao/trung tuyến/phân giác/trung trực trong tam giác
  Tính chất hình bình hành, hình thang, hình thoi, hình chữ nhật
  Đường tròn: tiếp tuyến, dây cung, góc ở tâm

━━━ TUYỆT ĐỐI KHÔNG DÙNG ━━━
✗ Công thức Heron  (không học ở cấp 2)
✗ Sin / cos / tan / lượng giác bất kỳ
✗ Vectơ, tọa độ (trừ tọa độ cơ bản nếu bài có)
✗ Định lý cos, định lý sin
✗ Giới hạn, tích phân, đạo hàm
✗ Công thức ngoài danh sách trên

Nếu bài toán cần công thức ngoài danh sách → đổi câu hỏi hoặc bỏ bài đó.

━━━ QUY TẮC LỜI GIẢI ━━━

Lời giải là object JSON có trường "steps" — mảng các bước. Mỗi bước:
  "text"         : BẮT BUỘC — mô tả bước, PHẢI nêu rõ định lý/tính chất/công thức áp dụng
  "expr"         : biểu thức số học JS (chỉ khi cần tính số)
  "unit"         : đơn vị (cm, cm², cm³, °)
  "isConclusion" : true cho bước kết luận cuối

Quy tắc "text" — PHẢI theo một trong các mẫu sau:
  "Theo định lý Pythagoras: BC² = AB² + AC²"
  "Áp dụng công thức diện tích tam giác: S = (1/2) × đáy × h"
  "Vì △ABC cân tại A nên ∠ABC = ∠ACB (tính chất tam giác cân)"
  "Tổng ba góc tam giác: ∠A + ∠B + ∠C = 180°"
  "Suy ra: BC²"   (bước tính trung gian sau khi đã nêu định lý)
KHÔNG được viết chung chung như "Tính BC" hay "Bước 1".

Quy tắc "expr":
  - Chỉ: chữ số, +, -, *, /, ^, (), sqrt(), pi
  - KHÔNG tự tính kết quả — ứng dụng tính từ "expr"
  - Đúng: "(1/2) * 6 * 4"   "sqrt(3^2 + 4^2)"   "pi * 5^2"
  - Sai:  "S = 12"          "(1/2)×6×4"          "12 cm²"

━━━ VÍ DỤ MẪU ━━━

{
  "question": "△ABC vuông tại A, AB = 3 cm, AC = 4 cm. Tính BC và diện tích △ABC.",
  "difficulty": "medium",
  "solution": {
    "steps": [
      { "text": "Theo định lý Pythagoras (△ABC vuông tại A): BC² = AB² + AC²" },
      { "text": "Thay số: BC²", "expr": "3^2 + 4^2", "unit": "cm²" },
      { "text": "Suy ra BC", "expr": "sqrt(3^2 + 4^2)", "unit": "cm" },
      { "text": "Áp dụng công thức S tam giác vuông: S = (1/2) × AB × AC" },
      { "text": "S△ABC", "expr": "(1/2) * 3 * 4", "unit": "cm²" },
      { "text": "Vậy BC = 5 cm và S△ABC = 6 cm².", "isConclusion": true }
    ]
  }
}

━━━ YÊU CẦU KHÁC ━━━
- Câu hỏi ngôn ngữ đơn giản, phù hợp lớp 6–9, KHÔNG nêu đáp án
- Chỉ hỏi về bài toán được cung cấp
- Tối đa 6 bước mỗi lời giải, "text" tối đa 15 từ

Trả về JSON hợp lệ cho ĐỘC NHẤT 1 bài tập (không có markdown code block, không có array):
{
  "question": "...",
  "difficulty": "...",
  "solution": { "steps": [ { "text": "...", "expr": "...", "unit": "..." }, ... ] }
}`;

/** Fix literal newlines/tabs inside JSON string values emitted by AI models. */
function fixJsonStrings(text: string): string {
  let inString = false;
  let escaped = false;
  let result = '';
  for (const ch of text) {
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true; result += ch; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString && ch === '\n') { result += '\\n'; continue; }
    if (inString && ch === '\r') { result += '\\r'; continue; }
    if (inString && ch === '\t') { result += '\\t'; continue; }
    result += ch;
  }
  return result;
}

function extractJsonObject(text: string): string {
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
  if (fenced?.[1]) return fenced[1].trim();

  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);

  return text;
}

const SAFE_EXPR_CHARS = /^[\d\s.+\-*\/()^]+$/;

function isValidExpr(expr: string): boolean {
  if (!expr.trim()) return false;
  const stripped = expr.trim().replace(/\bsqrt\b/g, '').replace(/\bpi\b/g, '');
  // stripped may be empty for bare "pi" or "sqrt(...)" — that is valid
  return stripped === '' || SAFE_EXPR_CHARS.test(stripped);
}

function normalizeSolution(raw: unknown): ExerciseSolution {
  if (typeof raw === 'string' && raw.trim()) {
    return { steps: [{ text: raw }] };
  }

  if (raw !== null && typeof raw === 'object' && 'steps' in raw) {
    const stepsRaw = (raw as { steps: unknown }).steps;
    if (Array.isArray(stepsRaw)) {
      const steps: SolutionStep[] = stepsRaw
        .filter((s): s is Record<string, unknown> => s !== null && typeof s === 'object')
        .map((s): SolutionStep => {
          const step: SolutionStep = {
            text: typeof s.text === 'string' ? s.text.trim() : '',
          };
          if (typeof s.expr === 'string' && isValidExpr(s.expr)) step.expr = s.expr.trim();
          if (typeof s.unit === 'string' && s.unit.trim()) step.unit = s.unit.trim();
          if (s.isConclusion === true) step.isConclusion = true;
          return step;
        })
        .filter((s) => s.text);
      if (steps.length > 0) return { steps };
    }
  }

  return { steps: [{ text: 'Không có lời giải.' }] };
}

function normalizeExercises(value: unknown, fallbackDifficulty: ExerciseDifficulty): Exercise[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item): Exercise => {
      const difficulty: Exercise['difficulty'] =
        item.difficulty === 'basic' || item.difficulty === 'medium' || item.difficulty === 'advanced'
          ? item.difficulty
          : fallbackDifficulty;
      const solution: ExerciseSolution = normalizeSolution(item.solution);
      return {
        question: typeof item.question === 'string' ? item.question.trim() : '',
        difficulty,
        solution,
      };
    })
    .filter((item) => item.question && hasSolutionContent(item.solution));
}

function hasSolutionContent(s: ExerciseSolution): boolean {
  if (typeof s === 'string') return s.trim().length > 0;
  return (s as StructuredSolution).steps.length > 0;
}

/**
 * Salvage complete exercises from a truncated AI response.
 * Tries progressively simpler closing sequences at each '}' boundary
 * to handle deeply nested solution objects.
 */
function recoverPartialExercises(raw: string, fallbackDifficulty: ExerciseDifficulty): Exercise[] {
  const base = fixJsonStrings(raw);
  const start = base.indexOf('{');
  if (start === -1) return [];

  // Closing suffixes ordered from most-nested to least:
  // solution.steps array + solution obj + exercise obj + exercises array
  const closingSuffixes = [
    ']}]}]}',   // truncated inside a step
    ']}]}',     // truncated inside steps array, solution open
    ']}',       // truncated inside solution array, exercise closed
    '}]}',      // truncated inside solution object
    '}}]}',     // truncated mid-step fields
  ];

  // Try each '}' position from right to left (limit to 15 candidates)
  let pos = base.lastIndexOf('}');
  let attempts = 0;
  while (pos >= start && attempts < 15) {
    attempts++;
    const slice = base.slice(start, pos + 1);
    for (const suffix of closingSuffixes) {
      try {
        const parsed = JSON.parse(slice + suffix) as { exercises?: unknown };
        const exercises = normalizeExercises(parsed.exercises, fallbackDifficulty);
        if (exercises.length > 0) {
          return exercises.map((ex) => ({ ...ex, difficulty: fallbackDifficulty }));
        }
      } catch {
        // try next suffix
      }
    }
    pos = base.lastIndexOf('}', pos - 1);
  }

  return [];
}

function buildSingleExercisePrompt(
  constructionContext: string,
  objectData: string | undefined,
  difficulty: ExerciseDifficulty,
  index: number,
): string {
  const difficultyConfig = DIFFICULTY_CONFIG[difficulty];
  const contextParts: string[] = [`MÔ TẢ TỔNG QUAN:\n${constructionContext}`];
  if (objectData) contextParts.push(`DANH SÁCH ĐỐI TƯỢNG:\n${objectData}`);
  const hint = INDEX_HINT[index] ?? INDEX_HINT[0];

  return `━━━ DỮ LIỆU BÀI TOÁN ━━━
${contextParts.join('\n\n')}

Sinh ĐÚNG 1 bài tập mức ${difficultyConfig.label}. "difficulty" phải là "${difficulty}".
Định hướng: ${difficultyConfig.instruction}
${hint}
"solution" là object { "steps": [...] } — KHÔNG phải string.
Mỗi bước tính toán có "expr" (JS, chỉ +,-,*,/,^,sqrt(),pi — KHÔNG tự tính).
"text" tối đa 15 từ. Tối đa 6 bước.
Trả về 1 JSON object duy nhất (KHÔNG phải array, KHÔNG có markdown).`;
}

/** Parse AI response as a single exercise object. Returns null on failure. */
function parseSingleExercise(raw: string, difficulty: ExerciseDifficulty): Exercise | null {
  const cleaned = fixJsonStrings(extractJsonObject(raw));

  try {
    const obj = JSON.parse(cleaned) as Record<string, unknown>;

    // Direct single exercise: { question, difficulty, solution }
    if (typeof obj.question === 'string') {
      const result = normalizeExercises([obj], difficulty);
      return result[0] ?? null;
    }

    // Fallback: AI wrapped in { exercises: [...] } despite instructions
    if (Array.isArray(obj.exercises)) {
      const result = normalizeExercises(obj.exercises, difficulty);
      return result[0] ?? null;
    }
  } catch {
    // Try partial recovery for truncated response
    const recovered = recoverPartialExercises(raw, difficulty);
    if (recovered.length > 0) return recovered[0] ?? null;
  }

  return null;
}

async function generateSingleExercise(
  config: AiConfig,
  constructionContext: string,
  objectData: string | undefined,
  difficulty: ExerciseDifficulty,
  index: number,
): Promise<Exercise> {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildSingleExercisePrompt(constructionContext, objectData, difficulty, index) },
      ],
    }),
    signal: timeout,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.warn(`Exercise AI failed ${difficulty}[${index}] ${response.status}`, detail.slice(0, 200));
    throw new Error(JSON.stringify({
      upstreamStatus: response.status,
      upstreamDetail: detail.slice(0, ERROR_DETAIL_MAX_LENGTH),
    }));
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = data.choices?.[0]?.message?.content?.trim() ?? '';

  const exercise = parseSingleExercise(raw, difficulty);
  if (exercise) return exercise;

  logger.warn(`Exercise: failed to parse AI response ${difficulty}[${index}]`, raw.slice(0, 300));
  throw new Error('Exercise generation returned invalid JSON');
}

/**
 * POST /api/geogebra/exercises
 * Generate exercises based on the current construction context.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ExercisesSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ');
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { constructionContext, objectData, difficulty, index } = parsed.data;
  const config = loadConfig();

  if (!config.ai.enabled) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY is not configured' }, { status: 503 });
  }

  try {
    const exercise = await generateSingleExercise(config.ai, constructionContext, objectData, difficulty, index);
    return NextResponse.json({ exercises: [exercise] } satisfies ExercisesResponse);
  } catch (error: unknown) {
    logger.error('Exercises route failed', error);
    if (error instanceof Error) {
      try {
        const parsedError = JSON.parse(error.message) as {
          upstreamStatus?: unknown;
          upstreamDetail?: unknown;
        };
        if (typeof parsedError.upstreamStatus === 'number') {
          return NextResponse.json(
            {
              error: 'Exercise generation failed',
              upstreamStatus: parsedError.upstreamStatus,
              upstreamDetail:
                typeof parsedError.upstreamDetail === 'string' ? parsedError.upstreamDetail : '',
            },
            { status: 502 },
          );
        }
      } catch {
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
    }
    return NextResponse.json({ error: 'Exercise generation failed' }, { status: 500 });
  }
}
