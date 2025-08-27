import { FPLBootstrapData, FPLPlayer, FPLTeam, Fixture } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// FPL API service with real endpoints
export const fplApiService = {
  // Base URL for FPL API
  baseUrl: 'https://fantasy.premierleague.com/api',
  
  // Local storage directory for photos
  photoStorageDir: `${FileSystem.documentDirectory}player_photos/`,
  
  // Initialize photo storage directory
  async initPhotoStorage(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.photoStorageDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.photoStorageDir, { intermediates: true });
        console.log('📁 Created photo storage directory');
      }
      
      // Store ghost image in local storage for players without photos
      await this.storeGhostImage();
    } catch (error) {
      console.error('❌ Error creating photo storage directory:', error);
    }
  },

  // Store ghost image in local photo storage
  async storeGhostImage(): Promise<string | null> {
    try {
      const ghostFileName = 'ghost_player.png';
      const ghostFilePath = `${this.photoStorageDir}${ghostFileName}`;
      
      // Check if ghost image already exists
      const fileInfo = await FileSystem.getInfoAsync(ghostFilePath);
      if (fileInfo.exists) {
        console.log('👻 Ghost image already exists in local storage');
        return ghostFilePath;
      }
      
      // Create a simple base64-encoded ghost image (simple gray placeholder)
      // This avoids the asset bundling issues
      const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      await FileSystem.writeAsStringAsync(ghostFilePath, base64Image, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      console.log('👻 Ghost image stored in local storage:', ghostFilePath);
      return ghostFilePath;
    } catch (error) {
      console.error('❌ Error storing ghost image:', error);
      return null;
    }
  },

  // Get ghost image path from local storage
  async getGhostImagePath(): Promise<string | null> {
    try {
      const ghostFileName = 'ghost_player.png';
      const ghostFilePath = `${this.photoStorageDir}${ghostFileName}`;
      
      const fileInfo = await FileSystem.getInfoAsync(ghostFilePath);
      if (fileInfo.exists) {
        return ghostFilePath;
      }
      
      // If ghost image doesn't exist, try to store it
      return await this.storeGhostImage();
    } catch (error) {
      console.error('❌ Error getting ghost image path:', error);
      return null;
    }
  },

  // Download and store a single photo locally
  async downloadAndStorePhoto(playerId: number, photoCode?: string): Promise<string | null> {
    try {
      const fileName = `player_${playerId}.png`;
      const filePath = `${this.photoStorageDir}${fileName}`;
      
      // Check if already downloaded
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        console.log(`🖼️ Photo already exists for player ${playerId}`);
        return filePath;
      }
      
      // Use FPL photo code if available, otherwise fallback to player ID
      const photoUrl = photoCode ? this.getPlayerPhotoUrl(photoCode) : this.getPlayerPhotoUrlById(playerId);
      console.log(`📥 Downloading photo for player ${playerId}: ${photoUrl}`);
      
      const downloadResult = await FileSystem.downloadAsync(photoUrl, filePath);
      
      if (downloadResult.status === 200) {
        console.log(`✅ Photo downloaded for player ${playerId}: ${filePath}`);
        return filePath;
      } else {
        console.log(`❌ Failed to download photo for player ${playerId}: ${downloadResult.status}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error downloading photo for player ${playerId}:`, error);
      return null;
    }
  },

  // Batch download and store photos
  async batchDownloadPhotos(players: FPLPlayer[], batchSize: number = 50): Promise<Map<number, string>> {
    const photoMap = new Map<number, string>();
    
    console.log(`🖼️ Starting batch photo download for ${players.length} players (batch size: ${batchSize})`);
    
    // Initialize storage directory
    await this.initPhotoStorage();
    
    // Clear existing cache to ensure fresh downloads with correct extension
    await this.clearPhotoCache();
    await this.initPhotoStorage();
    
    // First, check which photos are already downloaded
    const existingPhotos = new Map<number, string>();
    for (const player of players) {
      if (player.photo) {
        const localPath = await this.getLocalPhotoPath(player.id);
        if (localPath) {
          existingPhotos.set(player.id, localPath);
          photoMap.set(player.id, localPath);
        }
      }
    }
    
    console.log(`🖼️ Found ${existingPhotos.size} existing photos, need to download ${players.length - existingPhotos.size}`);
    
    // Process in batches
    for (let i = 0; i < players.length; i += batchSize) {
      const batch = players.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(players.length / batchSize);
      
      console.log(`🖼️ Processing batch ${batchNum}/${totalBatches} (${batch.length} players)`);
      
      // Process batch concurrently with small delay
      const batchPromises = batch.map(async (player) => {
        if (!existingPhotos.has(player.id)) {
          const localPath = await this.downloadAndStorePhoto(player.id, player.photo);
          if (localPath) {
            photoMap.set(player.id, localPath);
          }
        }
        // Small delay to avoid overwhelming
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      await Promise.all(batchPromises);
      
      // Delay between batches
      if (i + batchSize < players.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    console.log(`✅ Batch photo download completed. Stored ${photoMap.size} photos locally.`);
    return photoMap;
  },

  // Get local photo path for a player
  async getLocalPhotoPath(playerId: number): Promise<string | null> {
    try {
      const fileName = `player_${playerId}.png`;
      const filePath = `${this.photoStorageDir}${fileName}`;
      
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        return filePath;
      }
      return null;
    } catch (error) {
      console.error(`❌ Error getting local photo path for player ${playerId}:`, error);
      return null;
    }
  },

  // Get count of downloaded photos
  async getDownloadedPhotoCount(): Promise<number> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.photoStorageDir);
      if (!dirInfo.exists) {
        return 0;
      }
      
      const files = await FileSystem.readDirectoryAsync(this.photoStorageDir);
      return files.filter(file => file.endsWith('.png')).length;
    } catch (error) {
      console.error('❌ Error getting downloaded photo count:', error);
      return 0;
    }
  },

  // Clear all downloaded photos
  async clearPhotoCache(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.photoStorageDir);
      if (dirInfo.exists) {
        await FileSystem.deleteAsync(this.photoStorageDir, { idempotent: true });
        console.log('🗑️ Cleared photo cache');
      }
    } catch (error) {
      console.error('❌ Error clearing photo cache:', error);
    }
  },
  
  // Fetch bootstrap data (teams, players, events, etc.)
  fetchBootstrapData: async (): Promise<FPLBootstrapData> => {
    try {
      const response = await fetch(`${fplApiService.baseUrl}/bootstrap-static/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Debug: log the structure of the response
      console.log('🔍 FPL API Bootstrap response structure:');
      console.log('  - Keys:', Object.keys(data));
      console.log('  - Elements count:', data.elements?.length || 0);
      console.log('  - Teams count:', data.teams?.length || 0);
      
      if (data.elements && data.elements.length > 0) {
        const firstPlayer = data.elements[0];
        console.log('  - First player keys:', Object.keys(firstPlayer));
        console.log('  - First player photo:', firstPlayer.photo);
        console.log('  - First player sample:', {
          id: firstPlayer.id,
          web_name: firstPlayer.web_name,
          photo: firstPlayer.photo,
          element_type: firstPlayer.element_type
        });
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching FPL bootstrap data:', error);
      throw error;
    }
  },
  
  // Fetch all players
  fetchAllPlayers: async (): Promise<FPLPlayer[]> => {
    try {
      const bootstrapData = await fplApiService.fetchBootstrapData();
      return bootstrapData.elements || [];
    } catch (error) {
      console.error('Error fetching FPL players:', error);
      throw error;
    }
  },
  
  // Fetch all teams
  fetchAllTeams: async (): Promise<FPLTeam[]> => {
    try {
      const bootstrapData = await fplApiService.fetchBootstrapData();
      return bootstrapData.teams || [];
    } catch (error) {
      console.error('Error fetching FPL teams:', error);
      throw error;
    }
  },
  
  // Get player by ID
  getPlayerById: async (playerId: number): Promise<FPLPlayer | null> => {
    try {
      const players = await fplApiService.fetchAllPlayers();
      return players.find(p => p.id === playerId) || null;
    } catch (error) {
      console.error('Error fetching player by ID:', error);
      return null;
    }
  },
  
  // Get team by ID
  getTeamById: async (teamId: number): Promise<FPLTeam | null> => {
    try {
      const teams = await fplApiService.fetchAllTeams();
      return teams.find(t => t.id === teamId) || null;
    } catch (error) {
      console.error('Error fetching team by ID:', error);
      return null;
    }
  },
  
  // Get team badge URL
  getTeamBadgeUrl: (teamCode: number): string => {
    return `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`;
  },
  
  // Get player photo URL from FPL 'photo' field
  getPlayerPhotoUrl: (photo: string): string => {
    // FPL returns e.g. "154561.jpg" in bootstrap; correct URL is .../premierleague25/.../154561.png
    const baseUrl = `https://resources.premierleague.com/premierleague25/photos/players/110x140/`;
    const photoCode = photo.replace('.jpg', '').replace('.png', '');
    return `${baseUrl}${photoCode}.png`;
  },

  // Get player photo URL from player ID (fallback when photo code is missing)
  getPlayerPhotoUrlById: (playerId: number): string => {
    // This is a fallback - we should have photo codes from the API
    return `https://resources.premierleague.com/premierleague/photos/players/110x140/p${playerId}.png`;
  },

  // Batch load player photos with validation
  batchLoadPlayerPhotos: async (players: FPLPlayer[], batchSize: number = 100): Promise<Map<number, string>> => {
    const photoMap = new Map<number, string>();
    const validPhotoUrls: { playerId: number; url: string }[] = [];
    
    console.log(`🖼️ Starting batch photo loading for ${players.length} players (batch size: ${batchSize})`);
    
    // First, collect all photo URLs
    for (const player of players) {
      if (player.photo) {
        const photoUrl = fplApiService.getPlayerPhotoUrl(player.photo);
        validPhotoUrls.push({ playerId: player.id, url: photoUrl });
      }
    }
    
    console.log(`🖼️ Found ${validPhotoUrls.length} players with photo codes`);
    
    // Process in batches
    for (let i = 0; i < validPhotoUrls.length; i += batchSize) {
      const batch = validPhotoUrls.slice(i, i + batchSize);
      console.log(`🖼️ Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(validPhotoUrls.length / batchSize)} (${batch.length} players)`);
      
      // Process batch with small delay to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // For now, just store the URLs - we'll validate them when actually displayed
      for (const { playerId, url } of batch) {
        photoMap.set(playerId, url);
      }
    }
    
    console.log(`🖼️ Batch photo loading completed. Cached ${photoMap.size} photo URLs`);
    return photoMap;
  },
  
  // Fetch fixtures (placeholder for now)
  fetchFixtures: async () => {
    return [];
  },
  
  // Fetch fixtures from FPL API
  fetchFixturesData: async (): Promise<any[]> => {
    try {
      const response = await fetch(`${fplApiService.baseUrl}/fixtures/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Debug: log the structure of the first fixture
      if (data && data.length > 0) {
        console.log('FPL API Fixture structure:', data[0]);
        console.log('Total fixtures from API:', data.length);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching FPL fixtures:', error);
      return [];
    }
  },
  
  // Get fixtures for a specific gameweek
  getFixturesForGameweek: async (gameweek: number): Promise<Fixture[]> => {
    try {
      const fixturesData = await fplApiService.fetchFixturesData();
      const teams = await fplApiService.fetchAllTeams();
      
      console.log(`Looking for fixtures in gameweek ${gameweek}`);
      console.log('Available fixtures:', fixturesData.map(f => ({ id: f.id, event: f.event, home: f.team_h, away: f.team_a })));
      console.log('Available teams:', teams.map(t => ({ id: t.id, name: t.name, short_name: t.short_name })));
      
      // Filter fixtures for the specific gameweek
      const gameweekFixtures = fixturesData.filter(fixture => fixture.event === gameweek);
      
      console.log(`Found ${gameweekFixtures.length} fixtures for gameweek ${gameweek}`);
      
      // Convert to our Fixture interface
      const convertedFixtures: Fixture[] = gameweekFixtures.map(fixture => {
        const homeTeam = teams.find(team => team.id === fixture.team_h);
        const awayTeam = teams.find(team => team.id === fixture.team_a);
        
        console.log(`Converting fixture ${fixture.id}: ${homeTeam?.name} vs ${awayTeam?.name}`);
        
        // Determine difficulty based on team strength (you can adjust this logic)
        let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
        if (fixture.team_h_difficulty <= 2 || fixture.team_a_difficulty <= 2) {
          difficulty = 'Easy';
        } else if (fixture.team_h_difficulty >= 4 || fixture.team_a_difficulty >= 4) {
          difficulty = 'Hard';
        }
        
        // Format the date
        const kickoffDate = new Date(fixture.kickoff_time);
        const dateString = kickoffDate.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        return {
          id: fixture.id,
          home_team: homeTeam?.name || 'Unknown Team',
          away_team: awayTeam?.name || 'Unknown Team',
          home_team_short: homeTeam?.short_name || 'UNK',
          away_team_short: awayTeam?.short_name || 'UNK',
          difficulty,
          difficulty_score: Math.max(fixture.team_h_difficulty || 3, fixture.team_a_difficulty || 3),
          date: dateString,
          gameweek: fixture.event,
          status: fixture.finished ? 'FINISHED' : fixture.started ? 'LIVE' : 'TBC',
          minutes: fixture.started && !fixture.finished ? fixture.minutes?.toString() || '' : '',
          home_score: fixture.team_h_score || 0,
          away_score: fixture.team_a_score || 0,
          kickoff: fixture.kickoff_time
        };
      });
      
      console.log('Converted fixtures:', convertedFixtures);
      return convertedFixtures;
    } catch (error) {
      console.error('Error getting fixtures for gameweek:', error);
      return [];
    }
  },
  
  // Get all fixtures
  getAllFixtures: async (): Promise<Fixture[]> => {
    try {
      const fixturesData = await fplApiService.fetchFixturesData();
      const teams = await fplApiService.fetchAllTeams();
      
      // Convert all fixtures to our Fixture interface
      const convertedFixtures: Fixture[] = fixturesData.map(fixture => {
        const homeTeam = teams.find(team => team.id === fixture.team_h);
        const awayTeam = teams.find(team => team.id === fixture.team_a);
        
        // Determine difficulty based on team strength
        let difficulty: 'Easy' | 'Medium' | 'Hard' = 'Medium';
        if (fixture.team_h_difficulty <= 2 || fixture.team_a_difficulty <= 2) {
          difficulty = 'Easy';
        } else if (fixture.team_h_difficulty >= 4 || fixture.team_a_difficulty >= 4) {
          difficulty = 'Hard';
        }
        
        // Format the date
        const kickoffDate = new Date(fixture.kickoff_time);
        const dateString = kickoffDate.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        return {
          id: fixture.id,
          home_team: homeTeam?.name || 'Unknown Team',
          away_team: awayTeam?.name || 'Unknown Team',
          home_team_short: homeTeam?.short_name || 'UNK',
          away_team_short: awayTeam?.short_name || 'UNK',
          difficulty,
          difficulty_score: Math.max(fixture.team_h_difficulty || 3, fixture.team_a_difficulty || 3),
          date: dateString,
          gameweek: fixture.event,
          status: fixture.finished ? 'FINISHED' : fixture.started ? 'LIVE' : 'TBC',
          minutes: fixture.started && !fixture.finished ? fixture.minutes?.toString() || '' : '',
          home_score: fixture.team_h_score || 0,
          away_score: fixture.team_a_score || 0,
          kickoff: fixture.kickoff_time
        };
      });
      
      return convertedFixtures;
    } catch (error) {
      console.error('Error getting all fixtures:', error);
      return [];
    }
  },
  
  // Get next fixture for a specific player
  getNextFixtureForPlayer: async (playerId: number, currentGameweek: number): Promise<string> => {
    try {
      const fixtures = await fplApiService.fetchFixturesData();
      const players = await fplApiService.fetchAllPlayers();
      const teams = await fplApiService.fetchAllTeams();
      
      // Find the player to get their team
      const player = players.find(p => p.id === playerId);
      if (!player) return 'No fixture';
      
      // Find fixtures for this team in current or next gameweek
      const teamFixtures = fixtures.filter(fixture => 
        fixture.team_h === player.team || fixture.team_a === player.team
      );
      
      // Find the next fixture (current or next gameweek)
      const nextFixture = teamFixtures.find(fixture => 
        fixture.event >= currentGameweek
      );
      
      if (nextFixture) {
        const homeTeam = teams.find(t => t.id === nextFixture.team_h);
        const awayTeam = teams.find(t => t.id === nextFixture.team_a);
        
        if (homeTeam && awayTeam) {
          const isHome = nextFixture.team_h === player.team;
          const opponent = isHome ? awayTeam : homeTeam;
          const venue = isHome ? '(H)' : '(A)';
          
          return `${opponent.short_name} ${venue}`;
        }
      }
      
      return 'No fixture';
    } catch (error) {
      console.error('Error getting next fixture for player:', error);
      return 'No fixture';
    }
  },
  
  // Get fixture difficulty for a player
  getFixtureDifficulty: async (playerId: number, currentGameweek: number): Promise<'Easy' | 'Medium' | 'Hard'> => {
    try {
      const fixtures = await fplApiService.fetchFixturesData();
      const players = await fplApiService.fetchAllPlayers();
      
      const player = players.find(p => p.id === playerId);
      if (!player) return 'Medium';
      
      const teamFixtures = fixtures.filter(fixture => 
        fixture.team_h === player.team || fixture.team_a === player.team
      );
      
      const nextFixture = teamFixtures.find(fixture => 
        fixture.event >= currentGameweek
      );
      
      if (nextFixture) {
        // FPL API provides difficulty rating (1-5, where 1 is easiest)
        const difficulty = nextFixture.difficulty;
        if (difficulty <= 2) return 'Easy';
        if (difficulty >= 4) return 'Hard';
        return 'Medium';
      }
      
      return 'Medium';
    } catch (error) {
      console.error('Error getting fixture difficulty:', error);
      return 'Medium';
    }
  },
  
  // Get current gameweek
  getCurrentGameweek: async (): Promise<{ id: number; name: string; deadline: string }> => {
    try {
      const bootstrapData = await fplApiService.fetchBootstrapData();
      const events = bootstrapData.events || [];
      
      // Debug: log the events structure
      console.log('FPL Events data:', events);
      if (events.length > 0) {
        console.log('First event structure:', events[0]);
      }
      
      // Find the current event (gameweek)
      const currentEvent = events.find(event => event.is_current === true);
      
      if (currentEvent) {
        console.log('Current event found:', currentEvent);
        return {
          id: currentEvent.id,
          name: currentEvent.name || `Gameweek ${currentEvent.id}`,
          deadline: currentEvent.deadline_time || 'TBD'
        };
      }
      
      // Fallback: if no current event found, return the latest event
      if (events.length > 0) {
        const latestEvent = events[events.length - 1];
        console.log('Using latest event as fallback:', latestEvent);
        return {
          id: latestEvent.id,
          name: latestEvent.name || `Gameweek ${latestEvent.id}`,
          deadline: latestEvent.deadline_time || 'TBD'
        };
      }
      
      // Default fallback
      return { id: 1, name: 'Gameweek 1', deadline: 'TBD' };
    } catch (error) {
      console.error('Error fetching current gameweek:', error);
      return { id: 1, name: 'Gameweek 1', deadline: 'TBD' }; // Default fallback
    }
  },
  
  // Format deadline date nicely
  formatDeadline: (deadlineTime: string): string => {
    try {
      if (!deadlineTime || deadlineTime === 'TBD') {
        return 'Deadline: TBD';
      }
      
      const deadline = new Date(deadlineTime);
      const now = new Date();
      
      // Check if deadline has passed
      if (deadline < now) {
        return 'Deadline: Passed';
      }
      
      // Calculate time remaining
      const timeRemaining = deadline.getTime() - now.getTime();
      const daysRemaining = Math.floor(timeRemaining / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.floor((timeRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      // Format the date
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      };
      
      const formattedDate = deadline.toLocaleDateString('en-GB', options);
      
      // Add countdown if less than 24 hours
      if (daysRemaining === 0 && hoursRemaining < 24) {
        return `Deadline: ${formattedDate} (${hoursRemaining}h remaining)`;
      } else if (daysRemaining === 1) {
        return `Deadline: ${formattedDate} (Tomorrow)`;
      } else if (daysRemaining > 1) {
        return `Deadline: ${formattedDate} (${daysRemaining} days)`;
      }
      
      return `Deadline: ${formattedDate}`;
    } catch (error) {
      console.error('Error formatting deadline:', error);
      return 'Deadline: TBD';
    }
  },

  // Get player history (performance data for each gameweek)
  getPlayerHistory: async (playerId: number): Promise<any[]> => {
    try {
      const response = await fetch(`${fplApiService.baseUrl}/element-summary/${playerId}/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Debug: log the structure of player history
      if (data && data.history) {
        console.log('Player history structure:', data.history[0]);
        console.log('Total history entries:', data.history.length);
      }
      
      // Debug: log the structure of history_past (previous seasons)
      if (data && data.history_past) {
        console.log('Player history_past structure:', data.history_past[0]);
        console.log('Total history_past entries:', data.history_past.length);
      }
      
      return data.history || [];
    } catch (error) {
      console.error('Error fetching player history:', error);
      return [];
    }
  },

  // Get player fixtures (upcoming matches)
  getPlayerFixtures: async (playerId: number): Promise<any[]> => {
    try {
      const response = await fetch(`${fplApiService.baseUrl}/element-summary/${playerId}/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Debug: log the structure of player fixtures
      if (data && data.fixtures) {
        console.log('Player fixtures structure:', data.fixtures[0]);
        console.log('Total fixtures entries:', data.fixtures.length);
      }
      
      return data.fixtures || [];
    } catch (error) {
      console.error('Error fetching player fixtures:', error);
      return [];
    }
  },

  // Get player season history (previous seasons data)
  getPlayerSeasonHistory: async (playerId: number): Promise<any[]> => {
    try {
      const response = await fetch(`${fplApiService.baseUrl}/element-summary/${playerId}/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Debug: log the structure of season history
      if (data && data.history_past) {
        console.log('Player season history structure:', data.history_past[0]);
        console.log('Total season history entries:', data.history_past.length);
      }
      
      return data.history_past || [];
    } catch (error) {
      console.error('Error fetching player season history:', error);
      return [];
    }
  },

  // Get player rankings by position for different stats
  getPlayerRankings: async (playerId: number): Promise<{
    pointsRank: string;
    formRank: string;
    ownershipRank: string;
    valueRank: string;
  }> => {
    try {
      console.log('Getting rankings for player ID:', playerId);
      
      // Get all players and the specific player
      const allPlayers = await fplApiService.fetchAllPlayers();
      console.log('Total players fetched:', allPlayers.length);
      
      const player = allPlayers.find(p => p.id === playerId);
      console.log('Player found:', player ? player.web_name : 'Not found');
      
      if (!player) {
        throw new Error('Player not found');
      }

      // Filter players by the same position (element_type)
      const samePositionPlayers = allPlayers.filter(p => p.element_type === player.element_type);
      console.log('Players in same position:', samePositionPlayers.length, 'Position type:', player.element_type);
      
      // Calculate rankings
      const pointsRank = fplApiService.calculateRank(
        samePositionPlayers, 
        player.id, 
        'total_points', 
        'desc'
      );
      console.log('Points rank calculated:', pointsRank);
      
      const formRank = fplApiService.calculateRank(
        samePositionPlayers, 
        player.id, 
        'form', 
        'desc'
      );
      console.log('Form rank calculated:', formRank);
      
      const ownershipRank = fplApiService.calculateRank(
        samePositionPlayers, 
        player.id, 
        'selected_by_percent', 
        'desc'
      );
      console.log('Ownership rank calculated:', ownershipRank);
      
      const valueRank = fplApiService.calculateRank(
        samePositionPlayers, 
        player.id, 
        'value_form', 
        'desc'
      );
      console.log('Value rank calculated:', valueRank);

      const result = {
        pointsRank: `${pointsRank}/${samePositionPlayers.length}`,
        formRank: `${formRank}/${samePositionPlayers.length}`,
        ownershipRank: `${ownershipRank}/${samePositionPlayers.length}`,
        valueRank: `${valueRank}/${samePositionPlayers.length}`,
      };
      
      console.log('Final rankings result:', result);
      return result;
    } catch (error) {
      console.error('Error calculating player rankings:', error);
      return {
        pointsRank: 'N/A',
        formRank: 'N/A',
        ownershipRank: 'N/A',
        valueRank: 'N/A',
      };
    }
  },

  // Helper function to calculate rank
  calculateRank: (players: any[], playerId: number, statKey: string, sortOrder: 'asc' | 'desc'): number => {
    // Sort players by the specified stat
    const sortedPlayers = [...players].sort((a, b) => {
      const aValue = parseFloat(a[statKey] || '0');
      const bValue = parseFloat(b[statKey] || '0');
      
      if (sortOrder === 'desc') {
        return bValue - aValue; // Higher values first
      } else {
        return aValue - bValue; // Lower values first
      }
    });
    
    // Find the player's position (rank) in the sorted list
    const rank = sortedPlayers.findIndex(p => p.id === playerId) + 1;
    return rank;
  },

  // Fetch element summary for a player (history + upcoming fixtures)
  getElementSummary: async (playerId: number): Promise<any> => {
    try {
      const response = await fetch(`${fplApiService.baseUrl}/element-summary/${playerId}/`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching element summary for player ${playerId}:`, error);
      throw error;
    }
  }
}; 