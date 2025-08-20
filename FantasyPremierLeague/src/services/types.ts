// Basic FPL Types

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
