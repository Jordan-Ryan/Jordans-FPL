import { FPLApiService } from './fplApi';
import { FeatureEngineeringService } from './features';
import { PredictionModelService } from './model';
import {
  PlayerExpectedPoints,
  FixturePrediction,
  PlayerFeatures,
  FPLPlayer,
  FPLTeam,
  FPLFixture,
  ElementSummary
} from '../types';
import { Cache } from '../utils/cache';
import { config } from '../config';

export class PredictionService {
  private fplApi: FPLApiService;
  private cache: Cache;

  constructor() {
    this.fplApi = new FPLApiService();
    this.cache = new Cache(config.cache.maxKeys);
  }

  /**
   * Predict expected points for a single player for the next N gameweeks
   */
  async predictPlayerExpectedPoints(
    playerId: number,
    horizon: number = 3
  ): Promise<PlayerExpectedPoints> {
    try {
      // Check cache first
      const cacheKey = Cache.getPredictionKey([playerId], horizon);
      const cached = this.cache.get<PlayerExpectedPoints>(cacheKey);
      if (cached) {
        console.log(`Cache hit for player ${playerId} predictions`);
        return cached;
      }

      console.log(`Generating predictions for player ${playerId} (horizon: ${horizon})`);

      // Fetch required data
      const [player, elementSummary, upcomingFixtures, bootstrapData] = await Promise.all([
        this.fplApi.getPlayer(playerId),
        this.fplApi.getElementSummary(playerId),
        this.fplApi.getUpcomingFixtures(horizon),
        this.fplApi.getBootstrapData()
      ]);

      if (!player) {
        throw new Error(`Player ${playerId} not found`);
      }

      // Get player's team
      const playerTeam = bootstrapData.teams.find(team => team.id === player.team);
      if (!playerTeam) {
        throw new Error(`Team not found for player ${playerId}`);
      }

      // Calculate features
      const features = FeatureEngineeringService.calculateRollingFeatures(
        elementSummary.history,
        player
      );

      // Find player's upcoming fixtures
      const playerFixtures = upcomingFixtures.filter(fixture => 
        fixture.team_h === player.team || fixture.team_a === player.team
      );

      // Generate predictions for each fixture
      const predictions: FixturePrediction[] = [];
      for (const fixture of playerFixtures) {
        const isHome = fixture.team_h === player.team;
        const opponentTeamId = isHome ? fixture.team_a : fixture.team_h;
        const opponentTeam = bootstrapData.teams.find(team => team.id === opponentTeamId);

        if (!opponentTeam) {
          console.warn(`Opponent team ${opponentTeamId} not found for fixture ${fixture.id}`);
          continue;
        }

        // Validate inputs
        if (!PredictionModelService.validatePredictionInputs(features, fixture, playerTeam, opponentTeam)) {
          console.warn(`Invalid inputs for player ${playerId} fixture ${fixture.id}`);
          continue;
        }

        const prediction = PredictionModelService.predictFixturePoints(
          features,
          fixture,
          playerTeam,
          opponentTeam,
          isHome
        );

        predictions.push(prediction);
      }

      // Calculate total expected points
      const total3gw = predictions.reduce((sum, pred) => sum + pred.expected_points, 0);

      // Calculate confidence range
      const basePoints = this.calculateAverageBasePoints(features);
      const confidence = PredictionModelService.calculateConfidenceRange(features, basePoints);

      const result: PlayerExpectedPoints = {
        player_id: playerId,
        name: player.web_name,
        team: playerTeam.short_name,
        position: this.mapPosition(player.element_type),
        predictions,
        total_3gw: Math.round(total3gw * 10) / 10,
        confidence
      };

      // Cache the result
      this.cache.set(cacheKey, result, config.cache.ttl.predictions);

      console.log(`Generated predictions for player ${playerId}: ${total3gw.toFixed(1)} total points`);
      return result;

    } catch (error) {
      console.error(`Failed to predict expected points for player ${playerId}:`, error);
      throw new Error(`Prediction failed for player ${playerId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Predict expected points for multiple players in batch
   */
  async predictBatchExpectedPoints(
    playerIds: number[],
    horizon: number = 3
  ): Promise<PlayerExpectedPoints[]> {
    try {
      // Check cache first
      const cacheKey = Cache.getPredictionKey(playerIds, horizon);
      const cached = this.cache.get<PlayerExpectedPoints[]>(cacheKey);
      if (cached) {
        console.log(`Cache hit for batch predictions (${playerIds.length} players)`);
        return cached;
      }

      console.log(`Generating batch predictions for ${playerIds.length} players (horizon: ${horizon})`);

      // Fetch all required data in parallel
      const [bootstrapData, upcomingFixtures, elementSummaries] = await Promise.all([
        this.fplApi.getBootstrapData(),
        this.fplApi.getUpcomingFixtures(horizon),
        this.fplApi.getBatchElementSummaries(playerIds)
      ]);

      // Generate predictions for each player
      const predictions: PlayerExpectedPoints[] = [];
      const errors: Array<{ playerId: number; error: string }> = [];

      for (const playerId of playerIds) {
        try {
          const player = bootstrapData.elements.find(p => p.id === playerId);
          if (!player) {
            errors.push({ playerId, error: 'Player not found' });
            continue;
          }

          const elementSummary = elementSummaries.get(playerId);
          if (!elementSummary) {
            errors.push({ playerId, error: 'Element summary not found' });
            continue;
          }

          const playerTeam = bootstrapData.teams.find(team => team.id === player.team);
          if (!playerTeam) {
            errors.push({ playerId, error: 'Team not found' });
            continue;
          }

          // Calculate features
          const features = FeatureEngineeringService.calculateRollingFeatures(
            elementSummary.history,
            player
          );

          // Find player's upcoming fixtures
          const playerFixtures = upcomingFixtures.filter(fixture => 
            fixture.team_h === player.team || fixture.team_a === player.team
          );

          // Generate predictions for each fixture
          const fixturePredictions: FixturePrediction[] = [];
          for (const fixture of playerFixtures) {
            const isHome = fixture.team_h === player.team;
            const opponentTeamId = isHome ? fixture.team_a : fixture.team_h;
            const opponentTeam = bootstrapData.teams.find(team => team.id === opponentTeamId);

            if (!opponentTeam) continue;

            if (PredictionModelService.validatePredictionInputs(features, fixture, playerTeam, opponentTeam)) {
              const prediction = PredictionModelService.predictFixturePoints(
                features,
                fixture,
                playerTeam,
                opponentTeam,
                isHome
              );
              fixturePredictions.push(prediction);
            }
          }

          // Calculate total expected points
          const total3gw = fixturePredictions.reduce((sum, pred) => sum + pred.expected_points, 0);

          // Calculate confidence range
          const basePoints = this.calculateAverageBasePoints(features);
          const confidence = PredictionModelService.calculateConfidenceRange(features, basePoints);

          predictions.push({
            player_id: playerId,
            name: player.web_name,
            team: playerTeam.short_name,
            position: this.mapPosition(player.element_type),
            predictions: fixturePredictions,
            total_3gw: Math.round(total3gw * 10) / 10,
            confidence
          });

        } catch (error) {
          console.error(`Failed to predict for player ${playerId}:`, error);
          errors.push({ 
            playerId, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      // Log any errors
      if (errors.length > 0) {
        console.warn(`Batch prediction completed with ${errors.length} errors:`, errors);
      }

      // Cache the results
      this.cache.set(cacheKey, predictions, config.cache.ttl.predictions);

      console.log(`Batch predictions complete: ${predictions.length}/${playerIds.length} successful`);
      return predictions;

    } catch (error) {
      console.error('Failed to generate batch predictions:', error);
      throw new Error(`Batch prediction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate average base points for confidence calculation
   */
  private calculateAverageBasePoints(features: PlayerFeatures): number {
    return (features.roll3_points + features.roll5_points + features.roll8_points) / 3;
  }

  /**
   * Map FPL element type to position string
   */
  private mapPosition(elementType: number): 'GK' | 'DEF' | 'MID' | 'FWD' {
    switch (elementType) {
      case 1: return 'GK';
      case 2: return 'DEF';
      case 3: return 'MID';
      case 4: return 'FWD';
      default: return 'MID';
    }
  }

  /**
   * Clear prediction cache
   */
  clearCache(): void {
    this.cache.clear();
    console.log('Prediction cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}
