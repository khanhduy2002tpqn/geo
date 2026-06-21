import { describe, expect, test } from 'vitest';
import { LruCache } from './memoryCache';

describe('LruCache', () => {
  test('stores and retrieves values', () => {
    const cache = new LruCache<number>(3);
    cache.set('a', 1);
    expect(cache.get('a')).toBe(1);
    expect(cache.has('a')).toBe(true);
    expect(cache.get('missing')).toBeUndefined();
  });

  test('evicts the least-recently-used entry past capacity', () => {
    const cache = new LruCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3); // evicts 'a'
    expect(cache.has('a')).toBe(false);
    expect(cache.get('b')).toBe(2);
    expect(cache.get('c')).toBe(3);
  });

  test('get() refreshes recency so a touched key survives eviction', () => {
    const cache = new LruCache<number>(2);
    cache.set('a', 1);
    cache.set('b', 2);
    cache.get('a'); // 'a' now most-recently-used
    cache.set('c', 3); // evicts 'b', not 'a'
    expect(cache.has('a')).toBe(true);
    expect(cache.has('b')).toBe(false);
  });

  test('rejects non-positive capacity', () => {
    expect(() => new LruCache<number>(0)).toThrow();
  });
});
