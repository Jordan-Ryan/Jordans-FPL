import { PlayerExpectedPoints, BatchRequest, BatchResponse } from './types';

// Configuration
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3001' 
  : 'https://your-production-api.com'; // Update with your production URL

const API_ENDPOINTS = {
  singlePlayer: (playerId: number, horizon: number = 3) => 
    `${API_BASE_URL}/api/players/${playerId}/expected-points?horizon=${horizon}`,
  batch: `${API_BASE_URL}/api/expected-points/batch`,
  health: `${API_BASE_URL}/health`,
  cacheStats: `${API_BASE_URL}/api/expected-points/cache/stats`,
  cacheClear: `${API_BASE_URL}/api/expected-points/cache/clear`
};

// API response wrapper
interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  cache_hit?: boolean;
}

// Error handling
class ExpectedPointsApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ExpectedPointsApiError';
  }
}

// HTTP client with error handling
async function apiRequest<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
      } catch {
        // If error response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }

      throw new ExpectedPointsApiError(
        errorMessage,
        response.status,
        response.statusText
      );
    }

    const data: ApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new ExpectedPointsApiError(
        data.data?.message || 'API request failed',
        500
      );
    }

    return data.data;
  } catch (error) {
    if (error instanceof ExpectedPointsApiError) {
      throw error;
    }
    
    // Network or other errors
    throw new ExpectedPointsApiError(
      error instanceof Error ? error.message : 'Network error occurred',
      0,
      'NETWORK_ERROR'
    );
  }
}

/**
 * Expected Points API Service
 * Provides methods to fetch expected points predictions from the backend
 */
export class ExpectedPointsApiService {
  /**
   * Get expected points for a single player
   */
  static async getPlayerExpectedPoints(
    playerId: number,
    horizon: number = 3
  ): Promise<PlayerExpectedPoints> {
    console.log(`Fetching expected points for player ${playerId} (horizon: ${horizon})`);
    
    try {
      const url = API_ENDPOINTS.singlePlayer(playerId, horizon);
      const result = await apiRequest<PlayerExpectedPoints>(url);
      
      console.log(`Successfully fetched expected points for player ${playerId}`);
      return result;
    } catch (error) {
      console.error(`Failed to fetch expected points for player ${playerId}:`, error);
      throw error;
    }
  }

  /**
   * Get expected points for multiple players in batch
   */
  static async getBatchExpectedPoints(
    playerIds: number[],
    horizon: number = 3
  ): Promise<PlayerExpectedPoints[]> {
    console.log(`Fetching batch expected points for ${playerIds.length} players (horizon: ${horizon})`);
    
    try {
      const requestBody: BatchRequest = {
        playerIds,
        horizon
      };

      const result = await apiRequest<PlayerExpectedPoints[]>(
        API_ENDPOINTS.batch,
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        }
      );
      
      console.log(`Successfully fetched batch expected points for ${result.length} players`);
      return result;
    } catch (error) {
      console.error('Failed to fetch batch expected points:', error);
      throw error;
    }
  }

  /**
   * Check API health
   */
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(API_ENDPOINTS.health);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<any> {
    try {
      const result = await apiRequest<any>(API_ENDPOINTS.cacheStats);
      return result;
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      throw error;
    }
  }

  /**
   * Clear prediction cache
   */
  static async clearCache(): Promise<void> {
    try {
      await apiRequest<void>(
        API_ENDPOINTS.cacheClear,
        { method: 'POST' }
      );
      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Test API connectivity
   */
  static async testConnection(): Promise<{
    connected: boolean;
    latency: number;
    error?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(API_ENDPOINTS.health);
      const latency = Date.now() - startTime;
      
      return {
        connected: response.ok,
        latency,
      };
    } catch (error) {
      const latency = Date.now() - startTime;
      
      return {
        connected: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export error class for use in components
export { ExpectedPointsApiError };

// Export types for convenience
export type { PlayerExpectedPoints, BatchRequest, BatchResponse };
