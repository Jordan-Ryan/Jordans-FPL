import baselineData2024_25 from '../data/2024-25-baseline-processed.json';



interface PlayerSeasonData {
  name: string;
  name_key: string;
  fpl_id: number;
  season_history: Array<{
    round: number;
    total_points: number;
    minutes: number;
    was_home: boolean;
    opponent_team: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    goals_conceded: number;
    bonus: number;
    bps: number;
    influence: number;
    creativity: number;
    threat: number;
    ict_index: number;
    expected_goals: number;
    expected_assists: number;
    expected_goal_involvements: number;
    expected_goals_conceded: number;
    fixture: number;
    kickoff_time: string;
    team_a_score: number;
    team_h_score: number;
    value: number;
  }>;
  stats: {
    total_games: number;
    total_points: number;
    total_minutes: number;
    average_points: number;
    goals_scored: number;
    assists: number;
    clean_sheets: number;
    bonus_points: number;
  };
}

export interface PlayerPrediction {
  player_id: number;
  name: string;
  team: string;
  position: string;
  price: number;
  // Extend to 8 gameweeks for strategic planning (GWP1 = next gameweek, GWP2 = next+1, etc.)
  gwp1_xp: number;
  gwp2_xp: number;
  gwp3_xp: number;
  gwp4_xp: number;
  gwp5_xp: number;
  gwp6_xp: number;
  gwp7_xp: number;
  gwp8_xp: number;
  total_3gw_xp: number; // Keep for backward compatibility
  total_8gw_xp: number; // Sum of all 8 gameweeks
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

interface PlayerClassification {
  isNewToPL: boolean;
  isFromPromotedClub: boolean;
  isYoungPlayer: boolean;
  hasInsufficientData: boolean;
  penaltyMultiplier: number;
  dataQuality: 'excellent' | 'good' | 'limited' | 'minimal' | 'new_player';
}

export class FPLPredictor2025_26 {
  private model: any;
  private baselineData: Record<string, PlayerSeasonData> | null = null;
  private isPredicting: boolean = false;
  private predictionPromise: Promise<PlayerPrediction[]> | null = null;
  private verboseLogs: boolean = false;
  private usedBaselineKeys: Set<string> = new Set();
  private baselineKeysCache: string[] | null = null;
  private processedPlayersCount: number = 0;

  constructor() {
    // Load model synchronously for now
    this.model = {}; // Will be loaded when needed
    // Load baseline data directly from static file
    this.baselineData = baselineData2024_25.players as Record<string, PlayerSeasonData>;
    
    // Baseline data loaded successfully (verbose only)
    if (this.verboseLogs && this.baselineData) {
      console.log(`✅ BASELINE DATA LOADED: ${Object.keys(this.baselineData).length} players`);
    }
  }

  async initialize(): Promise<void> {
    // No need to initialize - data is already loaded
  }

  isInitialized(): boolean {
    return this.baselineData !== null;
  }

  getPredictionStatus(): boolean {
    return this.isPredicting;
  }

  async cancelPredictions(): Promise<void> {
    if (this.isPredicting) {
      console.log(`🛑 Cancelling ongoing predictions`);
      this.isPredicting = false;
      this.predictionPromise = null;
    }
  }

  private async loadModel() {
    if (Object.keys(this.model).length === 0) {
      const modelData = await import('../models/fplModel2025-26.json');
      this.model = modelData.default;
    }
  }

  private calculateRollingFeatures(
    playerName: string,
    baselineHistory: any[],
    currentSeasonHistory: any[]
  ): RollingFeatures {
    // Combine histories: current season first, then baseline in reverse order (38, 37, 36, 35...)
    const sortedBaselineHistory = [...(baselineHistory || [])].sort((a, b) => (b.round || 0) - (a.round || 0));
    const combinedHistory = [...(currentSeasonHistory || []), ...sortedBaselineHistory];
    
    // Special debugging for Ekitike rolling points only
    if (playerName.includes('Ekit')) {
      console.log(`🔍 EKITIKE ROLLING POINTS DEBUG:`);
      console.log(`  - baselineHistory length: ${baselineHistory?.length || 0}`);
      console.log(`  - currentSeasonHistory length: ${currentSeasonHistory?.length || 0}`);
      console.log(`  - combinedHistory length: ${combinedHistory.length}`);
      console.log(`  - last 3 games total_points:`, combinedHistory.slice(-3).map(g => g.total_points));
      console.log(`  - last 5 games total_points:`, combinedHistory.slice(-5).map(g => g.total_points));
      if (baselineHistory && baselineHistory.length > 0) {
        console.log(`  - baseline sample (sorted by round desc):`, sortedBaselineHistory.slice(0, 3).map(g => ({ gw: g.round, pts: g.total_points, mins: g.minutes })));
      }
      if (currentSeasonHistory && currentSeasonHistory.length > 0) {
        console.log(`  - current season sample:`, currentSeasonHistory.slice(0, 3).map(g => ({ gw: g.round, pts: g.total_points, mins: g.minutes })));
      }
    }

    if (combinedHistory.length === 0) {
      console.warn('⚠️ No historical data for player:', playerName);
      // Return conservative defaults
      return {
        roll3_points: 0,
        roll5_points: 0,
        roll8_points: 0,
        roll15_points: 0,
        roll3_minutes: 0,
        roll5_minutes: 0,
        roll8_minutes: 0,
        roll5_consistency: 0.5,
        roll5_starts: 0,
        form_trend: 0,
        avg_ict: 0,
        avg_bps: 0,
        avg_expected_gi: 0,
        data_quality: 'very_new',
        history_games: 0
      };
    }

    // Special handling for players with limited data (e.g., 2 games)
    // If we have some current season data but limited history, use what we have
    const hasCurrentSeasonData = currentSeasonHistory && currentSeasonHistory.length > 0;
    const hasBaselineData = baselineHistory && baselineHistory.length > 0;
    
    if (hasCurrentSeasonData && !hasBaselineData && combinedHistory.length < 3) {
      console.log(`📊 Player ${playerName} has ${combinedHistory.length} games - using available data for rollup calculations`);
      console.log(`  - Current season games:`, currentSeasonHistory.map(g => ({ gw: g.round, pts: g.total_points, mins: g.minutes })));
    }
    
    // Debug: Log if we have data but roll3_points will be 0
    if (combinedHistory.length > 0 && combinedHistory.length < 3) {
      const last3 = combinedHistory.slice(-3);
      const last3Pts = last3.map(g => g.total_points);
      console.log(`🔍 ${playerName}: ${combinedHistory.length} games available, last3Pts:`, last3Pts);
    }

    // Helper functions for calculations
    const getAvg = (arr: any[]) => {
      if (arr.length === 0) return 0;
      

      
      // Convert strings to numbers and handle invalid values
      const numericArr = arr.map(x => {
        if (typeof x === 'string') {
          const num = Number(x);
          if (isNaN(num)) {
            console.warn('⚠️ getAvg: Converting invalid string to 0:', x);
            return 0;
          }
          return num;
        }
        return x;
      });
      
      // Check for invalid values
      const invalidValues = numericArr.filter(x => x === undefined || x === null || isNaN(x));
      if (invalidValues.length > 0) {
        console.warn('⚠️ getAvg: found invalid values after conversion:', { invalidValues, originalArray: arr, convertedArray: numericArr });
      }
      
      const validValues = numericArr.filter(x => x !== undefined && x !== null && !isNaN(x));
      if (validValues.length === 0) {
        return 0;
      }
        
      const sum = validValues.reduce((a, b) => a + b, 0);
      const avg = sum / validValues.length;
      

      
      return avg;
    };

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

    const result = {
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
    


    // Ensure all values are valid numbers (excluding non-numeric fields)
    Object.keys(result).forEach(key => {
      const value = (result as any)[key];
      // Skip validation for non-numeric fields
      if (key === 'data_quality' || key === 'history_games') {
        return;
      }
      if (isNaN(value) || !isFinite(value)) {
        console.warn(`⚠️ Invalid ${key} for player ${playerName}:`, value, 'Setting to 0');
        (result as any)[key] = 0;
      }
    });



    return result;
  }

  public findPlayerBaseline(playerName: string, player?: any): PlayerSeasonData | null {
    // IMPROVED: Better matching with partial name support for truncated baseline data
    const baseline = this.baselineData;
    if (!baseline) return null;
    // Use cached keys for performance
    if (!this.baselineKeysCache) {
      this.baselineKeysCache = Object.keys(baseline);
    }
    const allKeys = this.baselineKeysCache;
    const debug = !!(player && String(player.web_name || '').toLowerCase().includes('ekit'));
    
    // Debug: Track baseline matching calls
    if (this.processedPlayersCount % 100 === 0 && player) {

    }

    const normalize = (s: string) => s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_\s]/g, '');

    const tryKeys = (keys: string[], reason: string): PlayerSeasonData | null => {
      for (const key of keys) {
        if (baseline[key]) return baseline[key];
      }
      return null;
    };

    if (player) {
      const firstName = player.first_name || '';
      const secondName = player.second_name || '';
      const nameKey = `${firstName}_${secondName}`;
      const reversedNameKey = `${secondName}_${firstName}`;
      
      // PRIORITY 1: Exact structured keys (highest priority)
      const exactKey1 = baseline[nameKey] && !this.usedBaselineKeys.has(nameKey) ? nameKey : null;
      const exactKey2 = baseline[reversedNameKey] && !this.usedBaselineKeys.has(reversedNameKey) ? reversedNameKey : null;
      const exact = exactKey1 ? baseline[exactKey1] : (exactKey2 ? baseline[exactKey2] : null);
      if (exact) {
        const matchedKey = exactKey1 || exactKey2;
        this.usedBaselineKeys.add(matchedKey!);
        if (debug) {
          console.log('🔎 BASELINE MATCH DEBUG (predictor):', {
            player: { id: player.id, web_name: player.web_name, first_name: player.first_name, second_name: player.second_name },
            reason: 'exact_name_or_reversed',
            matchedKey,
            length: exact?.season_history?.length || 0
          });
        }
        return exact;
      }

      // PRIORITY 2: Exact web_name underscore
      if (player.web_name) {
        const webKey = String(player.web_name).replace(/\s+/g, '_');
        if (baseline[webKey] && !this.usedBaselineKeys.has(webKey)) {
          this.usedBaselineKeys.add(webKey);
          if (debug) {
            console.log('🔎 BASELINE MATCH DEBUG (predictor):', {
              player: { id: player.id, web_name: player.web_name, first_name: player.first_name, second_name: player.second_name },
              reason: 'web_name_underscore_exact',
              matchedKey: webKey,
              length: baseline[webKey]?.season_history?.length || 0
            });
          }
          return baseline[webKey];
        }

        // PRIORITY 3: Normalized exact equality against any key
        const webNorm = normalize(webKey);
        const normKey = allKeys.find(k => normalize(k) === webNorm && !this.usedBaselineKeys.has(k));
        if (normKey) {
          this.usedBaselineKeys.add(normKey);
          if (debug) {
            console.log('🔎 BASELINE MATCH DEBUG (predictor):', {
              player: { id: player.id, web_name: player.web_name, first_name: player.first_name, second_name: player.second_name },
              reason: 'web_name_normalized_exact',
              matchedKey: normKey,
              length: baseline[normKey]?.season_history?.length || 0
            });
          }
          return baseline[normKey];
        }
      }

      // PRIORITY 4: Normalized exact equality for nameKey
      const nameNorm = normalize(nameKey);
      const normNameKey = allKeys.find(k => normalize(k) === nameNorm && !this.usedBaselineKeys.has(k));
      if (normNameKey) {
        this.usedBaselineKeys.add(normNameKey);
        if (debug) {
          console.log('🔎 BASELINE MATCH DEBUG (predictor):', {
            player: { id: player.id, web_name: player.web_name, first_name: player.first_name, second_name: player.second_name },
            reason: 'name_normalized_exact',
            matchedKey: normNameKey,
            length: baseline[normNameKey]?.season_history?.length || 0
          });
        }
        return baseline[normNameKey];
      }

      // PRIORITY 5: NEW - Try partial matches for truncated names
      // This handles cases like "Garnacho Ferreyra" -> "Garnacho" or "Hernandez Cascante" -> "Hernandez"
      if (secondName) {
        const secondNameParts = secondName.split(' ');
        for (let i = 1; i <= secondNameParts.length; i++) {
          const truncatedSecondName = secondNameParts.slice(0, i).join(' ');
          const truncatedKey1 = `${firstName}_${truncatedSecondName}`;
          const truncatedKey2 = `${truncatedSecondName}_${firstName}`;
          
          const partialKey1 = baseline[truncatedKey1] && !this.usedBaselineKeys.has(truncatedKey1) ? truncatedKey1 : null;
          const partialKey2 = baseline[truncatedKey2] && !this.usedBaselineKeys.has(truncatedKey2) ? truncatedKey2 : null;
          const partialMatch = partialKey1 ? baseline[partialKey1] : (partialKey2 ? baseline[partialKey2] : null);
          if (partialMatch) {
            const matchedKey = partialKey1 || partialKey2;
            this.usedBaselineKeys.add(matchedKey!);
            if (debug) {
              console.log('🔎 BASELINE MATCH DEBUG (predictor):', {
                player: { id: player.id, web_name: player.web_name, first_name: player.first_name, second_name: player.second_name },
                reason: 'partial_name_match',
                matchedKey,
                length: partialMatch?.season_history?.length || 0
              });
            }
            return partialMatch;
          }
        }
      }

      // PRIORITY 6: NEW - Try reverse partial matches (baseline longer than FPL API)
      // This handles cases like "Matheus_Nunes" -> "Matheus Luiz_Nunes"
      const fplKey = `${firstName}_${secondName}`;
      const reverseMatch = allKeys.find(k => {
        if (this.usedBaselineKeys.has(k)) return false;
        // Check if baseline key contains FPL key with additional parts
        // Cases: "Matheus_Nunes" matches "Matheus Luiz_Nunes" or "Matheus_Something_Nunes"
        const parts = k.split('_');
        if (parts.length >= 2) {
          const firstPart = parts[0];
          const lastPart = parts[parts.length - 1];
          // Check if first part starts with firstName and last part contains secondName
          return firstPart.startsWith(firstName) && lastPart.includes(secondName);
        }
        return false;
      });
      if (reverseMatch) {
        this.usedBaselineKeys.add(reverseMatch);
        if (debug) {
          console.log('🔎 BASELINE MATCH DEBUG (predictor):', {
            player: { id: player.id, web_name: player.web_name, first_name: player.first_name, second_name: player.second_name },
            reason: 'reverse_partial_match',
            matchedKey: reverseMatch,
            length: baseline[reverseMatch]?.season_history?.length || 0
          });
        }
        return baseline[reverseMatch];
      }

      // PRIORITY 7: NEW - Try forward partial matches (FPL API longer than baseline)
      // This handles cases like "Rúben_dos Santos Gato Alves Dias" -> "Rúben_Gato Alves Dias"
      const forwardMatch = allKeys.find(k => {
        if (this.usedBaselineKeys.has(k)) return false;
        // Check if FPL key contains baseline key with additional parts
        // Cases: "Rúben_dos Santos Gato Alves Dias" matches "Rúben_Gato Alves Dias"
        const parts = k.split('_');
        if (parts.length >= 2) {
          const firstPart = parts[0];
          const lastPart = parts[parts.length - 1];
          // Check if FPL first part starts with baseline first part and FPL last part ends with baseline last part
          return firstName.startsWith(firstPart) && secondName.endsWith(lastPart);
        }
        return false;
      });
      if (forwardMatch) {
        this.usedBaselineKeys.add(forwardMatch);
        if (debug) {
          console.log('🔎 BASELINE MATCH DEBUG (predictor):', {
            player: { id: player.id, web_name: player.web_name, first_name: player.first_name, second_name: player.second_name },
            reason: 'forward_partial_match',
            matchedKey: forwardMatch,
            length: baseline[forwardMatch]?.season_history?.length || 0
          });
        }
        return baseline[forwardMatch];
      }
    }

    // PRIORITY 8: Fallbacks based on provided playerName only (strict)
    if (baseline[playerName]) {
      if (debug) {
        console.log('🔎 BASELINE MATCH DEBUG (predictor):', {
          player: { id: player?.id, web_name: player?.web_name },
          reason: 'playerName_exact_key',
          matchedKey: playerName,
          length: baseline[playerName]?.season_history?.length || 0
        });
      }
      return baseline[playerName];
    }
    const underscoreName = playerName.replace(/\s+/g, '_');
    if (baseline[underscoreName]) {
      if (debug) {
        console.log('🔎 BASELINE MATCH DEBUG (predictor):', {
          player: { id: player?.id, web_name: player?.web_name },
          reason: 'playerName_underscore_exact',
          matchedKey: underscoreName,
          length: baseline[underscoreName]?.season_history?.length || 0
        });
      }
      return baseline[underscoreName];
    }
    const underscoreNorm = normalize(underscoreName);
    const normOnly = allKeys.find(k => normalize(k) === underscoreNorm);
    if (normOnly) {
      if (debug) {
        console.log('🔎 BASELINE MATCH DEBUG (predictor):', {
          player: { id: player?.id, web_name: player?.web_name },
          reason: 'playerName_normalized_exact',
          matchedKey: normOnly,
          length: baseline[normOnly]?.season_history?.length || 0
        });
      }
      return baseline[normOnly];
    }

    // Not found
    if (debug) {
      console.log('🔎 BASELINE MATCH DEBUG (predictor):', {
        player: { id: player?.id, web_name: player?.web_name, first_name: player?.first_name, second_name: player?.second_name },
        reason: 'no_match',
        tried: {
          nameKey: player ? `${player.first_name || ''}_${player.second_name || ''}` : '(none)',
          reversedNameKey: player ? `${player.second_name || ''}_${player.first_name || ''}` : '(none)',
          underscoreName
        }
      });
    }
    return null;
  }

  private getNewPlayerDefaults(): RollingFeatures {
    // Generate conservative defaults for new players (reduced from previous values)
    const basePoints = 1.5 + (Math.random() * 1.5 - 0.75); // 0.75 to 2.25 (was 1.5 to 3.5)
    const baseMinutes = 35 + (Math.random() * 15 - 7.5); // 27.5 to 42.5 (was 35 to 55)
    const baseConsistency = 0.3 + (Math.random() * 0.2); // 0.3 to 0.5 (was 0.4 to 0.6)
    const baseStarts = 0.4 + (Math.random() * 0.2); // 0.4 to 0.6 (was 0.5 to 0.7)
    
    return {
      roll3_points: basePoints,
      roll5_points: basePoints,
      roll8_points: basePoints,
      roll15_points: basePoints,
      roll3_minutes: baseMinutes,
      roll5_minutes: baseMinutes,
      roll8_minutes: baseMinutes,
      roll5_consistency: baseConsistency,
      roll5_starts: baseStarts,
      form_trend: 0,
      avg_ict: 20 + (Math.random() * 10 - 5), // 15 to 25
      avg_bps: 15 + (Math.random() * 10 - 5), // 10 to 20
      avg_expected_gi: 0.3 + (Math.random() * 0.4 - 0.2), // 0.1 to 0.5
      data_quality: 'new_player',
      history_games: 0
    };
  }

  private createSyntheticBaseline(player: any): RollingFeatures {
    // Create synthetic baseline based on player position and team
    const position = player.element_type;
    const team = player.team;
    
    // Base values by position
    let basePoints, baseMinutes, baseConsistency, baseStarts, baseIct, baseBps, baseExpectedGi;
    
    switch (position) {
      case 1: // Goalkeeper - MUCH MORE CONSERVATIVE
        basePoints = 1.5 + (Math.random() * 1 - 0.5); // 1.0 to 2.0 (was 2.25 to 3.75)
        baseMinutes = 60 + (Math.random() * 20 - 10); // 50 to 70 (was 70 to 90)
        baseConsistency = 0.4 + (Math.random() * 0.2); // 0.4 to 0.6 (was 0.6 to 0.8)
        baseStarts = 0.6 + (Math.random() * 0.2); // 0.6 to 0.8 (was 0.8 to 1.0)
        baseIct = 10 + (Math.random() * 8 - 4); // 6 to 14 (was 10 to 20)
        baseBps = 15 + (Math.random() * 8 - 4); // 11 to 19 (was 20 to 30)
        baseExpectedGi = 0.05 + (Math.random() * 0.1 - 0.05); // 0.0 to 0.1 (was 0.0 to 0.2)
        break;
      case 2: // Defender - MUCH MORE CONSERVATIVE
        basePoints = 1.8 + (Math.random() * 1.2 - 0.6); // 1.2 to 2.4 (was 2.5 to 4.5)
        baseMinutes = 60 + (Math.random() * 20 - 10); // 50 to 70 (was 65 to 85)
        baseConsistency = 0.3 + (Math.random() * 0.2); // 0.3 to 0.5 (was 0.5 to 0.7)
        baseStarts = 0.5 + (Math.random() * 0.2); // 0.5 to 0.7 (was 0.7 to 0.9)
        baseIct = 15 + (Math.random() * 10 - 5); // 10 to 20 (was 17.5 to 32.5)
        baseBps = 12 + (Math.random() * 8 - 4); // 8 to 16 (was 15 to 25)
        baseExpectedGi = 0.1 + (Math.random() * 0.15 - 0.075); // 0.025 to 0.175 (was 0.05 to 0.35)
        break;
      case 3: // Midfielder - MUCH MORE CONSERVATIVE
        basePoints = 2.0 + (Math.random() * 1.5 - 0.75); // 1.25 to 2.75 (was 2.75 to 5.25)
        baseMinutes = 55 + (Math.random() * 20 - 10); // 45 to 65 (was 57.5 to 82.5)
        baseConsistency = 0.3 + (Math.random() * 0.2); // 0.3 to 0.5 (was 0.4 to 0.7)
        baseStarts = 0.4 + (Math.random() * 0.2); // 0.4 to 0.6 (was 0.6 to 0.9)
        baseIct = 20 + (Math.random() * 12 - 6); // 14 to 26 (was 25 to 45)
        baseBps = 10 + (Math.random() * 8 - 4); // 6 to 14 (was 12 to 24)
        baseExpectedGi = 0.2 + (Math.random() * 0.2 - 0.1); // 0.1 to 0.3 (was 0.2 to 0.6)
        break;
      case 4: // Forward - MUCH MORE CONSERVATIVE
        basePoints = 2.2 + (Math.random() * 1.6 - 0.8); // 1.4 to 3.0 (was 3.0 to 6.0)
        baseMinutes = 50 + (Math.random() * 20 - 10); // 40 to 60 (was 52.5 to 77.5)
        baseConsistency = 0.2 + (Math.random() * 0.2); // 0.2 to 0.4 (was 0.3 to 0.6)
        baseStarts = 0.3 + (Math.random() * 0.2); // 0.3 to 0.5 (was 0.5 to 0.8)
        baseIct = 25 + (Math.random() * 15 - 7.5); // 17.5 to 32.5 (was 27.5 to 52.5)
        baseBps = 8 + (Math.random() * 8 - 4); // 4 to 12 (was 7.5 to 22.5)
        baseExpectedGi = 0.3 + (Math.random() * 0.3 - 0.15); // 0.15 to 0.45 (was 0.35 to 0.85)
        break;
      default:
        basePoints = 3.5 + (Math.random() * 2 - 1);
        baseMinutes = 70 + (Math.random() * 20 - 10);
        baseConsistency = 0.5 + (Math.random() * 0.2);
        baseStarts = 0.6 + (Math.random() * 0.2);
        baseIct = 25 + (Math.random() * 15 - 7.5);
        baseBps = 18 + (Math.random() * 10 - 5);
        baseExpectedGi = 0.3 + (Math.random() * 0.4 - 0.2);
    }
    
    // Add some team-based variation (top teams get slight boost)
    const teamBoost = team <= 6 ? 1.1 : team <= 12 ? 1.0 : 0.9; // Top 6 teams get 10% boost, bottom 8 get 10% reduction
    
    return {
      roll3_points: basePoints * teamBoost,
      roll5_points: basePoints * teamBoost,
      roll8_points: basePoints * teamBoost,
      roll15_points: basePoints * teamBoost,
      roll3_minutes: baseMinutes,
      roll5_minutes: baseMinutes,
      roll8_minutes: baseMinutes,
      roll5_consistency: baseConsistency,
      roll5_starts: baseStarts,
      form_trend: (Math.random() * 2 - 1) * 0.5, // Small random trend
      avg_ict: baseIct * teamBoost,
      avg_bps: baseBps,
      avg_expected_gi: baseExpectedGi * teamBoost,
      data_quality: 'new_player',
      history_games: 0
    };
  }

  private async predict(features: RollingFeatures, context: any): Promise<number> {
    await this.loadModel();
    const weights = this.model.weights;

    // 1. Base prediction from rolling form features
    let prediction = 
      features.roll3_points * weights.form_weights.roll3 +
      features.roll5_points * weights.form_weights.roll5 +
      features.roll8_points * weights.form_weights.roll8 +
      features.roll15_points * weights.form_weights.roll15;


    
    // 2. Minutes reliability adjustment
    const minutesReliability = Math.min(features.roll5_minutes / 90.0, 1.2);
    prediction *= minutesReliability * weights.context_weights.minutes_factor;

    // 3. Consistency bonus (consistent players get boost)
    const consistencyFactor = weights.context_weights.consistency_factor * features.roll5_consistency;
    prediction *= (0.8 + 0.4 * consistencyFactor);

    // 4. Starts reliability (regular starters get boost)
    const startsFactor = weights.context_weights.starts_factor * features.roll5_starts;
    prediction *= (0.7 + 0.3 * startsFactor);

    // 5. Advanced statistics boosts
    const bpsBoost = features.avg_bps * weights.feature_scaling.bps_scale;
    prediction += bpsBoost;

    const ictBoost = features.avg_ict * weights.feature_scaling.ict_scale;
    prediction += ictBoost;

    const expectedBoost = features.avg_expected_gi * weights.feature_scaling.expected_gi_scale;
    prediction += expectedBoost;

    // 6. CRITICAL: Apply 2025-26 rule adjustments (was missing!)
    prediction = this.apply2025_26Rules(context.player, prediction);
    
    // 7. Position multiplier (updated for 2025-26)
    prediction *= this.getPositionMultiplier2025_26(context.player.element_type);
    
    // 8. Home/away advantage
    if (context.is_home) {
      prediction *= weights.context_weights.home_advantage;
    } else {
      prediction *= 0.94; // Away penalty
    }
    
    // 9. CRITICAL: Apply FDR multiplier (was missing!)
    if (context.fixture) {
      const fdrMultiplier = this.getFixtureDifficultyMultiplier(context.fixture, context.is_home);
      prediction *= fdrMultiplier;
      
      // Debug logging for fixture difficulty (sample players only)
      if (context.player.web_name && (context.player.web_name.includes('Salah') || context.player.web_name.includes('Haaland'))) {
        console.log(`🔍 FIXTURE DIFFICULTY DEBUG (${context.player.web_name}):`, {
          fixture: context.fixture,
          is_home: context.is_home,
          difficulty: context.fixture.difficulty,
          team_h_difficulty: context.fixture.team_h_difficulty,
          team_a_difficulty: context.fixture.team_a_difficulty,
          fdrMultiplier: fdrMultiplier,
          beforeFDR: prediction / fdrMultiplier,
          afterFDR: prediction
        });
      }
    }
    
    // 10. CRITICAL: Apply new player penalties (was missing!)
    const classification = this.classifyPlayer(context.player, context.elementSummary || {}, context.baselineData);
    
    // Debug logging for new players penalty application
    if (context.player.web_name && (context.player.web_name.includes('Ekit') || classification.isNewToPL)) {
      console.log(`🔍 NEW PLAYER PENALTY APPLICATION (${context.player.web_name}):`, {
        web_name: context.player.web_name,
        isNewToPL: classification.isNewToPL,
        isFromPromotedClub: classification.isFromPromotedClub,
        isYoungPlayer: classification.isYoungPlayer,
        hasInsufficientData: classification.hasInsufficientData,
        beforePenalty: prediction,
        penaltyMultiplier: classification.penaltyMultiplier,
        afterPenalty: prediction * classification.penaltyMultiplier
      });
    }
    
    prediction *= classification.penaltyMultiplier;
    

    
    // 11. CRITICAL: Apply conservative caps (was missing!)
    const originalPrediction = prediction;
    prediction = this.applyConservativeCaps(prediction, context.player, classification, context.gameweek || 2);
    

    
    // 12. Availability scaling
    if (context.player.chance_of_playing_next_round !== null && 
        context.player.chance_of_playing_next_next_round !== undefined) {
      const availabilityFactor = this.getAvailabilityMultiplier(context.player.chance_of_playing_next_round);
      prediction *= availabilityFactor;
    }
    
    // 13. Final bounds with more conservative minimum for new players
    const minPrediction = classification.penaltyMultiplier < 0.8 ? 0.5 : 1.0;
    const finalPrediction = Math.max(minPrediction, Math.min(15.0, prediction));
    

    
    return finalPrediction;
  }



  private getOpponentName(fixture: any, teams: any[]): string {
    const opponentTeamId = fixture.is_home ? fixture.team_a : fixture.team_h;
    const opponent = teams.find(t => t.id === opponentTeamId);
    return opponent ? opponent.short_name : 'TBD';
  }

  private shouldPlayerPlay(player: any, elementSummary: any): boolean {
    
    // Check if player is injured or not expected to play
    if (player.chance_of_playing_next_round !== null && player.chance_of_playing_next_round !== undefined) {
      if (player.chance_of_playing_next_round < 25) {
        return false;
      }
    }
    
    // Check if player has recent minutes - but be more lenient for new players
    if (elementSummary.history && elementSummary.history.length > 0) {
      const recentGames = elementSummary.history.slice(-3);
      const avgMinutes = recentGames.reduce((sum: number, game: any) => sum + (game.minutes || 0), 0) / recentGames.length;
      
      if (avgMinutes < 15) {
        // Don't filter out - just warn
      }
    } else {
      // Don't filter out - we can use baseline data
    }
    
    // Check if player is suspended or has other issues
    if (player.status === 'u' || player.status === 's') {
      return false;
    }
    
    return true;
  }

  async predictPlayer(
    player: any,
    elementSummary: any,
    teams: any[]
  ): Promise<PlayerPrediction> {
    await this.initialize();
    
    // Removed verbose player processing logs

    try {
      // Quiet: removed Salah debug logs

      // Check if player should play
      if (!this.shouldPlayerPlay(player, elementSummary)) {
        return {
          player_id: player.id,
          name: player.web_name,
          team: teams.find(t => t.id === player.team)?.short_name || 'TBD',
          position: (['', 'GK', 'DEF', 'MID', 'FWD'][player.element_type] as any),
          price: (player.now_cost || 0) / 10,
          gwp1_xp: 0,
          gwp2_xp: 0,
          gwp3_xp: 0,
          gwp4_xp: 0,
          gwp5_xp: 0,
          gwp6_xp: 0,
          gwp7_xp: 0,
          gwp8_xp: 0,
          total_3gw_xp: 0,
          total_8gw_xp: 0,
          fixtures: []
        };
      }

      const baselineData = this.findPlayerBaseline('', player);
      
      // Quiet: removed Salah baseline logs

    const features = this.calculateRollingFeatures(
      player.web_name,
        baselineData?.season_history || [],
      elementSummary.history || []
    );

      // Quiet: removed Salah features logs
      
      // Get player classification for detailed XP breakdown
      const classification = this.classifyPlayer(player, elementSummary, baselineData);
      const has2024_25Data = !!baselineData;
      const baselineHistoryLength = baselineData?.season_history?.length || 0;
      const currentHistoryLength = elementSummary.history?.length || 0;
      const effectiveHistoryLength = baselineHistoryLength + currentHistoryLength;
      const hasInsufficientData = effectiveHistoryLength < 5;
      
      // Quiet: removed Salah classification logs
      


      // Use up to 8 future fixtures for strategic planning; if missing, synthesize neutral fixtures
      let upcomingFixtures = (elementSummary.fixtures || []).slice(0, 8);
      
      // Debug fixture ordering for sample players
      if (player.web_name && (player.web_name.includes('Salah') || player.web_name.includes('Haaland'))) {
        console.log(`🔍 FIXTURE ORDERING DEBUG (${player.web_name}):`, {
          originalFixtures: elementSummary.fixtures?.slice(0, 5).map(f => ({
            event: f.event,
            is_home: f.is_home,
            difficulty: f.difficulty,
            team_h_difficulty: f.team_h_difficulty,
            team_a_difficulty: f.team_a_difficulty
          })),
          upcomingFixtures: upcomingFixtures.slice(0, 5).map(f => ({
            event: f.event,
            is_home: f.is_home,
            difficulty: f.difficulty,
            team_h_difficulty: f.team_h_difficulty,
            team_a_difficulty: f.team_a_difficulty
          }))
        });
      }
    if (!upcomingFixtures || upcomingFixtures.length === 0) {
        // Synthesize 8 neutral fixtures with average difficulty
      upcomingFixtures = [
          { event: 2, is_home: true, team_a: player.team, team_h: player.team, difficulty: 3, team_h_difficulty: 3, team_a_difficulty: 3 },
          { event: 3, is_home: false, team_a: player.team, team_h: player.team, difficulty: 3, team_h_difficulty: 3, team_a_difficulty: 3 },
          { event: 4, is_home: true, team_a: player.team, team_h: player.team, difficulty: 3, team_h_difficulty: 3, team_a_difficulty: 3 },
          { event: 5, is_home: false, team_a: player.team, team_h: player.team, difficulty: 3, team_h_difficulty: 3, team_a_difficulty: 3 },
          { event: 6, is_home: true, team_a: player.team, team_h: player.team, difficulty: 3, team_h_difficulty: 3, team_a_difficulty: 3 },
          { event: 7, is_home: false, team_a: player.team, team_h: player.team, difficulty: 3, team_h_difficulty: 3, team_a_difficulty: 3 },
          { event: 8, is_home: true, team_a: player.team, team_h: player.team, difficulty: 3, team_h_difficulty: 3, team_a_difficulty: 3 },
          { event: 9, is_home: false, team_a: player.team, team_h: player.team, difficulty: 3, team_h_difficulty: 3, team_a_difficulty: 3 },
        ];
      } else if (upcomingFixtures.length < 8) {
      const lastEvent = upcomingFixtures[upcomingFixtures.length - 1].event || 1;
        while (upcomingFixtures.length < 8) {
        upcomingFixtures.push({
          event: lastEvent + (upcomingFixtures.length),
          is_home: upcomingFixtures.length % 2 === 0,
          team_a: player.team,
          team_h: player.team,
          difficulty: 3,
            team_h_difficulty: 3,
            team_a_difficulty: 3,
        });
      }
    }

    const predictions: any[] = [];

      let gwp1_xp = 0, gwp2_xp = 0, gwp3_xp = 0, gwp4_xp = 0, gwp5_xp = 0, gwp6_xp = 0, gwp7_xp = 0, gwp8_xp = 0;

      for (let i = 0; i < upcomingFixtures.length && i < 8; i++) {
      const fixture = upcomingFixtures[i];

      const context = {
          player: player,
          elementSummary: elementSummary,
        element_type: player.element_type,
        is_home: !!fixture.is_home,
          fixture: fixture, // Add fixture data for FDR calculation
          chance_of_playing_next_round: player.chance_of_playing_next_round ?? 100,
          gameweek: fixture.event || (2 + i) // Add gameweek for conservative caps
      };

      const expectedPoints = await this.predict(features, context);
        

        
      const roundedPoints = Math.round(expectedPoints * 10) / 10;

        // Final safety check - ensure we have valid points
        const finalPoints = isNaN(roundedPoints) || !isFinite(roundedPoints) ? 0 : Math.max(0, roundedPoints);

      const fixtureData = {
        gameweek: fixture.event ?? (2 + i),
        opponent: this.getOpponentName(fixture, teams),
        home_away: fixture.is_home ? 'H' as const : 'A' as const,
        difficulty: fixture.difficulty ?? 3,
          expected_points: finalPoints,
          // Add the fields that the XP tab expects
          is_home: fixture.is_home,
          team_h: fixture.team_h,
          team_a: fixture.team_a,
          team_h_difficulty: fixture.team_h_difficulty ?? fixture.difficulty ?? 3,
          team_a_difficulty: fixture.team_a_difficulty ?? fixture.difficulty ?? 3
      };

      predictions.push(fixtureData);

        // Assign to specific gameweek variables (GWP1 = next gameweek, GWP2 = next+1, etc.)
        switch (i) {
          case 0: gwp1_xp = finalPoints; break;
          case 1: gwp2_xp = finalPoints; break;
          case 2: gwp3_xp = finalPoints; break;
          case 3: gwp4_xp = finalPoints; break;
          case 4: gwp5_xp = finalPoints; break;
          case 5: gwp6_xp = finalPoints; break;
          case 6: gwp7_xp = finalPoints; break;
          case 7: gwp8_xp = finalPoints; break;
        }
      }

      const total_3gw_xp = Math.round((gwp1_xp + gwp2_xp + gwp3_xp) * 10) / 10;
      const total_8gw_xp = Math.round((gwp1_xp + gwp2_xp + gwp3_xp + gwp4_xp + gwp5_xp + gwp6_xp + gwp7_xp + gwp8_xp) * 10) / 10;

      // Quiet: removed Salah final XP logs

      // Final validation of all values
      const result = {
        player_id: player.id,
        name: player.web_name,
        team: teams.find(t => t.id === player.team)?.short_name || 'TBD',
        position: (['', 'GK', 'DEF', 'MID', 'FWD'][player.element_type] as any),
        price: (player.now_cost || 0) / 10,
        gwp1_xp: isNaN(gwp1_xp) ? 0 : gwp1_xp,
        gwp2_xp: isNaN(gwp2_xp) ? 0 : gwp2_xp,
        gwp3_xp: isNaN(gwp3_xp) ? 0 : gwp3_xp,
        gwp4_xp: isNaN(gwp4_xp) ? 0 : gwp4_xp,
        gwp5_xp: isNaN(gwp5_xp) ? 0 : gwp5_xp,
        gwp6_xp: isNaN(gwp6_xp) ? 0 : gwp6_xp,
        gwp7_xp: isNaN(gwp7_xp) ? 0 : gwp7_xp,
        gwp8_xp: isNaN(gwp8_xp) ? 0 : gwp8_xp,
        total_3gw_xp: isNaN(total_3gw_xp) ? 0 : total_3gw_xp,
        total_8gw_xp: isNaN(total_8gw_xp) ? 0 : total_8gw_xp,
        fixtures: predictions,
        teams: teams, // Add teams array for XP tab fixture display
        // Classification and data quality details for XP tab
        dataQuality: classification.dataQuality,
        isNewToPL: classification.isNewToPL,
        isYoungPlayer: classification.isYoungPlayer,
        isFromPromotedClub: classification.isFromPromotedClub,
        penaltyMultiplier: classification.penaltyMultiplier,
        hasInsufficientData: hasInsufficientData,
        has2024_25Data: has2024_25Data,
        baselineHistoryLength: baselineHistoryLength,
        currentHistoryLength: currentHistoryLength,
        effectiveHistoryLength: effectiveHistoryLength,
        baselineDataSample: baselineData?.season_history?.slice(0, 3) || []
      };



      return result;
    } catch (error) {
      console.error('🚨 Error predicting player:', player.web_name, error);
      
      // Return safe fallback prediction
    return {
      player_id: player.id,
      name: player.web_name,
      team: teams.find(t => t.id === player.team)?.short_name || 'TBD',
      position: (['', 'GK', 'DEF', 'MID', 'FWD'][player.element_type] as any),
      price: (player.now_cost || 0) / 10,
        gwp1_xp: 0,
        gwp2_xp: 0,
        gwp3_xp: 0,
        gwp4_xp: 0,
        gwp5_xp: 0,
        gwp6_xp: 0,
        gwp7_xp: 0,
        gwp8_xp: 0,
        total_3gw_xp: 0,
        total_8gw_xp: 0,
        fixtures: [],
        teams: [], // Add empty teams array for fallback
        // Classification and data quality details for XP tab
        dataQuality: 'error',
        isNewToPL: false,
        isYoungPlayer: false,
        isFromPromotedClub: false,
        penaltyMultiplier: 1.0,
        hasInsufficientData: true,
        has2024_25Data: false,
        baselineHistoryLength: 0,
        currentHistoryLength: 0,
        effectiveHistoryLength: 0,
        baselineDataSample: []
      };
    }
  }

  async predictAllPlayers(fplApiService: any, onProgress?: (current: number, total: number) => void): Promise<PlayerPrediction[]> {
    // Prevent multiple simultaneous predictions
    if (this.isPredicting) {
      if (this.verboseLogs) console.log(`🔄 Prediction already in progress, returning existing promise`);
      return this.predictionPromise!;
    }

    // Ensure we're initialized
    if (!this.isInitialized()) {
      throw new Error('FPLPredictor not initialized. Call initialize() first.');
    }

    this.isPredicting = true;
    // Reset used baseline keys for one-to-one matching
    this.usedBaselineKeys.clear();
    // Clear baseline keys cache to ensure fresh data
    this.baselineKeysCache = null;
    // Reset processed players counter
    this.processedPlayersCount = 0;
    this.predictionPromise = this._predictAllPlayers(fplApiService, onProgress);
    
    try {
      const result = await this.predictionPromise;
      return result;
    } catch (error) {
      console.error(`🚨 Prediction error:`, error);
      throw error;
    } finally {
      this.isPredicting = false;
      this.predictionPromise = null;
    }
  }

  private async _predictAllPlayers(fplApiService: any, onProgress?: (current: number, total: number) => void): Promise<PlayerPrediction[]> {
    const bootstrap = await fplApiService.fetchBootstrapData();
    const allPlayers = bootstrap.elements;
    const teams = bootstrap.teams;
    
    if (this.verboseLogs) console.log(`🔄 Starting predictions for ${allPlayers.length} players (batched processing)`);

    const results: PlayerPrediction[] = [];
    const batchSize = 100; // Increased batch size for better performance
    let successCount = 0;
    let errorCount = 0;

    // Process players in batches for better performance while maintaining control
    for (let i = 0; i < allPlayers.length; i += batchSize) {
      // Check if predictions were cancelled
      if (!this.isPredicting) {
        console.log(`🛑 Predictions cancelled at batch ${Math.floor(i / batchSize) + 1}`);
        break;
      }

      const batch = allPlayers.slice(i, i + batchSize);
      if (this.verboseLogs) console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allPlayers.length / batchSize)} (${batch.length} players)`);
      
      // Log first few players in batch for debugging
      if (this.verboseLogs) {
        const samplePlayers = batch.slice(0, 5).map((p: any) => p.web_name);

      }
      
      // Quiet: removed batch Salah logs
      
      // Process batch with Promise.all but with controlled concurrency
      const batchPromises = batch.map(async (player: any) => {
        try {
        // Quiet: removed Salah start prediction log
          
          const elementSummary = await fplApiService.getElementSummary(player.id);
          const prediction = await this.predictPlayer(player, elementSummary, teams);
          
          if (prediction && 
              !isNaN(prediction.gwp1_xp) && !isNaN(prediction.gwp2_xp) && !isNaN(prediction.gwp3_xp) &&
              !isNaN(prediction.gwp4_xp) && !isNaN(prediction.gwp5_xp) && !isNaN(prediction.gwp6_xp) &&
              !isNaN(prediction.gwp7_xp) && !isNaN(prediction.gwp8_xp) &&
              !isNaN(prediction.total_8gw_xp)) {
            return prediction;
          } else {
            console.warn(`⚠️ Invalid prediction for player ${player.web_name}:`, prediction);
            return null;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to predict player ${player.id} (${player.web_name}):`, error instanceof Error ? error.message : String(error));
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(Boolean) as PlayerPrediction[];
      results.push(...validResults);
      
      successCount += validResults.length;
      errorCount += batchResults.length - validResults.length;

      // Update progress after each batch
      if (onProgress) {
        const currentProgress = Math.min(i + batchSize, allPlayers.length);
        onProgress(currentProgress, allPlayers.length);
      }

      // Delay between batches to be respectful to the API
      if (i + batchSize < allPlayers.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    if (this.verboseLogs) {
      if (this.isPredicting) {
        console.log(`✅ Predictions completed: ${successCount} successful, ${errorCount} errors`);
      } else {
        console.log(`🛑 Predictions cancelled: ${successCount} successful, ${errorCount} errors before cancellation`);
      }
    }
    
    return results;
  }

  // NEW: Player Classification System for 2025-26
  public classifyPlayer(player: any, elementSummary: any, baselineData?: any): PlayerClassification {
    const historyLength = elementSummary.history?.length || 0;
    
    // 2025-26 promoted teams (adjust team IDs as needed)
    const promotedTeamIds = [3, 11, 17]; // Burnley, Leeds, Sunderland
    
    // Check if player has no 2024-25 baseline data (new to PL)
    const has2024_25Data = baselineData;
    
    // Use baseline data history length if available, otherwise use FPL API history
    const baselineHistoryLength = has2024_25Data?.season_history?.length || 0;
    const effectiveHistoryLength = Math.max(historyLength, baselineHistoryLength);
    
    // Player is new to PL if they have 0 baseline gameweeks
    const isNewToPL = baselineHistoryLength === 0;
    
    // Debug logging for Ekitike only
    if (player.web_name && player.web_name.includes('Ekit')) {
      console.log(`🔍 EKITIKE CLASSIFICATION DEBUG:`, {
        web_name: player.web_name,
        has2024_25Data: !!has2024_25Data,
        baselineHistoryLength,
        isNewToPL,
        penaltyMultiplier: isNewToPL ? 0.65 : 1.0
      });
    }
    
    const isFromPromotedClub = promotedTeamIds.includes(player.team);
    
    const isYoungPlayer = effectiveHistoryLength < 15 && player.now_cost <= 60; // Under £6m with limited data
    
    // Don't classify new players as having insufficient data - they get the new player penalty instead
    const hasInsufficientData = effectiveHistoryLength < 10 && !has2024_25Data && !isNewToPL;
    
    // Calculate combined penalty multiplier
    let penaltyMultiplier = 1.0;
    let dataQuality: 'excellent' | 'good' | 'limited' | 'minimal' | 'new_player' = 'good';
    
    if (isNewToPL) {
      penaltyMultiplier *= 0.65; // 35% reduction for Premier League newcomers
      dataQuality = 'new_player';
    }
    
    if (isFromPromotedClub && !isNewToPL) {
      penaltyMultiplier *= 0.70; // 30% reduction for promoted club players
      dataQuality = 'limited';
    }
    
    if (isYoungPlayer && !isNewToPL && !isFromPromotedClub) {
      penaltyMultiplier *= 0.75; // 25% reduction for young/inexperienced players
    }
    
    if (hasInsufficientData && !isNewToPL && !isFromPromotedClub) {
      const dataReduction = effectiveHistoryLength < 3 ? 0.65 : effectiveHistoryLength < 6 ? 0.75 : 0.85;
      penaltyMultiplier *= dataReduction;
      dataQuality = effectiveHistoryLength < 3 ? 'minimal' : 'limited';
    }
    
    // Debug logging for Ekitike only (after penalty multiplier calculation)
    if (player.web_name && player.web_name.includes('Ekit')) {
      console.log(`🔍 EKITIKE FINAL CLASSIFICATION:`, {
        web_name: player.web_name,
        historyLength,
        has2024_25Data: !!has2024_25Data,
        baselineHistoryLength,
        effectiveHistoryLength,
        isNewToPL,
        hasInsufficientData,
        penaltyMultiplier,
        finalPenaltyMultiplier: penaltyMultiplier
      });
    }
    

    
    return {
      isNewToPL,
      isFromPromotedClub,
      isYoungPlayer,
      hasInsufficientData,
      penaltyMultiplier,
      dataQuality
    };
  }

  // NEW: 2025-26 Rule Adjustments
  private apply2025_26Rules(player: any, basePrediction: number): number {
    let adjustedPrediction = basePrediction;
    
    // 1. NEW: Defensive Contributions (REDUCED - major 2025-26 change)
    const defensiveContributionBoost = {
      1: 0.00, // GK - no defensive contributions
      2: 0.10, // DEF - +10% from 10+ clearances/blocks/interceptions/tackles (was 20%)
      3: 0.08, // MID - +8% from 12+ defensive actions including recoveries (was 15%)
      4: 0.04  // FWD - +4% from limited defensive actions (was 8%)
    };
    
    const positionBoost = defensiveContributionBoost[player.element_type as keyof typeof defensiveContributionBoost] || 0;
    adjustedPrediction *= (1 + positionBoost);
    
    // 2. NEW: More Liberal Assists (+2% boost across all positions - REDUCED)
    adjustedPrediction *= 1.02;
    
    // 3. NEW: BPS System Changes
    if (player.element_type === 1) {
      // Goalkeepers: Improved save BPS (3 pts inside box, 2 outside, 8 for penalties)
      adjustedPrediction *= 1.08;
    } else if (player.element_type === 2) {
      // Defenders: Goal-line clearances now 9 BPS (was 3)
      adjustedPrediction *= 1.03;
    } else if (basePrediction > 8.0) {
      // High scorers (penalty takers): Penalty goals normalized to 12 BPS for all positions
      adjustedPrediction *= 0.95;
    }
    
    return adjustedPrediction;
  }

  // NEW: Conservative Caps - REMOVED ALL HARD CAPS
  private applyConservativeCaps(prediction: number, player: any, classification: PlayerClassification, gameweek: number): number {
    let cappedPrediction = prediction;
    
    // Debug logging for new players
    if (classification.isNewToPL) {

    }
    
    // REMOVED ALL HARD CAPS - penalty multipliers are sufficient
    // New players: 35% penalty (0.65x)
    // Promoted club: 30% penalty (0.70x) 
    // Young players: 25% penalty (0.75x)
    // Insufficient data: various penalties (0.65x to 0.85x)
    
    // Additional caps for later gameweeks (predictions get less reliable)
    if (gameweek >= 6) {
      cappedPrediction *= 0.95; // Slight reduction for distant predictions
    }
    if (gameweek >= 8) {
      cappedPrediction *= 0.90; // Further reduction for very distant predictions
    }
    
    if (classification.isNewToPL) {

    }
    
    return cappedPrediction;
  }

  // NEW: Updated Position Multipliers for 2025-26 (REDUCED)
  private getPositionMultiplier2025_26(elementType: number): number {
    // More conservative multipliers to prevent inflated predictions
    const multipliers = {
      1: 1.05, // GK - slight boost (was 1.08)
      2: 1.15, // DEF - moderate boost (was 1.23)
      3: 1.12, // MID - moderate boost (was 1.20)
      4: 1.15  // FWD - moderate boost (was 1.23)
    };
    
    return multipliers[elementType as keyof typeof multipliers] || 1.0;
  }

  // NEW: Availability Multiplier
  private getAvailabilityMultiplier(chanceOfPlaying: number): number {
    if (chanceOfPlaying === null || chanceOfPlaying === undefined) return 1.0;
    if (chanceOfPlaying >= 100) return 1.0;
    if (chanceOfPlaying >= 75) return 0.9;
    if (chanceOfPlaying >= 50) return 0.7;
    if (chanceOfPlaying >= 25) return 0.5;
    return 0.3;
  }

  // NEW: Fixture Difficulty Multiplier for 2025-26
  private getFixtureDifficultyMultiplier(fixture: any, isHome: boolean): number {
    if (!fixture) return 1.0;
    
    // Get the correct difficulty for home/away team
    let difficulty: number;
    if (isHome) {
      difficulty = fixture.team_h_difficulty || fixture.difficulty_score || 3;
    } else {
      difficulty = fixture.team_a_difficulty || fixture.difficulty_score || 3;
    }
    
    // Validate difficulty value
    if (typeof difficulty !== 'number' || isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      console.warn('⚠️ Invalid fixture difficulty:', difficulty, 'for fixture:', fixture);
      difficulty = 3; // Default to medium
    }
    
    // 2025-26 FDR Multipliers (CORRECTED - FPL difficulty 1=hardest, 5=easiest)
    const difficultyMultipliers = {
      1: 0.70, // Very Hard (vs Man City) - significant reduction
      2: 0.85, // Hard - reduce expected points
      3: 1.00, // Medium - no change
      4: 1.15, // Easy - slight boost
      5: 1.25  // Very Easy (vs promoted team) - boost expected points
    };
    
    const multiplier = difficultyMultipliers[difficulty as keyof typeof difficultyMultipliers] || 1.0;
    

    
    return multiplier;
  }
}
