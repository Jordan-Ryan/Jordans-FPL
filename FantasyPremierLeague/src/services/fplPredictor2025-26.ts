import baselineData2024_25 from '../data/2024-25-baseline-processed.json';

interface PlayerSeasonData {
  name: string;
  element_type: number;
  team: string;
  season_history: Array<{
    round: number;
    total_points: number;
    minutes: number;
    was_home: boolean;
    opponent_team: string;
    ict_index: number;
    bps: number;
    expected_goal_involvements: number;
  }>;
}

export interface PlayerPrediction {
  player_id: number;
  name: string;
  team: string;
  position: string;
  price: number;
  gw2_xp: number;
  gw3_xp: number;
  gw4_xp: number;
  total_3gw_xp: number;
  fixtures: any[];
  [key: string]: any;
}

export interface RollingFeatures {
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
  avg_ict: number;
  avg_bps: number;
  avg_expected_gi: number;
  data_quality: 'good' | 'limited' | 'minimal' | 'new_player' | 'very_new';
  history_games: number;
}

export class FPLPredictor2025_26 {
  private model: any;
  private baselineData: Record<string, PlayerSeasonData> | null = null;

  constructor() {
    this.model = require('../models/fplModel2025-26.json');
    // Load baseline data directly from static file
    this.baselineData = baselineData2024_25 as Record<string, PlayerSeasonData>;
    console.log('✅ FPL Predictor 2025-26 initialized with static baseline data');
  }

  async initialize(): Promise<void> {
    // No need to initialize - data is already loaded
    console.log('✅ Predictor already initialized with static baseline data');
  }

  isInitialized(): boolean {
    return this.baselineData !== null;
  }

  private calculateRollingFeatures(playerName: string, currentSeasonHistory: any[]): RollingFeatures {
    const baselineData = this.findPlayerBaseline(playerName);
    const baselineHistory = baselineData?.season_history || [];

    let combinedHistory: any[] = [];

    if (baselineHistory && baselineHistory.length > 0) {
      const last15Games = baselineHistory.slice(-15);
      combinedHistory = [...last15Games];
    }

    if (currentSeasonHistory && currentSeasonHistory.length > 0) {
      const currentFormatted = currentSeasonHistory.map((game: any) => ({
        round: game.round + 100,
        total_points: game.total_points || 0,
        minutes: game.minutes || 0,
        was_home: game.was_home || false,
        opponent_team: game.opponent_team || 'Unknown',
        ict_index: game.ict_index || 0,
        bps: game.bps || 0,
        expected_goal_involvements: game.expected_goal_involvements || 0
      }));
      combinedHistory = [...combinedHistory, ...currentFormatted];
    }

    if (combinedHistory.length === 0) {
      return this.getNewPlayerDefaults();
    }

    combinedHistory.sort((a, b) => a.round - b.round);

    const getAvg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const getStd = (arr: number[]) => {
      if (arr.length <= 1) return 1;
      const avg = getAvg(arr);
      const variance = getAvg(arr.map(x => (x - avg) ** 2));
      return Math.sqrt(variance);
    };

    const last3 = combinedHistory.slice(-3);
    const last5 = combinedHistory.slice(-5);
    const last8 = combinedHistory.slice(-8);
    const last15 = combinedHistory.slice(-15);

    // Spike smoothing: if single-game spike > 2x recent mean, reduce its influence
    const lastGamePts = last3.length > 0 ? last3[last3.length - 1].total_points : 0;
    const recentMean = getAvg(last5.map(g => g.total_points));
    const spikeFactor = recentMean > 0 && lastGamePts > 2 * recentMean ? 0.85 : 1.0;

    // Compute averages with spike smoothing applied to last game
    const last3Pts = last3.map((g, idx) => idx === last3.length - 1 ? g.total_points * spikeFactor : g.total_points);

    const historyGames = combinedHistory.length;
    const baseQuality = historyGames >= 10 ? 'good' : historyGames >= 5 ? 'limited' : 'minimal';

    const veryNew = (!baselineHistory || baselineHistory.length === 0) && (currentSeasonHistory?.length || 0) < 3;

    return {
      roll3_points: getAvg(last3Pts),
      roll5_points: getAvg(last5.map(g => g.total_points)),
      roll8_points: getAvg(last8.map(g => g.total_points)),
      roll15_points: getAvg(last15.map(g => g.total_points)),
      roll3_minutes: getAvg(last3.map(g => g.minutes)),
      roll5_minutes: getAvg(last5.map(g => g.minutes)),
      roll8_minutes: getAvg(last8.map(g => g.minutes)),
      roll5_consistency: 1 / (1 + getStd(last5.map(g => g.total_points))),
      roll5_starts: getAvg(last5.map(g => g.minutes >= 60 ? 1 : 0)),
      form_trend: getAvg(last3Pts) - getAvg(last8.map(g => g.total_points)),
      avg_ict: getAvg(combinedHistory.map(g => g.ict_index)),
      avg_bps: getAvg(combinedHistory.map(g => g.bps)),
      avg_expected_gi: getAvg(combinedHistory.map(g => g.expected_goal_involvements)),
      data_quality: veryNew ? 'very_new' : (baseQuality as any),
      history_games: historyGames
    };
  }

  private findPlayerBaseline(playerName: string): PlayerSeasonData | null {
    // Try exact match first
    if (this.baselineData?.[playerName]) {
      return this.baselineData[playerName];
    }

    // Try normalized name (remove accents, lowercase)
    const normalizedName = playerName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '');

    for (const [name, data] of Object.entries(this.baselineData || {})) {
      const normalizedBaselineName = name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, '');

      if (normalizedName === normalizedBaselineName) {
        return data;
      }
    }

    // Try partial match
    for (const [name, data] of Object.entries(this.baselineData || {})) {
      if (name.toLowerCase().includes(playerName.toLowerCase()) || 
          playerName.toLowerCase().includes(name.toLowerCase())) {
        return data;
      }
    }

    return null;
  }

  private getNewPlayerDefaults(): RollingFeatures {
    return {
      roll3_points: 3.5, roll5_points: 3.5, roll8_points: 3.5, roll15_points: 3.5,
      roll3_minutes: 65, roll5_minutes: 65, roll8_minutes: 65,
      roll5_consistency: 0.5, roll5_starts: 0.7, form_trend: 0,
      avg_ict: 25, avg_bps: 20, avg_expected_gi: 0.8,
      data_quality: 'new_player', history_games: 0
    };
  }

  private predict(features: RollingFeatures, context: any): number {
    const weights = this.model.weights;

    let prediction = 
      features.roll3_points * weights.form_weights.roll3 +
      features.roll5_points * weights.form_weights.roll5 +
      features.roll8_points * weights.form_weights.roll8 +
      features.roll15_points * weights.form_weights.roll15;

    // New/very_new dampening on early-form features
    if (features.data_quality === 'very_new') {
      prediction *= 0.65; // strong dampening
    }

    const minutesReliability = Math.min(features.roll5_minutes / 90.0, 1.2);
    prediction *= minutesReliability * weights.context_weights.minutes_factor;

    const consistencyFactor = weights.context_weights.consistency_factor * features.roll5_consistency;
    prediction *= (0.8 + 0.4 * consistencyFactor);

    const startsFactor = weights.context_weights.starts_factor * features.roll5_starts;
    prediction *= (0.7 + 0.3 * startsFactor);

    const bpsBoost = features.avg_bps * weights.feature_scaling.bps_scale;
    prediction += bpsBoost;

    const ictBoost = features.avg_ict * weights.feature_scaling.ict_scale;
    prediction += ictBoost;

    const expectedBoost = features.avg_expected_gi * weights.feature_scaling.expected_gi_scale;
    prediction += expectedBoost;

    // 2025-26 RULE ADJUSTMENTS
    const defensiveBoost = this.model.rule_adjustments.defensive_contributions[context.element_type.toString() as keyof typeof this.model.rule_adjustments.defensive_contributions] || 0;
    prediction *= (1 + defensiveBoost);

    prediction *= this.model.rule_adjustments.assists_boost;

    if (context.element_type === 1) {
      prediction *= this.model.rule_adjustments.bps_adjustments.goalkeepers;
    } else if (context.element_type === 2) {
      prediction *= this.model.rule_adjustments.bps_adjustments.defenders;
    } else if (prediction > 8) {
      prediction *= this.model.rule_adjustments.bps_adjustments.penalty_takers;
    }

    const positionMultiplier = weights.position_multipliers[context.element_type.toString() as keyof typeof weights.position_multipliers] || 1.0;
    prediction *= positionMultiplier;

    if (context.is_home) {
      prediction *= weights.context_weights.home_advantage;
    } else {
      prediction *= 0.94;
    }

    if (context.chance_of_playing_next_round !== undefined && context.chance_of_playing_next_round !== null) {
      const availabilityFactor = this.getAvailabilityMultiplier(context.chance_of_playing_next_round);
      prediction *= availabilityFactor;
    }

    if (features.data_quality === 'minimal') {
      prediction *= 0.8;
    } else if (features.data_quality === 'limited') {
      prediction *= 0.9;
    } else if (features.data_quality === 'new_player') {
      prediction *= 0.75;
    } else if (features.data_quality === 'very_new') {
      prediction *= 0.6; // extra dampening
    }

    // Hard cap for very new players to avoid unrealistic spikes
    const capped = features.data_quality === 'very_new' ? Math.min(prediction, 12) : prediction;

    return Math.max(0, Math.min(20, capped));
  }

  private getAvailabilityMultiplier(chance: number): number {
    if (chance >= 100) return 1.0;
    if (chance >= 75) return 0.9;
    if (chance >= 50) return 0.75;
    if (chance >= 25) return 0.5;
    return 0.25;
  }

  private getOpponentName(fixture: any, teams: any[]): string {
    const opponentTeamId = fixture.is_home ? fixture.team_a : fixture.team_h;
    const opponent = teams.find(t => t.id === opponentTeamId);
    return opponent ? opponent.short_name : 'TBD';
  }

  async predictPlayer(
    player: any,
    elementSummary: any,
    teams: any[]
  ): Promise<PlayerPrediction> {
    await this.initialize();

    const features = this.calculateRollingFeatures(
      player.web_name,
      elementSummary.history || []
    );

    // Use up to 3 future fixtures; if missing, synthesize neutral fixtures so XP isn't stuck at 0
    let upcomingFixtures = (elementSummary.fixtures || []).slice(0, 3);
    if (!upcomingFixtures || upcomingFixtures.length === 0) {
      // Synthesize 3 neutral fixtures with average difficulty
      upcomingFixtures = [
        { event: 2, is_home: true, team_a: player.team, team_h: player.team, difficulty: 3 },
        { event: 3, is_home: false, team_a: player.team, team_h: player.team, difficulty: 3 },
        { event: 4, is_home: true, team_a: player.team, team_h: player.team, difficulty: 3 },
      ];
    } else if (upcomingFixtures.length < 3) {
      const lastEvent = upcomingFixtures[upcomingFixtures.length - 1].event || 1;
      while (upcomingFixtures.length < 3) {
        upcomingFixtures.push({
          event: lastEvent + (upcomingFixtures.length),
          is_home: upcomingFixtures.length % 2 === 0,
          team_a: player.team,
          team_h: player.team,
          difficulty: 3,
        });
      }
    }

    const predictions: any[] = [];

    let gw2_xp = 0, gw3_xp = 0, gw4_xp = 0;

    for (let i = 0; i < upcomingFixtures.length && i < 3; i++) {
      const fixture = upcomingFixtures[i];

      const context = {
        element_type: player.element_type,
        is_home: !!fixture.is_home,
        chance_of_playing_next_round: player.chance_of_playing_next_round ?? 100
      };

      const expectedPoints = this.predict(features, context);
      const roundedPoints = Math.round(expectedPoints * 10) / 10;

      const fixtureData = {
        gameweek: fixture.event ?? (2 + i),
        opponent: this.getOpponentName(fixture, teams),
        home_away: fixture.is_home ? 'H' as const : 'A' as const,
        difficulty: fixture.difficulty ?? 3,
        expected_points: roundedPoints
      };

      predictions.push(fixtureData);

      if (i === 0) gw2_xp = roundedPoints;
      if (i === 1) gw3_xp = roundedPoints;
      if (i === 2) gw4_xp = roundedPoints;
    }

    const total_3gw_xp = Math.round((gw2_xp + gw3_xp + gw4_xp) * 10) / 10;

    return {
      player_id: player.id,
      name: player.web_name,
      team: teams.find(t => t.id === player.team)?.short_name || 'TBD',
      position: (['', 'GK', 'DEF', 'MID', 'FWD'][player.element_type] as any),
      price: (player.now_cost || 0) / 10,
      gw2_xp,
      gw3_xp,
      gw4_xp,
      total_3gw_xp,
      fixtures: predictions
    };
  }

  async predictAllPlayers(fplApiService: any): Promise<PlayerPrediction[]> {
    console.log('🔮 Generating predictions for all players...');

    const bootstrap = await fplApiService.fetchBootstrapData();
    const allPlayers = bootstrap.elements;
    const teams = bootstrap.teams;

    const results: PlayerPrediction[] = [];
    const batchSize = 8;

    for (let i = 0; i < allPlayers.length; i += batchSize) {
      const batch = allPlayers.slice(i, i + batchSize);

      console.log(`📊 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allPlayers.length / batchSize)}`);

      const batchPromises = batch.map(async (player: any) => {
        try {
          const elementSummary = await fplApiService.getElementSummary(player.id);
          return await this.predictPlayer(player, elementSummary, teams);
        } catch (error) {
          console.warn(`⚠️ Failed to predict player ${player.id} (${player.web_name}):`, error instanceof Error ? error.message : String(error));
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean) as PlayerPrediction[]);

      if (i + batchSize < allPlayers.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`✅ Generated predictions for ${results.length} players`);
    return results;
  }
}
