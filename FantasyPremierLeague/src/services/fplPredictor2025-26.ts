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

  constructor() {
    this.model = require('../models/fplModel2025-26.json');
    // Load baseline data directly from static file
    this.baselineData = baselineData2024_25 as Record<string, PlayerSeasonData>;
    
    // DEBUG: Check baseline data loading
    console.log(`🔍 BASELINE DATA LOADED: ${this.baselineData ? Object.keys(this.baselineData).length : 0} players`);
    if (this.baselineData) {
      const samplePlayers = Object.keys(this.baselineData).slice(0, 5);
      console.log(`🔍 SAMPLE BASELINE PLAYERS:`, samplePlayers);
      
      // Test specific players
      if (this.baselineData['Mohamed Salah']) {
        console.log(`✅ MOHAMED SALAH FOUND in baseline data`);
        console.log(`📊 Salah data:`, {
          name: this.baselineData['Mohamed Salah'].name,
          element_type: this.baselineData['Mohamed Salah'].element_type,
          team: this.baselineData['Mohamed Salah'].team,
          historyLength: this.baselineData['Mohamed Salah'].season_history?.length || 0
        });
      } else {
        console.log(`❌ MOHAMED SALAH NOT FOUND in baseline data`);
      }
      
      // Check for any Salah variants
      const salahVariants = Object.keys(this.baselineData).filter(name => 
        name.toLowerCase().includes('salah')
      );
      if (salahVariants.length > 0) {
        console.log(`🔍 SALAH VARIANTS FOUND:`, salahVariants);
      }
    }
  }

  async initialize(): Promise<void> {
    // No need to initialize - data is already loaded
  }

  isInitialized(): boolean {
    return this.baselineData !== null;
  }

  private calculateRollingFeatures(
    playerName: string,
    baselineHistory: any[],
    currentSeasonHistory: any[]
  ): RollingFeatures {
    // Combine baseline and current season history
    const combinedHistory = [...(baselineHistory || []), ...(currentSeasonHistory || [])];
    
    console.log(`🔍 COMBINED HISTORY DEBUG: ${playerName}`, {
      baselineHistoryLength: baselineHistory?.length || 0,
      currentSeasonLength: currentSeasonHistory?.length || 0,
      combinedLength: combinedHistory.length,
      baselineSample: baselineHistory?.slice(0, 2) || [],
      currentSample: currentSeasonHistory?.slice(0, 2) || []
    });

    if (combinedHistory.length === 0) {
      console.warn('⚠️ No historical data for player:', playerName);
      console.log(`🔍 DEBUG: Baseline history length: ${baselineHistory?.length || 0}, Current season length: ${currentSeasonHistory?.length || 0}`);
      return this.createSyntheticBaseline({ web_name: playerName });
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
    
    // DEBUG: Log rolling features calculation
    console.log(`🔄 ROLLING FEATURES DEBUG: ${playerName}`, {
      historyLength: combinedHistory.length,
      baselineHistoryLength: baselineHistory?.length || 0,
      currentSeasonLength: currentSeasonHistory?.length || 0,
      last3Points: last3.map(g => g.total_points),
      last5Points: last5.map(g => g.total_points),
      last8Points: last8.map(g => g.total_points),
      last15Points: last15.map(g => g.total_points),
      roll3_points: result.roll3_points,
      roll5_points: result.roll5_points,
      roll8_points: result.roll8_points,
      roll15_points: result.roll15_points,
      dataQuality: result.data_quality
    });

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

  private findPlayerBaseline(playerName: string): PlayerSeasonData | null {
    // DEBUG: Log the search attempt
    console.log(`🔍 SEARCHING BASELINE: Looking for "${playerName}"`);
    
    // Try exact match first
    if (this.baselineData?.[playerName]) {
      console.log(`✅ EXACT MATCH: Found "${playerName}" in baseline data`);
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
        console.log(`✅ NORMALIZED MATCH: Found "${name}" for "${playerName}"`);
        return data;
      }
    }

    // Try smart name matching for common FPL naming patterns
    const smartMatches = this.findSmartMatches(playerName);
    if (smartMatches.length > 0) {
      const bestMatch = smartMatches[0];
      console.log(`✅ SMART MATCH: Found "${bestMatch.name}" for "${playerName}" (score: ${bestMatch.score})`);
      return bestMatch.data;
    }

    // Try fuzzy matching for common name variations
    const fuzzyMatches = this.findFuzzyMatches(playerName);
    if (fuzzyMatches.length > 0) {
      const bestMatch = fuzzyMatches[0];
      console.log(`🔍 FUZZY MATCH: Found "${bestMatch.name}" for "${playerName}" (score: ${bestMatch.score})`);
      return bestMatch.data;
    }

    console.log(`❌ NO BASELINE FOUND: "${playerName}" not found in baseline data`);
    return null;
  }

  private findSmartMatches(playerName: string): Array<{name: string, data: PlayerSeasonData, score: number}> {
    if (!this.baselineData) return [];
    
    const playerNameLower = playerName.toLowerCase();
    const matches: Array<{name: string, data: PlayerSeasonData, score: number}> = [];
    
    // DEBUG: Log what we're searching for
    console.log(`🔍 SMART MATCHING: Looking for "${playerName}" (lowercase: "${playerNameLower}")`);
    
    // Test the specific case for Salah and M.Salah
    if (playerNameLower === 'salah' || playerNameLower === 'm.salah') {
      console.log(`🔍 SPECIAL CASE: Looking for "${playerName}" - testing all baseline names`);
      for (const [name, data] of Object.entries(this.baselineData)) {
        if (name.toLowerCase().includes('salah')) {
          console.log(`🔍 FOUND SALAH VARIANT: "${name}"`);
        }
      }
    }
    
    for (const [name, data] of Object.entries(this.baselineData)) {
      const baselineNameLower = name.toLowerCase();
      let score = 0;
      
      // Check if FPL name is contained in baseline name (e.g., "Salah" in "Mohamed Salah")
      if (baselineNameLower.includes(playerNameLower)) {
        score += 50;
        // Bonus for exact last name match
        if (baselineNameLower.endsWith(playerNameLower)) {
          score += 30;
        }
        console.log(`🔍 CONTAINS MATCH: "${name}" contains "${playerName}" (score: ${score})`);
      }
      
      // Handle abbreviated names like "M.Salah" -> "Mohamed Salah"
      if (playerNameLower.includes('.')) {
        const lastName = playerNameLower.split('.').pop(); // Get "salah" from "m.salah"
        if (lastName && baselineNameLower.includes(lastName)) {
          score += 60; // Higher score for abbreviated name matches
          console.log(`🔍 ABBREVIATED MATCH: "${name}" matches "${playerName}" (lastName: "${lastName}", score: ${score})`);
        }
      }
      
      // Check if baseline name is contained in FPL name (e.g., "De Bruyne" in "De Bruyne")
      if (playerNameLower.includes(baselineNameLower)) {
        score += 40;
        console.log(`🔍 CONTAINED MATCH: "${playerName}" contains "${name}" (score: ${score})`);
      }
      
      // Check for last name matches (common case)
      const baselineWords = baselineNameLower.split(/\s+/);
      const playerWords = playerNameLower.split(/\s+/);
      
      // Check if any word from FPL name matches any word from baseline name
      for (const playerWord of playerWords) {
        for (const baselineWord of baselineWords) {
          if (playerWord === baselineWord && playerWord.length > 2) {
            score += 25;
            // Bonus for exact word match
            if (playerWord.length > 3) {
              score += 15;
            }
            console.log(`🔍 WORD MATCH: "${playerWord}" matches "${baselineWord}" in "${name}" (score: ${score})`);
          }
        }
      }
      
      // Check for common FPL naming patterns
      if (this.isCommonFPLPattern(playerName, name)) {
        score += 20;
        console.log(`🔍 PATTERN MATCH: "${name}" matches common pattern for "${playerName}" (score: ${score})`);
      }
      
      if (score > 0) {
        matches.push({ name, data, score });
        console.log(`🔍 ADDED MATCH: "${name}" with score ${score}`);
      }
    }
    
    console.log(`🔍 SMART MATCHES FOUND: ${matches.length} matches for "${playerName}"`);
    if (matches.length > 0) {
      console.log(`🔍 TOP MATCHES:`, matches.slice(0, 3).map(m => `${m.name} (${m.score})`));
    }
    
    // Sort by score (highest first)
    return matches.sort((a, b) => b.score - a.score);
  }
  
  private isCommonFPLPattern(fplName: string, baselineName: string): boolean {
    const fplLower = fplName.toLowerCase();
    const baselineLower = baselineName.toLowerCase();
    
    // Common patterns: "Salah" -> "Mohamed Salah", "Haaland" -> "Erling Haaland"
    const commonFirstNames = ['mohamed', 'erling', 'kevin', 'bruno', 'marcus', 'james', 'alexander', 'andrew'];
    
    for (const firstName of commonFirstNames) {
      if (baselineLower.startsWith(firstName + ' ') && baselineLower.includes(fplLower)) {
        return true;
      }
    }
    
    // Handle specific common cases
    const commonMappings: { [key: string]: string[] } = {
      'salah': ['mohamed salah'],
      'haaland': ['erling haaland'],
      'de bruyne': ['kevin de bruyne'],
      'rashford': ['marcus rashford'],
      'arnold': ['trent alexander-arnold'],
      'robertson': ['andrew robertson'],
      'van dijk': ['virgil van dijk'],
      'son': ['heung-min son'],
      'kane': ['harry kane'],
      'sterling': ['raheem sterling'],
      'aguero': ['sergio aguero'],
      'silva': ['bernardo silva', 'david silva'],
      'fernandes': ['bruno fernandes'],
      'pogba': ['paul pogba'],
      'lukaku': ['romelu lukaku'],
      'aubameyang': ['pierre-emerick aubameyang'],
      'lacazette': ['alexandre lacazette'],
      'pepe': ['nicolas pepe'],
      'zaha': ['wilfried zaha'],
      'vardy': ['jamie vardy']
    };
    
    const fplNameKey = fplLower.replace(/[^a-z]/g, '');
    if (commonMappings[fplNameKey]) {
      return commonMappings[fplNameKey].some(mapping => 
        baselineLower.includes(mapping.replace(/[^a-z]/g, ''))
      );
    }
    
    return false;
  }

  private findFuzzyMatches(playerName: string): Array<{name: string, data: PlayerSeasonData, score: number}> {
    if (!this.baselineData) return [];
    
    const playerNameLower = playerName.toLowerCase();
    const matches: Array<{name: string, data: PlayerSeasonData, score: number}> = [];
    
    for (const [name, data] of Object.entries(this.baselineData)) {
      const baselineNameLower = name.toLowerCase();
      
      // Calculate similarity score
      let score = 0;
      
      // Check for common prefixes/suffixes
      if (baselineNameLower.startsWith(playerNameLower) || playerNameLower.startsWith(baselineNameLower)) {
        score += 0.8;
      }
      
      // Check for common substrings
      if (baselineNameLower.includes(playerNameLower) || playerNameLower.includes(baselineNameLower)) {
        score += 0.6;
      }
      
      // Check for word overlap
      const playerWords = playerNameLower.split(/\s+/);
      const baselineWords = baselineNameLower.split(/\s+/);
      const commonWords = playerWords.filter(word => baselineWords.includes(word));
      if (commonWords.length > 0) {
        score += 0.4 * commonWords.length;
      }
      
      // Check for similar length names
      const lengthDiff = Math.abs(playerName.length - name.length);
      if (lengthDiff <= 3) {
        score += 0.2;
      }
      
      if (score > 0.3) { // Only include reasonable matches
        matches.push({ name, data, score });
      }
    }
    
    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }

  private getNewPlayerDefaults(): RollingFeatures {
    // Generate slightly varied defaults to avoid all new players having identical scores
    const basePoints = 2.5 + (Math.random() * 2 - 1); // 1.5 to 3.5
    const baseMinutes = 45 + (Math.random() * 20 - 10); // 35 to 55
    const baseConsistency = 0.4 + (Math.random() * 0.2); // 0.4 to 0.6
    const baseStarts = 0.5 + (Math.random() * 0.2); // 0.5 to 0.7
    
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
      case 1: // Goalkeeper
        basePoints = 3.0 + (Math.random() * 1.5 - 0.75); // 2.25 to 3.75
        baseMinutes = 80 + (Math.random() * 20 - 10); // 70 to 90
        baseConsistency = 0.6 + (Math.random() * 0.2); // 0.6 to 0.8
        baseStarts = 0.8 + (Math.random() * 0.2); // 0.8 to 1.0
        baseIct = 15 + (Math.random() * 10 - 5); // 10 to 20
        baseBps = 25 + (Math.random() * 10 - 5); // 20 to 30
        baseExpectedGi = 0.1 + (Math.random() * 0.2 - 0.1); // 0.0 to 0.2
        break;
      case 2: // Defender
        basePoints = 3.5 + (Math.random() * 2 - 1); // 2.5 to 4.5
        baseMinutes = 75 + (Math.random() * 20 - 10); // 65 to 85
        baseConsistency = 0.5 + (Math.random() * 0.2); // 0.5 to 0.7
        baseStarts = 0.7 + (Math.random() * 0.2); // 0.7 to 0.9
        baseIct = 25 + (Math.random() * 15 - 7.5); // 17.5 to 32.5
        baseBps = 20 + (Math.random() * 10 - 5); // 15 to 25
        baseExpectedGi = 0.2 + (Math.random() * 0.3 - 0.15); // 0.05 to 0.35
        break;
      case 3: // Midfielder
        basePoints = 4.0 + (Math.random() * 2.5 - 1.25); // 2.75 to 5.25
        baseMinutes = 70 + (Math.random() * 25 - 12.5); // 57.5 to 82.5
        baseConsistency = 0.4 + (Math.random() * 0.3); // 0.4 to 0.7
        baseStarts = 0.6 + (Math.random() * 0.3); // 0.6 to 0.9
        baseIct = 35 + (Math.random() * 20 - 10); // 25 to 45
        baseBps = 18 + (Math.random() * 12 - 6); // 12 to 24
        baseExpectedGi = 0.4 + (Math.random() * 0.4 - 0.2); // 0.2 to 0.6
        break;
      case 4: // Forward
        basePoints = 4.5 + (Math.random() * 3 - 1.5); // 3.0 to 6.0
        baseMinutes = 65 + (Math.random() * 25 - 12.5); // 52.5 to 77.5
        baseConsistency = 0.3 + (Math.random() * 0.3); // 0.3 to 0.6
        baseStarts = 0.5 + (Math.random() * 0.3); // 0.5 to 0.8
        baseIct = 40 + (Math.random() * 25 - 12.5); // 27.5 to 52.5
        baseBps = 15 + (Math.random() * 15 - 7.5); // 7.5 to 22.5
        baseExpectedGi = 0.6 + (Math.random() * 0.5 - 0.25); // 0.35 to 0.85
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

  private predict(features: RollingFeatures, context: any): number {
    const weights = this.model.weights;
    
    // 1. Base prediction from rolling form features
    let prediction = 
      features.roll3_points * weights.form_weights.roll3 +
      features.roll5_points * weights.form_weights.roll5 +
      features.roll8_points * weights.form_weights.roll8 +
      features.roll15_points * weights.form_weights.roll15;
    
    // DEBUG: Log the base prediction calculation
    console.log(`🔍 BASE PREDICTION DEBUG: ${context.player.web_name}`, {
      roll3_points: features.roll3_points,
      roll5_points: features.roll5_points,
      roll8_points: features.roll8_points,
      roll15_points: features.roll15_points,
      weights: weights.form_weights,
      basePrediction: prediction
    });
    
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
      
      // Add logging for FDR adjustments
      if (Math.abs(fdrMultiplier - 1.0) > 0.01) {
        console.log(`🏟️ FDR APPLIED: ${context.player.web_name} GW${context.gameweek}`, {
          opponent: this.getOpponentName(context.fixture, []),
          homeAway: context.is_home ? 'H' : 'A',
          difficulty: context.fixture.difficulty || context.fixture.team_h_difficulty || context.fixture.team_a_difficulty || 'unknown',
          multiplier: `${fdrMultiplier.toFixed(2)}x`,
          adjustedPoints: prediction.toFixed(1)
        });
      }
    }
    
    // 10. CRITICAL: Apply new player penalties (was missing!)
    const classification = this.classifyPlayer(context.player, context.elementSummary || {});
    prediction *= classification.penaltyMultiplier;
    
    // Add logging for validation
    if (classification.penaltyMultiplier < 0.9) {
      console.log(`🔧 PENALTY APPLIED: ${context.player.web_name}`, {
        penalty: `${classification.penaltyMultiplier.toFixed(2)}x`,
        newToPL: classification.isNewToPL,
        promotedClub: classification.isFromPromotedClub,
        dataQuality: classification.dataQuality || 'unknown'
      });
    }
    
    // 11. CRITICAL: Apply conservative caps (was missing!)
    const originalPrediction = prediction;
    prediction = this.applyConservativeCaps(prediction, context.player, classification, context.gameweek || 2);
    
    // Add logging for caps
    if (Math.abs(originalPrediction - prediction) > 0.1) {
      console.log(`📊 CAP APPLIED: ${context.player.web_name}`, {
        original: originalPrediction.toFixed(1),
        capped: prediction.toFixed(1),
        reason: classification.dataQuality
      });
    }
    
    // 12. Availability scaling
    if (context.player.chance_of_playing_next_round !== null && 
        context.player.chance_of_playing_next_next_round !== undefined) {
      const availabilityFactor = this.getAvailabilityMultiplier(context.player.chance_of_playing_next_round);
      prediction *= availabilityFactor;
    }
    
    // 13. Final bounds with more conservative minimum for new players
    const minPrediction = classification.penaltyMultiplier < 0.8 ? 0.5 : 1.0;
    const finalPrediction = Math.max(minPrediction, Math.min(15.0, prediction));
    
    // DEBUG: Log the final prediction breakdown
    console.log(`🎯 FINAL PREDICTION DEBUG: ${context.player.web_name}`, {
      basePrediction: prediction,
      classification: classification,
      minPrediction,
      finalPrediction,
      gameweek: context.gameweek,
      fixture: context.fixture ? `${context.is_home ? 'H' : 'A'} vs ${this.getOpponentName(context.fixture, [])}` : 'No fixture'
    });
    
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
    
    // Check if player has recent minutes
    if (elementSummary.history && elementSummary.history.length > 0) {
      const recentGames = elementSummary.history.slice(-3);
      const avgMinutes = recentGames.reduce((sum: number, game: any) => sum + (game.minutes || 0), 0) / recentGames.length;
      
      if (avgMinutes < 15) {
        return false;
      }
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

    try {
      // Check if player should play
      if (!this.shouldPlayerPlay(player, elementSummary)) {
        return {
          player_id: player.id,
          name: player.web_name,
          team: teams.find(t => t.id === player.team)?.short_name || 'TBD',
          position: (['', 'GK', 'DEF', 'MID', 'FWD'][player.element_type] as any),
          price: (player.now_cost || 0) / 10,
          gw2_xp: 0,
          gw3_xp: 0,
          gw4_xp: 0,
          gw5_xp: 0,
          gw6_xp: 0,
          gw7_xp: 0,
          gw8_xp: 0,
          gw9_xp: 0,
          total_3gw_xp: 0,
          total_8gw_xp: 0,
          fixtures: []
        };
      }

      const baselineData = this.findPlayerBaseline(player.web_name);
      console.log(`🔍 BASELINE DATA FOR ${player.web_name}:`, {
        found: !!baselineData,
        baselineHistoryLength: baselineData?.season_history?.length || 0,
        currentHistoryLength: elementSummary.history?.length || 0,
        baselineDataKeys: baselineData ? Object.keys(baselineData) : [],
        seasonHistorySample: baselineData?.season_history?.slice(0, 2) || []
      });
      
      const features = this.calculateRollingFeatures(
        player.web_name,
        baselineData?.season_history || [],
        elementSummary.history || []
      );
      


      // Use up to 8 future fixtures for strategic planning; if missing, synthesize neutral fixtures
      let upcomingFixtures = (elementSummary.fixtures || []).slice(0, 8);
      if (!upcomingFixtures || upcomingFixtures.length === 0) {
        // Synthesize 8 neutral fixtures with average difficulty
        upcomingFixtures = [
          { event: 2, is_home: true, team_a: player.team, team_h: player.team, difficulty: 3 },
          { event: 3, is_home: false, team_a: player.team, team_h: player.team, difficulty: 3 },
          { event: 4, is_home: true, team_a: player.team, team_h: player.team, difficulty: 3 },
          { event: 5, is_home: false, team_a: player.team, team_h: player.team, difficulty: 3 },
          { event: 6, is_home: true, team_a: player.team, team_h: player.team, difficulty: 3 },
          { event: 7, is_home: false, team_a: player.team, team_h: player.team, difficulty: 3 },
          { event: 8, is_home: true, team_a: player.team, team_h: player.team, difficulty: 3 },
          { event: 9, is_home: false, team_a: player.team, team_h: player.team, difficulty: 3 },
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
          });
        }
      }

      const predictions: any[] = [];

      let gw2_xp = 0, gw3_xp = 0, gw4_xp = 0, gw5_xp = 0, gw6_xp = 0, gw7_xp = 0, gw8_xp = 0, gw9_xp = 0;

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

        const expectedPoints = this.predict(features, context);
        
        const roundedPoints = Math.round(expectedPoints * 10) / 10;

        // Final safety check - ensure we have valid points
        const finalPoints = isNaN(roundedPoints) || !isFinite(roundedPoints) ? 0 : Math.max(0, roundedPoints);

        const fixtureData = {
          gameweek: fixture.event ?? (2 + i),
          opponent: this.getOpponentName(fixture, teams),
          home_away: fixture.is_home ? 'H' as const : 'A' as const,
          difficulty: fixture.difficulty ?? 3,
          expected_points: finalPoints
        };

        predictions.push(fixtureData);

        // Assign to specific gameweek variables
        switch (i) {
          case 0: gw2_xp = finalPoints; break;
          case 1: gw3_xp = finalPoints; break;
          case 2: gw4_xp = finalPoints; break;
          case 3: gw5_xp = finalPoints; break;
          case 4: gw6_xp = finalPoints; break;
          case 5: gw7_xp = finalPoints; break;
          case 6: gw8_xp = finalPoints; break;
          case 7: gw9_xp = finalPoints; break;
        }
      }

      const total_3gw_xp = Math.round((gw2_xp + gw3_xp + gw4_xp) * 10) / 10;
      const total_8gw_xp = Math.round((gw2_xp + gw3_xp + gw4_xp + gw5_xp + gw6_xp + gw7_xp + gw8_xp + gw9_xp) * 10) / 10;

      // Final validation of all values
      const result = {
        player_id: player.id,
        name: player.web_name,
        team: teams.find(t => t.id === player.team)?.short_name || 'TBD',
        position: (['', 'GK', 'DEF', 'MID', 'FWD'][player.element_type] as any),
        price: (player.now_cost || 0) / 10,
        gw2_xp: isNaN(gw2_xp) ? 0 : gw2_xp,
        gw3_xp: isNaN(gw3_xp) ? 0 : gw3_xp,
        gw4_xp: isNaN(gw4_xp) ? 0 : gw4_xp,
        gw5_xp: isNaN(gw5_xp) ? 0 : gw5_xp,
        gw6_xp: isNaN(gw6_xp) ? 0 : gw6_xp,
        gw7_xp: isNaN(gw7_xp) ? 0 : gw7_xp,
        gw8_xp: isNaN(gw8_xp) ? 0 : gw8_xp,
        gw9_xp: isNaN(gw9_xp) ? 0 : gw9_xp,
        total_3gw_xp: isNaN(total_3gw_xp) ? 0 : total_3gw_xp,
        total_8gw_xp: isNaN(total_8gw_xp) ? 0 : total_8gw_xp,
        fixtures: predictions
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
        gw2_xp: 0,
        gw3_xp: 0,
        gw4_xp: 0,
        gw5_xp: 0,
        gw6_xp: 0,
        gw7_xp: 0,
        gw8_xp: 0,
        gw9_xp: 0,
        total_3gw_xp: 0,
        total_8gw_xp: 0,
        fixtures: []
      };
    }
  }

  async predictAllPlayers(fplApiService: any, onProgress?: (current: number, total: number) => void): Promise<PlayerPrediction[]> {
    const bootstrap = await fplApiService.fetchBootstrapData();
    const allPlayers = bootstrap.elements;
    const teams = bootstrap.teams;
    
    console.log(`🔍 PREDICT ALL PLAYERS: Processing ${allPlayers.length} players from FPL API`);
    
    // Debug: Check if Salah is in the FPL API data
    const salahPlayer = allPlayers.find((p: any) => p.web_name.toLowerCase().includes('salah'));
    if (salahPlayer) {
      console.log(`✅ SALAH FOUND in FPL API data:`, {
        id: salahPlayer.id,
        name: salahPlayer.web_name,
        team: salahPlayer.team,
        position: salahPlayer.element_type,
        cost: salahPlayer.now_cost
      });
    } else {
      console.log(`❌ SALAH NOT FOUND in FPL API data`);
      console.log(`🔍 SAMPLE FPL PLAYERS:`, allPlayers.slice(0, 10).map((p: any) => p.web_name));
      
      // Check for any Liverpool players
      const liverpoolPlayers = allPlayers.filter((p: any) => p.team === 11); // Liverpool team ID
      if (liverpoolPlayers.length > 0) {
        console.log(`🔍 LIVERPOOL PLAYERS:`, liverpoolPlayers.slice(0, 5).map((p: any) => p.web_name));
      }
    }
    
    const results: PlayerPrediction[] = [];
    const batchSize = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allPlayers.length; i += batchSize) {
      const batch = allPlayers.slice(i, i + batchSize);


      const batchPromises = batch.map(async (player: any) => {
        try {
          const elementSummary = await fplApiService.getElementSummary(player.id);
          const prediction = await this.predictPlayer(player, elementSummary, teams);
          
          if (prediction && 
              !isNaN(prediction.gw2_xp) && !isNaN(prediction.gw3_xp) && !isNaN(prediction.gw4_xp) &&
              !isNaN(prediction.gw5_xp) && !isNaN(prediction.gw6_xp) && !isNaN(prediction.gw7_xp) &&
              !isNaN(prediction.gw8_xp) && !isNaN(prediction.gw9_xp) &&
              !isNaN(prediction.total_8gw_xp)) {
            successCount++;
            return prediction;
          } else {
            console.warn(`⚠️ Invalid prediction for player ${player.name}:`, prediction);
            errorCount++;
            return null;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to predict player ${player.id} (${player.web_name}):`, error instanceof Error ? error.message : String(error));
          errorCount++;
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(Boolean) as PlayerPrediction[];
      results.push(...validResults);

      // Update progress after each batch
      if (onProgress) {
        const currentProgress = Math.min(i + batchSize, allPlayers.length);
        onProgress(currentProgress, allPlayers.length);
      }

      if (i + batchSize < allPlayers.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    console.log(`✅ Predictions completed: ${successCount} successful, ${errorCount} errors`);
    
    // Log summary of new player penalties applied
    const newPlayers = results.filter(p => {
      const player = allPlayers.find((ap: any) => ap.id === p.player_id);
      return player && this.classifyPlayer(player, {}).isNewToPL;
    });
    
    const promotedPlayers = results.filter(p => {
      const player = allPlayers.find((ap: any) => ap.id === p.player_id);
      return player && this.classifyPlayer(player, {}).isFromPromotedClub;
    });
    
    console.log(`🔧 NEW PLAYER PENALTIES: ${newPlayers.length} players got 40% reduction`);
    console.log(`🔧 PROMOTED CLUB PENALTIES: ${promotedPlayers.length} players got 30% reduction`);
    
    if (newPlayers.length > 0) {
      console.log(`📊 Sample new player XP (GW2):`, 
        newPlayers.slice(0, 3).map(p => `${p.name}: ${p.gw2_xp.toFixed(1)}`).join(', ')
      );
    }

    return results;
  }

  // NEW: Player Classification System for 2025-26
  private classifyPlayer(player: any, elementSummary: any): PlayerClassification {
    const historyLength = elementSummary.history?.length || 0;
    
    // 2025-26 promoted teams (adjust team IDs as needed)
    const promotedTeamIds = [3, 11, 17]; // Burnley, Leeds, Sunderland
    
    // Check if player has no 2024-25 baseline data (new to PL)
    const has2024_25Data = this.findPlayerBaseline(player.web_name);
    
    // Player is new to PL if they have no historical data and no baseline data
    const isNewToPL = !has2024_25Data && historyLength === 0;
    
    const isFromPromotedClub = promotedTeamIds.includes(player.team);
    
    const isYoungPlayer = historyLength < 15 && player.now_cost <= 60; // Under £6m with limited data
    
    const hasInsufficientData = historyLength < 10 && !has2024_25Data;
    
    // Calculate combined penalty multiplier
    let penaltyMultiplier = 1.0;
    let dataQuality: 'excellent' | 'good' | 'limited' | 'minimal' | 'new_player' = 'good';
    
    if (isNewToPL) {
      penaltyMultiplier *= 0.60; // 40% reduction for Premier League newcomers
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
      const dataReduction = historyLength < 3 ? 0.65 : historyLength < 6 ? 0.75 : 0.85;
      penaltyMultiplier *= dataReduction;
      dataQuality = historyLength < 3 ? 'minimal' : 'limited';
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
    
    // 1. NEW: Defensive Contributions (major 2025-26 change)
    const defensiveContributionBoost = {
      1: 0.00, // GK - no defensive contributions
      2: 0.20, // DEF - +20% from 10+ clearances/blocks/interceptions/tackles
      3: 0.15, // MID - +15% from 12+ defensive actions including recoveries  
      4: 0.08  // FWD - +8% from limited defensive actions
    };
    
    const positionBoost = defensiveContributionBoost[player.element_type as keyof typeof defensiveContributionBoost] || 0;
    adjustedPrediction *= (1 + positionBoost);
    
    // 2. NEW: More Liberal Assists (+5% boost across all positions)
    adjustedPrediction *= 1.05;
    
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

  // NEW: Conservative Caps
  private applyConservativeCaps(prediction: number, player: any, classification: PlayerClassification, gameweek: number): number {
    let cappedPrediction = prediction;
    
    // Apply conservative caps based on player classification
    if (classification.isNewToPL) {
      cappedPrediction = Math.min(cappedPrediction, 5.0); // Max 5 points for PL newcomers
    }
    
    if (classification.isFromPromotedClub) {
      cappedPrediction = Math.min(cappedPrediction, 6.0); // Max 6 points for promoted players
    }
    
    if (classification.hasInsufficientData) {
      cappedPrediction = Math.min(cappedPrediction, 4.0); // Very conservative for no data
    }
    
    if (classification.isYoungPlayer) {
      cappedPrediction = Math.min(cappedPrediction, 4.5); // Conservative for young players
    }
    
    // Additional caps for later gameweeks (predictions get less reliable)
    if (gameweek >= 6) {
      cappedPrediction *= 0.95; // Slight reduction for distant predictions
    }
    if (gameweek >= 8) {
      cappedPrediction *= 0.90; // Further reduction for very distant predictions
    }
    
    return cappedPrediction;
  }

  // NEW: Updated Position Multipliers for 2025-26
  private getPositionMultiplier2025_26(elementType: number): number {
    // Updated multipliers accounting for 2025-26 rule changes
    const multipliers = {
      1: 1.08, // GK - boosted by improved save BPS
      2: 1.23, // DEF - boosted by defensive contributions + goal-line clearance BPS
      3: 1.20, // MID - boosted by defensive contributions + liberal assists
      4: 1.23  // FWD - boosted by liberal assists (penalty BPS nerf offset by other boosts)
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
    
    // 2025-26 FDR Multipliers (based on FPL official ratings)
    const difficultyMultipliers = {
      1: 1.25, // Very Easy - boost expected points
      2: 1.15, // Easy - slight boost
      3: 1.00, // Medium - no change
      4: 0.85, // Hard - reduce expected points
      5: 0.70  // Very Hard - significant reduction
    };
    
    const multiplier = difficultyMultipliers[difficulty as keyof typeof difficultyMultipliers] || 1.0;
    

    
    return multiplier;
  }
}
