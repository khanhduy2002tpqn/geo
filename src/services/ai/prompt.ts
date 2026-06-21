import type { GradeLevel, ObjectInfo } from '@/types/geogebra';

/**
 * System prompt for the Vietnamese math tutor. Verbatim intent from the spec,
 * with an explicit instruction to never exceed 2–3 short sentences.
 */
export const SYSTEM_PROMPT = `Bạn là một giáo viên Toán người Việt xuất sắc.

Quy tắc:
- Luôn trả lời bằng tiếng Việt.
- Giải thích như đang nói với một học sinh.
- Giữ lời giải thích ngắn gọn, tối đa 2-3 câu.
- Dùng ngôn ngữ đơn giản, tránh thuật ngữ hàn lâm.
- Điều chỉnh lời giải thích theo loại đối tượng.
- Nếu là khái niệm toán đặc biệt (đỉnh, tiêu điểm, tiếp tuyến, tiệm cận, giao điểm, trung điểm...), hãy giải thích ý nghĩa toán học của nó.
- Nếu có tọa độ, hãy nhắc tới tọa độ.
- Nếu là hàm số, hãy mô tả ngắn gọn hành vi của nó.
- TUYỆT ĐỐI không nêu diện tích, chu vi, thể tích, độ dài cạnh hoặc bất kỳ giá trị số tính toán nào của hình. Học sinh có thể hỏi các giá trị đó ở mục Hỏi đáp.
- Chỉ trả về lời giải thích, không thêm lời chào hay ghi chú.`;

const LEVEL_GUIDANCE: Record<GradeLevel, string> = {
  primary: 'Học sinh tiểu học: dùng từ thật đơn giản, ví dụ gần gũi, tránh công thức.',
  secondary: 'Học sinh trung học cơ sở: có thể dùng thuật ngữ cơ bản và nhắc công thức ngắn.',
  highschool: 'Học sinh trung học phổ thông: có thể giải thích sâu hơn về tính chất toán học.',
};

/** Build the user message describing the clicked object (no XML — by design). */
export function buildUserMessage(
  info: ObjectInfo,
  level: GradeLevel | undefined,
  constructionContext?: string,
  localText?: string,
): string {
  if (constructionContext) {
    const lines = [
      'Tổng quan bài toán:',
      constructionContext,
      '',
      'Đối tượng cần giải thích:',
      `Tên: ${info.name}`,
      `Loại: ${info.type}`,
      info.value ? `Giá trị: ${info.value}` : null,
      info.definition ? `Định nghĩa: ${info.definition}` : null,
      level ? LEVEL_GUIDANCE[level] : null,
      '',
      localText ? `Lời giải thích gợi ý: "${localText}"` : null,
      '',
      'Dựa vào tổng quan bài, hãy viết lại 1-2 câu tự nhiên, chính xác, phù hợp đọc to (TTS). Không dùng ký hiệu toán học. Không nêu diện tích, chu vi, thể tích, độ dài cụ thể.',
    ];
    return lines.filter((line): line is string => line !== null).join('\n');
  }

  const lines = [
    `Tên: ${info.name}`,
    `Loại: ${info.type}`,
    info.value ? `Giá trị: ${info.value}` : null,
    info.definition ? `Định nghĩa: ${info.definition}` : null,
    info.command ? `Lệnh: ${info.command}` : null,
    level ? `Cấp độ học sinh: ${LEVEL_GUIDANCE[level]}` : null,
    '',
    'Hãy giải thích đối tượng này cho học sinh bằng 2-3 câu tiếng Việt.',
  ];
  return lines.filter((line): line is string => line !== null).join('\n');
}
