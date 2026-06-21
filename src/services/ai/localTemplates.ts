import type { GgbCategory, ObjectInfo } from '@/types/geogebra';
import { cleanCoordinates, parseCircleParts, tidy } from '@/services/geogebra/format';
import { stripVietPrefix, isAutoPrefixed } from '@/lib/nameUtils';

/**
 * Deterministic Vietnamese explanations. Every category has a template so the
 * app works fully offline-of-AI in Phase 1. In Phase 2 the concept categories
 * (needsAi = true) are upgraded to richer AI explanations, but these remain the
 * always-available fallback if the AI call fails.
 *
 * Tone: short, warm, spoken-to-a-student. 1–2 sentences max.
 */
export function buildLocalExplanation(
  info: ObjectInfo,
  category: GgbCategory,
): string {
  const rawName = info.name.trim() || 'này';
  // For auto-prefixed names (MatBCE, CanhBE…) use only the point-label part
  // in speech so TTS does not read the raw identifier out loud.
  const label = isAutoPrefixed(rawName) ? stripVietPrefix(rawName) : rawName;
  const name = label || rawName;
  const coords = cleanCoordinates(info.value);
  const value = tidy(info.value);

  switch (category) {
    case 'point':
      return coords
        ? `Đây là điểm ${name} có tọa độ ${coords}.`
        : `Đây là điểm ${name}.`;

    case 'line':
      return isAutoPrefixed(rawName)
        ? `Đây là đường thẳng ${label}.`
        : `Đây là đường thẳng ${name}.`;

    case 'segment':
      return isAutoPrefixed(rawName)
        ? `Đây là cạnh ${label}.`
        : `Đây là đoạn thẳng ${name}.`;

    case 'ray':
      return `Đây là tia ${name}.`;

    case 'vector':
      return `Đây là vectơ ${name}.`;

    case 'equilateralTriangle':
      return `Đây là tam giác đều ${name}, có ba cạnh bằng nhau và ba góc bằng 60°.`;

    case 'triangle':
      return `Đây là tam giác ${name}.`;

    case 'square':
      return `Đây là hình vuông ${name}, có bốn cạnh bằng nhau và bốn góc vuông.`;

    case 'rectangle':
      return `Đây là hình chữ nhật ${name}, có bốn góc vuông.`;

    case 'rhombus':
      return `Đây là hình thoi ${name}, có bốn cạnh bằng nhau.`;

    case 'parallelogram':
      return `Đây là hình bình hành ${name}, có hai cặp cạnh song song và bằng nhau.`;

    case 'trapezoid':
      return `Đây là hình thang ${name}, có một cặp cạnh song song.`;

    case 'quadrilateral':
      return `Đây là tứ giác ${name}.`;

    case 'pentagon':
      return `Đây là ngũ giác ${name}.`;

    case 'hexagon':
      return `Đây là lục giác ${name}.`;

    case 'polygon':
      return `Đây là đa giác ${name}.`;

    case 'arc':
      return value
        ? `Đây là cung tròn ${name}.`
        : `Đây là cung tròn ${name}.`;

    case 'numeric':
      return value
        ? `Đây là số ${name}, có giá trị bằng ${value}.`
        : `Đây là số ${name}.`;

    case 'angle':
      return value
        ? `Đây là góc ${name}, có số đo ${value}.`
        : isAutoPrefixed(rawName)
          ? `Đây là góc ${label}.`
          : `Đây là góc ${name}.`;

    case 'circle': {
      const { center, radius } = parseCircleParts(info);
      if (center && radius) {
        return `Đây là đường tròn tâm ${center} bán kính ${radius}.`;
      }
      if (center) {
        return `Đây là đường tròn tâm ${center}.`;
      }
      return `Đây là đường tròn ${name}.`;
    }

    case 'simpleFunction':
      return `Đây là đồ thị của hàm số ${name}.`;

    case 'solid': {
      const solidName = detectSolidType(info.command ?? info.definition);
      return `Đây là ${solidName} ${rawName}.`;
    }

    case 'plane': {
      // "MatBCE" → points part is "BCE" → split each char → "B, C, E"
      const pointPart = stripVietPrefix(rawName);
      const points = pointPart.length > 0
        ? pointPart.split('').join(', ')
        : '';
      return points
        ? `Đây là mặt phẳng đi qua các điểm ${points}.`
        : `Đây là mặt phẳng.`;
    }

    case 'list': {
      const count = countListItems(info.value);
      return count !== null
        ? `Đây là danh sách ${name} gồm ${count} phần tử.`
        : `Đây là danh sách ${name}.`;
    }

    case 'matrix': {
      const dims = parseMatrixDimensions(info.value);
      return dims
        ? `Đây là ma trận ${name} có ${dims.rows} hàng và ${dims.cols} cột.`
        : `Đây là ma trận ${name}.`;
    }

    case 'boolean':
      return value
        ? `Đây là giá trị ${name}, hiện bằng "${value}".`
        : `Đây là giá trị đúng/sai ${name}.`;

    case 'text':
      return `Đây là nhãn văn bản trong bài.`;

    // --- concept categories: basic local sentence (Phase 2 upgrades to AI) ---
    case 'vertex':
      return coords
        ? `Đây là đỉnh ${name} của đồ thị, có tọa độ ${coords}.`
        : `Đây là đỉnh của đồ thị.`;

    case 'focus':
      return coords
        ? `Đây là tiêu điểm ${name}, có tọa độ ${coords}.`
        : `Đây là tiêu điểm của đường cong.`;

    case 'intersection':
      return coords
        ? `Đây là giao điểm ${name} của hai đường, có tọa độ ${coords}.`
        : `Đây là giao điểm của hai đường.`;

    case 'midpoint':
      return coords
        ? `Đây là trung điểm ${name}, có tọa độ ${coords}.`
        : `Đây là trung điểm của đoạn thẳng.`;

    case 'tangent':
      return `Đây là tiếp tuyến ${name} của đường cong.`;

    case 'asymptote':
      return `Đây là đường tiệm cận ${name}.`;

    case 'parabola':
      return `Đây là đường parabol ${name}.`;

    case 'ellipse':
      return `Đây là đường elip ${name}.`;

    case 'hyperbola':
      return `Đây là đường hypebol ${name}.`;

    case 'complexFunction':
      return `Đây là đồ thị của hàm số ${name}.`;

    // --- Special triangle points ---
    case 'centroid':
      return coords
        ? `Đây là trọng tâm ${name} của tam giác, có tọa độ ${coords}. Trọng tâm là điểm giao nhau của ba đường trung tuyến.`
        : `Đây là trọng tâm ${name} của tam giác — giao điểm của ba đường trung tuyến.`;

    case 'circumcenter':
      return coords
        ? `Đây là tâm đường tròn ngoại tiếp ${name}, có tọa độ ${coords}.`
        : `Đây là tâm đường tròn ngoại tiếp ${name} — cách đều ba đỉnh của tam giác.`;

    case 'incenter':
      return coords
        ? `Đây là tâm đường tròn nội tiếp ${name}, có tọa độ ${coords}.`
        : `Đây là tâm đường tròn nội tiếp ${name} — giao điểm của ba đường phân giác trong.`;

    case 'orthocenter':
      return coords
        ? `Đây là trực tâm ${name} của tam giác, có tọa độ ${coords}.`
        : `Đây là trực tâm ${name} — giao điểm của ba đường cao trong tam giác.`;

    // --- Special triangle lines ---
    case 'altitude':
      return isAutoPrefixed(rawName)
        ? `Đây là đường cao ${label} của tam giác — đường vuông góc từ đỉnh xuống cạnh đối diện.`
        : `Đây là đường cao ${name} của tam giác.`;

    case 'median':
      return isAutoPrefixed(rawName)
        ? `Đây là đường trung tuyến ${label} — nối đỉnh với trung điểm cạnh đối diện.`
        : `Đây là đường trung tuyến ${name} của tam giác.`;

    case 'angleBisector':
      return isAutoPrefixed(rawName)
        ? `Đây là đường phân giác ${label} — chia góc thành hai phần bằng nhau.`
        : `Đây là đường phân giác ${name}.`;

    case 'perpendicularBisector':
      return isAutoPrefixed(rawName)
        ? `Đây là đường trung trực ${label} — vuông góc với đoạn thẳng tại trung điểm.`
        : `Đây là đường trung trực ${name}.`;

    case 'unknown':
    default:
      return `Đây là đối tượng ${name}.`;
  }
}

const SOLID_TYPE_MAP: Array<[RegExp, string]> = [
  [/hinhchop|pyramid/i,    'hình chóp'],
  [/hinhtru|cylinder/i,    'hình trụ'],
  [/hinhcau|sphere/i,      'hình cầu'],
  [/hinhhop|cuboid|box/i,  'hình hộp'],
  [/hinhnon|cone/i,        'hình nón'],
  [/hinhlang|prism/i,      'hình lăng trụ'],
];

function detectSolidType(cmd: string): string {
  const normalized = cmd.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  for (const [pattern, label] of SOLID_TYPE_MAP) {
    if (pattern.test(normalized)) return label;
  }
  return 'hình khối';
}

/** Count top-level elements in a GeoGebra list value like "{A, B, C}" → 3. */
function countListItems(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;
  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return 0;
  return splitTopLevelCommas(inner).length;
}

/** Detect matrix dimensions from a value like "{{1, 2}, {3, 4}}" → {rows:2, cols:2}. */
function parseMatrixDimensions(value: string): { rows: number; cols: number } | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{{')) return null;
  const inner = trimmed.slice(1, -1).trim(); // strip outer {}
  const rows = splitTopLevelCommas(inner);
  if (rows.length === 0) return null;
  const firstRow = rows[0]?.trim() ?? '';
  const cols = firstRow.startsWith('{')
    ? splitTopLevelCommas(firstRow.slice(1, -1)).length
    : 1;
  return { rows: rows.length, cols };
}

/** Split a string on commas that are not inside nested braces. */
function splitTopLevelCommas(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of input) {
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; }
    else current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}
