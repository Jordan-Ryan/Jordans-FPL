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
  web_name: string;
  first_name: string;
  second_name: string;
  team: number;
  element_type: number;
  photo: string;
  now_cost: number;
  form: string;
  total_points: number;
  ict_index: string;
  status: string;
  news: string;
  code: number;
  chance_of_playing_next_round?: number;
  chance_of_playing_this_round?: number;
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
  // Season statistics for XP calculation
  goals_scored?: number;
  assists?: number;
  bonus?: number;
  clean_sheets?: number;
  minutes?: number;
  // Expected Points for next 3 gameweeks
  gw2Xp?: number;
  gw3Xp?: number;
  gw4Xp?: number;
  threeGwXp?: number;
  // Squad-specific properties
  squad_position?: number;
  is_starter?: boolean;
  is_captain?: boolean;
  is_vice_captain?: boolean;
  multiplier?: number;
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