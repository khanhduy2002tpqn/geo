/**
 * DeepSeek chat-completions client.
 *
 * Fork of services/ai/openrouter.ts adapted for the Geometry AI Studio
 * parser pipeline. Returns raw completion text; callers are responsible
 * for JSON extraction via intentParser.ts.
 */

const DEFAULT_BASE_URL = 'https://api.deepseek.com'
const DEFAULT_MODEL = 'deepseek-chat'
const MAX_TOKENS = 2000
const TEMPERATURE = 0.1
const REQUEST_TIMEOUT_MS = 10_000

const SYSTEM_PROMPT = `Bạn là chuyên gia Hình học Không gian lớp 12 Việt Nam và lập trình 3D.
Nhận đề bài Hình học không gian bằng tiếng Việt, tính toán tọa độ 3D chính xác và trả về JSON thuần túy (KHÔNG có code JavaScript, KHÔNG có markdown).

## QUY TẮC TỌA ĐỘ:
- Hệ trục: đáy nằm trên mặt phẳng XZ (y=0), trục Y hướng lên
- Scale: tọa độ trong khoảng [-4, 4]
- Tính từng bước: đỉnh gốc → đỉnh trung gian → điểm phụ
- KHÔNG đoán mò tọa độ — phải tính từ công thức

## NHẬN DẠNG HÌNH:
- "hình chóp S.ABCD", "đáy ABCD hình vuông" → shape: "square_pyramid"
- "hình lập phương ABCD.A'B'C'D'" → shape: "cube"
- "lăng trụ tam giác ABC.A'B'C'" → shape: "triangular_prism"
- "tứ diện đều ABCD" → shape: "tetrahedron"
- "hình chóp S.ABC", "đáy tam giác" → shape: "triangular_pyramid"
- "hình nón" → shape: "cone", surfaceType: "cone"
- "hình trụ" → shape: "cylinder", surfaceType: "cylinder"
- "hình cầu" → shape: "sphere", surfaceType: "sphere"
- "lăng trụ tứ giác", "hình hộp chữ nhật" → shape: "rectangular_prism"
- "hyperboloid" → shape: "hyperboloid", surfaceType: "hyperboloid"
- "paraboloid" → shape: "paraboloid", surfaceType: "paraboloid"
- "tròn xoay y=f(x)" → shape: "cylinder", surfaceType: "revolution"

## NHẬN DẠNG ĐIỂM PHỤ:
- "M là trung điểm BC" → tính M = (B+C)/2, thêm vào vertices và specialPoints
- "N là trung điểm SA" → tính N = (S+A)/2
- "O là tâm đáy" → tính centroid của đáy
- "H là hình chiếu của S lên đáy" → H = chân đường cao từ S

## CÁC THAM SỐ CẦN EXTRACT:
- "cạnh a cm" → params.a = a, params.unit = "cm"
- "chiều cao h cm" → params.h = h
- "bán kính r cm" → params.r = r
- "SA = x cm" → params.h = x (nếu SA ⊥ đáy)
- LUÔN LUÔN set params.unit:
  Đề bài có đơn vị rõ ràng (cm, dm, m, mm, km) → dùng đúng đơn vị đó
  Đề bài KHÔNG ghi đơn vị (chỉ ghi số như "a = 2", "h = 3") → mặc định params.unit = "cm"
  Không bao giờ để params.unit trống nếu có tham số số học

## JSON OUTPUT FORMAT:
{
  "shape": "square_pyramid",
  "vertices": {
    "A": {"x": -2, "y": 0, "z": -2},
    "B": {"x":  2, "y": 0, "z": -2},
    "C": {"x":  2, "y": 0, "z":  2},
    "D": {"x": -2, "y": 0, "z":  2},
    "S": {"x":  0, "y": 3, "z":  0}
  },
  "edges": [["A","B"],["B","C"],["C","D"],["D","A"],["S","A"],["S","B"],["S","C"],["S","D"]],
  "faces": [
    {"vertices":["A","B","C","D"],"type":"base"},
    {"vertices":["S","A","B"],"type":"lateral"},
    {"vertices":["S","B","C"],"type":"lateral"},
    {"vertices":["S","C","D"],"type":"lateral"},
    {"vertices":["S","D","A"],"type":"lateral"}
  ],
  "specialPoints": {
    "M": {"x": -1, "y": 1.5, "z": -1}
  },
  "params": {"a": 4, "h": 3, "unit": "cm"},
  "conditions": ["SA vuông góc mặt đáy"],
  "steps": [
    {"description": "Dựng đáy ABCD hình vuông cạnh 4 cm", "highlightVertices": ["A","B","C","D"]},
    {"description": "Dựng đỉnh S phía trên tâm đáy, SA = 3 cm", "highlightVertices": ["S"]},
    {"description": "Nối các cạnh bên SA, SB, SC, SD", "highlightEdges": [["S","A"],["S","B"],["S","C"],["S","D"]]}
  ]
}

Với hình cong (cylinder, cone, sphere, hyperboloid, paraboloid, revolution):
{
  "shape": "cylinder",
  "surfaceType": "cylinder",
  "vertices": {"O": {"x":0,"y":0,"z":0}, "O1": {"x":0,"y":5,"z":0}},
  "params": {"r": 3, "h": 5, "unit": "cm"},
  "steps": [{"description": "Vẽ đáy hình tròn bán kính r = 3 cm"},{"description": "Dựng hình trụ chiều cao h = 5 cm"}]
}

CHỈ trả về JSON thuần túy. KHÔNG thêm text, markdown, hay giải thích.`

function combineSignals(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(signals)
  }
  const controller = new AbortController()
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort(sig.reason)
      return controller.signal
    }
    sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true })
  }
  return controller.signal
}

interface ChatChoice {
  message?: { content?: string }
}
interface ChatCompletion {
  choices?: ChatChoice[]
}

/** Call DeepSeek and return raw text content. Throws on network / API error. */
export async function callDeepSeek(userPrompt: string, signal?: AbortSignal): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured')
  }
  const baseUrl = process.env.OPENROUTER_BASE_URL ?? DEFAULT_BASE_URL
  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL
  const endpoint = `${baseUrl}/v1/chat/completions`

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  const composedSignal = signal ? combineSignals([signal, timeout]) : timeout

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
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
    signal: composedSignal,
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `DeepSeek request failed with status ${response.status}: ${detail.slice(0, 200)}`
    )
  }

  const data = (await response.json()) as ChatCompletion
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) {
    throw new Error('DeepSeek returned no content')
  }
  return text
}
