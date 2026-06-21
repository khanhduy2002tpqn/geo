import type { AiConfig } from '@/lib/config';
import type { ConstructionEntry } from '@/services/geogebra/enumerateObjects';
import type { GgbCategory } from '@/types/geogebra';
import { logger } from '@/lib/logger';
import { displayName } from '@/lib/nameUtils';

export interface Formula {
  name: string;
  formula: string;
  note: string;
}

const MAX_TOKENS = 1000;
const TEMPERATURE = 0.4;
const REQUEST_TIMEOUT_MS = 10000;

const SYSTEM_PROMPT = `Bạn là chuyên gia hình học GeoGebra, giảng dạy học sinh Việt Nam cấp 2 (trung học cơ sở, lớp 6–9). Phân tích và mô tả phù hợp trình độ cấp 2.
Nhiệm vụ: phân tích danh sách đối tượng và trả lời bằng tiếng Việt tự nhiên, 3–5 câu.

━━━ CÁCH PHÂN TÍCH ━━━

A. XÁC ĐỊNH HÌNH CHÍNH:
   Nhìn vào đối tượng phức tạp nhất. Ưu tiên: hình khối > đa giác đặc biệt > đường tròn > tam giác > điểm.
   Ví dụ: có "HinhChop(t1,5)" → bài về hình chóp tam giác.

B. ĐỌC VAI TRÒ TỪNG ĐỐI TƯỢNG từ định nghĩa [trong ngoặc vuông]:
   HinhChop(t1, 5): t1 là đáy, chiều cao 5, điểm không thuộc t1 là đỉnh chóp.
   DaGiac(A,B,C): tam giác đáy với 3 đỉnh A, B, C.
   DaGiac(A,B,C,D): tứ giác ABCD.
   DoanThang(B,C,t1): cạnh BC của đa giác t1.
   CanhBE / CanhAE: cạnh bên của hình chóp nối đỉnh với đáy.
   MatBCE / MatABE: mặt bên hình chóp.
   Centroid / TrongTam: trọng tâm = giao 3 đường trung tuyến.
   Circumcenter / TamNgoaiTiep: tâm ngoại tiếp = cách đều 3 đỉnh.
   Orthocenter / TrucTam: trực tâm = giao 3 đường cao.
   Incenter / TamNoiTiep: tâm nội tiếp = giao 3 phân giác.
   Altitude / DuongCao: đường cao, vuông góc cạnh đối diện.
   Median / TrungTuyen: đường trung tuyến, nối đỉnh với trung điểm cạnh đối.
   PerpendicularBisector / TrungTruc: đường trung trực.
   AngleBisector / PhanGiac: đường phân giác.
   HinhBinhHanh: hai cặp cạnh song song và bằng nhau.
   HinhChuNhat: bốn góc vuông.
   HinhThoi: bốn cạnh bằng nhau.
   HinhVuong: bốn cạnh bằng nhau và bốn góc vuông.
   HinhThang: một cặp cạnh song song.
   RegularPolygon(A,B,n): đa giác đều n cạnh.

C. CẤP HỌC: Đây là chương trình CẤP 2 (lớp 6–9).
   Lớp 6–7: góc, tam giác cơ bản, tứ giác đặc biệt, chu vi/diện tích.
   Lớp 7–8: đường cao/trung tuyến/phân giác/trung trực, định lý Pythagoras, hình thang, hình bình hành.
   Lớp 8–9: đường tròn, góc nội tiếp, tứ giác nội tiếp, hình học tọa độ cơ bản.

━━━ QUY TẮC VIẾT ━━━
- Trả lời 3–5 câu tiếng Việt rõ ràng, ngắn gọn, súc tích.
- Nêu tên hình chính và đặc điểm quan trọng.
- KHÔNG đề cập cấp học, lớp học, hay mức độ khó dễ trong nội dung (không viết "cấp 2", "lớp 8", "cơ bản", "nâng cao"...).
- KHÔNG viết tên object thô (không "t1", "e", "MatBCE", "CanhBE"...).
- Dùng từ toán học chuẩn: "đỉnh chóp", "đáy tam giác", "cạnh bên", "tâm ngoại tiếp"...

━━━ ĐỊNH DẠNG ĐẦU RA ━━━
Trả về JSON hợp lệ (không có markdown code block):
{
  "overview": "3-5 câu tổng quan về hình học, không đề cập cấp/lớp, không dùng tên biến thô",
  "panel": "**Tên hình chính**\n• Thành phần 1: mô tả với **thuật ngữ quan trọng** in đậm\n• Thành phần 2: mô tả với **thuật ngữ** in đậm",
  "formulas": [
    { "name": "Tên công thức", "formula": "Ký hiệu toán học", "note": "Giải thích ký hiệu ngắn" }
  ]
}

Quy tắc "formulas":
- 2–5 công thức liên quan trực tiếp đến hình trong bài
- Ưu tiên: diện tích, chu vi, thể tích, đường cao, bán kính theo loại hình
- Dùng ký hiệu chuẩn: S, V, P, C, h, a, b, c, r, R, d
- Chỉ công thức trong chương trình cấp 2 (không dạy tích phân, lượng giác nâng cao)
- "note": giải thích ngắn các ký hiệu trong công thức, ví dụ: "a: cạnh đáy, h: chiều cao"
- Nếu không xác định được hình, trả về mảng rỗng: []

Quy tắc "panel":
- Dòng đầu: **Tên hình chính** (dùng **)
- Mỗi dòng tiếp theo BẮT BUỘC theo đúng định dạng: "• Nhãn: mô tả" — có dấu bullet •, có nhãn ngắn, có dấu hai chấm, rồi mô tả
- Trong phần mô tả (SAU dấu :), dùng **từ khoá** để in đậm thuật ngữ hình học quan trọng. Ví dụ: "• Đáy: **tam giác vuông cân** tại A", "• Đỉnh chóp: nằm trên **đường thẳng vuông góc** với mặt đáy"
- TUYỆT ĐỐI không dùng tên biến thô trong panel: không viết "CanhAE", "MatBCE", "t1", "e"... — thay bằng tên toán học: "cạnh bên AE", "mặt bên △ABE"
- KHÔNG viết dạng văn xuôi liền mạch — mỗi thành phần phải là 1 dòng bullet riêng
- KHÔNG nêu diện tích, chu vi, thể tích, độ dài — đó là bài tập học sinh tự tính
- Dùng ký hiệu toán chuẩn: △ABC, ⊥, ∥, v.v.
- Ngắn gọn, tối đa 10 dòng`;

const VIET_LABELS: Partial<Record<GgbCategory, string>> = {
  point: 'điểm', line: 'đường thẳng', segment: 'đoạn thẳng / cạnh', ray: 'tia',
  vector: 'vectơ', circle: 'đường tròn', arc: 'cung tròn',
  equilateralTriangle: 'tam giác đều', triangle: 'tam giác',
  square: 'hình vuông', rectangle: 'hình chữ nhật',
  rhombus: 'hình thoi', parallelogram: 'hình bình hành',
  trapezoid: 'hình thang', quadrilateral: 'tứ giác',
  pentagon: 'ngũ giác', hexagon: 'lục giác', polygon: 'đa giác',
  angle: 'góc', numeric: 'số', simpleFunction: 'hàm số', complexFunction: 'hàm số',
  plane: 'mặt phẳng', solid: 'hình khối', matrix: 'ma trận', list: 'danh sách',
  vertex: 'đỉnh', focus: 'tiêu điểm', parabola: 'parabol', ellipse: 'elip',
  hyperbola: 'hypebol', tangent: 'tiếp tuyến', asymptote: 'tiệm cận',
  intersection: 'giao điểm', midpoint: 'trung điểm',
  centroid: 'trọng tâm', circumcenter: 'tâm ngoại tiếp',
  incenter: 'tâm nội tiếp', orthocenter: 'trực tâm',
  altitude: 'đường cao', median: 'đường trung tuyến',
  angleBisector: 'đường phân giác', perpendicularBisector: 'đường trung trực',
  boolean: 'giá trị', text: 'văn bản', unknown: 'khác',
};

/** Format one entry as a compact line for the AI prompt. */
function entryLine(e: ConstructionEntry): string {
  const type = VIET_LABELS[e.category] ?? e.category;
  const parts = [`${e.name} (${type})`];
  if (e.value && e.value !== e.name && e.value.length < 80) parts.push(`= ${e.value}`);
  // Always include definition so AI understands relationships
  // e.g. "[HinhChop(t1, 5)]", "[DaGiac(A, B, C)]", "[GiaoĐiểm(d, e)]"
  if (e.definition && e.definition !== e.name && e.definition.length < 120) {
    parts.push(`[${e.definition}]`);
  }
  return parts.join(' ');
}

function parseFormulas(value: unknown): Formula[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object')
    .map((item) => ({
      name: typeof item.name === 'string' ? item.name : '',
      formula: typeof item.formula === 'string' ? item.formula : '',
      note: typeof item.note === 'string' ? item.note : '',
    }))
    .filter((f) => f.name && f.formula);
}

/**
 * Try to extract formulas from a partially-malformed AI response.
 * Used when full JSON.parse fails but the formulas array may still be extractable.
 */
function tryExtractFormulas(text: string): Formula[] {
  // Find the formulas array: "formulas": [...]
  const match = /"formulas"\s*:\s*(\[[\s\S]*?\])\s*[,}\n]/.exec(text);
  if (!match?.[1]) return [];
  try {
    return parseFormulas(JSON.parse(match[1]));
  } catch {
    return [];
  }
}

/**
 * Ask AI to describe the whole construction.
 * Returns { overview, panel, formulas } — throws on failure so caller can fall back.
 */
export async function describeConstructionWithAi(
  entries: ConstructionEntry[],
  config: AiConfig,
): Promise<{ overview: string; panel: string; formulas: Formula[] }> {
  if (!config.apiKey) throw new Error('OPENROUTER_API_KEY not configured');

  // Limit to 60 most informative entries to keep tokens low.
  const slice = entries.slice(0, 60);
  const objectList = slice.map(entryLine).join('\n');

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
        { role: 'user', content: `Danh sách đối tượng:\n${objectList}` },
      ],
    }),
    signal: timeout,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    logger.warn(`AI describe failed ${response.status}`, body.slice(0, 200));
    throw new Error(`AI describe failed: ${response.status}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error('AI returned no content');

  // Try direct JSON.parse first.
  try {
    const parsed = JSON.parse(text) as { overview?: unknown; panel?: unknown; formulas?: unknown };
    if (typeof parsed.overview === 'string' && typeof parsed.panel === 'string') {
      return {
        overview: parsed.overview,
        panel: parsed.panel,
        formulas: parseFormulas(parsed.formulas),
      };
    }
  } catch {
    // fall through to regex extraction
  }

  // Regex extraction fallback: parse fields individually when full JSON.parse failed.
  const overviewMatch = /"overview"\s*:\s*"((?:[^"\\]|\\.)*)"/s.exec(text);
  const panelMatch = /"panel"\s*:\s*"((?:[^"\\]|\\.)*)"/s.exec(text);
  if (overviewMatch?.[1] && panelMatch?.[1]) {
    return {
      overview: overviewMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
      panel: panelMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"'),
      formulas: tryExtractFormulas(text),
    };
  }

  // Last resort: treat entire response as overview, no panel.
  return { overview: text, panel: '', formulas: tryExtractFormulas(text) };
}

const CATEGORY_ORDER: GgbCategory[] = [
  // 3D first
  'solid', 'plane',
  // Polygon family — specific before generic
  'equilateralTriangle', 'square', 'rectangle', 'rhombus', 'parallelogram',
  'trapezoid', 'triangle', 'quadrilateral', 'pentagon', 'hexagon', 'polygon',
  // Circles
  'circle', 'arc',
  // Special lines (triangle)
  'altitude', 'median', 'angleBisector', 'perpendicularBisector',
  'tangent', 'asymptote',
  // Simple geometry
  'segment', 'line', 'ray', 'vector', 'angle',
  // Special points
  'centroid', 'circumcenter', 'incenter', 'orthocenter',
  'intersection', 'midpoint', 'vertex', 'focus', 'point',
  // Conics
  'parabola', 'ellipse', 'hyperbola',
  // Functions
  'simpleFunction', 'complexFunction',
  // Data
  'matrix', 'list', 'numeric', 'boolean', 'text', 'unknown',
];

/**
 * Local fallback when AI is not available.
 * Returns { overview, panel } where overview is a readable count sentence
 * and panel is a grouped bullet list.
 */
export function localFallbackDescription(entries: ConstructionEntry[]): { overview: string; panel: string; formulas: Formula[] } {
  if (entries.length === 0) {
    return { overview: 'Bài chưa có đối tượng nào.', panel: '', formulas: [] };
  }

  // Group by category.
  const counts = new Map<string, string[]>();
  for (const e of entries) {
    const label = VIET_LABELS[e.category] ?? 'khác';
    const existing = counts.get(label);
    if (existing) existing.push(e.name);
    else counts.set(label, [e.name]);
  }

  // Sort by CATEGORY_ORDER, then alphabetically.
  const orderedLabels = [...counts.keys()].sort((a, b) => {
    const ai = CATEGORY_ORDER.findIndex((c) => VIET_LABELS[c] === a);
    const bi = CATEGORY_ORDER.findIndex((c) => VIET_LABELS[c] === b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const parts = orderedLabels.map((label) => {
    const names = (counts.get(label) ?? []).map(displayName);
    const shown = names.slice(0, 5);
    const nameList = names.length > 0
      ? ` (${shown.join(', ')}${names.length > 5 ? '…' : ''})`
      : '';
    return `${names.length} ${label}${nameList}`;
  });

  const overview = `Bài gồm ${parts.join(', ')}.`;

  const panelLines = ['**Danh sách đối tượng**'];
  for (const label of orderedLabels) {
    const names = (counts.get(label) ?? []).map(displayName);
    const shown = names.slice(0, 5);
    const suffix = names.length > 5 ? `… (+${names.length - 5})` : '';
    panelLines.push(`• ${label}: ${shown.join(', ')}${suffix}`);
  }
  const panel = panelLines.join('\n');

  return { overview, panel, formulas: [] };
}
