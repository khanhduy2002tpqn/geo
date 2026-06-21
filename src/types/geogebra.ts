/**
 * Domain types for GeoGebra object inspection and explanation.
 *
 * `ObjectInfo` is the canonical payload extracted from a clicked applet object.
 * It is intentionally small: only what the explanation layer needs. GeoGebra
 * XML is deliberately NOT part of the AI payload (large, low value).
 */

/** Raw object info collected from the GeoGebra JS API on click. */
export interface ObjectInfo {
  /** Object label, e.g. "A", "d", "c1". */
  name: string;
  /** Raw type from getObjectType(), e.g. "point", "line", "conic". */
  type: string;
  /** Value string from getValueString(), e.g. "(2, 3)" or "x^2 - 4". */
  value: string;
  /** Human definition from getDefinitionString(), e.g. "Point", "Intersect(f, g)". */
  definition: string;
  /** Command string from getCommandString() when available, e.g. "Intersect(f, g)". */
  command?: string;
  /**
   * Optional GeoGebra XML for the object (debug / future use only).
   * Never forwarded to the AI provider.
   */
  xml?: string;
}

/**
 * Semantic category derived from {@link ObjectInfo}. This is richer than the
 * raw GeoGebra type because the *role* of an object (vertex, intersection,
 * midpoint…) lives in its definition/command, not its type.
 */
export type GgbCategory =
  // --- deterministic / local-template categories ---
  | 'point'
  | 'line'
  | 'segment'
  | 'ray'
  | 'vector'
  | 'circle'
  | 'arc'               // cung tròn / hình quạt
  // Polygon family — ordered by specificity
  | 'equilateralTriangle' // tam giác đều
  | 'triangle'          // tam giác
  | 'square'            // hình vuông
  | 'rectangle'         // hình chữ nhật
  | 'rhombus'           // hình thoi
  | 'parallelogram'     // hình bình hành
  | 'trapezoid'         // hình thang
  | 'quadrilateral'     // tứ giác (general 4-sided)
  | 'pentagon'          // ngũ giác
  | 'hexagon'           // lục giác
  | 'polygon'           // đa giác (7+ sides or unclassified)
  | 'numeric'
  | 'angle'
  | 'simpleFunction'
  | 'list'
  | 'matrix'
  | 'boolean'
  | 'text'
  | 'plane'
  | 'solid'
  // --- concept categories — have local template fallback, AI gives richer teaching ---
  | 'vertex'
  | 'focus'
  | 'parabola'
  | 'ellipse'
  | 'hyperbola'
  | 'tangent'
  | 'asymptote'
  | 'intersection'
  | 'midpoint'
  | 'centroid'          // trọng tâm
  | 'circumcenter'      // tâm ngoại tiếp
  | 'incenter'          // tâm nội tiếp
  | 'orthocenter'       // trực tâm
  | 'altitude'          // đường cao
  | 'median'            // đường trung tuyến
  | 'angleBisector'     // đường phân giác
  | 'perpendicularBisector' // đường trung trực
  | 'complexFunction'
  | 'unknown';

/** Student grade band — threaded now, used by the AI prompt in Phase 2. */
export type GradeLevel = 'primary' | 'secondary' | 'highschool';

/** Result of classifying an {@link ObjectInfo}. */
export interface Classification {
  category: GgbCategory;
  /**
   * Whether this object benefits from a teaching-style AI explanation.
   * Phase 1 ignores this (always local). Phase 2 routes `true` to the AI.
   */
  needsAi: boolean;
}

/** Where an explanation text originated. */
export type ExplanationSource = 'local' | 'ai' | 'cache';
