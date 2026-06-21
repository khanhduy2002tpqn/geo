import { describe, expect, test } from 'vitest';
import { explainObject } from './explainObject';
import type { ObjectInfo } from '@/types/geogebra';

function obj(partial: Partial<ObjectInfo>): ObjectInfo {
  return { name: 'A', type: 'point', value: '', definition: '', ...partial };
}

describe('explainObject (no AI key -> local path)', () => {
  test('simple point yields a local explanation', async () => {
    const result = await explainObject(
      obj({ name: 'A', type: 'point', value: '(2, 3)', definition: 'Point' }),
      undefined,
    );
    expect(result.category).toBe('point');
    expect(result.source).toBe('local');
    expect(result.text).toBe('Đây là điểm A có tọa độ (2, 3).');
  });

  test('second identical call is served from cache', async () => {
    const info = obj({ name: 'Zed', type: 'line', definition: 'Line(A, B)' });
    const first = await explainObject(info, undefined);
    const second = await explainObject(info, undefined);
    expect(first.source).toBe('local');
    expect(second.source).toBe('cache');
    expect(second.text).toBe(first.text);
  });

  test('concept object still gets a local sentence when AI is disabled', async () => {
    const result = await explainObject(
      obj({ name: 'P', type: 'point', value: '(1, 4)', command: 'Intersect(d, e)' }),
      undefined,
    );
    expect(result.category).toBe('intersection');
    expect(result.source).toBe('local');
    expect(result.text).toContain('giao điểm');
  });
});
