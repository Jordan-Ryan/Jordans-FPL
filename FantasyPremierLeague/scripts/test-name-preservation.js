// Test the name preservation logic
const testNames = [
  'Aaron_Wan-Bissaka_388',
  'Abdoulaye_Doucouré_217',
  'Dara_O\'Shea_630',
  'Kevin_De Bruyne_345',
  'Virgil_van Dijk_339'
];

testNames.forEach(folderName => {
  console.log(`\n🔍 Testing: ${folderName}`);
  
  // Parse folder name: FirstName_LastName_With_Spaces_ID
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
  
  // Clean up names - preserve hyphens, apostrophes, and common accented characters
  firstName = firstName.replace(/[^a-zA-Z\s\-'éèêëàâäôöùûüçñ]/g, '').trim();
  lastName = lastName.replace(/[^a-zA-Z\s\-'éèêëàâäôöùûüçñ]/g, '').trim();
  
  // Create a unique key using just the name (without ID)
  const nameKey = lastName ? `${firstName}_${lastName}` : firstName;
  const fullName = lastName ? `${firstName} ${lastName}` : firstName;
  
  console.log(`   Original: ${nameParts.join(' ')}`);
  console.log(`   First: "${firstName}"`);
  console.log(`   Last: "${lastName}"`);
  console.log(`   Full: "${fullName}"`);
  console.log(`   Key: "${nameKey}"`);
  console.log(`   ID: ${id}`);
});

