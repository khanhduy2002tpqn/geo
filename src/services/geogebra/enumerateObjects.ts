import type { GeoGebraApi } from '@/types/ggb';
import type { GgbCategory } from '@/types/geogebra';
import { classify } from './classify';

export interface ConstructionEntry {
  name: string;
  category: GgbCategory;
  value: string;
  /** Raw definition string from GeoGebra — needed for AI overview. */
  definition: string;
}

export interface ConstructionOverview {
  total: number;
  entries: ConstructionEntry[];
  /** Objects grouped by category label for display. */
  groups: { label: string; items: ConstructionEntry[] }[];
}

const HIDDEN_PREFIXES = ['xAxis', 'yAxis', 'zAxis', 'corner'];
const CATEGORY_LABEL: Record<GgbCategory, string> = {
  point: 'Điểm',
  line: 'Đường thẳng',
  segment: 'Đoạn thẳng',
  ray: 'Tia',
  vector: 'Vectơ',
  circle: 'Đường tròn',
  arc: 'Cung tròn',
  equilateralTriangle: 'Tam giác đều',
  triangle: 'Tam giác',
  square: 'Hình vuông',
  rectangle: 'Hình chữ nhật',
  rhombus: 'Hình thoi',
  parallelogram: 'Hình bình hành',
  trapezoid: 'Hình thang',
  quadrilateral: 'Tứ giác',
  pentagon: 'Ngũ giác',
  hexagon: 'Lục giác',
  polygon: 'Đa giác',
  numeric: 'Số',
  angle: 'Góc',
  simpleFunction: 'Hàm số',
  complexFunction: 'Hàm số',
  plane: 'Mặt phẳng',
  solid: 'Hình khối',
  list: 'Danh sách',
  matrix: 'Ma trận',
  boolean: 'Đúng/Sai',
  text: 'Văn bản',
  vertex: 'Đỉnh',
  focus: 'Tiêu điểm',
  parabola: 'Parabol',
  ellipse: 'Elip',
  hyperbola: 'Hypebol',
  tangent: 'Tiếp tuyến',
  asymptote: 'Tiệm cận',
  intersection: 'Giao điểm',
  midpoint: 'Trung điểm',
  centroid: 'Trọng tâm',
  circumcenter: 'Tâm ngoại tiếp',
  incenter: 'Tâm nội tiếp',
  orthocenter: 'Trực tâm',
  altitude: 'Đường cao',
  median: 'Đường trung tuyến',
  angleBisector: 'Đường phân giác',
  perpendicularBisector: 'Đường trung trực',
  unknown: 'Khác',
};

/** Canonical display label for a category (merges simpleFunction + complexFunction). */
function categoryLabel(cat: GgbCategory): string {
  return CATEGORY_LABEL[cat] ?? 'Khác';
}

function safeGet(fn: () => string): string {
  try { return fn() ?? ''; } catch { return ''; }
}

/**
 * Enumerate all user-visible objects in the current construction.
 * Preserves construction order (insertion order from GeoGebra).
 * Filters: axis/corner system objects + invisible/hidden objects.
 */
export function enumerateObjects(api: GeoGebraApi): ConstructionOverview {
  let names: string[] = [];
  try {
    names = api.getAllObjectNames();
  } catch {
    return { total: 0, entries: [], groups: [] };
  }

  const entries: ConstructionEntry[] = [];

  for (const name of names) {
    // Filter GeoGebra internal system objects.
    if (HIDDEN_PREFIXES.some((p) => name.startsWith(p))) continue;

    // Filter objects the teacher has marked as invisible (e.g. helper
    // points, auxiliary lines, slider controls set to not visible).
    try {
      if (!api.isVisible(name)) continue;
    } catch {
      // isVisible unavailable on this applet version — include object.
    }

    const type = safeGet(() => api.getObjectType(name));
    const value = safeGet(() => api.getValueString(name));
    const definition = safeGet(() => api.getDefinitionString(name));
    const command = safeGet(() => api.getCommandString(name));

    const { category } = classify({ name, type, value, definition, command: command || undefined });
    entries.push({ name, category, value, definition });
  }

  // Group by display label, preserving insertion order of first occurrence.
  const groupMap = new Map<string, ConstructionEntry[]>();
  for (const entry of entries) {
    const label = categoryLabel(entry.category);
    const existing = groupMap.get(label);
    if (existing) existing.push(entry);
    else groupMap.set(label, [entry]);
  }

  const groups = Array.from(groupMap.entries()).map(([label, items]) => ({ label, items }));
  return { total: entries.length, entries, groups };
}
