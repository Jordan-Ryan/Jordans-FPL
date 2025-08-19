import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { Cache } from '../utils/cache';
import {
  FPLBootstrapData,
  FPLPlayer,
  FPLTeam,
  FPLFixture,
  ElementSummary
} from '../types';

export class FPLApiService {
  private http: AxiosInstance;
  private cache: Cache;

  constructor() {
    this.http = axios.create({
      baseURL: config.fpl.baseUrl,
      timeout: config.fpl.timeouts.request,
      headers: {
        'User-Agent': 'FPL-Expected-Points-API/1.0.0'
      }
    });

    this.cache = new Cache(config.cache.maxKeys);

    // Add response interceptor for logging
    this.http.interceptors.response.use(
      (response) => {
        console.log(`FPL API ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        console.error(`FPL API Error: ${error.message}`, {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data
        });
        return Promise.reject(error);
      }
    );
  }

  // Fetch bootstrap data (players, teams, events)
  async getBootstrapData(): Promise<FPLBootstrapData> {
    const cacheKey = Cache.getFPLKey('bootstrap');
    const cached = this.cache.get<FPLBootstrapData>(cacheKey);
    
    if (cached) {
      console.log('Cache hit for bootstrap data');
      return cached;
    }

    try {
      console.log('Fetching bootstrap data from FPL API...');
      const response = await this.http.get(config.fpl.endpoints.bootstrap);
      const data = response.data;
      
      this.cache.set(cacheKey, data, config.cache.ttl.bootstrap);
      console.log(`Bootstrap data cached for ${config.cache.ttl.bootstrap / 1000 / 60} minutes`);
      
      return data;
    } catch (error) {
      console.error('Failed to fetch bootstrap data:', error);
      throw new Error(`Failed to fetch bootstrap data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Fetch fixtures data
  async getFixtures(): Promise<FPLFixture[]> {
    const cacheKey = Cache.getFPLKey('fixtures');
    const cached = this.cache.get<FPLFixture[]>(cacheKey);
    
    if (cached) {
      console.log('Cache hit for fixtures data');
      return cached;
    }

    try {
      console.log('Fetching fixtures data from FPL API...');
      const response = await this.http.get(config.fpl.endpoints.fixtures);
      const data = response.data;
      
      this.cache.set(cacheKey, data, config.cache.ttl.fixtures);
      console.log(`Fixtures data cached for ${config.cache.ttl.fixtures / 1000 / 60} minutes`);
      
      return data;
    } catch (error) {
      console.error('Failed to fetch fixtures data:', error);
      throw new Error(`Failed to fetch fixtures data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Fetch element summary for a specific player
  async getElementSummary(playerId: number): Promise<ElementSummary> {
    const cacheKey = Cache.getFPLKey('element-summary', { playerId });
    const cached = this.cache.get<ElementSummary>(cacheKey);
    
    if (cached) {
      console.log(`Cache hit for element summary ${playerId}`);
      return cached;
    }

    try {
      console.log(`Fetching element summary for player ${playerId}...`);
      const response = await this.http.get(`${config.fpl.endpoints.elementSummary}${playerId}/`);
      const data = response.data;
      
      this.cache.set(cacheKey, data, config.cache.ttl.elementSummary);
      console.log(`Element summary ${playerId} cached for ${config.cache.ttl.elementSummary / 1000 / 60} minutes`);
      
      return data;
    } catch (error) {
      console.error(`Failed to fetch element summary for player ${playerId}:`, error);
      throw new Error(`Failed to fetch element summary for player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Batch fetch element summaries for multiple players
  async getBatchElementSummaries(playerIds: number[]): Promise<Map<number, ElementSummary>> {
    const results = new Map<number, ElementSummary>();
    const uncachedIds: number[] = [];

    // Check cache first
    for (const playerId of playerIds) {
      const cacheKey = Cache.getFPLKey('element-summary', { playerId });
      const cached = this.cache.get<ElementSummary>(cacheKey);
      if (cached) {
        results.set(playerId, cached);
      } else {
        uncachedIds.push(playerId);
      }
    }

    // Fetch uncached summaries with concurrency control
    if (uncachedIds.length > 0) {
      console.log(`Fetching ${uncachedIds.length} uncached element summaries...`);
      
      const batchSize = 5; // Process 5 at a time to avoid overwhelming FPL API
      for (let i = 0; i < uncachedIds.length; i += batchSize) {
        const batch = uncachedIds.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (playerId) => {
          try {
            const summary = await this.getElementSummary(playerId);
            results.set(playerId, summary);
            return { playerId, success: true };
          } catch (error) {
            console.error(`Failed to fetch element summary for player ${playerId}:`, error);
            return { playerId, success: false, error };
          }
        });

        // Wait for batch to complete before proceeding
        await Promise.allSettled(batchPromises);
        
        // Small delay between batches to be respectful to FPL API
        if (i + batchSize < uncachedIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    console.log(`Batch fetch complete: ${results.size}/${playerIds.length} players retrieved`);
    return results;
  }

  // Get current gameweek
  async getCurrentGameweek(): Promise<number> {
    try {
      const bootstrapData = await this.getBootstrapData();
      const currentEvent = bootstrapData.events.find((event: any) => event.is_current);
      
      if (!currentEvent) {
        throw new Error('Could not determine current gameweek');
      }
      
      return currentEvent.id;
    } catch (error) {
      console.error('Failed to get current gameweek:', error);
      throw new Error(`Failed to get current gameweek: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get upcoming fixtures for next N gameweeks
  async getUpcomingFixtures(horizon: number = 3): Promise<FPLFixture[]> {
    try {
      const [fixtures, currentGw] = await Promise.all([
        this.getFixtures(),
        this.getCurrentGameweek()
      ]);

      const upcomingFixtures = fixtures.filter(fixture => 
        fixture.event > currentGw && 
        fixture.event <= currentGw + horizon &&
        !fixture.finished
      );

      return upcomingFixtures;
    } catch (error) {
      console.error('Failed to get upcoming fixtures:', error);
      throw new Error(`Failed to get upcoming fixtures: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get team by ID
  async getTeam(teamId: number): Promise<FPLTeam | null> {
    try {
      const bootstrapData = await this.getBootstrapData();
      return bootstrapData.teams.find(team => team.id === teamId) || null;
    } catch (error) {
      console.error(`Failed to get team ${teamId}:`, error);
      return null;
    }
  }

  // Get player by ID
  async getPlayer(playerId: number): Promise<FPLPlayer | null> {
    try {
      const bootstrapData = await this.getBootstrapData();
      return bootstrapData.elements.find(player => player.id === playerId) || null;
    } catch (error) {
      console.error(`Failed to get player ${playerId}:`, error);
      return null;
    }
  }

  // Clear all cache
  clearCache(): void {
    this.cache.clear();
    console.log('FPL API cache cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return this.cache.getStats();
  }
}
