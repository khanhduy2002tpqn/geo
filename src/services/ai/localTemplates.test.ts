import { describe, expect, test } from 'vitest';
import { buildLocalExplanation } from './localTemplates';
import type { ObjectInfo } from '@/types/geogebra';

function obj(partial: Partial<ObjectInfo>): ObjectInfo {
  return { name: 'A', type: 'point', value: '', definition: '', ...partial };
}

describe('buildLocalExplanation', () => {
  test('point with coordinates', () => {
    const text = buildLocalExplanation(obj({ name: 'A', value: '(2, 3)' }), 'point');
    expect(text).toBe('Đây là điểm A có tọa độ (2, 3).');
  });

  test('point without coordinates degrades gracefully', () => {
    expect(buildLocalExplanation(obj({ name: 'A', value: '' }), 'point')).toBe(
      'Đây là điểm A.',
    );
  });

  test('line / segment / vector', () => {
    expect(buildLocalExplanation(obj({ name: 'd' }), 'line')).toBe('Đây là đường thẳng d.');
    expect(buildLocalExplanation(obj({ name: 'AB' }), 'segment')).toBe('Đây là đoạn thẳng AB.');
    expect(buildLocalExplanation(obj({ name: 'u' }), 'vector')).toBe('Đây là vectơ u.');
  });

  test('circle with center and numeric radius', () => {
    const info = obj({ name: 'c', type: 'conic', command: 'Circle(O, 5)' });
    expect(buildLocalExplanation(info, 'circle')).toBe('Đây là đường tròn tâm O bán kính 5.');
  });

  test('circle with center point but non-numeric radius', () => {
    const info = obj({ name: 'c', type: 'conic', command: 'Circle(O, A)' });
    expect(buildLocalExplanation(info, 'circle')).toBe('Đây là đường tròn tâm O.');
  });

  test('numeric value', () => {
    expect(buildLocalExplanation(obj({ name: 'k', value: '5' }), 'numeric')).toBe(
      'Đây là số k, có giá trị bằng 5.',
    );
  });

  test('intersection mentions coordinates', () => {
    const text = buildLocalExplanation(obj({ name: 'P', value: '(1, 4)' }), 'intersection');
    expect(text).toBe('Đây là giao điểm P của hai đường, có tọa độ (1, 4).');
  });

  test('vertex without coordinates uses concept-only sentence', () => {
    expect(buildLocalExplanation(obj({ name: 'V', value: '' }), 'vertex')).toBe(
      'Đây là đỉnh của đồ thị.',
    );
  });

  test('MatBCE plane — no raw identifier in TTS text', () => {
    const text = buildLocalExplanation(
      obj({ name: 'MatBCE', type: 'plane', value: '' }),
      'plane',
    );
    expect(text).not.toContain('MatBCE');
    expect(text).toBe('Đây là mặt phẳng đi qua các điểm B, C, E.');
  });

  test('CanhBE segment — reads as cạnh, not đoạn thẳng CanhBE', () => {
    const text = buildLocalExplanation(
      obj({ name: 'CanhBE', type: 'segment', value: '' }),
      'segment',
    );
    expect(text).not.toContain('CanhBE');
    expect(text).toBe('Đây là cạnh BE.');
  });

  test('plain segment name is still spoken normally', () => {
    expect(buildLocalExplanation(obj({ name: 'AB' }), 'segment')).toBe(
      'Đây là đoạn thẳng AB.',
    );
  });

  test('every category returns a non-empty Vietnamese string', () => {
    const categories = [
      'point', 'line', 'segment', 'ray', 'vector',
      'circle', 'arc',
      'equilateralTriangle', 'triangle',
      'square', 'rectangle', 'rhombus', 'parallelogram', 'trapezoid',
      'quadrilateral', 'pentagon', 'hexagon', 'polygon',
      'numeric', 'angle', 'simpleFunction', 'plane', 'solid',
      'list', 'matrix', 'boolean', 'text',
      'vertex', 'focus', 'parabola', 'ellipse', 'hyperbola',
      'tangent', 'asymptote', 'intersection', 'midpoint',
      'centroid', 'circumcenter', 'incenter', 'orthocenter',
      'altitude', 'median', 'angleBisector', 'perpendicularBisector',
      'complexFunction', 'unknown',
    ] as const;
    for (const cat of categories) {
      const text = buildLocalExplanation(obj({ name: 'A', value: '(0, 0)' }), cat);
      expect(text.length).toBeGreaterThan(0);
      expect(text.startsWith('Đây là')).toBe(true);
    }
  });
});
