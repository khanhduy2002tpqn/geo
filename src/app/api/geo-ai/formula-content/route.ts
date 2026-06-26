import { NextResponse } from 'next/server'
import { chatCompletionsUrl } from '@/lib/chatCompletionsUrl'
import { z } from 'zod'

export const runtime = 'nodejs'

const RequestSchema = z.object({
  shape: z.string().min(1).max(100),
  params: z.record(z.string(), z.number()).optional(),
})

const SHAPE_NAMES: Record<string, string> = {
  cylinder: 'Hình trụ',
  cone: 'Hình nón',
  sphere: 'Hình cầu',
  cube: 'Hình lập phương',
  rectangular_prism: 'Hình hộp chữ nhật',
  triangular_prism: 'Lăng trụ tam giác',
  square_pyramid: 'Hình chóp tứ giác đều',
  triangular_pyramid: 'Hình chóp tam giác (tứ diện)',
  tetrahedron: 'Tứ diện đều',
  general_pyramid: 'Hình chóp tổng quát',
}

const SYSTEM_PROMPT = `Bạn là giáo viên Toán hình học không gian lớp 12 Việt Nam, giảng dạy theo chuẩn SGK.

Trả về JSON hợp lệ (không có text ngoài JSON):
{
  "observationBullets": [
    "Câu 1: mô tả hình dạng tổng thể, so sánh với vật thực tế (lon nước, hộp, mái nhà...)",
    "Câu 2: số mặt, số cạnh, số đỉnh và hình dạng từng loại mặt",
    "Câu 3: tính đối xứng, các yếu tố đặc biệt (đường cao, đường sinh, tâm...)",
    "Câu 4: điểm nổi bật phân biệt hình này với hình khác"
  ],
  "explorationBullets": [
    "Câu 1: xác định và đặt tên các yếu tố quan trọng (bán kính r, cạnh a, chiều cao h, đường sinh l...)",
    "Câu 2: mối quan hệ hình học giữa các yếu tố (ví dụ Pythagore, đường trung đoạn...)",
    "Câu 3: cách phân tích hình thành các phần đơn giản hơn",
    "Câu 4: câu hỏi dẫn dắt học sinh tự khám phá công thức"
  ],
  "experimentBullets": [
    "Câu 1: chuẩn bị dụng cụ thí nghiệm (cốc, cát, nước, bìa cứng...)",
    "Câu 2: mô tả bước thí nghiệm đầu tiên cụ thể",
    "Câu 3: mô tả bước tiếp theo và quan sát được gì",
    "Câu 4: kết luận từ thí nghiệm và liên hệ với công thức"
  ],
  "discoveryText": "2-3 câu suy luận: từ thí nghiệm và quan sát, giải thích TẠI SAO công thức có dạng đó",
  "discoveryLatex": "LaTeX bước suy luận trung gian quan trọng nhất",
  "formulaText": "1 câu giới thiệu bộ công thức",
  "formulaLatex": "LaTeX các công thức đầy đủ: V, Sxq, Stp. Dùng \\\\[4pt] ngắn hơn giữa các dòng",
  "practiceQuestion": "Bài tập: [tên hình] có [thông số cụ thể]. Tính [thể tích/diện tích].",
  "practiceSteps": [
    "Bước 1: Xác định — [giải thích xác định thông số đề cho]",
    "Bước 2: Áp dụng công thức — [viết công thức cần dùng]",
    "Bước 3: Thay số — [thay số cụ thể vào công thức]",
    "Bước 4: Tính toán — [tính từng bước]",
    "Kết quả: [đáp số với đơn vị đo phù hợp]"
  ],
  "practiceBlanks": ["đáp án 1", "đáp án 2"]
}

Quy tắc bắt buộc:
- Tiếng Việt chuẩn, tự nhiên như giáo viên giảng bài
- LaTeX: dùng \\frac{}{}, \\pi, \\sqrt{}, ^{}, _{} đúng cú pháp KaTeX, KHÔNG dùng \\displaystyle
- practiceSteps: viết như giáo viên hướng dẫn từng bước, có số liệu cụ thể
- Chính xác toán học tuyệt đối`

interface DeepSeekResponse {
  choices?: Array<{ message?: { content?: string } }>
}

async function callDeepSeek(shape: string, shapeName: string, params?: Record<string, number>): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY ?? ''
  if (!apiKey) throw new Error('No API key')

  const baseUrl = process.env.OPENROUTER_BASE_URL ?? 'https://api.deepseek.com'
  const model = process.env.OPENROUTER_MODEL ?? 'deepseek-chat'

  const paramStr = params && Object.keys(params).length
    ? `Tham số: ${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(', ')}.`
    : ''

  const userMessage = `Tạo nội dung học tập chi tiết cho: ${shapeName} (shape key: ${shape}). ${paramStr}
Đảm bảo nội dung phù hợp chương trình Toán 12, chính xác và đủ chiều sâu.`

  const res = await fetch(chatCompletionsUrl(baseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 1200,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    }),
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) throw new Error(`DeepSeek ${res.status}`)
  const data = (await res.json()) as DeepSeekResponse
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty response')
  return text
}

function parseJsonFromText(text: string): Record<string, unknown> {
  // Strip markdown code fences if present
  const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(cleaned)
}

export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { shape, params } = parsed.data
  const shapeName = SHAPE_NAMES[shape] ?? shape

  try {
    const raw = await callDeepSeek(shape, shapeName, params)
    const json = parseJsonFromText(raw)
    return NextResponse.json({ content: json })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
