import { PlayerFeatures, FixturePrediction, FPLFixture, FPLTeam } from '../types';
import { config } from '../config';
import { FeatureEngineeringService } from './features';

export class PredictionModelService {
  /**
   * Predict expected points for a player in a specific fixture
   */
  static predictFixturePoints(
    features: PlayerFeatures,
    fixture: FPLFixture,
    playerTeam: FPLTeam,
    opponentTeam: FPLTeam,
    isHome: boolean
  ): FixturePrediction {
    // Calculate base expected points using weighted rolling averages
    const basePoints = this.calculateBasePoints(features);
    
    // Apply context multipliers
    const homeAwayMultiplier = FeatureEngineeringService.calculateHomeAwayMultiplier(isHome);
    const opponentMultipliers = FeatureEngineeringService.calculateOpponentMultiplier(opponentTeam, isHome);
    
    // Apply position-specific adjustments
    const positionMultiplier = this.getPositionMultiplier(features.position);
    
    // Calculate minutes reliability adjustment
    const minutesAdjustment = this.calculateMinutesAdjustment(features);
    
    // Calculate final expected points
    let expectedPoints = basePoints * homeAwayMultiplier * positionMultiplier * minutesAdjustment;
    
    // Apply opponent difficulty adjustment based on position
    if (features.position === 'GK' || features.position === 'DEF') {
      // Defensive players benefit from weak opponent attack
      expectedPoints *= opponentMultipliers.defenseMultiplier;
    } else {
      // Attacking players benefit from weak opponent defense
      expectedPoints *= opponentMultipliers.attackMultiplier;
    }
    
    // Apply availability adjustment
    const availabilityMultiplier = FeatureEngineeringService.calculateAvailabilityMultiplier(
      features.chance_of_playing_next_round
    );
    expectedPoints *= availabilityMultiplier;
    
    // Clip to reasonable range
    expectedPoints = Math.max(0, Math.min(config.features.maxExpectedPoints, expectedPoints));
    
    // Get difficulty rating
    const difficulty = this.getFixtureDifficulty(fixture, isHome);
    
    // Get opponent short name
    const opponent = isHome ? opponentTeam.short_name : opponentTeam.short_name;
    const homeAway = isHome ? 'H' : 'A';
    
    return {
      gameweek: fixture.event,
      opponent,
      home_away: homeAway,
      difficulty,
      expected_points: Math.round(expectedPoints * 10) / 10 // Round to 1 decimal place
    };
  }

  /**
   * Calculate base expected points using weighted rolling averages
   */
  private static calculateBasePoints(features: PlayerFeatures): number {
    // Weighted combination of rolling averages (more recent = higher weight)
    const weights = {
      roll3: 0.35,   // Most recent
      roll5: 0.30,   // Recent
      roll8: 0.20,   // Medium term
      roll15: 0.15   // Long term
    };
    
    let basePoints = 
      features.roll3_points * weights.roll3 +
      features.roll5_points * weights.roll5 +
      features.roll8_points * weights.roll8 +
      features.roll15_points * weights.roll15;
    
    // Add form trend bonus
    if (features.form_trend > 0) {
      basePoints += features.form_trend * 0.1; // Small bonus for improving form
    }
    
    // Add consistency bonus
    basePoints += features.roll5_consistency * 0.5;
    
    // Add ICT index contribution (small)
    basePoints += (features.ict_index / 100) * 0.3;
    
    return basePoints;
  }

  /**
   * Get position-specific multiplier
   */
  private static getPositionMultiplier(position: string): number {
    return config.prediction.positionMultipliers[position as keyof typeof config.prediction.positionMultipliers] || 1.0;
  }

  /**
   * Calculate minutes reliability adjustment
   */
  private static calculateMinutesAdjustment(features: PlayerFeatures): number {
    const { minMinutesForReliability, minStartsForReliability } = config.prediction;
    
    // If player has low minutes or low starts, reduce expected points
    if (features.roll5_minutes < minMinutesForReliability || features.roll5_starts < minStartsForReliability) {
      return 0.7; // 30% reduction for unreliable players
    }
    
    // If player is very reliable, give small boost
    if (features.roll5_minutes >= 85 && features.roll5_starts >= 0.9) {
      return 1.1; // 10% boost for nailed starters
    }
    
    return 1.0; // No adjustment for average reliability
  }

  /**
   * Get fixture difficulty rating
   */
  private static getFixtureDifficulty(fixture: FPLFixture, isHome: boolean): number {
    // Use FPL's difficulty rating if available
    if (isHome && fixture.team_h_difficulty !== undefined) {
      return fixture.team_h_difficulty;
    }
    if (!isHome && fixture.team_a_difficulty !== undefined) {
      return fixture.team_a_difficulty;
    }
    
    // Default to medium difficulty if not available
    return 3;
  }

  /**
   * Calculate confidence range for predictions
   */
  static calculateConfidenceRange(
    features: PlayerFeatures,
    basePoints: number
  ): { lower: number; upper: number } {
    const { default: defaultRange, lowReliability } = config.features.confidenceRange;
    
    let confidenceRange = defaultRange;
    
    // Widen confidence if player has low reliability
    if (features.roll5_minutes < config.prediction.minMinutesForReliability || 
        features.roll5_starts < config.prediction.minStartsForReliability) {
      confidenceRange = lowReliability;
    }
    
    // Adjust confidence based on consistency
    if (features.roll5_consistency < 0.5) {
      confidenceRange *= 1.3; // 30% wider for inconsistent players
    } else if (features.roll5_consistency > 0.8) {
      confidenceRange *= 0.8; // 20% narrower for consistent players
    }
    
    // Ensure minimum confidence range
    confidenceRange = Math.max(1.0, confidenceRange);
    
    const lower = Math.max(0, basePoints - confidenceRange);
    const upper = Math.min(config.features.maxExpectedPoints, basePoints + confidenceRange);
    
    return {
      lower: Math.round(lower * 10) / 10,
      upper: Math.round(upper * 10) / 10
    };
  }

  /**
   * Validate prediction inputs
   */
  static validatePredictionInputs(
    features: PlayerFeatures,
    fixture: FPLFixture,
    playerTeam: FPLTeam,
    opponentTeam: FPLTeam
  ): boolean {
    if (!features || !fixture || !playerTeam || !opponentTeam) {
      return false;
    }
    
    if (fixture.finished) {
      return false; // Don't predict for finished fixtures
    }
    
    if (features.player_id <= 0) {
      return false;
    }
    
    return true;
  }

  /**
   * Get prediction explanation for debugging
   */
  static getPredictionExplanation(
    features: PlayerFeatures,
    fixture: FPLFixture,
    playerTeam: FPLTeam,
    opponentTeam: FPLTeam,
    isHome: boolean
  ): string {
    const basePoints = this.calculateBasePoints(features);
    const homeAwayMultiplier = FeatureEngineeringService.calculateHomeAwayMultiplier(isHome);
    const opponentMultipliers = FeatureEngineeringService.calculateOpponentMultiplier(opponentTeam, isHome);
    const positionMultiplier = this.getPositionMultiplier(features.position);
    const minutesAdjustment = this.calculateMinutesAdjustment(features);
    
    return `
      Prediction breakdown for ${features.position}:
      - Base points: ${basePoints.toFixed(2)}
      - Home/Away: ${isHome ? 'Home' : 'Away'} (${homeAwayMultiplier.toFixed(2)}x)
      - Position: ${features.position} (${positionMultiplier.toFixed(2)}x)
      - Minutes reliability: ${minutesAdjustment.toFixed(2)}x
      - Opponent: ${opponentMultipliers.attackMultiplier.toFixed(2)}x (attack), ${opponentMultipliers.defenseMultiplier.toFixed(2)}x (defense)
      - Form trend: ${features.form_trend.toFixed(2)}
      - Consistency: ${features.roll5_consistency.toFixed(2)}
      - ICT index: ${features.ict_index.toFixed(2)}
    `.trim();
  }
}
