const https = require('https');

// Function to fetch data from GitHub API
function fetchGitHubData(url) {
  return new Promise((resolve, reject) => {
    console.log(`📡 Fetching: ${url}`);
    
    const options = {
      headers: {
        'User-Agent': 'FPL-Baseline-Puller',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    https.get(url, options, (res) => {
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

async function discoverFolders() {
  try {
    console.log('🔍 Discovering all player folders from GitHub...\n');
    
    // Use GitHub API to list contents of the players directory
    const apiUrl = 'https://api.github.com/repos/vaastav/Fantasy-Premier-League/contents/data/2024-25/players';
    const data = await fetchGitHubData(apiUrl);
    const folders = JSON.parse(data);
    
    console.log(`✅ Found ${folders.length} player folders\n`);
    
    // Display all folder names
    console.log('📁 All player folders:');
    folders.forEach((folder, index) => {
      if (folder.type === 'dir') {
        console.log(`${(index + 1).toString().padStart(3, ' ')}. ${folder.name}`);
      }
    });
    
    // Show some examples with their structure
    console.log('\n🔍 Sample folder analysis:');
    const sampleFolders = folders.slice(0, 10);
    sampleFolders.forEach(folder => {
      if (folder.type === 'dir') {
        const parts = folder.name.split('_');
        const id = parts[parts.length - 1];
        const nameParts = parts.slice(0, -1);
        
        console.log(`\n📂 ${folder.name}:`);
        console.log(`   Parts: ${nameParts.join(' + ')} + ID: ${id}`);
        console.log(`   Name: ${nameParts.join(' ')}`);
        console.log(`   ID: ${id}`);
      }
    });
    
    // Save the folder list to a file for reference
    const fs = require('fs');
    const outputPath = './player-folders-list.json';
    const outputData = {
      total_folders: folders.length,
      discovered_at: new Date().toISOString(),
      folders: folders.filter(f => f.type === 'dir').map(f => f.name)
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log(`\n💾 Folder list saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error discovering folders:', error.message);
    
    if (error.message.includes('403')) {
      console.log('\n💡 GitHub API rate limit reached. Trying alternative approach...');
      console.log('   You can manually check: https://github.com/vaastav/Fantasy-Premier-League/tree/master/data/2024-25/players');
    }
  }
}

discoverFolders();

