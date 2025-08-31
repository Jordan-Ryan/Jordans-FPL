const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const BASE_URL = 'https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/players';
const OUTPUT_PATH = path.join(__dirname, '../src/data/2024-25-baseline-processed.json');

// Function to fetch data from GitHub
function fetchData(url) {
  return new Promise((resolve, reject) => {
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

// Function to get player list from the GitHub repository
async function getPlayerList() {
  try {
    console.log('📡 Discovering all players from GitHub repository...');
    
    // Use GitHub API to get the list of all player folders
    const githubApiUrl = 'https://api.github.com/repos/vaastav/Fantasy-Premier-League/contents/data/2024-25/players';
    const githubData = await fetchData(githubApiUrl);
    const githubJson = JSON.parse(githubData);
    
    console.log(`✅ GitHub API data loaded: ${githubJson.length} player folders found`);
    
    // Extract player information from folder names
    const players = [];
    const processedNames = new Set();
    
    githubJson.forEach(folder => {
      if (folder.type !== 'dir') return;
      
      // Parse folder name: FirstName_LastName_With_Spaces_ID
      const folderName = folder.name;
      const parts = folderName.split('_');
      
      if (parts.length < 2) {
        console.log(`⚠️ Skipping malformed folder: ${folderName}`);
        return;
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
      
      // Ensure we don't have duplicates by name
      if (!processedNames.has(nameKey)) {
        processedNames.add(nameKey);
        players.push({
          folderName,
          nameKey, // Use this as the key in our output
          fplId: parseInt(id),
          firstName,
          lastName,
          fullName: lastName ? `${firstName} ${lastName}` : firstName,
          githubPath: folder.path,
          downloadUrl: folder.download_url
        });
      } else {
        console.log(`⚠️ Duplicate name found: ${nameKey} (${folderName})`);
      }
    });
    
    console.log(`📋 Discovered ${players.length} unique players to process`);
    console.log(`🔍 Sample players:`);
    players.slice(0, 5).forEach(p => {
      console.log(`   - ${p.fullName} (ID: ${p.fplId}, Key: ${p.nameKey})`);
    });
    
    return players;
    
  } catch (error) {
    console.error('❌ Error getting player list:', error.message);
    return [];
  }
}

// Function to process a single player
async function processPlayer(playerInfo) {
  try {
    // Use the download_url from GitHub API
    const url = playerInfo.downloadUrl;
    if (!url) {
      console.log(`⚠️ No download URL for ${playerInfo.folderName}`);
      return null;
    }
    
    const csvData = await fetchData(url);
    const gameweekData = parseCSV(csvData);
    
    if (gameweekData.length === 0) {
      console.log(`⚠️ No data for ${playerInfo.folderName}`);
      return null;
    }
    
    // VALIDATION: Allow duplicate gameweeks (DGWs); collect valid rows
    const validRows = [];
    
    for (const row of gameweekData) {
      const round = parseInt(row.round);
      
      // Skip invalid gameweeks
      if (isNaN(round) || round < 1 || round > 38) {
        console.log(`⚠️ Skipping invalid gameweek ${row.round} for ${playerInfo.folderName}`);
        continue;
      }
      
      // Validate the data is reasonable
      const totalPoints = parseInt(row.total_points) || 0;
      const minutes = parseInt(row.minutes) || 0;
      
      // Skip unrealistic data (e.g., >50 points for a single gameweek)
      if (totalPoints > 50) {
        console.log(`⚠️ Skipping unrealistic points ${totalPoints} for ${playerInfo.folderName} GW${round}`);
        continue;
      }
      
      // Skip if minutes are invalid
      if (minutes < 0 || minutes > 120) {
        console.log(`⚠️ Skipping invalid minutes ${minutes} for ${playerInfo.folderName} GW${round}`);
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
      console.log(`⚠️ No valid gameweek data for ${playerInfo.folderName}`);
      return null;
    }
    
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
    
    return {
      name: playerInfo.fullName,
      name_key: playerInfo.nameKey, // Use firstName_LastName as key
      fpl_id: playerInfo.fplId, // Store the current FPL ID for reference
      element_type: 0, // Will be updated from FPL API
      team: '', // Will be updated from FPL API
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
    
  } catch (error) {
    console.error(`❌ Error processing ${playerInfo.folderName}:`, error.message);
    return null;
  }
}

// Main function to pull and process all data
async function pullBaselineData() {
  try {
    console.log('🚀 Starting baseline data pull from GitHub...');
    console.log(`📁 Source: ${BASE_URL}`);
    console.log(`📁 Output: ${OUTPUT_PATH}`);
    
    // Get list of players to process
    const players = await getPlayerList();
    
    if (players.length === 0) {
      console.log('❌ No players found to process');
      return;
    }
    
    console.log(`\n📊 Processing ${players.length} players...`);
    
    const processedPlayers = {};
    let successCount = 0;
    let errorCount = 0;
    
    // Process players in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(players.length/batchSize)} (${batch.length} players)`);
      
      const batchPromises = batch.map(async (playerInfo) => {
        const playerData = await processPlayer(playerInfo);
        if (playerData) {
          // Use the name_key as the key in our output
          processedPlayers[playerData.name_key] = playerData;
          successCount++;
          console.log(`✅ ${playerData.name} (Key: ${playerData.name_key}, ID: ${playerData.fpl_id}): ${playerData.stats.total_games} games, ${playerData.stats.total_points} points`);
        } else {
          errorCount++;
          console.log(`❌ Failed to process ${playerInfo.folderName}`);
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to be respectful to GitHub
      if (i + batchSize < players.length) {
        console.log('⏳ Waiting 2 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // Save the processed data
    console.log(`\n💾 Saving processed data...`);
    console.log(`📊 Successfully processed: ${successCount} players`);
    console.log(`📊 Failed: ${errorCount} players`);
    console.log(`📊 Total: ${Object.keys(processedPlayers).length} players in output`);
    
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
        source: BASE_URL,
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
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the data
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(outputData, null, 2));
    
    console.log(`\n✅ Baseline data successfully pulled and saved!`);
    console.log(`📁 File: ${OUTPUT_PATH}`);
    console.log(`📊 Size: ${(fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(2)} MB`);
    
    // Show some sample data
    console.log(`\n🔍 Sample processed players:`);
    const sampleNames = Object.keys(processedPlayers).slice(0, 5);
    sampleNames.forEach(name => {
      const player = processedPlayers[name];
      console.log(`   - ${name}: ${player.stats.total_games} games, ${player.stats.total_points} points, ${player.stats.average_points.toFixed(1)} avg`);
    });
    
  } catch (error) {
    console.error('❌ Error pulling baseline data:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  pullBaselineData();
}

module.exports = { pullBaselineData, processPlayer };
