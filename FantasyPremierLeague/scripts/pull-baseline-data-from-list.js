const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const BATCH_SIZE = 10; // Process 10 players at a time
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

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

// Preserve full Unicode letters (accents) when constructing names
function sanitizeName(input) {
  if (!input) return '';
  return input
    .normalize('NFC')
    .replace(/[^\p{L}\p{M}\s\-'’]/gu, '')
    .trim();
}

// Function to process a single player
async function processPlayer(folderName) {
  try {
    // Parse folder name: FirstName_LastName_With_Spaces_ID
    const parts = folderName.split('_');
    
    if (parts.length < 2) {
      console.log(`⚠️ Skipping malformed folder: ${folderName}`);
      return null;
    }
    
    // Extract name and ID
    const id = parts[parts.length - 1];
    const nameParts = parts.slice(0, -1); // Everything except the last part (ID)
    
    let firstName, lastName;
    if (nameParts.length === 1) {
      // Single name
      firstName = nameParts[0];
      lastName = '';
    } else {
      // Multiple name parts - first part is firstName, rest is lastName
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }
    
      // Clean up names (Unicode-safe, keep accents)
      firstName = sanitizeName(firstName);
      lastName = sanitizeName(lastName);
    
    // Create a unique key using just the name (without ID)
    const nameKey = lastName ? `${firstName}_${lastName}` : firstName;
    const fullName = lastName ? `${firstName} ${lastName}` : firstName;
    
    console.log(`   Name: ${fullName}`);
    console.log(`   Key: ${nameKey}`);
    console.log(`   ID: ${id}`);
    
    // Fetch CSV data - encode safely but keep Unicode characters
    const encodedFolderName = encodeURI(folderName);
    const url = `https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/players/${encodedFolderName}/gw.csv`;
    
    const csvData = await fetchData(url);
    const gameweekData = parseCSV(csvData);
    
    if (gameweekData.length === 0) {
      console.log(`   ⚠️ No data found`);
      return null;
    }
    
    console.log(`   ✅ Found ${gameweekData.length} gameweeks`);
    
    // VALIDATION: Ensure we have proper rows; allow duplicate gameweeks (DGWs)
    const validRows = [];
    
    for (const row of gameweekData) {
      const round = parseInt(row.round);
      
      // Skip invalid gameweeks
      if (isNaN(round) || round < 1 || round > 38) {
        console.log(`   ⚠️ Skipping invalid gameweek ${row.round}`);
        continue;
      }
      
      // Validate the data is reasonable
      const totalPoints = parseInt(row.total_points) || 0;
      const minutes = parseInt(row.minutes) || 0;
      
      // Skip unrealistic data (e.g., >50 points for a single gameweek)
      if (totalPoints > 50) {
        console.log(`   ⚠️ Skipping unrealistic points ${totalPoints} for GW${round}`);
        continue;
      }
      
      // Skip if minutes are invalid
      if (minutes < 0 || minutes > 120) {
        console.log(`   ⚠️ Skipping invalid minutes ${minutes} for GW${round}`);
        continue;
      }
      
      validRows.push(row);
    }
    
    // Sort rows by round then kickoff_time if available
    validRows.sort((a, b) => {
      const ra = parseInt(a.round) || 0;
      const rb = parseInt(b.round) || 0;
      if (ra !== rb) return ra - rb;
      const ta = a.kickoff_time || '';
      const tb = b.kickoff_time || '';
      return ta.localeCompare(tb);
    });
    
    if (validRows.length === 0) {
      console.log(`   ⚠️ No valid gameweek data after validation`);
      return null;
    }
    
    const distinctRounds = Array.from(new Set(validRows.map(r => parseInt(r.round) || 0))).sort((a,b) => a-b);
    console.log(`   ✅ Validated ${validRows.length} rows across rounds: ${distinctRounds.join(', ')}`);
    
    // Process the validated gameweek data
    const seasonHistory = validRows.map(row => ({
      round: parseInt(row.round) || 0,
      total_points: parseInt(row.total_points) || 0,
      minutes: parseInt(row.minutes) || 0,
      was_home: row.was_home === 'True',
      opponent_team: parseInt(row.opponent_team) || 0,
      goals_scored: parseInt(row.goals_scored) || 0,
      assists: parseInt(row.assist) || 0, // Note: CSV has 'assist' not 'assists'
      clean_sheets: parseInt(row.clean_sheets) || 0,
      goals_conceded: parseInt(row.goals_conceded) || 0,
      own_goals: parseInt(row.own_goals) || 0,
      penalties_saved: parseInt(row.penalties_saved) || 0,
      penalties_missed: parseInt(row.penalties_missed) || 0,
      yellow_cards: parseInt(row.yellow_cards) || 0,
      red_cards: parseInt(row.red_cards) || 0,
      saves: parseInt(row.saves) || 0,
      bonus: parseInt(row.bonus) || 0,
      bps: parseInt(row.bps) || 0,
      influence: parseFloat(row.influence) || 0,
      creativity: parseFloat(row.creativity) || 0,
      threat: parseFloat(row.threat) || 0,
      ict_index: parseFloat(row.ict_index) || 0,
      expected_goals: parseFloat(row.expected_goals) || 0,
      expected_assists: parseFloat(row.expected_assists) || 0,
      expected_goal_involvements: parseFloat(row.expected_goal_involvements) || 0,
      expected_goals_conceded: parseFloat(row.expected_goals_conceded) || 0,
      fixture: parseInt(row.fixture) || 0,
      kickoff_time: row.kickoff_time || '',
      team_a_score: parseInt(row.team_a_score) || 0,
      team_h_score: parseInt(row.team_h_score) || 0,
      value: parseInt(row.value) || 0
    }));
    
    // Calculate some aggregate stats
    const totalGames = seasonHistory.length;
    const totalPoints = seasonHistory.reduce((sum, gw) => sum + gw.total_points, 0);
    const totalMinutes = seasonHistory.reduce((sum, gw) => sum + gw.minutes, 0);
    const avgPoints = totalGames > 0 ? totalPoints / totalGames : 0;
    
    const playerData = {
      name: fullName,
      name_key: nameKey, // Use firstName_LastName as key
      fpl_id: parseInt(id), // Store the current FPL ID for reference
      season_history: seasonHistory,
      stats: {
        total_games: totalGames,
        total_points: totalPoints,
        total_minutes: totalMinutes,
        average_points: avgPoints,
        goals_scored: seasonHistory.reduce((sum, gw) => sum + gw.goals_scored, 0),
        assists: seasonHistory.reduce((sum, gw) => sum + gw.assists, 0),
        clean_sheets: seasonHistory.reduce((sum, gw) => sum + gw.clean_sheets, 0),
        bonus_points: seasonHistory.reduce((sum, gw) => sum + gw.bonus, 0)
      }
    };
    
    console.log(`   📊 Stats: ${totalGames} games, ${totalPoints} points, ${avgPoints.toFixed(1)} avg`);
    
    return playerData;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

// Function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main function
async function pullBaselineData() {
  try {
    console.log('🚀 Starting baseline data pull from GitHub...');
    console.log('📁 Source: https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/players');
    console.log('📁 Output: /Users/jordanryan/Documents/GitHub/Jordans-FPL/FantasyPremierLeague/src/data/2024-25-baseline-processed.json\n');
    
    // Load the folder list we discovered earlier
    const folderListPath = './player-folders-list.json';
    if (!fs.existsSync(folderListPath)) {
      console.error('❌ Folder list not found. Please run discover-folders.js first.');
      return;
    }
    
    const folderList = JSON.parse(fs.readFileSync(folderListPath, 'utf8'));
    const allFolders = folderList.folders;
    
    console.log(`📋 Loaded ${allFolders.length} player folders from discovery`);
    
    // Process players in batches
    const processedPlayers = {};
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < allFolders.length; i += BATCH_SIZE) {
      const batch = allFolders.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(allFolders.length / BATCH_SIZE);
      
      console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} players)`);
      
      const batchPromises = batch.map(async (folderName) => {
        console.log(`\n🔍 Processing: ${folderName}`);
        try {
          const playerData = await processPlayer(folderName);
          if (playerData) {
            // Use the name_key as the key in our output
            processedPlayers[playerData.name_key] = playerData;
            successCount++;
            console.log(`   ✅ SUCCESS: ${playerData.name} (${playerData.name_key})`);
          } else {
            errorCount++;
            console.log(`   ❌ FAILED: ${folderName} - No data returned`);
          }
        } catch (error) {
          errorCount++;
          console.log(`   💥 ERROR: ${folderName} - ${error.message}`);
        }
      });
      
      await Promise.all(batchPromises);
      
      // Show batch summary
      console.log(`\n📊 Batch ${batchNumber} Summary:`);
      console.log(`   ✅ Success: ${successCount} total`);
      console.log(`   ❌ Errors: ${errorCount} total`);
      console.log(`   📈 Progress: ${((i + BATCH_SIZE) / allFolders.length * 100).toFixed(1)}% complete`);
      
      // Add delay between batches to avoid overwhelming GitHub
      if (i + BATCH_SIZE < allFolders.length) {
        console.log(`\n⏳ Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }
    
    // Save the processed data
    const outputPath = path.join(__dirname, '../src/data/2024-25-baseline-processed.json');
    
    // VALIDATION: Check for any remaining data quality issues
    console.log(`\n🔍 Validating final data quality...`);
    let validationIssues = 0;
    
    for (const [key, player] of Object.entries(processedPlayers)) {
      // Check for duplicate gameweeks
      const rounds = player.season_history.map(gw => gw.round);
      const uniqueRounds = new Set(rounds);
      if (rounds.length !== uniqueRounds.size) {
        console.log(`⚠️ VALIDATION ISSUE: ${key} has duplicate gameweeks`);
        validationIssues++;
      }
      
      // Check for proper gameweek progression
      const sortedRounds = [...uniqueRounds].sort((a, b) => a - b);
      if (sortedRounds.length > 0 && (sortedRounds[0] !== 1 || sortedRounds[sortedRounds.length - 1] > 38)) {
        console.log(`⚠️ VALIDATION ISSUE: ${key} has invalid gameweek range: ${sortedRounds[0]} to ${sortedRounds[sortedRounds.length - 1]}`);
        validationIssues++;
      }
      
      // Check for unrealistic point totals
      const maxPoints = Math.max(...player.season_history.map(gw => gw.total_points));
      if (maxPoints > 50) {
        console.log(`⚠️ VALIDATION ISSUE: ${key} has unrealistic max points: ${maxPoints}`);
        validationIssues++;
      }
    }
    
    if (validationIssues === 0) {
      console.log(`✅ All data passed validation checks`);
    } else {
      console.log(`⚠️ Found ${validationIssues} validation issues`);
    }
    
    const outputData = {
      metadata: {
        source: 'GitHub FPL repository',
        pulled_at: new Date().toISOString(),
        total_players: Object.keys(processedPlayers).length,
        success_count: successCount,
        error_count: errorCount,
        validation_issues: validationIssues,
        data_quality: validationIssues === 0 ? 'PASSED' : 'ISSUES_FOUND'
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
    
    console.log(`\n✅ Baseline data pull completed!`);
    console.log(`📁 File: ${outputPath}`);
    console.log(`📊 Players processed: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📈 Success rate: ${((successCount / (successCount + errorCount)) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('❌ Error in main process:', error.message);
  }
}

// Run the script
pullBaselineData();
