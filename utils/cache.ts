import NodeCache from 'node-cache';
import { CacheEntry } from '../types';

export class Cache {
  private cache: NodeCache;

  constructor(maxKeys: number = 1000) {
    this.cache = new NodeCache({
      maxKeys,
      checkperiod: 60, // Check for expired keys every minute
      useClones: false
    });
  }

  set<T>(key: string, data: T, ttl: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl
    };
    this.cache.set(key, entry, ttl / 1000); // Convert to seconds for NodeCache
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get<CacheEntry<T>>(key);
    if (!entry) return null;

    // Check if entry is still valid
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.del(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    this.cache.del(key);
  }

  clear(): void {
    this.cache.flushAll();
  }

  getStats() {
    return this.cache.getStats();
  }

  // Get cache key for FPL data
  static getFPLKey(endpoint: string, params?: Record<string, any>): string {
    if (params) {
      const sortedParams = Object.keys(params)
        .sort()
        .map(key => `${key}:${params[key]}`)
        .join('|');
      return `fpl:${endpoint}:${sortedParams}`;
    }
    return `fpl:${endpoint}`;
  }

  // Get cache key for predictions
  static getPredictionKey(playerIds: number[], horizon: number = 3): string {
    const sortedIds = playerIds.sort((a, b) => a - b).join(',');
    return `predictions:${sortedIds}:h${horizon}`;
  }
}
