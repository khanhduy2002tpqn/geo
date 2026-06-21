import { describe, expect, test } from 'vitest';
import { parseCircleParts } from './format';
import type { ObjectInfo } from '@/types/geogebra';

function obj(partial: Partial<ObjectInfo>): ObjectInfo {
  return { name: 'c', type: 'conic', value: '', definition: '', ...partial };
}

describe('parseCircleParts', () => {
  test('simple point label center with numeric radius', () => {
    const result = parseCircleParts(obj({ command: 'Circle(O, 5)' }));
    expect(result).toEqual({ center: 'O', radius: '5' });
  });

  test('coordinate-pair center — was broken before balanced-paren fix', () => {
    // Circle((0,0), 3): the regex [^)]* would have stopped at the ')' inside
    // the coordinate pair, capturing '(0,0' instead of '(0,0), 3'.
    const result = parseCircleParts(obj({ command: 'Circle((0,0), 3)' }));
    expect(result.center).toBe('(0,0)');
    expect(result.radius).toBe('3');
  });

  test('decimal radius', () => {
    const result = parseCircleParts(obj({ command: 'Circle(M, 2.5)' }));
    expect(result).toEqual({ center: 'M', radius: '2.5' });
  });

  test('non-numeric second arg (expression) -> radius is undefined', () => {
    const result = parseCircleParts(obj({ command: 'Circle(O, A)' }));
    expect(result.center).toBe('O');
    expect(result.radius).toBeUndefined();
  });

  test('definition fallback when command absent', () => {
    const result = parseCircleParts(obj({ definition: 'Circle(P, 4)', command: undefined }));
    expect(result).toEqual({ center: 'P', radius: '4' });
  });

  test('no parentheses -> empty', () => {
    expect(parseCircleParts(obj({ command: 'JustAName' }))).toEqual({});
  });

  test('nested coordinate pairs for both args', () => {
    // Circle((1,2), (3,4)) — both args are coordinate pairs, radius non-numeric
    const result = parseCircleParts(obj({ command: 'Circle((1,2), (3,4))' }));
    expect(result.center).toBe('(1,2)');
    expect(result.radius).toBeUndefined(); // (3,4) is not a bare number
  });
});
