import { NextResponse } from 'next/server';
import { z } from 'zod';
import { loadConfig } from '@/lib/config';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';

const MAX_TOKENS = 300;
const TEMPERATURE = 0.5;
const REQUEST_TIMEOUT_MS = 10000;

const SuggestionsSchema = z.object({
  constructionContext: z.string().min(1).max(3000),
  objectData: z.string().max(4000).optional(),
});

const SYSTEM_PROMPT = `Bạn là giáo viên Toán cấp 2 Việt Nam. Dựa vào bài hình học được mô tả, hãy sinh đúng 4 câu hỏi ngắn mà học sinh có thể hỏi về bài này.

Yêu cầu câu hỏi:
- PHẢI dùng tên đối tượng cụ thể trong bài (ví dụ: "AB", "tam giác ABC", "đường tròn O") — KHÔNG hỏi chung chung
- Mỗi câu hỏi một kiểu: (1) tính toán, (2) tính chất/quan hệ, (3) định nghĩa/ý nghĩa, (4) chứng minh hoặc "tại sao"
- Ngắn gọn, tự nhiên như học sinh thực sự hỏi (dưới 12 từ)
- Phù hợp trình độ lớp 6–9

Trả về JSON hợp lệ (không có markdown):
{"questions": ["câu 1", "câu 2", "câu 3", "câu 4"]}`;

function buildUserMessage(constructionContext: string, objectData?: string): string {
  const parts = [`MÔ TẢ TỔNG QUAN:\n${constructionContext}`];
  if (objectData) parts.push(`DANH SÁCH ĐỐI TƯỢNG:\n${objectData}`);
  return parts.join('\n\n') + '\n\nSinh 4 câu hỏi theo yêu cầu.';
}

/**
 * POST /api/geogebra/suggestions
 * Generate 4 context-specific suggested questions for the Q&A panel.
 */
export async function POST(request: Request): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = SuggestionsSchema.safeParse(payload);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join('; ');
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { constructionContext, objectData } = parsed.data;
  const config = loadConfig();

  if (!config.ai.enabled) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 503 });
  }

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
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserMessage(constructionContext, objectData) },
        ],
      }),
      signal: timeout,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      logger.warn(`Suggestions AI failed ${response.status}`, detail.slice(0, 200));
      return NextResponse.json({ error: 'AI không phản hồi' }, { status: 502 });
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content?.trim() ?? '';

    const jsonMatch = /\{[\s\S]*\}/.exec(raw);
    if (!jsonMatch) {
      logger.warn('Suggestions: no JSON in response', raw.slice(0, 200));
      return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 });
    }

    const parsed2 = JSON.parse(jsonMatch[0]) as { questions?: unknown };
    const questions = Array.isArray(parsed2.questions)
      ? parsed2.questions.filter((q): q is string => typeof q === 'string' && q.length > 0).slice(0, 4)
      : [];

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No questions generated' }, { status: 502 });
    }

    return NextResponse.json({ questions });
  } catch (error: unknown) {
    logger.error('Suggestions route failed', error);
    return NextResponse.json({ error: 'Đã xảy ra lỗi' }, { status: 500 });
  }
}
