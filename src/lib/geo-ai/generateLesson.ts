/**
 * generateLesson.ts
 *
 * Reusable module: generates LessonContent for a shape via DeepSeek API.
 * Used by both the update-lesson-content.ts script (direct import via tsx)
 * and any future API route.
 */

import type { LessonContent } from './data/types'

// ── Topology description ──────────────────────────────────────────────────────

export interface ShapeTopology {
  vertices: string[]
  edges: string[]
  faces: string[]
  edgesByType?: Record<string, string[]>
  facesByType?: Record<string, string[]>
}

export interface ShapeExample {
  title: string
  prompt: string
  level: string
  params?: Record<string, number>
}

export interface LessonInput {
  shapeKey: string
  nameVi: string
  level: 'cap2' | 'cap3'
  levelLabel: string
  curriculumNote: string
  knownFormulas: string[]
  topology: ShapeTopology
  vertexDescriptions: Record<string, string>  // "O" → "tâm đáy dưới"
  edgeDescriptions: Record<string, string>    // "AB" → "cạnh đáy nối A và B"
  faceDescriptions: Record<string, string>    // "ABCD" → "mặt đáy hình vuông"
  examples: ShapeExample[]
}

// ── System prompt ─────────────────────────────────────────────────────────────

const SYSTEM = `Bạn là giáo viên Toán Hình học Không gian Việt Nam, soạn nội dung bài học chuẩn theo chương trình THCS/THPT.

Quy tắc LaTeX (bắt buộc):
- Inline, ngắn gọn: V = \\pi r^2 h (không dùng displaystyle hay dfrac)
- Dùng \\frac thay dfrac; dùng ký hiệu chuẩn: S_{đáy}, S_{xq}, S_{tp}, C_{đáy}
- Mỗi công thức tối đa 45 ký tự LaTeX, không xuống dòng
- Nếu không có công thức LaTeX thì để latex: ""

Cấp độ:
- cap2 (Lớp 6-9): ngôn ngữ trực quan, dễ hiểu, công thức cơ bản
- cap3 (Lớp 10-11): chính xác hình học, tên đầy đủ định lý, công thức đầy đủ hơn

Định lý quan trọng cần biết cho hình học không gian:
- Nguyên lý Cavalieri: hai khối có cùng diện tích mọi mặt cắt ngang thì có cùng thể tích
- Định lý Archimedes: thể tích hình cầu = 2/3 thể tích hình trụ ngoại tiếp
- Định lý Pythagore: áp dụng để tính đường sinh, đường chéo, đường cao
- Định lý về diện tích xung quanh lăng trụ/trụ: S_xq = chu vi đáy × chiều cao
- Định lý về thể tích chóp/nón: V = (1/3) × S_đáy × h (Cavalieri mở rộng)
- Định lý Euler (đa diện): V - E + F = 2

Trả về JSON THUẦN TÚY, không markdown.`

// ── DeepSeek call ─────────────────────────────────────────────────────────────

export async function generateLessonContent(
  input: LessonInput,
  apiKey: string,
): Promise<LessonContent> {
  const { nameVi, level, levelLabel, curriculumNote, knownFormulas, topology,
          vertexDescriptions, edgeDescriptions, faceDescriptions, examples } = input

  // Build topology section with actual labels
  const vertexLines = topology.vertices.map(v => {
    const desc = vertexDescriptions[v] ?? ''
    return `  ${v}${desc ? ` — ${desc}` : ''}`
  }).join('\n')

  const edgeLines = Object.entries(input.topology.edgesByType ?? {}).map(([type, ids]) => {
    const mapped = ids.map(id => {
      const desc = edgeDescriptions[id] ?? ''
      return `  ${id}${desc ? ` (${desc})` : ''}`
    }).join(', ')
    return `[${type}]: ${mapped}`
  }).join('\n')

  const faceLines = Object.entries(input.topology.facesByType ?? {}).map(([type, ids]) => {
    const mapped = ids.map(id => {
      const desc = faceDescriptions[id] ?? ''
      return `  ${id}${desc ? ` — ${desc}` : ''}`
    }).join(', ')
    return `[${type}]: ${mapped}`
  }).join('\n')

  const exampleLines = examples.slice(0, 3).map((e, i) =>
    `  Bài ${i + 1} (${e.level}): ${e.title}\n  Đề: ${e.prompt}`
  ).join('\n')

  const userPrompt = `Hình học: ${nameVi}
Cấp học: ${levelLabel}
Chương trình: ${curriculumNote}
Công thức chuẩn (LaTeX): ${knownFormulas.join(' | ')}

=== TOPOLOGY 3D (tên thực tế trong hệ thống) ===
Đỉnh:
${vertexLines}

Cạnh:
${edgeLines || topology.edges.map(e => `  ${e} (${edgeDescriptions[e] ?? ''})`).join(', ')}

Mặt:
${faceLines || topology.faces.map(f => `  ${f} (${faceDescriptions[f] ?? ''})`).join(', ')}

=== VÍ DỤ ĐỀ BÀI TỪ THƯ VIỆN ===
${exampleLines || '(chưa có ví dụ)'}

=== YÊU CẦU NỘI DUNG ===

1. recognition: 4-5 bullet (string[])
   - Đặc điểm hình học nhận biết hình này (cấp học phù hợp)
   - Ví dụ thực tế trong cuộc sống

2. objects: mảng nhóm, mỗi nhóm { category, items[] }
   Chỉ liệt kê các đối tượng HIỆN DIỆN trong mô hình 3D (đỉnh, cạnh, mặt).
   KHÔNG đưa tham số đo lường (r, h, a...) vào đây — chúng thuộc phần formulas.
   Các nhóm (chỉ tạo nhóm nếu tồn tại trong topology):
   - "Đỉnh": tên đỉnh thực từ topology, mỗi item: "TênĐỉnh — vai trò ngắn"
   - "Cạnh đáy": ID cạnh đáy thực, ví dụ "AB — cạnh đáy nối A và B"
   - "Cạnh bên": ID cạnh lateral/bên nếu có
   - "Trục" (cho hình trụ/nón): ID cạnh trục nếu có
   - "Mặt đáy": ID mặt base thực
   - "Mặt bên": ID mặt lateral thực nếu có
   - "Mặt trên": ID mặt top thực nếu có
   QUAN TRỌNG: dùng ĐÚNG TÊN từ topology, không bịa tên khác, không thêm nhóm tham số

3. theorems: 2-3 định lý { title, description, latex }
   - BẮT BUỘC 2 định lý tối thiểu
   - title: TÊN CHÍNH THỨC theo nhà toán học hoặc tên khoa học chuẩn:
     * Hình trụ/nón/chóp/lăng trụ: "Nguyên lý Cavalieri" (thể tích)
     * Hình cầu: "Định lý Archimedes" (V_cầu = 2/3 V_trụ ngoại tiếp)
     * Tính đường sinh/chéo/cao: "Định lý Pythagore"
     * Đa diện (hộp, chóp, lăng trụ): "Định lý Euler" (V-E+F=2)
     * Diện tích xung quanh lăng trụ: "Định lý diện tích xung quanh lăng trụ"
     * KHÔNG được viết "Định lý về X" hay "Công thức X" làm tên định lý
   - description: phát biểu 1 câu ngắn, chính xác toán học
   - latex: công thức (để "" nếu định lý phát biểu lời, không có công thức)
   - Phù hợp cấp học: ${level}

4. formulas: 3-6 công thức { title, description, latex }
   - Ưu tiên: thể tích, diện tích xung quanh, diện tích toàn phần
   - Thêm: chu vi đáy, đường sinh, đường cao, đường chéo (nếu phù hợp)
   - cap2: công thức cơ bản, ký hiệu đơn giản
   - cap3: ký hiệu chuẩn, có thể thêm công thức nâng cao
   - Phù hợp với cấp học: ${level}

JSON trả về:
{
  "recognition": ["..."],
  "objects": [{"category":"Đỉnh","items":["A — ...","B — ..."]}],
  "theorems": [{"title":"...","description":"...","latex":"..."}],
  "formulas": [{"title":"...","description":"...","latex":"..."}]
}`

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 2200,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty response from DeepSeek')

  const parsed = JSON.parse(content) as LessonContent
  return parsed
}
