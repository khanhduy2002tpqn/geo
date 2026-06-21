import { describe, expect, test } from 'vitest';
import {
  classify,
  classifyConicEquation,
  extractCommandName,
  isComplexFunction,
} from './classify';
import type { ObjectInfo } from '@/types/geogebra';

function obj(partial: Partial<ObjectInfo>): ObjectInfo {
  return {
    name: 'X',
    type: 'point',
    value: '',
    definition: '',
    ...partial,
  };
}

describe('extractCommandName', () => {
  test('reads leading command from command string', () => {
    expect(extractCommandName(obj({ command: 'Intersect(f, g)' }))).toBe('intersect');
  });

  test('falls back to definition when command absent', () => {
    expect(extractCommandName(obj({ definition: 'Midpoint(A, B)' }))).toBe('midpoint');
  });

  test('normalizes Vietnamese diacritics', () => {
    expect(extractCommandName(obj({ command: 'TrungĐiểm(A, B)' }))).toBe('trungdiem');
  });

  test('returns null for a bare noun definition', () => {
    expect(extractCommandName(obj({ definition: 'Point' }))).toBeNull();
  });
});

describe('classify — simple objects use local templates', () => {
  test('free point', () => {
    const c = classify(obj({ type: 'point', value: '(2, 3)', definition: 'Point' }));
    expect(c).toEqual({ category: 'point', needsAi: false });
  });

  test('line', () => {
    expect(classify(obj({ type: 'line', name: 'd' })).category).toBe('line');
    expect(classify(obj({ type: 'line' })).needsAi).toBe(false);
  });

  test('segment / ray / vector / polygon / angle', () => {
    expect(classify(obj({ type: 'segment' })).category).toBe('segment');
    expect(classify(obj({ type: 'ray' })).category).toBe('ray');
    expect(classify(obj({ type: 'vector' })).category).toBe('vector');
    expect(classify(obj({ type: 'polygon' })).category).toBe('polygon');
    expect(classify(obj({ type: 'angle' })).category).toBe('angle');
  });

  test('numeric/number both map to numeric', () => {
    expect(classify(obj({ type: 'numeric' })).category).toBe('numeric');
    expect(classify(obj({ type: 'number' })).category).toBe('numeric');
  });
});

describe('classify — specific polygon shapes', () => {
  test('Square command → square', () => {
    const c = classify(obj({ type: 'polygon', command: 'Square(A, B)' }));
    expect(c.category).toBe('square');
    expect(c.needsAi).toBe(false);
  });

  test('Rectangle → rectangle', () => {
    expect(classify(obj({ type: 'polygon', command: 'Rectangle(A, B, 5)' })).category).toBe('rectangle');
  });

  test('Rhombus → rhombus', () => {
    expect(classify(obj({ type: 'polygon', command: 'Rhombus(A, B, 60)' })).category).toBe('rhombus');
  });

  test('Parallelogram → parallelogram', () => {
    expect(classify(obj({ type: 'polygon', command: 'Parallelogram(A, B, C)' })).category).toBe('parallelogram');
  });

  test('Trapezoid → trapezoid', () => {
    expect(classify(obj({ type: 'polygon', command: 'Trapezoid(A, B, C, D)' })).category).toBe('trapezoid');
  });

  test('RegularPolygon 3 sides → equilateralTriangle', () => {
    expect(classify(obj({ type: 'polygon', command: 'RegularPolygon(A, B, 3)' })).category).toBe('equilateralTriangle');
  });

  test('RegularPolygon 4 sides → square', () => {
    expect(classify(obj({ type: 'polygon', command: 'RegularPolygon(A, B, 4)' })).category).toBe('square');
  });

  test('RegularPolygon 5 sides → pentagon', () => {
    expect(classify(obj({ type: 'polygon', command: 'RegularPolygon(A, B, 5)' })).category).toBe('pentagon');
  });

  test('RegularPolygon 6 sides → hexagon', () => {
    expect(classify(obj({ type: 'polygon', command: 'RegularPolygon(A, B, 6)' })).category).toBe('hexagon');
  });

  test('Polygon 3 args → triangle', () => {
    expect(classify(obj({ type: 'polygon', command: 'Polygon(B, C, E)' })).category).toBe('triangle');
  });

  test('Polygon 4 args → quadrilateral', () => {
    expect(classify(obj({ type: 'polygon', command: 'Polygon(A, B, C, D)' })).category).toBe('quadrilateral');
  });

  test('Polygon 5 args → pentagon', () => {
    expect(classify(obj({ type: 'polygon', command: 'Polygon(A, B, C, D, E)' })).category).toBe('pentagon');
  });

  test('Polygon(B, C, E, 3) — GeoGebra GUI trailing vertex count → triangle', () => {
    expect(classify(obj({ type: 'polygon', command: 'Polygon(B, C, E, 3)' })).category).toBe('triangle');
  });

  test('Polygon(A, B, C, D, 4) — GeoGebra GUI trailing vertex count → quadrilateral', () => {
    expect(classify(obj({ type: 'polygon', command: 'Polygon(A, B, C, D, 4)' })).category).toBe('quadrilateral');
  });

  test('DaGiac(B, C, E, e) — pyramid face (type=triangle, solid ref as 4th arg) → triangle', () => {
    expect(classify(obj({ type: 'triangle', command: 'DaGiac(B, C, E, e)' })).category).toBe('triangle');
  });

  test('Vietnamese HinhBinhHanh command', () => {
    expect(classify(obj({ type: 'polygon', command: 'HinhBinhHanh(A, B, C)' })).category).toBe('parallelogram');
  });

  test('Vietnamese HinhThang command', () => {
    expect(classify(obj({ type: 'polygon', command: 'HinhThang(A, B, C, D)' })).category).toBe('trapezoid');
  });
});

describe('classify — special triangle lines/points', () => {
  test('Centroid → centroid', () => {
    expect(classify(obj({ type: 'point', command: 'Centroid(t1)' })).category).toBe('centroid');
  });

  test('Circumcenter → circumcenter', () => {
    expect(classify(obj({ type: 'point', command: 'Circumcenter(A, B, C)' })).category).toBe('circumcenter');
  });

  test('Orthocenter → orthocenter', () => {
    expect(classify(obj({ type: 'point', command: 'Orthocenter(A, B, C)' })).category).toBe('orthocenter');
  });

  test('Incenter → incenter', () => {
    expect(classify(obj({ type: 'point', command: 'Incenter(A, B, C)' })).category).toBe('incenter');
  });

  test('Altitude → altitude', () => {
    expect(classify(obj({ type: 'line', command: 'Altitude(A, t1)' })).category).toBe('altitude');
  });

  test('Median → median', () => {
    expect(classify(obj({ type: 'line', command: 'Median(A, t1)' })).category).toBe('median');
  });

  test('AngleBisector → angleBisector', () => {
    expect(classify(obj({ type: 'line', command: 'AngleBisector(A, B, C)' })).category).toBe('angleBisector');
  });

  test('PerpendicularBisector → perpendicularBisector', () => {
    expect(classify(obj({ type: 'line', command: 'PerpendicularBisector(A, B)' })).category).toBe('perpendicularBisector');
  });
});

describe('classify — arc', () => {
  test('Arc command → arc', () => {
    expect(classify(obj({ type: 'arc', command: 'Arc(c, A, B)' })).category).toBe('arc');
  });

  test('SemiCircle → arc', () => {
    expect(classify(obj({ type: 'arc', command: 'SemiCircle(A, B)' })).category).toBe('arc');
  });
});

describe('classify — Vietnamese name-prefix fallbacks', () => {
  test('CanhBE → segment', () => {
    const c = classify(obj({ name: 'CanhBE', type: 'segment', definition: '' }));
    expect(c.category).toBe('segment');
    expect(c.needsAi).toBe(false);
  });

  test('MatBCE unrecognised type → plane via name', () => {
    // type may come back as '' or an unknown string from some GeoGebra versions
    const c = classify(obj({ name: 'MatBCE', type: 'plane', definition: '' }));
    expect(c.category).toBe('plane');
    expect(c.needsAi).toBe(false);
  });

  test('DuongThangAB → line', () => {
    expect(classify(obj({ name: 'DuongThangAB', type: '', definition: '' })).category).toBe('line');
  });
});

describe('classify — concept commands route to AI', () => {
  const cases: Array<[string, string]> = [
    ['Intersect(f, g)', 'intersection'],
    ['Midpoint(A, B)', 'midpoint'],
    ['Vertex(c)', 'vertex'],
    ['Focus(c)', 'focus'],
    ['Tangent(A, c)', 'tangent'],
    ['Asymptote(f)', 'asymptote'],
  ];

  test.each(cases)('%s -> %s (needsAi)', (command, expected) => {
    const c = classify(obj({ type: 'point', command }));
    expect(c.category).toBe(expected);
    expect(c.needsAi).toBe(true);
  });

  test('Vietnamese intersection command', () => {
    expect(classify(obj({ command: 'GiaoĐiểm(d, e)' })).category).toBe('intersection');
  });
});

describe('classify — conics', () => {
  test('Circle command is local', () => {
    const c = classify(obj({ type: 'conic', command: 'Circle(O, 5)', value: 'x^2 + y^2 = 25' }));
    expect(c).toEqual({ category: 'circle', needsAi: false });
  });

  test('Parabola/Ellipse/Hyperbola commands route to AI', () => {
    expect(classify(obj({ type: 'conic', command: 'Parabola(F, d)' })).category).toBe('parabola');
    expect(classify(obj({ type: 'conic', command: 'Ellipse(A, B, C)' })).category).toBe('ellipse');
    expect(classify(obj({ type: 'conic', command: 'Hyperbola(A, B, C)' })).category).toBe('hyperbola');
    expect(classify(obj({ type: 'conic', command: 'Parabola(F, d)' })).needsAi).toBe(true);
  });
});

describe('classifyConicEquation', () => {
  test('expanded circle', () => {
    expect(classifyConicEquation('x^2 + y^2 = 25')).toBe('circle');
  });

  test('vertex-form circle', () => {
    expect(classifyConicEquation('(x - 1)^2 + (y - 2)^2 = 9')).toBe('circle');
  });

  test('standard-form ellipse with denominators', () => {
    expect(classifyConicEquation('x^2 / 9 + y^2 / 4 = 1')).toBe('ellipse');
  });

  test('hyperbola (difference of squares)', () => {
    expect(classifyConicEquation('x^2 / 9 - y^2 / 4 = 1')).toBe('hyperbola');
  });

  test('parabola — single squared variable', () => {
    expect(classifyConicEquation('y = x^2 - 4')).toBe('parabola');
    expect(classifyConicEquation('x = y^2')).toBe('parabola');
  });

  test('superscript ² normalized like ^2', () => {
    expect(classifyConicEquation('x² + y² = 16')).toBe('circle');
  });
});

describe('isComplexFunction', () => {
  test('linear is simple', () => {
    expect(isComplexFunction('2x + 1')).toBe(false);
  });

  test('quadratic and above is complex', () => {
    expect(isComplexFunction('x^2 - 4')).toBe(true);
    expect(isComplexFunction('x^3 + x')).toBe(true);
  });

  test('transcendental is complex', () => {
    expect(isComplexFunction('sin(x)')).toBe(true);
    expect(isComplexFunction('ln(x) + 1')).toBe(true);
  });

  test('function classification end-to-end', () => {
    expect(classify(obj({ type: 'function', value: '2x + 1' })).category).toBe('simpleFunction');
    expect(classify(obj({ type: 'function', value: 'x^2 - 4' })).category).toBe('complexFunction');
  });
});
