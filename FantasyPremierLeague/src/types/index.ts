export interface Player {
  id: number;
  starter: boolean;
  captain: boolean;
  vice_captain: boolean;
  team_position?: number;
  bench_position?: number;
}

export interface FPLPlayer {
  id: number;
  first_name: string;
  second_name: string;
  web_name: string;
  element_type: number;
  team: number;
  now_cost: number;
  selected_by_percent: string;
  form: string;
  total_points: number;
  event_points: number;
  ict_index: string;
  transfers_in: number;
  transfers_out: number;
  dreamteam_count: number;
  status: string;
  special: boolean;
  chance_of_playing_next_round: number | null;
  // Squad-specific properties
  squad_position?: number;
  is_starter?: boolean;
  is_captain?: boolean;
  is_vice_captain?: boolean;
  multiplier?: number;
  // Expected Points properties (extended to 8 gameweeks)
  gw2_xp?: number;
  gw3_xp?: number;
  gw4_xp?: number;
  gw5_xp?: number;
  gw6_xp?: number;
  gw7_xp?: number;
  gw8_xp?: number;
  gw9_xp?: number;
  total_3gw_xp?: number;
  total_8gw_xp?: number;
  // Gameweek-specific points from FPL API
  gameweekPoints?: number;
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

export interface Club {
  id: number;
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
}

// New comprehensive prediction interfaces for 2025-26 season
export interface PlayerPrediction {
  player_id: number;
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  
  // Extend to 8 gameweeks for strategic planning
  gw2_xp: number;
  gw3_xp: number;
  gw4_xp: number;
  gw5_xp: number;
  gw6_xp: number;
  gw7_xp: number;
  gw8_xp: number;
  gw9_xp: number;
  
  total_3gw_xp: number; // Keep for backward compatibility
  total_8gw_xp: number; // Sum of all 8 gameweeks
  
  fixtures: Array<{
    gameweek: number;
    opponent: string;
    home_away: 'H' | 'A';
    difficulty?: number;
    expected_points: number;
  }>;
}

export interface PlayerClassification {
  isNewToPL: boolean;
  isFromPromotedClub: boolean;
  isYoungPlayer: boolean;
  hasInsufficientData: boolean;
  penaltyMultiplier: number;
  dataQuality: 'excellent' | 'good' | 'limited' | 'minimal' | 'new_player';
}

export interface Fixture {
  id: number;
  home_team: string;
  away_team: string;
  home_team_short: string;
  away_team_short: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  difficulty_score: number;
  date: string;
  gameweek: number;
  status?: 'TBC' | 'LIVE' | 'FINISHED' | 'HALF_TIME';
  minutes?: string;
  home_score?: number;
  away_score?: number;
  kickoff?: string;
}

export interface Formation {
  defenders: number;
  midfielders: number;
  forwards: number;
  total: number;
}

export interface Chip {
  id: string;
  name: string;
  description: string;
  used: boolean;
  available: boolean;
  icon: string;
}

export interface TeamRating {
  overall: number;
  attack: number;
  defense: number;
  midfield: number;
  goalkeeping: number;
}

export interface TransferRecommendation {
  player_out: Player;
  player_in: Player;
  reason: string;
  priority: 'High' | 'Medium' | 'Low';
  expected_points_gain: number;
} 