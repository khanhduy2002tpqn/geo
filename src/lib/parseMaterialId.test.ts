import { describe, expect, test } from 'vitest';
import { parseMaterialId } from './parseMaterialId';

describe('parseMaterialId', () => {
  test('classic URL', () => {
    expect(parseMaterialId('https://www.geogebra.org/classic/jyvesbjk')).toBe('jyvesbjk');
  });

  test('/m/ short URL', () => {
    expect(parseMaterialId('https://www.geogebra.org/m/abc12345')).toBe('abc12345');
  });

  test('graphing URL', () => {
    expect(parseMaterialId('https://www.geogebra.org/graphing/xyzabcde')).toBe('xyzabcde');
  });

  test('no www subdomain', () => {
    expect(parseMaterialId('https://geogebra.org/classic/jyvesbjk')).toBe('jyvesbjk');
  });

  test('bare ID passthrough', () => {
    expect(parseMaterialId('jyvesbjk')).toBe('jyvesbjk');
  });

  test('output is lowercased', () => {
    expect(parseMaterialId('https://www.geogebra.org/classic/JYVESBJK')).toBe('jyvesbjk');
  });

  test('invalid URL returns null', () => {
    expect(parseMaterialId('https://example.com/abc')).toBeNull();
  });

  test('empty string returns null', () => {
    expect(parseMaterialId('')).toBeNull();
  });

  test('trailing whitespace stripped', () => {
    expect(parseMaterialId('  https://www.geogebra.org/classic/jyvesbjk  ')).toBe('jyvesbjk');
  });
});
