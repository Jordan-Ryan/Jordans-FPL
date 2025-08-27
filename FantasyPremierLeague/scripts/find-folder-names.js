const https = require('https');

function testUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve(res.statusCode === 200);
    }).on('error', () => resolve(false));
  });
}

async function findFolderNames() {
  console.log('🔍 Testing different folder name patterns...\n');
  
  const testPatterns = [
    // Test different variations for Son
    'Heung_Min_Son_233',
    'Son_Heung_Min_233', 
    'Heung_Min%20Son_233',
    'Son_Heung%20Min_233',
    'Heung-Min-Son_233',
    'Son_233',
    
    // Test different variations for Van Dijk
    'Virgil_Van_Dijk_121',
    'Van_Dijk_Virgil_121',
    'Virgil_Van%20Dijk_121',
    'Van%20Dijk_Virgil_121',
    'Van-Dijk_Virgil_121',
    'Van_Dijk_121',
    
    // Test De Bruyne
    'Kevin_De_Bruyne_122',
    'De_Bruyne_Kevin_122',
    'Kevin_De%20Bruyne_122',
    'De%20Bruyne_Kevin_122',
    'De-Bruyne_Kevin_122',
    'De_Bruyne_122'
  ];
  
  for (const pattern of testPatterns) {
    const url = `https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/players/${pattern}/gw.csv`;
    const exists = await testUrl(url);
    console.log(`${exists ? '✅' : '❌'} ${pattern}`);
  }
}

findFolderNames();

