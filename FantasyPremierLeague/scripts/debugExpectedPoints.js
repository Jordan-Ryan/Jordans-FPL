const fs = require('fs');
const path = require('path');

// Mock the FPL API service for testing
const mockFplApiService = {
  async fetchBootstrapData() {
    console.log('📡 Mock: Fetching bootstrap data...');
    // Return mock data structure
    return {
      elements: [
        {
          id: 1,
          web_name: 'Haaland',
          element_type: 4, // FWD
          team: 3, // Man City
          now_cost: 145, // £14.5m
          chance_of_playing_next_round: 100
        },
        {
          id: 2,
          web_name: 'Salah',
          element_type: 3, // MID
          team: 14, // Liverpool
          now_cost: 135, // £13.5m
          chance_of_playing_next_round: 100
        },
        {
          id: 3,
          web_name: 'De Bruyne',
          element_type: 3, // MID
          team: 3, // Man City
          now_cost: 125, // £12.5m
          chance_of_playing_next_round: 100
        }
      ],
      teams: [
        { id: 3, short_name: 'MCI', name: 'Man City' },
        { id: 14, short_name: 'LIV', name: 'Liverpool' }
      ]
    };
  },

  async getElementSummary(playerId) {
    console.log(`📊 Mock: Fetching element summary for player ${playerId}...`);
    // Return mock element summary
    return {
      history: [
        { total_points: 8, minutes: 90, was_home: true, opponent_team: 14, ict_index: 8.5, bps: 24, expected_goal_involvements: 1.2 },
        { total_points: 6, minutes: 90, was_home: false, opponent_team: 3, ict_index: 7.2, bps: 18, expected_goal_involvements: 0.8 },
        { total_points: 10, minutes: 90, was_home: true, opponent_team: 6, ict_index: 9.1, bps: 30, expected_goal_involvements: 1.5 }
      ],
      fixtures: [
        { event: 2, is_home: true, team_a: 14, difficulty: 3 },
        { event: 3, is_home: false, team_a: 6, difficulty: 2 },
        { event: 4, is_home: true, team_a: 8, difficulty: 4 }
      ]
    };
  }
};

// Test the predictor
async function testPredictor() {
  console.log('🧪 Testing Expected Points Generation...\n');

  try {
    // Import the predictor (we'll need to compile it first)
    const { FPLPredictor2025_26 } = require('../src/services/fplPredictor2025-26.ts');
    
    const predictor = new FPLPredictor2025_26();
    console.log('✅ Predictor created');

    // Test single player prediction
    console.log('\n🔮 Testing single player prediction...');
    const singlePrediction = await predictor.predictPlayer(
      { id: 1, web_name: 'Haaland', element_type: 4, team: 3, now_cost: 145, chance_of_playing_next_round: 100 },
      {
        history: [
          { total_points: 8, minutes: 90, was_home: true, opponent_team: 14, ict_index: 8.5, bps: 24, expected_goal_involvements: 1.2 },
          { total_points: 6, minutes: 90, was_home: false, opponent_team: 3, ict_index: 7.2, bps: 18, expected_goal_involvements: 0.8 },
          { total_points: 10, minutes: 90, was_home: true, opponent_team: 6, ict_index: 9.1, bps: 30, expected_goal_involvements: 1.5 }
        ],
        fixtures: [
          { event: 2, is_home: true, team_a: 14, difficulty: 3 },
          { event: 3, is_home: false, team_a: 6, difficulty: 2 },
          { event: 4, is_home: true, team_a: 8, difficulty: 4 }
        ]
      },
      [{ id: 3, short_name: 'MCI', name: 'Man City' }]
    );

    console.log('📊 Single player prediction result:');
    console.log(JSON.stringify(singlePrediction, null, 2));

    // Test all players prediction
    console.log('\n🔮 Testing all players prediction...');
    const allPredictions = await predictor.predictAllPlayers(mockFplApiService);
    
    console.log(`\n📊 Generated ${allPredictions.length} predictions:`);
    allPredictions.forEach((pred, index) => {
      console.log(`${index + 1}. ${pred.name} (${pred.position}): GW2: ${pred.gw2_xp}, GW3: ${pred.gw3_xp}, GW4: ${pred.gw4_xp}, Total: ${pred.total_3gw_xp}`);
    });

    // Save results to file
    const outputPath = path.join(__dirname, '../debug-predictions.json');
    fs.writeFileSync(outputPath, JSON.stringify(allPredictions, null, 2));
    console.log(`\n💾 Results saved to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPredictor();
