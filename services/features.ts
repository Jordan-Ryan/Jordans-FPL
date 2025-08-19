import { ElementHistory, PlayerFeatures, FPLPlayer } from '../types';
import { config } from '../config';

export class FeatureEngineeringService {
  private static readonly POSITION_MAP = {
    1: 'GK',
    2: 'DEF', 
    3: 'MID',
    4: 'FWD'
  };

  /**
   * Calculate rolling statistics for a player's history
   * Uses shift(1) to avoid data leakage - only uses completed fixtures
   */
  static calculateRollingFeatures(
    history: ElementHistory[],
    player: FPLPlayer
  ): PlayerFeatures {
    // Sort history by round (ascending) - all history entries are completed fixtures
    const sortedHistory = history
      .sort((a, b) => a.round - b.round);

    if (sortedHistory.length === 0) {
      return this.getDefaultFeatures(player);
    }

    // Calculate rolling statistics using shift(1) to avoid leakage
    const roll3_points = this.calculateRollingAverage(sortedHistory, 'total_points', 3);
    const roll5_points = this.calculateRollingAverage(sortedHistory, 'total_points', 5);
    const roll8_points = this.calculateRollingAverage(sortedHistory, 'total_points', 8);
    const roll15_points = this.calculateRollingAverage(sortedHistory, 'total_points', 15);

    const roll3_minutes = this.calculateRollingAverage(sortedHistory, 'minutes', 3);
    const roll5_minutes = this.calculateRollingAverage(sortedHistory, 'minutes', 5);
    const roll8_minutes = this.calculateRollingAverage(sortedHistory, 'minutes', 8);

    // Calculate consistency (inverse of standard deviation)
    const roll5_consistency = this.calculateConsistency(sortedHistory, 5);
    
    // Calculate starts percentage (minutes >= 60)
    const roll5_starts = this.calculateStartsPercentage(sortedHistory, 5);

    // Calculate form trends
    const form_trend = roll3_points - roll8_points;
    const form_momentum = roll8_points > 0 ? roll3_points / roll8_points : 1.0;

    // Calculate minutes reliability
    const minutes_reliability = roll5_minutes * roll5_starts;

    // Parse ICT index
    const ict_index = parseFloat(player.ict_index) || 0;

    return {
      player_id: player.id,
      roll3_points,
      roll5_points,
      roll8_points,
      roll15_points,
      roll3_minutes,
      roll5_minutes,
      roll8_minutes,
      roll5_consistency,
      roll5_starts,
      form_trend,
      form_momentum,
      minutes_reliability,
      ict_index,
      position: this.POSITION_MAP[player.element_type as keyof typeof this.POSITION_MAP] || 'MID',
      team: player.team,
      chance_of_playing_next_round: player.chance_of_playing_next_round
    };
  }

  /**
   * Calculate rolling average for a specific field over N matches
   * Uses shift(1) to avoid data leakage
   */
  private static calculateRollingAverage(
    history: ElementHistory[],
    field: keyof ElementHistory,
    window: number
  ): number {
    if (history.length < window) {
      return history.length > 0 ? this.calculateAverage(history, field) : 0;
    }

    // Use shift(1) - take the last N-1 matches (excluding most recent)
    const recentHistory = history.slice(-window - 1, -1);
    
    if (recentHistory.length === 0) return 0;
    
    return this.calculateAverage(recentHistory, field);
  }

  /**
   * Calculate average for a specific field
   */
  private static calculateAverage(
    history: ElementHistory[],
    field: keyof ElementHistory
  ): number {
    const values = history.map(h => {
      const value = h[field];
      return typeof value === 'number' ? value : 0;
    });

    if (values.length === 0) return 0;
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Calculate consistency (inverse of standard deviation)
   */
  private static calculateConsistency(
    history: ElementHistory[],
    window: number
  ): number {
    if (history.length < window) return 1.0;

    // Use shift(1) - take the last N-1 matches
    const recentHistory = history.slice(-window - 1, -1);
    
    if (recentHistory.length === 0) return 1.0;

    const points = recentHistory.map(h => h.total_points);
    const mean = points.reduce((acc, val) => acc + val, 0) / points.length;
    
    const variance = points.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / points.length;
    const stdDev = Math.sqrt(variance);
    
    // Return consistency as 1 / (1 + std_dev) - higher is more consistent
    return 1 / (1 + stdDev);
  }

  /**
   * Calculate percentage of matches where player started (minutes >= 60)
   */
  private static calculateStartsPercentage(
    history: ElementHistory[],
    window: number
  ): number {
    if (history.length < window) {
      return history.length > 0 ? this.calculateStartsPercentage(history, history.length) : 0;
    }

    // Use shift(1) - take the last N-1 matches
    const recentHistory = history.slice(-window - 1, -1);
    
    if (recentHistory.length === 0) return 0;

    const starts = recentHistory.filter(h => h.minutes >= 60).length;
    return starts / recentHistory.length;
  }

  /**
   * Get default features for players with no history
   */
  private static getDefaultFeatures(player: FPLPlayer): PlayerFeatures {
    const position = this.POSITION_MAP[player.element_type as keyof typeof this.POSITION_MAP] || 'MID';
    
    // Default values based on position
    const defaults = {
      GK: { points: 3.0, minutes: 90, consistency: 0.8, starts: 1.0 },
      DEF: { points: 4.0, minutes: 85, consistency: 0.7, starts: 0.9 },
      MID: { points: 4.5, minutes: 80, consistency: 0.6, starts: 0.8 },
      FWD: { points: 5.0, minutes: 75, consistency: 0.5, starts: 0.7 }
    };

    const defaultValues = defaults[position as keyof typeof defaults] || defaults.MID;

    return {
      player_id: player.id,
      roll3_points: defaultValues.points,
      roll5_points: defaultValues.points,
      roll8_points: defaultValues.points,
      roll15_points: defaultValues.points,
      roll3_minutes: defaultValues.minutes,
      roll5_minutes: defaultValues.minutes,
      roll8_minutes: defaultValues.minutes,
      roll5_consistency: defaultValues.consistency,
      roll5_starts: defaultValues.starts,
      form_trend: 0,
      form_momentum: 1.0,
      minutes_reliability: defaultValues.minutes * defaultValues.starts,
      ict_index: parseFloat(player.ict_index) || 0,
      position,
      team: player.team,
      chance_of_playing_next_round: player.chance_of_playing_next_round
    };
  }

  /**
   * Calculate opponent difficulty multiplier
   */
  static calculateOpponentMultiplier(
    opponentTeam: any,
    isHome: boolean
  ): { attackMultiplier: number; defenseMultiplier: number } {
    if (!opponentTeam) return { attackMultiplier: 1.0, defenseMultiplier: 1.0 };

    // Use defensive strength for attacking players, attacking strength for defensive players
    const defensiveStrength = isHome 
      ? opponentTeam.strength_defence_home || opponentTeam.strength || 1000
      : opponentTeam.strength_defence_away || opponentTeam.strength || 1000;

    const attackingStrength = isHome
      ? opponentTeam.strength_attack_away || opponentTeam.strength || 1000
      : opponentTeam.strength_attack_home || opponentTeam.strength || 1000;

    // Normalize around 1000 baseline
    const norm = 1000;
    
    // For attacking players: lower opponent defense = easier = higher multiplier
    const attackMultiplier = Math.max(
      config.features.opponentMultiplierRange[0],
      Math.min(
        config.features.opponentMultiplierRange[1],
        norm / defensiveStrength
      )
    );

    // For defensive players: lower opponent attack = easier clean sheet = higher multiplier
    const defenseMultiplier = Math.max(
      config.features.opponentMultiplierRange[0],
      Math.min(
        config.features.opponentMultiplierRange[1],
        norm / attackingStrength
      )
    );

    return { attackMultiplier, defenseMultiplier };
  }

  /**
   * Calculate home/away multiplier
   */
  static calculateHomeAwayMultiplier(isHome: boolean): number {
    return isHome ? config.features.homeMultiplier : config.features.awayMultiplier;
  }

  /**
   * Calculate availability multiplier based on chance of playing
   */
  static calculateAvailabilityMultiplier(chanceOfPlaying?: number): number {
    if (!chanceOfPlaying || chanceOfPlaying >= 100) return 1.0;
    if (chanceOfPlaying >= 75) return 0.9;
    if (chanceOfPlaying >= 50) return 0.75;
    if (chanceOfPlaying >= 25) return 0.5;
    return 0.25;
  }
}
