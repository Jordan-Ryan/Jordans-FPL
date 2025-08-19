// Premier League API Service
export interface PLMatch {
  id: string;
  homeTeam: {
    name: string;
    shortName: string;
    score?: number;
    clubColors?: {
      primary: string;
    };
  };
  awayTeam: {
    name: string;
    shortName: string;
    score?: number;
    clubColors?: {
      primary: string;
    };
  };
  kickoff: string;
  status?: string; // Made optional since API might not use this
  period: string; // Premier League API uses this: 'PreMatch', 'LIVE', 'FINISHED', etc.
  clock?: string | {
    label: string;
  };
  score?: {
    home: number;
    away: number;
  };
  gameweek?: number; // Made optional since it might not exist
  matchWeek?: number; // Premier League API uses this (camelCase)
  matchweek?: number; // Alternative field name
  week?: number; // Another possible field name
  round?: number; // Another possible field name
  gw?: number; // Short form
  competition: {
    name: string;
  };
}

export interface PLLineup {
  formation: string;
  players: PLPlayer[];
}

export interface PLPlayer {
  id: string;
  position: string;
  shirtNum: number;
  knownName: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface PLStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  fouls: number;
  yellowCards: number;
  redCards: number;
}

// Convert Premier League API match to our app's Fixture format
export const convertPLMatchToAppFixture = (plMatch: PLMatch) => {
  const kickoffDate = new Date(plMatch.kickoff);
  
  // Format date
  const dateStr = kickoffDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
  const timeStr = kickoffDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  
  // Determine status and minutes based on Premier League API
  // The API uses 'period' field with values like 'PreMatch', 'LIVE', 'FINISHED', etc.
  let status = 'TBC';
  let minutes = '';
  
  console.log('=== STATUS DETECTION DEBUG ===');
  console.log('Period field:', plMatch.period);
  console.log('Clock field:', plMatch.clock);
  console.log('Score field:', plMatch.score);
  
  if (plMatch.period === 'LIVE' || plMatch.period === 'FIRST_HALF' || plMatch.period === 'SECOND_HALF') {
    status = 'LIVE';
    // Handle both string and object clock formats
    if (typeof plMatch.clock === 'string') {
      minutes = plMatch.clock;
    } else if (plMatch.clock?.label) {
      minutes = plMatch.clock.label;
    } else {
      minutes = '';
    }
    console.log('✅ Match is LIVE, minutes:', minutes);
  } else if (plMatch.period === 'FINISHED' || plMatch.period === 'FullTime') {
    status = 'FINISHED';
    minutes = '';
    console.log('✅ Match is FINISHED/FullTime');
  } else if (plMatch.period === 'HALF_TIME') {
    status = 'HALF_TIME';
    minutes = '';
    console.log('✅ Match is HALF_TIME');
  } else if (plMatch.period === 'PreMatch' || plMatch.period === 'SCHEDULED') {
    status = 'TBC';
    minutes = '';
    console.log('✅ Match is SCHEDULED/PreMatch');
  } else {
    console.log('⚠️ Unknown period:', plMatch.period, '- defaulting to TBC');
  }
  
  console.log('Final status:', status);
  console.log('Final minutes:', minutes);
  console.log('=== END STATUS DETECTION ===');
  
  // Shorten team names for display
  const shortenTeamName = (teamName: string) => {
    const shortNames: { [key: string]: string } = {
      'Brighton and Hove Albion': 'Brighton',
      'Nottingham Forest': 'Nott\'m Forest',
      'Manchester United': 'Man United',
      'Manchester City': 'Man City',
      'Sheffield United': 'Sheffield Utd',
      'Crystal Palace': 'Crystal Palace',
      'Aston Villa': 'Aston Villa',
      'Newcastle United': 'Newcastle',
      'West Ham United': 'West Ham',
      'Tottenham Hotspur': 'Tottenham',
      'Sunderland AFC': 'Sunderland',
      'Wolverhampton Wanderers': 'Wolves'
    };
    return shortNames[teamName] || teamName;
  };

  // Debug: Log the team names being processed
  const homeTeamShortened = shortenTeamName(plMatch.homeTeam.name);
  const awayTeamShortened = shortenTeamName(plMatch.awayTeam.name);
  
  console.log('Team name conversion:');
  console.log('  Home:', plMatch.homeTeam.name, '->', homeTeamShortened);
  console.log('  Away:', plMatch.awayTeam.name, '->', awayTeamShortened);
  
  // Try to find the gameweek from different possible field names
  // The Premier League API uses 'matchWeek' (camelCase)
  let gameweek = 1; // Default fallback
  const possibleGameweekFields = ['matchWeek', 'matchweek', 'gameweek', 'week', 'round', 'gw'];
  
  console.log('=== GAMEWEEK DETECTION DEBUG ===');
  console.log('Raw plMatch object keys:', Object.keys(plMatch));
  console.log('Raw plMatch object:', JSON.stringify(plMatch, null, 2));
  
  for (const field of possibleGameweekFields) {
    console.log(`Checking field '${field}':`, plMatch[field as keyof PLMatch]);
    if (plMatch[field as keyof PLMatch] !== undefined) {
      gameweek = Number(plMatch[field as keyof PLMatch]);
      console.log(`✅ Found gameweek ${gameweek} using field '${field}'`);
      break;
    } else {
      console.log(`❌ Field '${field}' not found or undefined`);
    }
  }
  
  console.log('Final gameweek value:', gameweek);
  console.log('=== END GAMEWEEK DETECTION ===');
  
  return {
    id: parseInt(plMatch.id),
    home_team: homeTeamShortened,
    away_team: awayTeamShortened,
    home_team_short: plMatch.homeTeam.shortName,
    away_team_short: plMatch.awayTeam.shortName,
    difficulty: 'Medium', // Will be calculated based on team strength
    difficulty_score: 3,
    date: `${dateStr} ${kickoffDate.getDate()}, ${timeStr}`,
    gameweek: gameweek,
    home_team_original: plMatch.homeTeam.name,
    away_team_original: plMatch.awayTeam.name,
    status,
    minutes,
    home_score: plMatch.homeTeam.score || 0,
    away_score: plMatch.awayTeam.score || 0,
    kickoff: plMatch.kickoff,
  };
};

// Fetch fixtures from Premier League API
export const fetchFixtures = async (gameweek?: number) => {
  try {
    console.log('Fetching fixtures from Premier League API...');
    console.log('Requested gameweek:', gameweek);
    
    // If specific gameweek is requested, fetch only that gameweek
    if (gameweek && gameweek > 0) {
      console.log(`Fetching specific gameweek: ${gameweek}`);
      const endpoint = `https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches?competition=8&season=2025&matchweek=${gameweek}&_limit=500`;
      
      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Gameweek ${gameweek} API response structure:`, Object.keys(data));
        
        let matches = [];
        if (data.content) {
          matches = data.content;
        } else if (Array.isArray(data)) {
          matches = data;
        } else if (data.matches) {
          matches = data.matches;
        } else if (data.data) {
          matches = data.data;
        }
        
        if (matches && matches.length > 0) {
          console.log(`Found ${matches.length} matches for gameweek ${gameweek}`);
          
          // Debug: Log the first few matches to see the actual structure
          console.log(`Gameweek ${gameweek} sample matches structure:`);
          matches.slice(0, 2).forEach((match: any, index: number) => {
            console.log(`Match ${index + 1} structure:`, Object.keys(match));
            console.log('  Raw match data:', JSON.stringify(match, null, 2));
          });
          
          return matches;
        } else {
          console.log(`No matches found for gameweek ${gameweek}`);
          return [];
        }
      } catch (error) {
        console.error(`Error fetching gameweek ${gameweek}:`, error);
        return [];
      }
    }
    
    // For "All" gameweeks (gameweek === 0), try to get all fixtures in one call
    console.log('Fetching all fixtures in single API call...');
    
    // Try different endpoints that might return all fixtures without gameweek filtering
    const allFixturesEndpoints = [
      // Try with high limit to ensure we get all fixtures
      'https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches?competition=8&season=2025&_limit=500',
      // Try with very high limit as backup
      'https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches?competition=8&season=2025&_limit=1000',
      // Try alternative endpoint structure with high limit
      'https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches?competition=8&season=2025&_limit=500',
      // Try without season but with high limit
      'https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches?competition=8&_limit=500',
      // Try previous season as fallback with high limit
      'https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches?competition=8&season=2024&_limit=500'
    ];
    
    for (const endpoint of allFixturesEndpoints) {
      try {
        console.log('Trying all fixtures endpoint:', endpoint);
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          console.log(`HTTP error! status: ${response.status} for ${endpoint}`);
          continue;
        }
        
        const data = await response.json();
        console.log('All fixtures API response structure:', Object.keys(data));
        console.log('Response data length:', data?.length || 'No length property');
        console.log('Response data keys:', Object.keys(data));
        
        let matches = [];
        if (data.content) {
          matches = data.content;
          console.log('Using data.content, length:', matches.length);
        } else if (Array.isArray(data)) {
          matches = data;
          console.log('Using data as array, length:', matches.length);
        } else if (data.matches) {
          matches = data.matches;
          console.log('Using data.matches, length:', matches.length);
        } else if (data.data) {
          matches = data.data;
          console.log('Using data.data, length:', matches.length);
        } else {
          console.log('No recognized data structure found');
          console.log('Available keys:', Object.keys(data));
          if (data.pagination) {
            console.log('Pagination info:', data.pagination);
          }
        }
        
        if (matches && matches.length > 0) {
          console.log(`Found ${matches.length} total fixtures from single API call`);
          
          // Check if this is paginated data and we need to fetch more pages
          if (data.pagination && data.pagination._next) {
            console.log('⚠️ Pagination detected! This endpoint returns paginated results.');
            console.log('Pagination info:', data.pagination);
            console.log('Current page fixtures:', matches.length);
            console.log('Next page available:', data.pagination._next);
            
            // For paginated results, we need to use the fallback method
            console.log('Using fallback method for paginated data...');
            continue;
          }
          
          // Debug: Log the first few matches to see the actual structure
          console.log('Sample matches structure:');
          matches.slice(0, 3).forEach((match: any, index: number) => {
            console.log(`Match ${index + 1} structure:`, Object.keys(match));
            console.log('  Raw match data:', JSON.stringify(match, null, 2));
          });
          
          // Check if we have fixtures from multiple gameweeks - try different possible field names
          // The Premier League API uses 'matchWeek' (camelCase)
          const possibleGameweekFields = ['matchWeek', 'matchweek', 'gameweek', 'week', 'round', 'gw'];
          let gameweeks: number[] = [];
          
          for (const field of possibleGameweekFields) {
            if (matches[0] && matches[0][field] !== undefined) {
              const foundGameweeks = matches.map((match: any) => match[field]).filter(Boolean);
              gameweeks = [...new Set(foundGameweeks)].map(gw => Number(gw));
              console.log(`Found gameweeks using field '${field}':`, gameweeks);
              console.log('Gameweek range:', Math.min(...gameweeks), 'to', Math.max(...gameweeks));
              break;
            }
          }
          
          if (gameweeks.length > 1) {
            console.log('Successfully got multiple gameweeks in single call!');
            console.log('Total fixtures:', matches.length);
            console.log('Gameweeks covered:', gameweeks.length);
            return matches;
          } else {
            console.log('Only got single gameweek, trying next endpoint...');
            continue;
          }
        }
        
        console.log(`No matches found in ${endpoint}`);
      } catch (error) {
        console.error(`Error with endpoint ${endpoint}:`, error);
        continue;
      }
    }
    
    // If single API calls fail, fall back to multiple gameweek calls
    console.log('Single API calls failed, falling back to multiple gameweek calls...');
    const allMatches = [];
    
    for (let gw = 1; gw <= 38; gw++) {
      try {
        const endpoint = `https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches?competition=8&season=2025&matchweek=${gw}&_limit=500`;
        console.log(`Fetching gameweek ${gw}...`);
        
        const response = await fetch(endpoint);
        if (!response.ok) {
          console.log(`HTTP error! status: ${response.status} for gameweek ${gw}`);
          continue;
        }
        
        const data = await response.json();
        let matches = [];
        if (data.content) {
          matches = data.content;
        } else if (Array.isArray(data)) {
          matches = data;
        } else if (data.matches) {
          matches = data.matches;
        } else if (data.data) {
          matches = data.data;
        }
        
        if (matches && matches.length > 0) {
          console.log(`Found ${matches.length} matches for gameweek ${gw}`);
          allMatches.push(...matches);
        }
        
        // Small delay between requests to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error fetching gameweek ${gw}:`, error);
        continue;
      }
    }
    
    if (allMatches.length > 0) {
      console.log(`Total matches found across all gameweeks: ${allMatches.length}`);
      return allMatches;
    }
    
    console.log('No matches found from any gameweek, using fallback data');
    // Return comprehensive mock data as fallback
    return [
      {
        id: '1',
        homeTeam: { name: 'Liverpool', shortName: 'LIV' },
        awayTeam: { name: 'Bournemouth', shortName: 'BOU' },
        kickoff: '2025-08-17T15:00:00Z',
        status: 'SCHEDULED',
        period: 'SCHEDULED',
        clock: { label: '' },
        score: { home: 0, away: 0 },
        gameweek: 1,
        competition: { name: 'Premier League' }
      },
      {
        id: '2',
        homeTeam: { name: 'Arsenal', shortName: 'ARS' },
        awayTeam: { name: 'Chelsea', shortName: 'CHE' },
        kickoff: '2025-08-18T16:30:00Z',
        status: 'SCHEDULED',
        period: 'SCHEDULED',
        clock: { label: '' },
        score: { home: 0, away: 0 },
        gameweek: 1,
        competition: { name: 'Premier League' }
      },
      {
        id: '3',
        homeTeam: { name: 'Man City', shortName: 'MCI' },
        awayTeam: { name: 'Tottenham', shortName: 'TOT' },
        kickoff: '2025-08-19T20:00:00Z',
        status: 'SCHEDULED',
        period: 'SCHEDULED',
        clock: { label: '' },
        score: { home: 0, away: 0 },
        gameweek: 1,
        competition: { name: 'Premier League' }
      },
      {
        id: '4',
        homeTeam: { name: 'Man United', shortName: 'MUN' },
        awayTeam: { name: 'Newcastle', shortName: 'NEW' },
        kickoff: '2025-08-20T19:45:00Z',
        status: 'SCHEDULED',
        period: 'SCHEDULED',
        clock: { label: '' },
        score: { home: 0, away: 0 },
        gameweek: 1,
        competition: { name: 'Premier League' }
      },
      {
        id: '5',
        homeTeam: { name: 'Brighton', shortName: 'BHA' },
        awayTeam: { name: 'West Ham', shortName: 'WHU' },
        kickoff: '2025-08-21T15:00:00Z',
        status: 'SCHEDULED',
        period: 'SCHEDULED',
        clock: { label: '' },
        score: { home: 0, away: 0 },
        gameweek: 1,
        competition: { name: 'Premier League' }
      },
      {
        id: '6',
        homeTeam: { name: 'Aston Villa', shortName: 'AVL' },
        awayTeam: { name: 'Crystal Palace', shortName: 'CRY' },
        kickoff: '2025-08-22T15:00:00Z',
        status: 'SCHEDULED',
        period: 'SCHEDULED',
        clock: { label: '' },
        score: { home: 0, away: 0 },
        gameweek: 1,
        competition: { name: 'Premier League' }
      },
      {
        id: '7',
        homeTeam: { name: 'Brentford', shortName: 'BRE' },
        awayTeam: { name: 'Everton', shortName: 'EVE' },
        kickoff: '2025-08-23T15:00:00Z',
        status: 'SCHEDULED',
        period: 'SCHEDULED',
        clock: { label: '' },
        score: { home: 0, away: 0 },
        gameweek: 1,
        competition: { name: 'Premier League' }
      },
      {
        id: '8',
        homeTeam: { name: 'Burnley', shortName: 'BUR' },
        awayTeam: { name: 'Fulham', shortName: 'FUL' },
        kickoff: '2025-08-24T15:00:00Z',
        status: 'SCHEDULED',
        period: 'SCHEDULED',
        clock: { label: '' },
        score: { home: 0, away: 0 },
        gameweek: 1,
        competition: { name: 'Premier League' }
      },
      {
        id: '9',
        homeTeam: { name: 'Luton', shortName: 'LUT' },
        awayTeam: { name: 'Nottingham Forest', shortName: 'NFO' },
        kickoff: '2025-08-25T15:00:00Z',
        status: 'SCHEDULED',
        period: 'SCHEDULED',
        clock: { label: '' },
        score: { home: 0, away: 0 },
        gameweek: 1,
        competition: { name: 'Premier League' }
      },
      {
        id: '10',
        homeTeam: { name: 'Sheffield United', shortName: 'SHU' },
        awayTeam: { name: 'Wolves', shortName: 'WOL' },
        kickoff: '2025-08-26T15:00:00Z',
        status: 'SCHEDULED',
        period: 'SCHEDULED',
        clock: { label: '' },
        score: { home: 0, away: 0 },
        gameweek: 1,
        competition: { name: 'Premier League' }
      }
    ];
  } catch (error) {
    console.error('Error fetching fixtures:', error);
    return [];
  }
};

// Fetch lineup data for a specific match
export const fetchLineups = async (matchId: string) => {
  try {
    const response = await fetch(`https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches/${matchId}/lineups`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching lineups:', error);
    return null;
  }
};

// Fetch match stats
export const fetchMatchStats = async (matchId: string) => {
  try {
    const response = await fetch(`https://sdp-prem-prod.premier-league-prod.pulselive.com/api/v2/matches/${matchId}/stats`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching match stats:', error);
    return null;
  }
};

// Get team badge URL
export const getTeamBadgeUrl = (teamName: string) => {
  console.log('getTeamBadgeUrl called with:', teamName);
  console.log('getTeamBadgeUrl teamName type:', typeof teamName, 'length:', teamName?.length);
  
  const badgeMap: { [key: string]: string } = {
    'Arsenal': 'https://resources.premierleague.com/premierleague/badges/t3.png',
    'Aston Villa': 'https://resources.premierleague.com/premierleague/badges/t7.png',
    'Bournemouth': 'https://resources.premierleague.com/premierleague/badges/t91.png',
    'Brentford': 'https://resources.premierleague.com/premierleague/badges/t94.png',
    'Brighton': 'https://resources.premierleague.com/premierleague/badges/t36.png',
    'Burnley': 'https://resources.premierleague.com/premierleague/badges/t90.png',
    'Chelsea': 'https://resources.premierleague.com/premierleague/badges/t8.png',
    'Crystal Palace': 'https://resources.premierleague.com/premierleague/badges/t31.png',
    'Everton': 'https://resources.premierleague.com/premierleague/badges/t11.png',
    'Fulham': 'https://resources.premierleague.com/premierleague/badges/t54.png',
    'Leeds United': 'https://resources.premierleague.com/premierleague/badges/t2.png',
    'Liverpool': 'https://resources.premierleague.com/premierleague/badges/t14.png',
    'Luton': 'https://resources.premierleague.com/premierleague/badges/t102.png',
    'Man City': 'https://resources.premierleague.com/premierleague/badges/t43.png',
    'Man United': 'https://resources.premierleague.com/premierleague/badges/t1.png',
    'Newcastle': 'https://resources.premierleague.com/premierleague/badges/t4.png',
    'Nottingham Forest': 'https://resources.premierleague.com/premierleague/badges/t17.png',
    'Sunderland': 'https://resources.premierleague.com/premierleague/badges/t56.png',
    'Sheffield United': 'https://resources.premierleague.com/premierleague/badges/t49.png',
    'Tottenham': 'https://resources.premierleague.com/premierleague/badges/t6.png',
    'West Ham': 'https://resources.premierleague.com/premierleague/badges/t21.png',
    'Wolves': 'https://resources.premierleague.com/premierleague/badges/t39.png',
  };
  
  // Try exact match first
  if (badgeMap[teamName]) {
    console.log('Exact match found for:', teamName);
    return badgeMap[teamName];
  }
  
  // Try case-insensitive match
  const lowerTeamName = teamName.toLowerCase();
  for (const [key, value] of Object.entries(badgeMap)) {
    if (key.toLowerCase() === lowerTeamName) {
      console.log('Case-insensitive match found for:', teamName, '->', key);
      return value;
    }
  }
  
  // Try partial matches for variations
  if (teamName.includes('Brighton')) return badgeMap['Brighton'];
  if (teamName.includes('Nottingham') || teamName.includes('Forest')) return badgeMap['Nottingham Forest'];
  if (teamName.includes('Manchester United') || teamName.includes('Man United')) return badgeMap['Man United'];
  if (teamName.includes('Manchester City') || teamName.includes('Man City')) return badgeMap['Man City'];
  if (teamName.includes('Wolverhampton') || teamName.includes('Wolves')) return badgeMap['Wolves'];
  if (teamName.includes('Sunderland') || teamName.includes('SUN') || teamName.includes('sunderland') || teamName.includes('sun')) return badgeMap['Sunderland'];
  if (teamName.includes('Leeds') || teamName.includes('LEE')) return badgeMap['Leeds United'];
  
  // Additional team name variations that might be causing issues
  if (teamName.includes('Tottenham') || teamName.includes('Spurs')) return badgeMap['Tottenham'];
  if (teamName.includes('West Ham') || teamName.includes('Hammers')) return badgeMap['West Ham'];
  if (teamName.includes('Newcastle') || teamName.includes('Magpies')) return badgeMap['Newcastle'];
  if (teamName.includes('Aston Villa') || teamName.includes('Villa')) return badgeMap['Aston Villa'];
  if (teamName.includes('Crystal Palace') || teamName.includes('Palace')) return badgeMap['Crystal Palace'];
  if (teamName.includes('Sheffield United') || teamName.includes('Blades')) return badgeMap['Sheffield United'];
  if (teamName.includes('Brentford') || teamName.includes('Bees')) return badgeMap['Brentford'];
  if (teamName.includes('Burnley') || teamName.includes('Clarets')) return badgeMap['Burnley'];
  if (teamName.includes('Luton') || teamName.includes('Hatters')) return badgeMap['Luton'];
  if (teamName.includes('Fulham') || teamName.includes('Cottagers')) return badgeMap['Fulham'];
  if (teamName.includes('Everton') || teamName.includes('Toffees')) return badgeMap['Everton'];
  if (teamName.includes('Bournemouth') || teamName.includes('Cherries')) return badgeMap['Bournemouth'];
  if (teamName.includes('Chelsea') || teamName.includes('Blues')) return badgeMap['Chelsea'];
  if (teamName.includes('Liverpool') || teamName.includes('Reds')) return badgeMap['Liverpool'];
  if (teamName.includes('Arsenal') || teamName.includes('Gunners')) return badgeMap['Arsenal'];
  
  // Debug logging to see what team names are being passed
  console.log('Team name not found in badgeMap:', teamName);
  
  // Default fallback
  console.log('No badge found for:', teamName, '- using Arsenal as fallback');
  return badgeMap['Arsenal'];
}; 