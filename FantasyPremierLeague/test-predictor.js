const { FPLPredictor2025_26 } = require('./src/services/fplPredictor2025-26');
const fplApiService = require('./src/services/fplApi');

async function testPredictor() {
  try {
    console.log('🧪 Testing improved FPL Predictor...');
    
    const predictor = new FPLPredictor2025_26();
    console.log('✅ Predictor initialized');
    
    // Test with a small sample of players first
    const bootstrap = await fplApiService.fetchBootstrapData();
    const samplePlayers = bootstrap.elements.slice(0, 10); // Test first 10 players
    const teams = bootstrap.teams;
    
    console.log(`🧪 Testing with ${samplePlayers.length} sample players...`);
    
    const results = [];
    for (const player of samplePlayers) {
      try {
        const elementSummary = await fplApiService.getElementSummary(player.id);
        const prediction = await predictor.predictPlayer(player, elementSummary, teams);
        
        // Validate the prediction
        const isValid = prediction && 
          !isNaN(prediction.gw2_xp) && 
          !isNaN(prediction.gw3_xp) && 
          !isNaN(prediction.gw4_xp) &&
          prediction.gw2_xp >= 0 &&
          prediction.gw3_xp >= 0 &&
          prediction.gw4_xp >= 0;
        
        console.log(`${isValid ? '✅' : '❌'} ${player.web_name}: GW2=${prediction.gw2_xp}, GW3=${prediction.gw3_xp}, GW4=${prediction.gw4_xp}, Total=${prediction.total_3gw_xp}`);
        
        results.push({
          player: player.web_name,
          prediction,
          isValid
        });
        
      } catch (error) {
        console.error(`❌ Error predicting ${player.web_name}:`, error.message);
        results.push({
          player: player.web_name,
          error: error.message,
          isValid: false
        });
      }
    }
    
    // Summary
    const validCount = results.filter(r => r.isValid).length;
    const totalCount = results.length;
    console.log(`\n📊 Test Results: ${validCount}/${totalCount} players have valid predictions (${(validCount/totalCount*100).toFixed(1)}%)`);
    
    if (validCount === totalCount) {
      console.log('🎉 All players have valid predictions!');
    } else {
      console.log('⚠️ Some players still have issues:');
      results.filter(r => !r.isValid).forEach(r => {
        console.log(`  - ${r.player}: ${r.error || 'Invalid prediction'}`);
      });
    }
    
  } catch (error) {
    console.error('🚨 Test failed:', error);
  }
}

// Run the test
testPredictor();

