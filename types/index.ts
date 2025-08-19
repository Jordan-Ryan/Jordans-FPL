// FPL API response types
export interface FPLPlayer {
  id: number;
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number; // 1=GKP, 2=DEF, 3=MID, 4=FWD
  now_cost: number;
  total_points: number;
  form: string;
  ict_index: string;
  status: string;
  chance_of_playing_next_round?: number;
  news: string;
  code: number;
  cost_change_event: number;
  cost_change_event_fall: number;
  cost_change_start: number;
  cost_change_start_fall: number;
  dreamteam_count: number;
  ep_next: string;
  ep_this: string;
  event_points: number;
  in_dreamteam: boolean;
  news_added?: string;
  points_per_game: string;
  selected_by_percent: string;
  special: boolean;
  team_code: number;
  transfers_in: number;
  transfers_in_event: number;
  transfers_out: number;
  transfers_out_event: number;
  value_form: string;
  value_season: string;
}

export interface FPLTeam {
  code: number;
  draw: number;
  form: string;
  id: number;
  loss: number;
  name: string;
  played: number;
  points: number;
  position: number;
  short_name: string;
  strength: number;
  team_division: string;
  unavailable: boolean;
  win: number;
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
  pulse_id: number;
}

export interface FPLFixture {
  id: number;
  event: number; // Gameweek
  team_h: number;
  team_a: number;
  team_h_difficulty?: number;
  team_a_difficulty?: number;
  kickoff_time: string;
  finished: boolean;
  started: boolean;
  team_h_score?: number;
  team_a_score?: number;
}

export interface FPLBootstrapData {
  events: any[];
  game_settings: any;
  phases: any[];
  teams: FPLTeam[];
  total_players: number;
  elements: FPLPlayer[];
  element_stats: any[];
  element_types: any[];
}

// Element summary types
export interface ElementHistory {
  element: number;
  fixture: number;
  opponent_team: number;
  total_points: number;
  was_home: boolean;
  kickoff_time: string;
  team_h_score: number;
  team_a_score: number;
  round: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  value: number;
  transfers_balance: number;
  selected: number;
  transfers_in: number;
  transfers_out: number;
}

export interface ElementFixture {
  id: number;
  event: number;
  team_h: number;
  team_a: number;
  team_h_difficulty?: number;
  team_a_difficulty?: number;
  kickoff_time: string;
  finished: boolean;
  started: boolean;
  team_h_score?: number;
  team_a_score?: number;
}

export interface ElementSummary {
  history: ElementHistory[];
  fixtures: ElementFixture[];
}

// Feature engineering types
export interface PlayerFeatures {
  player_id: number;
  roll3_points: number;
  roll5_points: number;
  roll8_points: number;
  roll15_points: number;
  roll3_minutes: number;
  roll5_minutes: number;
  roll8_minutes: number;
  roll5_consistency: number;
  roll5_starts: number;
  form_trend: number;
  form_momentum: number;
  minutes_reliability: number;
  ict_index: number;
  position: string;
  team: number;
  chance_of_playing_next_round?: number;
}

// Prediction types
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

// API request/response types
export interface BatchRequest {
  playerIds: number[];
  horizon?: number;
}

export interface BatchResponse {
  predictions: PlayerExpectedPoints[];
  timestamp: string;
  cache_hit: boolean;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}
