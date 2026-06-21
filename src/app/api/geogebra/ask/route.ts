import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const MAX_TOKENS = 500;
const TEMPERATURE = 0.3;
const REQUEST_TIMEOUT_MS = 15000;

const MessageSchema = z.object({
  q: z.string().max(500),
  a: z.string().max(1000),
});

const AskSchema = z.object({
  question: z.string().min(1).max(500),
  constructionContext: z.string().max(3000).optional(),
  objectData: z.string().max(4000).optional(),
  history: z.array(MessageSchema).max(20).optional(),
});

const SYSTEM_PROMPT = `Bạn là giáo viên Toán cấp 2 (trung học cơ sở, lớp 6–9) Việt Nam. Học sinh hỏi về bài hình học đang xem trong GeoGebra.

Dữ liệu bài toán được cung cấp gồm:
- MÔ TẢ TỔNG QUAN: AI phân tích, tóm tắt nội dung bài.
- DANH SÁCH ĐỐI TƯỢNG: dữ liệu thô từ GeoGebra (tên, loại, giá trị, định nghĩa).

━━━ NGUYÊN TẮC QUAN TRỌNG NHẤT ━━━
Chỉ trả lời câu hỏi liên quan đến bài toán được cung cấp.
Nếu câu hỏi nằm ngoài phạm vi bài → trả lời đúng 1 câu: "Câu hỏi này nằm ngoài phạm vi bài toán."
Không tự bịa số liệu không có trong bài.

━━━ YÊU CẦU CHẤT LƯỢNG ━━━
Mỗi bước SUY LUẬN phải nêu rõ áp dụng định lý / tính chất / định nghĩa gì.
Ví dụ đúng:
  "Vì △ABC cân tại A (AB = AC) nên ∠ABC = ∠ACB (tính chất tam giác cân)."
  "Theo định lý Pythagoras: BC² = AB² + AC²"
  "Do AB ∥ CD nên ∠ABE = ∠CDE (góc so le trong)."
KHÔNG viết suy luận mà không nêu căn cứ.

━━━ KÝ HIỆU TOÁN CHUẨN ━━━
Bắt buộc dùng ký hiệu Unicode — KHÔNG viết tắt chữ:
  △ABC (không phải "tam giac ABC")
  ∠ABC hoặc ∠A (không phải "goc A" hay "goc ABC")
  AB ⊥ CD  |  AB ∥ CD  |  AB = CD  |  △ABC ≅ △DEF  |  △ABC ∼ △DEF
  ⟹  (suy ra)  |  ↔  (tương đương)

━━━ ĐỊNH DẠNG THEO LOẠI CÂU HỎI ━━━

TÍNH TOÁN (diện tích, chu vi, độ dài, góc...):
Áp dụng [tên công thức / định lý]:
= [công thức chữ]
= [thế số]
= [kết quả] ([đơn vị])
Vậy [kết luận ngắn].

KHÁI NIỆM / ĐỊNH NGHĨA:
[Định nghĩa chuẩn 1 câu, nêu tên định nghĩa]. [Liên hệ với bài: tính chất cụ thể đang thể hiện].

CHỨNG MINH / LÝ THUYẾT:
1. [suy luận 1] — vì [định lý / tính chất]
2. [suy luận 2] — do [căn cứ]
⟹ [kết luận].

━━━ QUY TẮC DÒNG TÍNH TOÁN ━━━
Dòng tính toán BẮT ĐẦU bằng "=" để ứng dụng làm nổi bật.
Mỗi bước một dòng riêng.

━━━ QUY TẮC BẮT BUỘC ━━━
- Tối đa 10 dòng. Súc tích, không thừa chữ.
- KHÔNG mở đầu bằng lời chào hay "Để trả lời...".
- KHÔNG dùng tên biến thô từ GeoGebra: t1, MatBCE, CanhAB, DaGiac... → dịch sang ký hiệu toán.
- Dùng đúng số liệu từ bài, không nói chung chung.
- Đơn vị cuối kết quả: (cm), (cm²), (cm³), (°).`;

/**
 * POST /api/geogebra/ask
 * Answer geometry questions strictly within the provided construction context.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = AskSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ');
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { question, constructionContext, objectData, history } = parsed.data;
  const config = loadConfig();

  if (!config.ai.enabled) {
    return NextResponse.json({ answer: 'Chức năng hỏi đáp cần cấu hình AI. Vui lòng thêm OPENROUTER_API_KEY.' });
  }

  // Context goes into the system prompt so it's available across ALL turns,
  // not just the last message. This lets the AI answer follow-up questions
  // ("thế còn chu vi?") without losing the construction context.
  const contextParts: string[] = [];
  if (constructionContext) contextParts.push(`MÔ TẢ TỔNG QUAN:\n${constructionContext}`);
  if (objectData) contextParts.push(`DANH SÁCH ĐỐI TƯỢNG:\n${objectData}`);
  const systemContent = contextParts.length > 0
    ? `${SYSTEM_PROMPT}\n\n━━━ DỮ LIỆU BÀI TOÁN ━━━\n${contextParts.join('\n\n')}`
    : SYSTEM_PROMPT;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemContent },
  ];
  for (const { q, a } of history ?? []) {
    messages.push({ role: 'user', content: q });
    messages.push({ role: 'assistant', content: a });
  }
  messages.push({ role: 'user', content: question });

  try {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    const response = await fetch(`${config.ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.apiKey}`,
      },
      body: JSON.stringify({
        model: config.ai.model,
        temperature: TEMPERATURE,
        max_tokens: MAX_TOKENS,
        messages,
      }),
      signal: timeout,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      logger.warn(`Ask AI failed ${response.status}`, detail.slice(0, 200));
      return NextResponse.json({ error: 'AI không phản hồi. Thử lại nhé.' }, { status: 502 });
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return NextResponse.json({ error: 'AI không trả về kết quả.' }, { status: 502 });
    }

    return NextResponse.json({ answer });
  } catch (error: unknown) {
    logger.error('Ask route failed', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi. Thử lại nhé.' }, { status: 500 });
  }
}
