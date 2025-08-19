// Expected Points API Types

export interface FixturePrediction {
  gameweek: number;
  opponent: string;
  home_away: 'H' | 'A';
  difficulty: number;
  expected_points: number;
}

export interface PlayerExpectedPoints {
  player_id: number;
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  predictions: FixturePrediction[];
  total_3gw: number;
  confidence: {
    lower: number;
    upper: number;
  };
}

export interface BatchRequest {
  playerIds: number[];
  horizon?: number;
}

export interface BatchResponse {
  predictions: PlayerExpectedPoints[];
  timestamp: string;
  cache_hit: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
  cache_hit?: boolean;
}

// Error Types
export interface ApiError {
  error: string;
  message: string;
  timestamp: string;
  status?: number;
  code?: string;
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Filter and Sort Types
export type SortField = 'total_3gw' | 'name' | 'team' | 'position';
export type SortOrder = 'asc' | 'desc';
export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

// UI State Types
export interface FilterState {
  position: string;
  team: string;
  searchQuery: string;
}

export interface SortState {
  field: SortField;
  order: SortOrder;
}

// Player Data Types (for integration with existing FPL data)
export interface FPLPlayerBasic {
  id: number;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  total_points: number;
  form: string;
  status: string;
  chance_of_playing_next_round?: number;
}

export interface FPLTeamBasic {
  id: number;
  short_name: string;
  name: string;
  strength: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
}

// Configuration Types
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

export interface CacheConfig {
  ttl: number;
  maxKeys: number;
  cleanupInterval: number;
}

// Hook Return Types
export interface UseExpectedPointsReturn {
  data: PlayerExpectedPoints[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  cacheHit: boolean;
  refetch: () => Promise<void>;
  clearCache: () => Promise<void>;
  isStale: boolean;
}

export interface UseApiConnectivityReturn {
  connected: boolean | null;
  latency: number | null;
  checking: boolean;
  checkConnection: () => Promise<void>;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
