// Script: list-zero-baseline.js
// Purpose: Output players with 0 baseline gameweeks, excluding promoted clubs, to a CSV file.
// Output: ./zero-baseline-non-promoted.csv

const fs = require('fs');
const path = require('path');

async function fetchBootstrap() {
  const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_\s]/g, '');
}

function getBaselineLen(player, baselinePlayers, usedBaselineKeys) {
  try {
    const firstName = player.first_name || (player.web_name || '').split(' ')[0] || '';
    const secondName = player.second_name || (player.web_name || '').split(' ').slice(1).join(' ') || '';
    
    // PRIORITY 1: Try exact matches first (current logic preserved)
    const key1 = `${firstName}_${secondName}`;
    const key2 = `${secondName}_${firstName}`;
    if (baselinePlayers[key1] && !usedBaselineKeys.has(key1)) {
      usedBaselineKeys.add(key1);
      return (baselinePlayers[key1].season_history || []).length;
    }
    if (baselinePlayers[key2] && !usedBaselineKeys.has(key2)) {
      usedBaselineKeys.add(key2);
      return (baselinePlayers[key2].season_history || []).length;
    }
    
    // PRIORITY 2: Try web_name as underscore
    const webUnderscore = String(player.web_name || '').replace(/\s+/g, '_');
    if (baselinePlayers[webUnderscore] && !usedBaselineKeys.has(webUnderscore)) {
      usedBaselineKeys.add(webUnderscore);
      return (baselinePlayers[webUnderscore].season_history || []).length;
    }
    
    // PRIORITY 3: Try normalized exact matches
    const allKeys = Object.keys(baselinePlayers);
    const normWeb = normalize(webUnderscore);
    const exactNormKey = allKeys.find(k => normalize(k) === normWeb && !usedBaselineKeys.has(k));
    if (exactNormKey) {
      usedBaselineKeys.add(exactNormKey);
      return (baselinePlayers[exactNormKey].season_history || []).length;
    }
    
    const normNameKey = normalize(key1);
    const exactNormName = allKeys.find(k => normalize(k) === normNameKey && !usedBaselineKeys.has(k));
    if (exactNormName) {
      usedBaselineKeys.add(exactNormName);
      return (baselinePlayers[exactNormName].season_history || []).length;
    }
    
    // PRIORITY 4: Try partial matches for truncated names (NEW LOGIC)
    // This handles cases like "Garnacho Ferreyra" -> "Garnacho" or "Hernandez Cascante" -> "Hernandez"
    const secondNameParts = secondName.split(' ');
    for (let i = 1; i <= secondNameParts.length; i++) {
      const truncatedSecondName = secondNameParts.slice(0, i).join(' ');
      const truncatedKey1 = `${firstName}_${truncatedSecondName}`;
      const truncatedKey2 = `${truncatedSecondName}_${firstName}`;
      
      if (baselinePlayers[truncatedKey1] && !usedBaselineKeys.has(truncatedKey1)) {
        usedBaselineKeys.add(truncatedKey1);
        return (baselinePlayers[truncatedKey1].season_history || []).length;
      }
      if (baselinePlayers[truncatedKey2] && !usedBaselineKeys.has(truncatedKey2)) {
        usedBaselineKeys.add(truncatedKey2);
        return (baselinePlayers[truncatedKey2].season_history || []).length;
      }
    }
    
    // PRIORITY 5: Try reverse partial matches (baseline longer than FPL API)
    // This handles cases like "Matheus_Nunes" -> "Matheus Luiz_Nunes"
    const fplKey = `${firstName}_${secondName}`;
    const reverseMatch = allKeys.find(k => {
      if (usedBaselineKeys.has(k)) return false;
      // Check if baseline key contains FPL key with additional parts
      // Cases: "Matheus_Nunes" matches "Matheus Luiz_Nunes" or "Matheus_Something_Nunes"
      const parts = k.split('_');
      if (parts.length >= 2) {
        const firstPart = parts[0];
        const lastPart = parts[parts.length - 1];
        // Check if first part starts with firstName and last part contains secondName
        return firstPart.startsWith(firstName) && lastPart.includes(secondName);
      }
      return false;
    });
    if (reverseMatch) {
      usedBaselineKeys.add(reverseMatch);
      return (baselinePlayers[reverseMatch].season_history || []).length;
    }
    
    // PRIORITY 6: Try forward partial matches (FPL API longer than baseline)
    // This handles cases like "Rúben_dos Santos Gato Alves Dias" -> "Rúben_Gato Alves Dias"
    const forwardMatch = allKeys.find(k => {
      if (usedBaselineKeys.has(k)) return false;
      // Check if FPL key contains baseline key with additional parts
      // Cases: "Rúben_dos Santos Gato Alves Dias" matches "Rúben_Gato Alves Dias"
      const parts = k.split('_');
      if (parts.length >= 2) {
        const firstPart = parts[0];
        const lastPart = parts[parts.length - 1];
        // Check if FPL first part starts with baseline first part and FPL last part ends with baseline last part
        return firstName.startsWith(firstPart) && secondName.endsWith(lastPart);
      }
      return false;
    });
    if (forwardMatch) {
      usedBaselineKeys.add(forwardMatch);
      return (baselinePlayers[forwardMatch].season_history || []).length;
    }
    
    return 0;
  } catch {
    return 0;
  }
}

async function main() {
  // Load baseline JSON from repo
  const baselinePath = path.resolve(__dirname, '../src/data/2024-25-baseline-processed.json');
  const baselineData = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const baselinePlayers = (baselineData && baselineData.players) || {};

  const bootstrap = await fetchBootstrap();
  const players = bootstrap.elements || [];
  const teams = bootstrap.teams || [];

  const teamById = new Map();
  teams.forEach(t => teamById.set(t.id, t.name));

  // Promoted club IDs (align with predictor)
  const promotedTeamIds = new Set([3, 11, 17]);

  // Track which baseline keys have been used to ensure one-to-one matching
  const usedBaselineKeys = new Set();

  const zeroBaseline = players.filter(p => {
    if (promotedTeamIds.has(p.team)) return false; // exclude promoted clubs
    const len = getBaselineLen(p, baselinePlayers, usedBaselineKeys);
    return (len || 0) === 0;
  });

  const header = ['first_name', 'second_name', 'web_name', 'club'].join(',');
  const rows = zeroBaseline.map(p => {
    const first = String(p.first_name || '').replaceAll(',', '');
    const second = String(p.second_name || '').replaceAll(',', '');
    const web = String(p.web_name || '').replaceAll(',', '');
    const club = String(teamById.get(p.team) || 'Unknown').replaceAll(',', '');
    return [first, second, web, club].join(',');
  });

  const outPath = path.resolve(__dirname, '../zero-baseline-non-promoted.csv');
  fs.writeFileSync(outPath, [header, ...rows].join('\n'), 'utf8');
  console.log(`✅ Wrote ${rows.length} players to ${outPath}`);
  console.log(`📊 Used ${usedBaselineKeys.size} baseline entries for matching`);
  console.log(`🔍 This should fix the Rodri, Garnacho, Munoz, Nunes, Kepa issues`);
}

main().catch(err => {
  console.error('❌ Failed to list zero-baseline players:', err);
  process.exit(1);
});
