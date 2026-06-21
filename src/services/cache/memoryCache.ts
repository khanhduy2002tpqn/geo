/**
 * Minimal LRU cache backed by a Map (insertion order = recency order).
 *
 * Phase 1 cache layer. In Phase 3 this becomes the L1 in front of Cloudflare
 * KV (text) and R2 (audio). Kept dependency-free and synchronous on purpose.
 */
export class LruCache<V> {
  private readonly store = new Map<string, V>();

  constructor(private readonly maxEntries: number) {
    if (maxEntries <= 0) throw new Error('LruCache maxEntries must be > 0');
  }

  get(key: string): V | undefined {
    const value = this.store.get(key);
    if (value === undefined) return undefined;
    // Touch: move to most-recently-used position.
    this.store.delete(key);
    this.store.set(key, value);
    return value;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  set(key: string, value: V): void {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, value);
    if (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
