const fs = require('fs');
const path = require('path');
const https = require('https');

// Function to fetch data from GitHub
function fetchData(url) {
  return new Promise((resolve, reject) => {
    console.log(`📡 Fetching: ${url}`);
    
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Function to parse CSV data
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',');
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    
    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : '';
    });
    
    data.push(row);
  }
  
  return data;
}

// Test with actual folder names from GitHub
const testPlayers = [
  'Mohamed_Salah_328',
  'Erling_Haaland_351',  // Actual ID from GitHub
  'Kevin_De Bruyne_345',  // Actual ID from GitHub, has space
  'Virgil_van Dijk_339',  // Actual ID from GitHub, has space
  'Son_Heung-min_503',    // Actual ID from GitHub
  'Alexis_Mac Allister_329'  // Actual ID from GitHub, has space
];

async function testSimplePull() {
  try {
    console.log('🚀 Testing simple data pull for known players...\n');
    
    const processedPlayers = {};
    
    for (const playerFolder of testPlayers) {
      try {
        console.log(`\n🔍 Processing: ${playerFolder}`);
        
        // Extract name and ID from folder
        const parts = playerFolder.split('_');
        const id = parts[parts.length - 1];
        const nameParts = parts.slice(0, -1);
        
        // Handle different naming patterns:
        // - Single name: "Salah" -> firstName: "Salah", lastName: ""
        // - Two parts: "Mohamed_Salah" -> firstName: "Mohamed", lastName: "Salah"  
        // - Multiple parts: "Heung_Min_Son" -> firstName: "Heung", lastName: "Min Son"
        // - URL encoded: "Mac%20Allister" -> firstName: "Mac", lastName: "Allister"
        
        let firstName, lastName;
        if (nameParts.length === 1) {
          // Single name
          firstName = nameParts[0];
          lastName = '';
        } else if (nameParts.length === 2) {
          // Two parts: First_Last
          firstName = nameParts[0];
          lastName = nameParts[1];
        } else {
          // Multiple parts: First_Middle_Last
          firstName = nameParts[0];
          lastName = nameParts.slice(1).join(' ');
        }
        
        // Handle URL encoding - convert %20 back to spaces
        const decodedFirstName = decodeURIComponent(firstName);
        const decodedLastName = decodeURIComponent(lastName);
        
        // Create full name and key
        const fullName = decodedLastName ? `${decodedFirstName} ${decodedLastName}` : decodedFirstName;
        const nameKey = decodedLastName ? `${decodedFirstName}_${decodedLastName}` : decodedFirstName;
        
        console.log(`   Name: ${fullName}`);
        console.log(`   Key: ${nameKey}`);
        console.log(`   ID: ${id}`);
        
        // Fetch CSV data - encode spaces as %20 for the URL
        // Replace spaces in the last name with %20 for the HTTP request
        const encodedFolderName = playerFolder.replace(/\s/g, '%20');
        const url = `https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/players/${encodedFolderName}/gw.csv`;
        const csvData = await fetchData(url);
        const gameweekData = parseCSV(csvData);
        
        if (gameweekData.length === 0) {
          console.log(`   ⚠️ No data found`);
          continue;
        }
        
        console.log(`   ✅ Found ${gameweekData.length} gameweeks`);
        
        // Process the data
        const seasonHistory = gameweekData.map(row => ({
          round: parseInt(row.round) || 0,
          total_points: parseInt(row.total_points) || 0,
          minutes: parseInt(row.minutes) || 0,
          was_home: row.was_home === 'True',
          opponent_team: parseInt(row.opponent_team) || 0,
          goals_scored: parseInt(row.goals_scored) || 0,
          assists: parseInt(row.assists) || 0,
          clean_sheets: parseInt(row.clean_sheets) || 0,
          goals_conceded: parseInt(row.goals_conceded) || 0,
          bonus: parseInt(row.bonus) || 0,
          bps: parseInt(row.bps) || 0,
          influence: parseFloat(row.influence) || 0,
          creativity: parseFloat(row.creativity) || 0,
          threat: parseFloat(row.threat) || 0,
          ict_index: parseFloat(row.ict_index) || 0
        }));
        
        // Calculate stats
        const totalGames = seasonHistory.length;
        const totalPoints = seasonHistory.reduce((sum, gw) => sum + gw.total_points, 0);
        const avgPoints = totalGames > 0 ? totalPoints / totalGames : 0;
        
        const playerData = {
          name: fullName,
          name_key: nameKey,
          fpl_id: parseInt(id),
          season_history: seasonHistory,
          stats: {
            total_games: totalGames,
            total_points: totalPoints,
            average_points: avgPoints
          }
        };
        
        processedPlayers[nameKey] = playerData;
        console.log(`   📊 Stats: ${totalGames} games, ${totalPoints} points, ${avgPoints.toFixed(1)} avg`);
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }
    
    // Save the test data
    const outputPath = path.join(__dirname, '../src/data/2024-25-baseline-test.json');
    const outputData = {
      metadata: {
        source: 'GitHub test pull',
        pulled_at: new Date().toISOString(),
        total_players: Object.keys(processedPlayers).length
      },
      players: processedPlayers
    };
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the data
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    
    console.log(`\n✅ Test data saved!`);
    console.log(`📁 File: ${outputPath}`);
    console.log(`📊 Players processed: ${Object.keys(processedPlayers).length}`);
    
    // Show sample data
    console.log(`\n🔍 Sample processed players:`);
    Object.keys(processedPlayers).forEach(nameKey => {
      const player = processedPlayers[nameKey];
      console.log(`   - ${player.name} (${nameKey}): ${player.stats.total_games} games, ${player.stats.total_points} points`);
    });
    
  } catch (error) {
    console.error('❌ Error in test:', error.message);
  }
}

// Run the test
testSimplePull();
