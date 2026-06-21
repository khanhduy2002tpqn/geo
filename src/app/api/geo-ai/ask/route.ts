import { NextResponse } from 'next/server'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import { LruCache } from '@/services/cache/memoryCache'

export const runtime = 'nodejs'

// ---------------------------------------------------------------------------
// Rate limiting — simple per-IP sliding window stored in process memory.
// ---------------------------------------------------------------------------
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 500 // requests per minute per IP

const globalForRate = globalThis as unknown as { __geoAiAskRateCache?: LruCache<number[]> }
const rateCounts: LruCache<number[]> =
  globalForRate.__geoAiAskRateCache ??
  (globalForRate.__geoAiAskRateCache = new LruCache(2000))

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const timestamps = (rateCounts.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (timestamps.length >= RATE_MAX) {
    rateCounts.set(ip, timestamps)
    return true
  }
  timestamps.push(now)
  rateCounts.set(ip, timestamps)
  return false
}

const KNOWN_SHAPES = [
  'cylinder',
  'cone',
  'sphere',
  'cube',
  'rectangular_prism',
  'triangular_prism',
  'square_pyramid',
  'triangular_pyramid',
  'general_pyramid',
] as const

const AskSchema = z.object({
  question: z.string().min(1).max(2000),
  shape: z.enum(KNOWN_SHAPES).or(z.string().min(1).max(100)),
  contextObject: z.string().optional(),
})

const DEFAULT_AI_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_AI_MODEL = 'deepseek-chat'
const MAX_TOKENS = 500
const TEMPERATURE = 0.4
const REQUEST_TIMEOUT_MS = 10000

const GEO_TUTOR_SYSTEM_PROMPT = `Bạn là giáo viên Toán hình học không gian lớp 12 Việt Nam, giảng dạy theo chương trình SGK Kết nối tri thức.

Vai trò: Trả lời câu hỏi của học sinh về hình học không gian một cách chính xác, dễ hiểu và có chiều sâu.

Phong cách trả lời:
- Ngôn ngữ tiếng Việt tự nhiên, gần gũi như thầy/cô giảng bài
- Giải thích TẠI SAO, không chỉ đưa công thức
- Nếu câu hỏi về công thức: viết công thức rõ ràng bằng ký hiệu toán học chuẩn
- Nếu câu hỏi về khái niệm: giải thích bằng ngôn ngữ đơn giản + ví dụ thực tế
- Nếu câu hỏi về tính toán: hướng dẫn từng bước như giải bài tập
- Tối đa 5-6 câu, súc tích nhưng đủ ý

Kiến thức nền:
- Chóp (pyramid): V = (1/3) × S_đáy × h; Lăng trụ (prism): V = S_đáy × h
- Hình trụ: V = πr²h, Sxq = 2πrh; Hình nón: V = (1/3)πr²h, Sxq = πrl; l = √(r²+h²)
- Hình cầu: V = (4/3)πr³, S = 4πr²
- Định lý Euler: V - E + F = 2 (đỉnh - cạnh + mặt)
- Hình lập phương cạnh a: V = a³, Stp = 6a²; Hình hộp a×b×h: V = abh
- Đường chéo hình hộp: d = √(a²+b²+h²); Đường chéo lập phương: d = a√3

Chỉ trả về câu trả lời, không thêm lời mở đầu hay ký tên.`

// Preset answers for when the AI is not available
const PRESET_ANSWERS: Array<{ keywords: string[]; shapes: string[]; answer: string }> = [
  {
    keywords: ['thể tích', 'volume', 'tích'],
    shapes: ['cylinder', 'hình trụ'],
    answer:
      'Diện tích đáy hình tròn là S = πr². Khi đổ nước cao h, thể tích = S×h = πr²h. Hình trụ giống như một chồng nhiều hình tròn xếp chồng lên nhau.',
  },
  {
    keywords: ['thể tích', 'volume', 'tích'],
    shapes: ['cone', 'hình nón'],
    answer:
      'Hình nón có cùng đáy và chiều cao với hình trụ chứa được 1/3 thể tích hình trụ. Thí nghiệm đổ nước xác nhận điều này: cần đổ 3 lần hình nón mới đầy hình trụ. Công thức: V = (1/3)πr²h.',
  },
  {
    keywords: ['thể tích', 'volume', 'tích'],
    shapes: ['sphere', 'hình cầu'],
    answer:
      'Thể tích hình cầu bán kính r là V = (4/3)πr³. Archimedes đã chứng minh rằng hình cầu chiếm 2/3 thể tích hình trụ bao quanh nó.',
  },
  {
    keywords: ['thể tích', 'volume', 'tích'],
    shapes: ['pyramid', 'hình chóp', 'square_pyramid', 'triangular_pyramid', 'general_pyramid'],
    answer:
      'Thể tích hình chóp bằng 1/3 diện tích đáy nhân với chiều cao: V = (1/3)×S_đáy×h. Hình chóp luôn bằng 1/3 thể tích hình lăng trụ cùng đáy và chiều cao.',
  },
  {
    keywords: ['diện tích', 'surface', 'area', 'xung quanh'],
    shapes: ['cylinder', 'hình trụ'],
    answer:
      'Diện tích xung quanh hình trụ là S_xq = 2πrh (giải ra như hình chữ nhật khi trải phẳng). Tổng diện tích = 2πrh + 2πr² = 2πr(h + r).',
  },
  {
    keywords: ['diện tích', 'surface', 'area', 'xung quanh'],
    shapes: ['cone', 'hình nón'],
    answer:
      'Diện tích xung quanh hình nón là S_xq = πrl, trong đó l là đường sinh (l = √(r² + h²)). Tổng diện tích = πrl + πr² = πr(l + r).',
  },
  {
    keywords: ['chiều cao', 'height', 'cao'],
    shapes: ['pyramid', 'hình chóp', 'square_pyramid'],
    answer:
      'Chiều cao hình chóp là đoạn vuông góc từ đỉnh xuống mặt đáy. Để tính chiều cao, ta thường dùng định lý Pythagore nếu biết cạnh bên và khoảng cách từ chân đường cao đến đỉnh của đáy.',
  },
  {
    keywords: ['đường sinh', 'slant', 'cạnh bên'],
    shapes: ['cone', 'hình nón'],
    answer:
      'Đường sinh hình nón là đoạn thẳng nối đỉnh với một điểm bất kỳ trên đường tròn đáy. Độ dài đường sinh l = √(r² + h²) theo định lý Pythagore, với r là bán kính đáy và h là chiều cao.',
  },
]

function findPresetAnswer(question: string, shape: string): string | null {
  const questionLower = question.toLowerCase()
  const shapeLower = shape.toLowerCase()

  for (const preset of PRESET_ANSWERS) {
    const matchesKeyword = preset.keywords.some(kw => questionLower.includes(kw))
    const matchesShape = preset.shapes.some(s => shapeLower.includes(s.toLowerCase()))
    if (matchesKeyword && matchesShape) {
      return preset.answer
    }
  }
  return null
}

function buildDefaultAnswer(question: string, shape: string, contextObject?: string): string {
  const ctx = contextObject ? ` về ${contextObject}` : ''
  return `Câu hỏi${ctx} về ${shape}: "${question}" — AI gia sư chưa được cấu hình. Vui lòng liên hệ quản trị viên.`
}

interface ChatChoice {
  message?: { content?: string }
}
interface ChatCompletion {
  choices?: ChatChoice[]
}

async function askDeepSeek(
  question: string,
  shape: string,
  contextObject: string | undefined,
  apiKey: string
): Promise<string> {
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? DEFAULT_AI_BASE_URL
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_AI_MODEL
  const endpoint = `${baseUrl}/v1/chat/completions`

  const userMessage = [
    `Hình: ${shape}`,
    contextObject ? `Đối tượng: ${contextObject}` : null,
    `Câu hỏi: ${question}`,
  ]
    .filter(Boolean)
    .join('\n')

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: GEO_TUTOR_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
    signal: timeout,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    logger.warn(`DeepSeek upstream error ${response.status}`, detail.slice(0, 200))
    throw new Error(`DeepSeek request failed with status ${response.status}`)
  }

  const data = (await response.json()) as ChatCompletion
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('DeepSeek returned no content')
  return text
}

/**
 * POST /api/geo-ai/ask
 * Answer a geometry question in Vietnamese.
 * Uses DeepSeek when DEEPSEEK_API_KEY is set; falls back to preset answers.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const ip =
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() ??
    'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = AskSchema.safeParse(payload)
  if (!parsed.success) {
    const message = parsed.error.issues.map(i => i.message).join('; ')
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { question, shape, contextObject } = parsed.data
  const apiKey = process.env.OPENROUTER_API_KEY ?? ''

  if (apiKey) {
    try {
      const answer = await askDeepSeek(question, shape, contextObject, apiKey)
      return NextResponse.json({ answer })
    } catch (error: unknown) {
      logger.warn('DeepSeek ask failed, falling back to preset', error)
      // Fall through to preset/default answer
    }
  }

  const preset = findPresetAnswer(question, shape)
  if (preset) {
    return NextResponse.json({ answer: preset })
  }

  return NextResponse.json({ answer: buildDefaultAnswer(question, shape, contextObject) })
}
