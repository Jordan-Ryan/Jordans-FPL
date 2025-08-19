// FPL Points Calculator for 2025/26 Season
// Based on official FPL scoring rules

export interface FPLMatchStats {
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  penalties_saved: number;
  penalties_missed: number;
  own_goals: number;
  bonus: number;
  element_type: number; // 1=GK, 2=DEF, 3=MID, 4=FWD
  // Additional stats for 2025/26 season
  clearances_blocks_interceptions?: number;
  recoveries?: number;
  tackles?: number;
  passes_completed?: number;
  passes_attempted?: number;
  successful_crosses?: number;
  big_chances_created?: number;
  key_passes?: number;
  successful_dribbles?: number;
  shots_on_target?: number;
  shots_off_target?: number;
  fouls_won?: number;
  fouls_conceded?: number;
  offsides?: number;
  big_chances_missed?: number;
  errors_leading_to_goal?: number;
  errors_leading_to_shot?: number;
  times_tackled?: number;
  goal_line_clearances?: number;
  match_winner_goal?: boolean;
}

export interface FPLPointsBreakdown {
  minutes_points: number;
  goals_points: number;
  assists_points: number;
  clean_sheet_points: number;
  goals_conceded_points: number;
  cards_points: number;
  saves_points: number;
  penalties_points: number;
  own_goals_points: number;
  defensive_contributions_points: number;
  pass_completion_points: number;
  other_actions_points: number;
  bonus_points: number;
  total_calculated: number;
}

export class FPLPointsCalculator {
  // 2025/26 Season Scoring Rules
  private static readonly SCORING_RULES = {
    // Minutes played
    MINUTES_UNDER_60: 1,
    MINUTES_60_PLUS: 2,
    
    // Goals
    GOALS: {
      1: 10, // GK
      2: 6,  // DEF
      3: 5,  // MID
      4: 4   // FWD
    } as const,
    
    // Assists
    ASSISTS: 3,
    
    // Clean sheets
    CLEAN_SHEETS: {
      1: 4, // GK
      2: 4, // DEF
      3: 1, // MID
      4: 0  // FWD
    } as const,
    
    // Goals conceded
    GOALS_CONCEDED_THRESHOLD: 2,
    GOALS_CONCEDED_POINTS: -1,
    
    // Cards
    YELLOW_CARD: -1,
    RED_CARD: -3,
    
    // Saves (Goalkeepers only)
    SAVES_THRESHOLD: 3,
    SAVES_POINTS: 1,
    
    // Penalties
    PENALTY_SAVED: 5,
    PENALTY_MISSED: -2,
    
    // Own goals
    OWN_GOAL: -2,
    
    // Defensive contributions
    DEFENSIVE_CONTRIBUTIONS: {
      DEF: { threshold: 10, points: 2 },
      MID_FWD: { threshold: 12, points: 2 }
    },
    
    // Pass completion
    PASS_COMPLETION: {
      '70-79': { threshold: 70, maxThreshold: 79, minAttempts: 30, points: 2 },
      '80-89': { threshold: 80, maxThreshold: 89, minAttempts: 30, points: 4 },
      '90+': { threshold: 90, minAttempts: 30, points: 6 }
    },
    
    // Other actions
    SUCCESSFUL_CROSS: 1,
    BIG_CHANCE_CREATED: 3,
    KEY_PASS: 1,
    SUCCESSFUL_TACKLE: 2,
    SUCCESSFUL_DRIBBLE: 1,
    SHOT_ON_TARGET: 2,
    SHOT_OFF_TARGET: -1,
    FOUL_WON: 1,
    FOUL_CONCEDED: -1,
    OFFSIDE: -1,
    BIG_CHANCE_MISSED: -3,
    ERROR_LEADING_TO_GOAL: -3,
    ERROR_LEADING_TO_SHOT: -1,
    TIMES_TACKLED: -1,
    GOAL_LINE_CLEARANCE: 9,
    MATCH_WINNER_GOAL: 3
  };

  /**
   * Calculate FPL points for a match based on player stats and position
   */
  static calculateMatchPoints(stats: FPLMatchStats): FPLPointsBreakdown {
    const position = stats.element_type;
    
    // Minutes played points
    let minutes_points = 0;
    if (stats.minutes > 0 && stats.minutes < 60) {
      minutes_points = this.SCORING_RULES.MINUTES_UNDER_60;
    } else if (stats.minutes >= 60) {
      minutes_points = this.SCORING_RULES.MINUTES_60_PLUS;
    }
    
    // Goals points (position-dependent)
    const goals_points = stats.goals_scored * this.SCORING_RULES.GOALS[position as keyof typeof this.SCORING_RULES.GOALS];
    
    // Assists points
    const assists_points = stats.assists * this.SCORING_RULES.ASSISTS;
    
    // Clean sheet points (position-dependent)
    const clean_sheet_points = stats.clean_sheets > 0 
      ? this.SCORING_RULES.CLEAN_SHEETS[position as keyof typeof this.SCORING_RULES.CLEAN_SHEETS]
      : 0;
    
    // Goals conceded points (position-dependent, every 2 goals)
    let goals_conceded_points = 0;
    if (stats.goals_conceded > 0 && (position === 1 || position === 2)) {
      const groups = Math.floor(stats.goals_conceded / this.SCORING_RULES.GOALS_CONCEDED_THRESHOLD);
      goals_conceded_points = groups * this.SCORING_RULES.GOALS_CONCEDED_POINTS;
    }
    
    // Cards points
    const cards_points = (stats.yellow_cards * this.SCORING_RULES.YELLOW_CARD) + 
                        (stats.red_cards * this.SCORING_RULES.RED_CARD);
    
    // Saves points (Goalkeepers only)
    const saves_points = position === 1 && stats.saves >= this.SCORING_RULES.SAVES_THRESHOLD 
      ? Math.floor(stats.saves / this.SCORING_RULES.SAVES_THRESHOLD) * this.SCORING_RULES.SAVES_POINTS
      : 0;
    
    // Penalties points
    const penalties_points = (stats.penalties_saved * this.SCORING_RULES.PENALTY_SAVED) + 
                            (stats.penalties_missed * this.SCORING_RULES.PENALTY_MISSED);
    
    // Own goals points
    const own_goals_points = stats.own_goals * this.SCORING_RULES.OWN_GOAL;
    
    // Defensive contributions points
    let defensive_contributions_points = 0;
    if (stats.clearances_blocks_interceptions !== undefined && stats.recoveries !== undefined && stats.tackles !== undefined) {
      const totalDefensiveActions = stats.clearances_blocks_interceptions + stats.recoveries + stats.tackles;
      
      if (position === 2) { // Defender
        if (totalDefensiveActions >= this.SCORING_RULES.DEFENSIVE_CONTRIBUTIONS.DEF.threshold) {
          defensive_contributions_points = this.SCORING_RULES.DEFENSIVE_CONTRIBUTIONS.DEF.points;
        }
      } else if (position === 3 || position === 4) { // Midfielder or Forward
        if (totalDefensiveActions >= this.SCORING_RULES.DEFENSIVE_CONTRIBUTIONS.MID_FWD.threshold) {
          defensive_contributions_points = this.SCORING_RULES.DEFENSIVE_CONTRIBUTIONS.MID_FWD.points;
        }
      }
    }
    
    // Pass completion points
    let pass_completion_points = 0;
    if (stats.passes_attempted !== undefined && stats.passes_completed !== undefined && stats.passes_attempted >= 30) {
      const completionRate = (stats.passes_completed / stats.passes_attempted) * 100;
      
      if (completionRate >= 90) {
        pass_completion_points = this.SCORING_RULES.PASS_COMPLETION['90+'].points;
      } else if (completionRate >= 80) {
        pass_completion_points = this.SCORING_RULES.PASS_COMPLETION['80-89'].points;
      } else if (completionRate >= 70) {
        pass_completion_points = this.SCORING_RULES.PASS_COMPLETION['70-79'].points;
      }
    }
    
    // Other actions points
    let other_actions_points = 0;
    
    // Successful crosses
    if (stats.successful_crosses) {
      other_actions_points += stats.successful_crosses * this.SCORING_RULES.SUCCESSFUL_CROSS;
    }
    
    // Big chances created
    if (stats.big_chances_created) {
      other_actions_points += stats.big_chances_created * this.SCORING_RULES.BIG_CHANCE_CREATED;
    }
    
    // Key passes
    if (stats.key_passes) {
      other_actions_points += stats.key_passes * this.SCORING_RULES.KEY_PASS;
    }
    
    // Successful tackles
    if (stats.tackles) {
      other_actions_points += stats.tackles * this.SCORING_RULES.SUCCESSFUL_TACKLE;
    }
    
    // Successful dribbles
    if (stats.successful_dribbles) {
      other_actions_points += stats.successful_dribbles * this.SCORING_RULES.SUCCESSFUL_DRIBBLE;
    }
    
    // Shots on target
    if (stats.shots_on_target) {
      other_actions_points += stats.shots_on_target * this.SCORING_RULES.SHOT_ON_TARGET;
    }
    
    // Shots off target
    if (stats.shots_off_target) {
      other_actions_points += stats.shots_off_target * this.SCORING_RULES.SHOT_OFF_TARGET;
    }
    
    // Fouls won
    if (stats.fouls_won) {
      other_actions_points += stats.fouls_won * this.SCORING_RULES.FOUL_WON;
    }
    
    // Fouls conceded
    if (stats.fouls_conceded) {
      other_actions_points += stats.fouls_conceded * this.SCORING_RULES.FOUL_CONCEDED;
    }
    
    // Offsides
    if (stats.offsides) {
      other_actions_points += stats.offsides * this.SCORING_RULES.OFFSIDE;
    }
    
    // Big chances missed
    if (stats.big_chances_missed) {
      other_actions_points += stats.big_chances_missed * this.SCORING_RULES.BIG_CHANCE_MISSED;
    }
    
    // Errors leading to goal
    if (stats.errors_leading_to_goal) {
      other_actions_points += stats.errors_leading_to_goal * this.SCORING_RULES.ERROR_LEADING_TO_GOAL;
    }
    
    // Errors leading to shot
    if (stats.errors_leading_to_shot) {
      other_actions_points += stats.errors_leading_to_shot * this.SCORING_RULES.ERROR_LEADING_TO_SHOT;
    }
    
    // Times tackled
    if (stats.times_tackled) {
      other_actions_points += stats.times_tackled * this.SCORING_RULES.TIMES_TACKLED;
    }
    
    // Goal line clearances
    if (stats.goal_line_clearances) {
      other_actions_points += stats.goal_line_clearances * this.SCORING_RULES.GOAL_LINE_CLEARANCE;
    }
    
    // Match winner goal
    if (stats.match_winner_goal) {
      other_actions_points += this.SCORING_RULES.MATCH_WINNER_GOAL;
    }
    
    // Bonus points (from API)
    const bonus_points = stats.bonus;
    
    // Calculate total
    const total_calculated = minutes_points + goals_points + assists_points + 
                            clean_sheet_points + goals_conceded_points + cards_points + 
                            saves_points + penalties_points + own_goals_points + 
                            defensive_contributions_points + pass_completion_points + 
                            other_actions_points + bonus_points;
    
    return {
      minutes_points,
      goals_points,
      assists_points,
      clean_sheet_points,
      goals_conceded_points,
      cards_points,
      saves_points,
      penalties_points,
      own_goals_points,
      defensive_contributions_points,
      pass_completion_points,
      other_actions_points,
      bonus_points,
      total_calculated
    };
  }

  /**
   * Get position name from element_type
   */
  static getPositionName(elementType: number): string {
    switch (elementType) {
      case 1: return 'GK';
      case 2: return 'DEF';
      case 3: return 'MID';
      case 4: return 'FWD';
      default: return 'Unknown';
    }
  }

  /**
   * Format points with proper sign
   */
  static formatPoints(points: number): string {
    if (points === 0) return '0';
    if (points > 0) return `+${points}`;
    return `${points}`;
  }
}
