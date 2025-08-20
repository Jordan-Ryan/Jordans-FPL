interface CachedAppData {
  fplPlayers: any[];
  teams: any[];
  fixtures: any[];
  currentGameweek: any;
  playerPredictions: any[];
  best11Teams: any;
  timestamp: number;
  expiresAt: number;
}

class AppCache {
  private cache: CachedAppData | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  setCache(data: Omit<CachedAppData, 'timestamp' | 'expiresAt'>) {
    const now = Date.now();
    this.cache = {
      ...data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION,
    };
    
    // Also store in global for compatibility
    (global as any).appCache = this.cache;
    
    console.log('💾 App data cached successfully');
  }

  getCache(): CachedAppData | null {
    if (!this.cache) {
      return null;
    }

    const now = Date.now();
    if (now > this.cache.expiresAt) {
      console.log('⏰ Cache expired, clearing...');
      this.clearCache();
      return null;
    }

    return this.cache;
  }

  clearCache() {
    this.cache = null;
    (global as any).appCache = null;
    console.log('🗑️ App cache cleared');
  }

  isCacheValid(): boolean {
    return this.getCache() !== null;
  }

  getCacheAge(): number {
    if (!this.cache) return -1;
    return Date.now() - this.cache.timestamp;
  }
}

export const appCache = new AppCache();
export default appCache;
