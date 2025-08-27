// Comprehensive test to debug expected points calculation
const fs = require('fs');
const path = require('path');

// Mock the FPL predictor to test the calculation logic
class MockFPLPredictor {
  constructor() {
    // Load baseline data
    const baselinePath = path.join(__dirname, 'src/data/2024-25-baseline-processed.json');
    this.baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8')).players;
    
    // Mock model weights
    this.model = {
      weights: {
        form_weights: {
          roll3: 0.3,
          roll5: 0.4,
          roll8: 0.2,
          roll15: 0.1
        },
        context_weights: {
          minutes_factor: 1.0,
          consistency_factor: 1.0,
          starts_factor: 1.0,
          home_advantage: 1.12
        },
        feature_scaling: {
          bps_scale: 0.1,
          ict_scale: 0.05,
          expected_gi_scale: 0.08
        }
      }
    };
  }

  // Mock the findPlayerBaseline method - updated to match the real implementation
  findPlayerBaseline(playerName, player) {
    console.log(`🔍 SEARCHING BASELINE: Looking for "${playerName}"`);
    
    // 0. PRIORITY: If we have player object with first_name + second_name, construct the correct key
    if (player && player.first_name && player.second_name) {
        // The baseline data uses "FirstName_LastName" as keys (with underscore)
        const nameKey = `${player.first_name}_${player.second_name}`;
        console.log(`🔍 LOOKING FOR KEY: "${nameKey}" in baseline data`);
        
        // Try exact match with name_key first (most reliable)
        if (this.baselineData[nameKey]) {
          console.log(`✅ NAME KEY EXACT MATCH: Found "${nameKey}" in baseline data`);
          return this.baselineData[nameKey];
        }
        
        // Try reversed name order (e.g., "Heung-min Son" -> "Son_Heung-min")
        const reversedNameKey = `${player.second_name}_${player.first_name}`;
        if (this.baselineData[reversedNameKey]) {
          console.log(`✅ REVERSED NAME KEY MATCH: Found "${reversedNameKey}" in baseline data`);
          return this.baselineData[reversedNameKey];
        }
        
        // Try with spaces instead of underscores (fallback)
        const spaceName = `${player.first_name} ${player.second_name}`;
        if (this.baselineData[spaceName]) {
          console.log(`✅ SPACE NAME MATCH: Found "${spaceName}" in baseline data`);
          return this.baselineData[spaceName];
        }
      }
    
    // 1. Try exact match with original name (fallback)
    if (this.baselineData[playerName]) {
      console.log(`✅ EXACT MATCH: Found "${playerName}" in baseline data`);
      return this.baselineData[playerName];
    }
    
    // 2. Try underscore match
    const underscoreName = playerName.replace(/\s+/g, '_');
    if (this.baselineData[underscoreName]) {
      console.log(`✅ UNDERSCORE MATCH: Found "${underscoreName}" in baseline data`);
      return this.baselineData[underscoreName];
    }
    
    // 3. Try last name match
    const nameParts = playerName.split(/\s+/);
    if (nameParts.length > 1) {
      const lastName = nameParts[nameParts.length - 1];
      for (const [key, data] of Object.entries(this.baselineData)) {
        if (key.includes(lastName)) {
          console.log(`✅ LAST NAME MATCH: Found "${key}" for "${playerName}"`);
          return data;
        }
      }
    }
    
    console.log(`❌ NO BASELINE FOUND: "${playerName}"`);
    return null;
  }

  // Mock the classifyPlayer method
  classifyPlayer(player, elementSummary) {
    const historyLength = elementSummary.history?.length || 0;
    const has2024_25Data = this.findPlayerBaseline(player.web_name, player);
    
    // Use baseline data history length if available
    const baselineHistoryLength = has2024_25Data?.season_history?.length || 0;
    const effectiveHistoryLength = Math.max(historyLength, baselineHistoryLength);
    
    const isNewToPL = !has2024_25Data && effectiveHistoryLength === 0;
    const isFromPromotedClub = [3, 11, 17].includes(player.team);
    const isYoungPlayer = effectiveHistoryLength < 15 && player.now_cost <= 60;
    const hasInsufficientData = effectiveHistoryLength < 10 && !has2024_25Data;
    
    let penaltyMultiplier = 1.0;
    let dataQuality = 'good';
    
    if (isNewToPL) {
      penaltyMultiplier *= 0.60;
      dataQuality = 'new_player';
    }
    
    if (isFromPromotedClub && !isNewToPL) {
      penaltyMultiplier *= 0.70;
      dataQuality = 'limited';
    }
    
    if (isYoungPlayer && !isNewToPL && !isFromPromotedClub) {
      penaltyMultiplier *= 0.75;
    }
    
    if (hasInsufficientData && !isNewToPL && !isFromPromotedClub) {
      const dataReduction = effectiveHistoryLength < 3 ? 0.65 : effectiveHistoryLength < 6 ? 0.75 : 0.85;
      penaltyMultiplier *= dataReduction;
      dataQuality = effectiveHistoryLength < 3 ? 'minimal' : 'limited';
    }
    
    console.log(`🔍 PLAYER CLASSIFICATION: ${player.web_name}`, {
      historyLength,
      baselineHistoryLength,
      effectiveHistoryLength,
      has2024_25Data: !!has2024_25Data,
      isNewToPL,
      isFromPromotedClub,
      isYoungPlayer,
      hasInsufficientData,
      penaltyMultiplier,
      dataQuality
    });
    
    return {
      isNewToPL,
      isFromPromotedClub,
      isYoungPlayer,
      hasInsufficientData,
      penaltyMultiplier,
      dataQuality
    };
  }

  // Mock the predict method
  predict(features, context) {
    console.log(`\n🔍 PREDICTING for ${context.player.web_name}:`);
    
    // 1. Base prediction from rolling features
    let prediction = 
      features.roll3_points * this.model.weights.form_weights.roll3 +
      features.roll5_points * this.model.weights.form_weights.roll5 +
      features.roll8_points * this.model.weights.form_weights.roll8 +
      features.roll15_points * this.model.weights.form_weights.roll15;
    
    console.log(`   Base prediction: ${prediction.toFixed(2)}`);
    
    // 2. Minutes reliability adjustment
    const minutesReliability = Math.min(features.roll5_minutes / 90.0, 1.2);
    prediction *= minutesReliability;
    console.log(`   After minutes adjustment: ${prediction.toFixed(2)}`);
    
    // 3. Consistency bonus
    prediction *= (0.8 + 0.4 * features.roll5_consistency);
    console.log(`   After consistency adjustment: ${prediction.toFixed(2)}`);
    
    // 4. Starts reliability
    prediction *= (0.7 + 0.3 * features.roll5_starts);
    console.log(`   After starts adjustment: ${prediction.toFixed(2)}`);
    
    // 5. Advanced statistics boosts
    prediction += features.avg_bps * this.model.weights.feature_scaling.bps_scale;
    prediction += features.avg_ict * this.model.weights.feature_scaling.ict_scale;
    prediction += features.avg_expected_gi * this.model.weights.feature_scaling.expected_gi_scale;
    console.log(`   After stats boost: ${prediction.toFixed(2)}`);
    
    // 6. Position multiplier
    const positionMultiplier = this.getPositionMultiplier(context.player.element_type);
    prediction *= positionMultiplier;
    console.log(`   After position multiplier (${positionMultiplier}): ${prediction.toFixed(2)}`);
    
    // 7. Home/away advantage
    if (context.is_home) {
      prediction *= this.model.weights.context_weights.home_advantage;
      console.log(`   After home advantage: ${prediction.toFixed(2)}`);
    } else {
      prediction *= 0.94;
      console.log(`   After away penalty: ${prediction.toFixed(2)}`);
    }
    
    // 8. Apply new player penalties
    const classification = this.classifyPlayer(context.player, context.elementSummary || {});
    prediction *= classification.penaltyMultiplier;
    console.log(`   After penalties (${classification.penaltyMultiplier.toFixed(2)}x): ${prediction.toFixed(2)}`);
    
    // 9. Apply conservative caps
    const originalPrediction = prediction;
    prediction = this.applyConservativeCaps(prediction, context.player, classification, context.gameweek || 2);
    console.log(`   After caps: ${prediction.toFixed(2)}`);
    
    // 10. Final bounds
    const minPrediction = classification.penaltyMultiplier < 0.8 ? 0.5 : 1.0;
    const finalPrediction = Math.max(minPrediction, Math.min(15.0, prediction));
    
    console.log(`🎯 FINAL PREDICTION: ${finalPrediction.toFixed(2)}`);
    return finalPrediction;
  }

  getPositionMultiplier(elementType) {
    const multipliers = { 1: 1.08, 2: 1.23, 3: 1.20, 4: 1.23 };
    return multipliers[elementType] || 1.0;
  }

  applyConservativeCaps(prediction, player, classification, gameweek) {
    let cappedPrediction = prediction;
    
    if (classification.isNewToPL) {
      cappedPrediction = Math.min(cappedPrediction, 5.0);
      console.log(`   🔒 Capped at 5.0 (new to PL)`);
    }
    
    if (classification.isFromPromotedClub) {
      cappedPrediction = Math.min(cappedPrediction, 6.0);
      console.log(`   🔒 Capped at 6.0 (promoted club)`);
    }
    
    if (classification.hasInsufficientData) {
      cappedPrediction = Math.min(cappedPrediction, 4.0);
      console.log(`   🔒 Capped at 4.0 (insufficient data)`);
    }
    
    if (classification.isYoungPlayer) {
      cappedPrediction = Math.min(cappedPrediction, 4.5);
      console.log(`   🔒 Capped at 4.5 (young player)`);
    }
    
    return cappedPrediction;
  }
}

// Test function
async function testExpectedPointsCalculation() {
  console.log('🚀 Testing Expected Points Calculation for All Players...\n');
  
  const predictor = new MockFPLPredictor();
  
  // Test with a few key players
  const testPlayers = [
    {
      id: 328,
      web_name: 'Salah',
      first_name: 'Mohamed',
      second_name: 'Salah',
      element_type: 3, // MID
      team: 11, // Liverpool
      now_cost: 130
    },
    {
      id: 351,
      web_name: 'Haaland',
      first_name: 'Erling',
      second_name: 'Haaland',
      element_type: 4, // FWD
      team: 43, // Man City
      now_cost: 145
    },
    {
      id: 123,
      web_name: 'Van de Ven',
      first_name: 'Micky',
      second_name: 'van de Ven',
      element_type: 2, // DEF
      team: 21, // Tottenham
      now_cost: 45
    },
    {
      id: 456,
      web_name: 'Palmer',
      first_name: 'Cole',
      second_name: 'Palmer',
      element_type: 3, // MID
      team: 43, // Man City
      now_cost: 55
    }
  ];
  
  for (const player of testPlayers) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 TESTING PLAYER: ${player.web_name} (${player.first_name} ${player.second_name})`);
    console.log(`${'='.repeat(60)}`);
    
    // Mock element summary with some history
    const elementSummary = {
      history: [
        { total_points: 10, minutes: 90, was_home: true, opponent_team: 4 },
        { total_points: 8, minutes: 90, was_home: false, opponent_team: 20 },
        { total_points: 12, minutes: 90, was_home: true, opponent_team: 6 }
      ]
    };
    
    // Mock rolling features
    const features = {
      roll3_points: 10.0,
      roll5_points: 9.5,
      roll8_points: 9.0,
      roll15_points: 8.5,
      roll5_minutes: 90.0,
      roll5_consistency: 0.8,
      roll5_starts: 0.9,
      avg_bps: 35.0,
      avg_ict: 12.0,
      avg_expected_gi: 0.8
    };
    
    // Mock context
    const context = {
      player,
      elementSummary,
      is_home: true,
      gameweek: 2,
      fixture: { difficulty: 3 }
    };
    
    try {
      // Test the findPlayerBaseline method directly with the full name
      console.log(`\n🔍 TESTING BASELINE LOOKUP DIRECTLY:`);
      const fullName = `${player.first_name} ${player.second_name}`;
      const baselineData = predictor.findPlayerBaseline(fullName, player);
      
      if (baselineData) {
        console.log(`✅ BASELINE FOUND: ${fullName} has ${baselineData.season_history.length} gameweeks of data`);
      } else {
        console.log(`❌ NO BASELINE: ${fullName} not found`);
      }
      
      const prediction = predictor.predict(features, context);
      console.log(`\n✅ FINAL RESULT: ${player.web_name} = ${prediction.toFixed(2)} points`);
    } catch (error) {
      console.error(`❌ Error predicting for ${player.web_name}:`, error.message);
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log('🎯 Expected Points Calculation Test Completed!');
  console.log(`${'='.repeat(60)}`);
}

// Run the test
testExpectedPointsCalculation();
