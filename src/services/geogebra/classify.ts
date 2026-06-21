import type { Classification, GgbCategory, ObjectInfo } from '@/types/geogebra';

/**
 * Classify a clicked GeoGebra object into a semantic {@link GgbCategory}.
 *
 * Key idea: GeoGebra's raw object type ("point", "conic", "line") is NOT
 * enough. The *role* of an object lives in its definition / command:
 *   - "Intersect(f, g)"  -> intersection
 *   - "Midpoint(A, B)"   -> midpoint
 *   - "Vertex(c)"        -> vertex
 *   - a bare "x^2 - 4"   -> function (simple vs complex)
 *
 * Classification therefore considers type + definition + command together and
 * falls back to AI-safe `unknown` for anything it cannot confidently name.
 */

/** Concept commands whose result is a *point* with special meaning. */
const POINT_CONCEPT_COMMANDS: Record<string, GgbCategory> = {
  // Generic
  intersect: 'intersection',
  intersection: 'intersection',
  giaodiem: 'intersection',         // vi: "GiaoĐiểm"
  midpoint: 'midpoint',
  center: 'midpoint',
  trungdiem: 'midpoint',            // vi: "TrungĐiểm"
  vertex: 'vertex',
  dinh: 'vertex',                   // vi: "Đỉnh"
  focus: 'focus',
  tieudiem: 'focus',                // vi: "TiêuĐiểm"
  // Special triangle centers (cấp 2–3)
  centroid: 'centroid',
  trongtam: 'centroid',             // vi: "TrọngTâm"
  circumcenter: 'circumcenter',
  circumcentre: 'circumcenter',
  tamngoaitiep: 'circumcenter',     // vi: "TâmNgoạiTiếp"
  incenter: 'incenter',
  incentre: 'incenter',
  tamnoitiep: 'incenter',           // vi: "TâmNộiTiếp"
  orthocenter: 'orthocenter',
  orthocentre: 'orthocenter',
  tractam: 'orthocenter',           // vi: "TrựcTâm"
  tructam: 'orthocenter',
};

/** Concept commands whose result is a *line* with special meaning. */
const LINE_CONCEPT_COMMANDS: Record<string, GgbCategory> = {
  tangent: 'tangent',
  tieptuyen: 'tangent',             // vi: "TiếpTuyến"
  asymptote: 'asymptote',
  tiemcan: 'asymptote',             // vi: "TiệmCận"
  // Special triangle lines (cấp 2–3)
  altitude: 'altitude',
  duongcao: 'altitude',             // vi: "ĐườngCao"
  median: 'median',
  trungtuyen: 'median',             // vi: "TrungTuyến"
  anglebisector: 'angleBisector',
  phangiac: 'angleBisector',        // vi: "PhânGiác"
  bisector: 'angleBisector',
  perpendicularbisector: 'perpendicularBisector',
  trungtruc: 'perpendicularBisector', // vi: "TrungTrực"
  linebisector: 'perpendicularBisector',
};

/** Conic / circle-family commands. */
const CONIC_COMMANDS: Record<string, GgbCategory> = {
  circle: 'circle',
  duongtron: 'circle',              // vi: "ĐườngTròn"
  semicircle: 'arc',
  nuaduongtron: 'arc',              // vi: "NửaĐườngTròn"
  arc: 'arc',
  cungtron: 'arc',                  // vi: "CungTròn"
  sector: 'arc',
  hinhquat: 'arc',                  // vi: "HìnhQuạt"
  parabola: 'parabola',
  ellipse: 'ellipse',
  hyperbola: 'hyperbola',
};

/** Specific polygon commands. */
const SPECIFIC_POLYGON_COMMANDS: Record<string, GgbCategory> = {
  square: 'square',
  hinhvuong: 'square',              // vi: "HìnhVuông"
  rectangle: 'rectangle',
  hinhchunhat: 'rectangle',         // vi: "HìnhChữNhật"
  rhombus: 'rhombus',
  hinhthoi: 'rhombus',              // vi: "HìnhThoi"
  parallelogram: 'parallelogram',
  hinhbinhhanh: 'parallelogram',    // vi: "HìnhBìnhHành"
  trapezoid: 'trapezoid',
  isoscelestrapezoid: 'trapezoid',
  trapezium: 'trapezoid',
  hinhthang: 'trapezoid',           // vi: "HìnhThang"
  hinhtrangcan: 'trapezoid',        // vi: "HìnhThangCân"
  hinhthangvuong: 'trapezoid',      // vi: "HìnhThangVuông"
};

/** Generic polygon commands — vertex count determines final category. */
const GENERIC_POLYGON_COMMANDS: ReadonlySet<string> = new Set([
  'polygon', 'dagiac', 'tamgiac', 'tugiac', 'regularpolygon',
  'dagiacdeui', 'dagiacdeu',        // vi: "ĐaGiácĐều"
]);

/** 3D solid commands. */
const SOLID_COMMANDS: Record<string, GgbCategory> = {
  pyramid: 'solid',
  hinhchop: 'solid',                // vi: "HìnhChóp"
  prism: 'solid',
  hinhlangtu: 'solid',              // vi: "HìnhLăngTrụ"
  hinhlangtrukhoingcheo: 'solid',
  cylinder: 'solid',
  hinhtru: 'solid',                 // vi: "HìnhTrụ"
  cone: 'solid',
  hinhnon: 'solid',                 // vi: "HìnhNón"
  sphere: 'solid',
  hinhcau: 'solid',                 // vi: "HìnhCầu"
  cuboid: 'solid',
  hinhhop: 'solid',                 // vi: "HìnhHộp"
  tetrahedron: 'solid',
  octahedron: 'solid',
  net: 'solid',
};

/** Count top-level comma-separated arguments inside a command like "DaGiac(A, B, C)".
 *
 * GeoGebra appends non-vertex trailing args to polygon commands:
 *   - GUI vertex-count metadata: "Polygon(B, C, E, 3)" — trailing integer
 *   - Solid face reference:      "DaGiac(B, C, E, e)"  — trailing object name
 * Vertex names always start with an uppercase letter (A, B1, A'…).
 * Any trailing arg NOT starting with uppercase is metadata — strip it.
 */
function countCommandArgs(source: string): number {
  const start = source.indexOf('(');
  if (start === -1) return 0;
  let depth = 0, count = 1, lastCommaPos = start;
  let end = source.length;
  for (let i = start + 1; i < source.length; i++) {
    const ch = source[i];
    if (!ch) break;
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') {
      if (depth === 0) { end = i; break; }
      depth--;
    } else if (ch === ',' && depth === 0) { count++; lastCommaPos = i; }
  }
  // Strip trailing arg that is not a vertex name (does not start with uppercase).
  if (count > 1) {
    const lastArg = source.slice(lastCommaPos + 1, end).trim();
    if (!/^[A-Z]/.test(lastArg)) count--;
  }
  return count;
}

/** Categories with good deterministic local templates (needsAi = false). */
const LOCAL_CATEGORIES: ReadonlySet<GgbCategory> = new Set<GgbCategory>([
  'point',
  'line',
  'segment',
  'ray',
  'vector',
  'circle',
  'arc',
  // Polygon family
  'equilateralTriangle',
  'triangle',
  'square',
  'rectangle',
  'rhombus',
  'parallelogram',
  'trapezoid',
  'quadrilateral',
  'pentagon',
  'hexagon',
  'polygon',
  'numeric',
  'angle',
  'simpleFunction',
  'list',
  'matrix',
  'boolean',
  'text',
  'plane',
  'solid',
  // Concept categories below: have local template fallback but benefit from AI
  // Remove from this set when Phase 2 AI routing is enabled.
  'centroid',
  'circumcenter',
  'incenter',
  'orthocenter',
  'altitude',
  'median',
  'angleBisector',
  'perpendicularBisector',
]);

/** Strip diacritics + lowercase so "Đỉnh"/"dinh" match the alias tables. */
function normalizeCommandName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

/** Extract the leading command name, e.g. "Intersect(f, g)" -> "intersect". */
export function extractCommandName(info: ObjectInfo): string | null {
  const source = info.command?.trim() || info.definition.trim();
  const match = source.match(/^([\p{L}]+)\s*\(/u);
  const head = match?.[1];
  if (!head) return null;
  return normalizeCommandName(head);
}

/** Normalize squared terms so "x^2" and "x²" are both detectable. */
function normalizeEquation(value: string): string {
  return value.replace(/²/g, '^2').replace(/\s+/g, '').toLowerCase();
}

/**
 * Effective signed coefficient of a variable's squared term, or null if the
 * variable is not squared. Handles expanded ("2x^2"), vertex ("(x-1)^2"), and
 * standard ("x^2/9") forms so circles, ellipses and hyperbolas are separable.
 */
function squaredTermCoefficient(eq: string, variable: 'x' | 'y'): number | null {
  // [sign][number]*([wrapped var or bare var)]^2[/denominator]
  const re = new RegExp(
    `([+-])?\\s*([0-9.]*)\\*?\\(?\\s*${variable}\\b[^)=]*?\\)?\\^2(?:\\s*/\\s*([0-9.]+))?`,
  );
  const m = eq.match(re);
  if (!m) return null;

  const sign = m[1] === '-' ? -1 : 1;
  const coef = m[2] === '' || m[2] === undefined ? 1 : Number(m[2]);
  const denom = m[3] === undefined ? 1 : Number(m[3]);
  if (Number.isNaN(coef) || Number.isNaN(denom) || denom === 0) return null;
  return (sign * coef) / denom;
}

/** Best-effort subclassification of a conic from its equation string. */
export function classifyConicEquation(value: string): GgbCategory {
  const eq = normalizeEquation(value);
  const xCoef = squaredTermCoefficient(eq, 'x');
  const yCoef = squaredTermCoefficient(eq, 'y');
  const hasX2 = xCoef !== null;
  const hasY2 = yCoef !== null;

  // Only one squared variable -> parabola (e.g. "y=x^2-4", "x=y^2").
  if (hasX2 !== hasY2) return 'parabola';
  if (!hasX2 || !hasY2 || xCoef === null || yCoef === null) return 'unknown';

  // Opposite signs on the squared terms -> hyperbola.
  if (Math.sign(xCoef) !== Math.sign(yCoef)) return 'hyperbola';

  // Same sign: equal magnitude -> circle, otherwise ellipse.
  return Math.abs(xCoef) === Math.abs(yCoef) ? 'circle' : 'ellipse';
}

/** Heuristic: does a function expression need a teaching-style explanation? */
export function isComplexFunction(value: string): boolean {
  const expr = value.toLowerCase();
  // Transcendental / piecewise / higher-degree behaviour benefits from AI.
  if (/\b(sin|cos|tan|cot|sec|csc|ln|log|exp|abs|sqrt|floor|ceil|if)\b/.test(expr)) {
    return true;
  }
  if (/\^\s*[3-9]/.test(expr) || /x\^2/.test(expr.replace(/²/g, '^2'))) {
    // Quadratic and above: worth explaining behaviour (parabola shape, roots).
    return true;
  }
  return false;
}

function categoryFromRawType(info: ObjectInfo): GgbCategory {
  const type = info.type.trim().toLowerCase();
  switch (type) {
    case 'point':
      return 'point';
    case 'line':
      return 'line';
    case 'segment':
      return 'segment';
    case 'ray':
      return 'ray';
    case 'vector':
      return 'vector';
    case 'polygon':
      return 'polygon';
    case 'numeric':
    case 'number':
      return 'numeric';
    case 'angle':
      return 'angle';
    case 'conic':
      return classifyConicEquation(info.value);
    case 'function':
      return isComplexFunction(info.value) ? 'complexFunction' : 'simpleFunction';
    case 'plane':
      return 'plane';
    // 3D GeoGebra solid types.
    // Edge case: GeoGebra sometimes reports sub-objects (apex vertex, edges)
    // with type "polyhedron". If the value looks like a 3D coordinate, it IS
    // a point — override to point category.
    case 'polyhedron':
    case 'quadric':
    case 'surface':
    case 'net': {
      const looksLikeCoord = /^\s*\([\d.\s,\-]+\)\s*$/.test(info.value);
      const singleLetter = /^[A-Z]$/.test(info.name.trim());
      if (looksLikeCoord || singleLetter) return 'point';
      return 'solid';
    }
    case 'list':
      // GeoGebra stores matrices as list-of-lists. Value starts with "{{".
      return info.value.trimStart().startsWith('{{') ? 'matrix' : 'list';
    case 'boolean':
      return 'boolean';
    case 'text':
      return 'text';
    default: {
      return categoryFromNamePrefix(info.name);
    }
  }
}

/**
 * Last-resort classification by Vietnamese name prefix.
 * GeoGebra teachers embed the object type in the label.
 */
function categoryFromNamePrefix(name: string): GgbCategory {
  if (/^Mat[A-Z]/i.test(name))                    return 'plane';
  if (/^Canh[A-Z]/i.test(name))                   return 'segment';
  if (/^DuongThang/i.test(name))                  return 'line';
  if (/^DuongTron/i.test(name))                   return 'circle';
  if (/^CungTron/i.test(name))                    return 'arc';
  if (/^Tia[A-Z]/i.test(name))                    return 'ray';
  if (/^Vecto/i.test(name))                        return 'vector';
  if (/^Goc[A-Z0-9]/i.test(name))                 return 'angle';
  if (/^Hinh(Chop|Tru|Cau|Hop|Non|Lang)/i.test(name)) return 'solid';
  if (/^HinhVuong/i.test(name))                   return 'square';
  if (/^HinhChuNhat/i.test(name))                 return 'rectangle';
  if (/^HinhThoi/i.test(name))                    return 'rhombus';
  if (/^HinhBinhHanh/i.test(name))                return 'parallelogram';
  if (/^HinhThang/i.test(name))                   return 'trapezoid';
  if (/^TuGiac/i.test(name))                       return 'quadrilateral';
  if (/^TamGiacDeu/i.test(name))                  return 'equilateralTriangle';
  if (/^TamGiac/i.test(name))                     return 'triangle';
  if (/^NguGiac/i.test(name))                     return 'pentagon';
  if (/^LucGiac/i.test(name))                     return 'hexagon';
  if (/^DuongCao/i.test(name))                    return 'altitude';
  if (/^TrungTuyen/i.test(name))                  return 'median';
  if (/^PhanGiac|^DuongPhanGiac/i.test(name))     return 'angleBisector';
  if (/^TrungTruc/i.test(name))                   return 'perpendicularBisector';
  if (/^TrongTam/i.test(name))                    return 'centroid';
  if (/^TrucTam|^TractTam/i.test(name))           return 'orthocenter';
  if (/^TamNgoai/i.test(name))                    return 'circumcenter';
  if (/^TamNoi/i.test(name))                      return 'incenter';
  return 'unknown';
}

/** Extract the number of sides from a RegularPolygon command, e.g. "RegularPolygon(A, B, 5)" → 5. */
function extractRegularPolygonSides(source: string): number | null {
  // RegularPolygon(vertex1, vertex2, n) — n is the 3rd argument.
  const inner = source.slice(source.indexOf('(') + 1, source.lastIndexOf(')'));
  const parts = inner.split(',').map((s) => s.trim());
  if (parts.length < 3) return null;
  const n = Number(parts[2]);
  return Number.isFinite(n) && n >= 3 ? n : null;
}

/** Classify a vertex-count into a polygon category. */
function polygonCategoryByVertexCount(count: number): GgbCategory {
  switch (count) {
    case 3: return 'triangle';
    case 4: return 'quadrilateral';
    case 5: return 'pentagon';
    case 6: return 'hexagon';
    default: return 'polygon';
  }
}

/**
 * Classify an object. Priority:
 *   1. Specific polygon command (square, rectangle, rhombus, parallelogram, trapezoid)
 *   2. RegularPolygon with side-count detection
 *   3. Concept point commands (centroid, circumcenter, etc.)
 *   4. Concept line commands (altitude, median, etc.)
 *   5. Conic / arc commands
 *   6. Generic polygon commands (vertex-count refinement)
 *   7. Solid commands
 *   8. Raw type from getObjectType()
 *   9. Name-prefix fallback
 */
export function classify(info: ObjectInfo): Classification {
  const command = extractCommandName(info);
  const src = info.command?.trim() || info.definition.trim();

  let category: GgbCategory | undefined;

  if (command) {
    // 1. Specific polygon shapes first — before generic polygon catch-all.
    category = SPECIFIC_POLYGON_COMMANDS[command];

    // 2. RegularPolygon — side count determines the exact shape.
    if (!category && command === 'regularpolygon') {
      const sides = extractRegularPolygonSides(src);
      if (sides === 3) category = 'equilateralTriangle';
      else if (sides === 4) category = 'square';
      else category = polygonCategoryByVertexCount(sides ?? 7);
    }

    // 3–7. Other command maps.
    if (!category) {
      category =
        POINT_CONCEPT_COMMANDS[command] ??
        LINE_CONCEPT_COMMANDS[command] ??
        CONIC_COMMANDS[command] ??
        (GENERIC_POLYGON_COMMANDS.has(command) ? 'polygon' : undefined) ??
        SOLID_COMMANDS[command];
    }
  }

  // 8. Raw GeoGebra type.
  if (!category) category = categoryFromRawType(info);

  // Refine generic polygon by vertex count.
  if (category === 'polygon') {
    category = polygonCategoryByVertexCount(countCommandArgs(src));
  }

  return { category, needsAi: !LOCAL_CATEGORIES.has(category) };
}
