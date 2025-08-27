const https = require('https');

// Function to fetch data from GitHub
function fetchData(url) {
  return new Promise((resolve, reject) => {
    console.log(`📡 Fetching: ${url}`);
    
    https.get(url, (res) => {
      console.log(`📊 Response status: ${res.statusCode}`);
      console.log(`📊 Response headers:`, res.headers);
      
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

async function testCSVFormat() {
  try {
    console.log('🔍 Testing CSV format from GitHub repository...\n');
    
    // Test with a known player - let's try Salah
    const testUrl = 'https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/players/Mohamed_Salah_118/gw.csv';
    
    console.log('=' .repeat(60));
    console.log('TEST 1: Mohamed_Salah_118');
    console.log('=' .repeat(60));
    
    try {
      const csvData = await fetchData(testUrl);
      console.log(`\n✅ Data fetched successfully!`);
      console.log(`📊 Data length: ${csvData.length} characters`);
      console.log(`📊 First 500 characters:`);
      console.log(csvData.substring(0, 500));
      
      if (csvData.includes('round,total_points,minutes')) {
        console.log(`\n✅ CSV headers found!`);
        
        // Parse the first few lines
        const lines = csvData.trim().split('\n');
        console.log(`\n📊 Total lines: ${lines.length}`);
        console.log(`📊 Headers: ${lines[0]}`);
        
        if (lines.length > 1) {
          console.log(`📊 First data row: ${lines[1]}`);
        }
        if (lines.length > 2) {
          console.log(`📊 Second data row: ${lines[2]}`);
        }
        
      } else {
        console.log(`\n❌ CSV headers not found`);
        console.log(`📊 Data preview:`, csvData.substring(0, 200));
      }
      
    } catch (error) {
      console.log(`❌ Failed to fetch Salah data: ${error.message}`);
    }
    
    // Test with another player
    console.log('\n' + '=' .repeat(60));
    console.log('TEST 2: Erling_Haaland_418');
    console.log('=' .repeat(60));
    
    try {
      const haalandUrl = 'https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/players/Erling_Haaland_418/gw.csv';
      const haalandData = await fetchData(haalandUrl);
      console.log(`\n✅ Haaland data fetched successfully!`);
      console.log(`📊 Data length: ${haalandData.length} characters`);
      
      if (haalandData.includes('round,total_points,minutes')) {
        console.log(`\n✅ Haaland CSV headers found!`);
        const lines = haalandData.trim().split('\n');
        console.log(`📊 Total lines: ${lines.length}`);
        console.log(`📊 Headers: ${lines[0]}`);
      }
      
    } catch (error) {
      console.log(`❌ Failed to fetch Haaland data: ${error.message}`);
    }
    
    // Test with a different player
    console.log('\n' + '=' .repeat(60));
    console.log('TEST 3: Kevin_De_Bruyne_122');
    console.log('=' .repeat(60));
    
    try {
      const kdbUrl = 'https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/players/Kevin_De_Bruyne_122/gw.csv';
      const kdbData = await fetchData(kdbUrl);
      console.log(`\n✅ KDB data fetched successfully!`);
      console.log(`📊 Data length: ${kdbData.length} characters`);
      
      if (kdbData.includes('round,total_points,minutes')) {
        console.log(`\n✅ KDB CSV headers found!`);
        const lines = kdbData.trim().split('\n');
        console.log(`📊 Total lines: ${lines.length}`);
        console.log(`📊 Headers: ${lines[0]}`);
      }
      
    } catch (error) {
      console.log(`❌ Failed to fetch KDB data: ${error.message}`);
    }
    
    // Test the directory structure
    console.log('\n' + '=' .repeat(60));
    console.log('TEST 4: Directory Structure');
    console.log('=' .repeat(60));
    
    try {
      // Try to access the main players directory
      const dirUrl = 'https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/players/README.md';
      const dirData = await fetchData(dirUrl);
      console.log(`\n✅ Directory README fetched!`);
      console.log(`📊 Content:`, dirData.substring(0, 500));
      
    } catch (error) {
      console.log(`❌ Failed to fetch directory info: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error in test:', error.message);
  }
}

// Run the test
testCSVFormat();

