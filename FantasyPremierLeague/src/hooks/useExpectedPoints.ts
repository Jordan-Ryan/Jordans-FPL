import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExpectedPointsApiService, ExpectedPointsApiError } from '../services/expectedPointsApi';
import { PlayerExpectedPoints } from '../services/types';

// Cache configuration
const CACHE_KEY_PREFIX = 'expected_points_cache';
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

// Cache entry interface
interface CacheEntry {
  data: PlayerExpectedPoints[];
  timestamp: number;
  ttl: number;
}

// Hook state interface
interface UseExpectedPointsState {
  data: PlayerExpectedPoints[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  cacheHit: boolean;
}

// Hook return interface
interface UseExpectedPointsReturn extends UseExpectedPointsState {
  refetch: () => Promise<void>;
  clearCache: () => Promise<void>;
  isStale: boolean;
}

/**
 * Custom hook for managing expected points data
 * Provides caching, loading states, and error handling
 */
export function useExpectedPoints(
  playerIds: number[],
  horizon: number = 3,
  autoFetch: boolean = true
): UseExpectedPointsReturn {
  const [state, setState] = useState<UseExpectedPointsState>({
    data: [],
    loading: false,
    error: null,
    lastUpdated: null,
    cacheHit: false
  });

  // Generate cache key based on player IDs and horizon
  const cacheKey = useMemo(() => {
    const sortedIds = [...playerIds].sort((a, b) => a - b);
    return `${CACHE_KEY_PREFIX}:${sortedIds.join(',')}:h${horizon}`;
  }, [playerIds, horizon]);

  // Check if data is stale (older than cache TTL)
  const isStale = useMemo(() => {
    if (!state.lastUpdated) return true;
    return Date.now() - state.lastUpdated.getTime() > CACHE_TTL;
  }, [state.lastUpdated]);

  // Load data from cache
  const loadFromCache = useCallback(async (): Promise<PlayerExpectedPoints[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) return null;

      const entry: CacheEntry = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - entry.timestamp > entry.ttl) {
        // Cache expired, remove it
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      console.log(`Cache hit for expected points: ${playerIds.length} players`);
      return entry.data;
    } catch (error) {
      console.error('Failed to load from cache:', error);
      return null;
    }
  }, [cacheKey, playerIds.length]);

  // Save data to cache
  const saveToCache = useCallback(async (data: PlayerExpectedPoints[]): Promise<void> => {
    try {
      const entry: CacheEntry = {
        data,
        timestamp: Date.now(),
        ttl: CACHE_TTL
      };

      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
      console.log(`Cached expected points for ${data.length} players`);
    } catch (error) {
      console.error('Failed to save to cache:', error);
    }
  }, [cacheKey]);

  // Fetch data from API
  const fetchData = useCallback(async (): Promise<void> => {
    if (playerIds.length === 0) {
      setState(prev => ({ ...prev, loading: false, error: 'No player IDs provided' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log(`Fetching expected points for ${playerIds.length} players...`);
      
      const data = await ExpectedPointsApiService.getBatchExpectedPoints(playerIds, horizon);
      
      // Save to cache
      await saveToCache(data);

      setState(prev => ({
        ...prev,
        data,
        loading: false,
        lastUpdated: new Date(),
        cacheHit: false
      }));

      console.log(`Successfully fetched expected points for ${data.length} players`);
    } catch (error) {
      console.error('Failed to fetch expected points:', error);
      
      let errorMessage = 'Failed to fetch expected points';
      if (error instanceof ExpectedPointsApiError) {
        errorMessage = error.message;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));
    }
  }, [playerIds, horizon, saveToCache]);

  // Load data (cache first, then API if needed)
  const loadData = useCallback(async (): Promise<void> => {
    if (playerIds.length === 0) return;

    try {
      // Try to load from cache first
      const cachedData = await loadFromCache();
      
      if (cachedData) {
        setState(prev => ({
          ...prev,
          data: cachedData,
          loading: false,
          lastUpdated: new Date(),
          cacheHit: true
        }));
        
        // If data is stale, fetch fresh data in background
        if (isStale) {
          console.log('Data is stale, fetching fresh data in background...');
          fetchData();
        }
      } else {
        // No cache, fetch from API
        await fetchData();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load data'
      }));
    }
  }, [playerIds, loadFromCache, fetchData, isStale]);

  // Refetch data (ignore cache)
  const refetch = useCallback(async (): Promise<void> => {
    await fetchData();
  }, [fetchData]);

  // Clear cache
  const clearCache = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(cacheKey);
      console.log('Expected points cache cleared');
      
      setState(prev => ({
        ...prev,
        data: [],
        lastUpdated: null,
        cacheHit: false
      }));
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [cacheKey]);

  // Auto-fetch effect
  useEffect(() => {
    if (autoFetch && playerIds.length > 0) {
      loadData();
    }
  }, [autoFetch, playerIds, loadData]);

  // Clear cache when player IDs change
  useEffect(() => {
    return () => {
      // Cleanup: clear cache when component unmounts or player IDs change
      AsyncStorage.removeItem(cacheKey).catch(console.error);
    };
  }, [cacheKey]);

  return {
    ...state,
    refetch,
    clearCache,
    isStale
  };
}

/**
 * Hook for single player expected points
 */
export function usePlayerExpectedPoints(
  playerId: number,
  horizon: number = 3,
  autoFetch: boolean = true
): UseExpectedPointsReturn {
  return useExpectedPoints([playerId], horizon, autoFetch);
}

/**
 * Hook for checking API connectivity
 */
export function useApiConnectivity() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    setChecking(true);
    try {
      const result = await ExpectedPointsApiService.testConnection();
      setConnected(result.connected);
      setLatency(result.latency);
    } catch (error) {
      setConnected(false);
      setLatency(null);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return {
    connected,
    latency,
    checking,
    checkConnection
  };
}
