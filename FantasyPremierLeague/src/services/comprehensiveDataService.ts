import { fplApiService } from './fplApi';
import { FPLPredictor2025_26 } from './fplPredictor2025-26';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const baselineData2024_25 = require('../data/2024-25-baseline-processed.json');

export interface ComprehensivePlayerData {
  // FPL API data
  id: number;
  code: number;
  web_name: string;
  name: string;
  element_type: number;
  team: number;
  now_cost: number;
  photo: string;
  photoUrl?: string; // Pre-loaded photo URL for instant display
  form: string;
  total_points: number;
  ict_index: string;
  selected_by_percent: string;
  transfers_in: number;
  transfers_out: number;
  event_points: number;
  dreamteam_count: number;
  chance_of_playing_next_round: number | null;
  chance_of_playing_this_round: number | null;
  can_select: boolean;
  can_transact: boolean;
  cost_change_event: number;
  cost_change_event_fall: number;
  cost_change_start: number;
  cost_change_start_fall: number;
  
  // Expected points data
  total_3gw_xp: number;
  total_8gw_xp: number;
  gwp1_xp: number;
  gwp2_xp: number;
  gwp3_xp: number;
  gwp4_xp: number;
  gwp5_xp: number;
  gwp6_xp: number;
  gwp7_xp: number;
  gwp8_xp: number;
  
  // Classification data
  baselineHistoryLength: number;
  isHighlighted: boolean;
  
  // Pre-calculated display values
  displayName: string;
  displayTeam: string;
  displayPosition: string;
  displayPrice: number;
  
  // Pre-calculated fixtures
  next3Fixtures: Array<{
    fixture: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    gameweek: number;
    opponent: string;
    isHome: boolean;
  }>;
}

export interface ComprehensiveTeamData {
  id: number;
  name: string;
  short_name: string;
  points: number;
  position: number;
}

export interface ComprehensiveFixtureData {
  id: number;
  event: number;
  team_h: number;
  team_a: number;
  team_h_difficulty: number;
  team_a_difficulty: number;
  date: string;
  finished: boolean;
  home_team_short: string;
  away_team_short: string;
}

export interface ComprehensiveAppData {
  players: ComprehensivePlayerData[];
  teams: ComprehensiveTeamData[];
  fixtures: ComprehensiveFixtureData[];
  currentGameweek: number;
  best11Teams: any;
  timestamp: number;
}

class ComprehensiveDataService {
  private cachedData: ComprehensiveAppData | null = null;
  private isLoading = false;
  private loadPromise: Promise<ComprehensiveAppData> | null = null;

  async loadAllData(onProgress?: (step: number, description: string, percentage: number) => void): Promise<ComprehensiveAppData> {
    // Prevent multiple simultaneous loads
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    if (this.cachedData) {
      return this.cachedData;
    }

    this.isLoading = true;
    this.loadPromise = this.performDataLoad(onProgress);
    
    try {
      const result = await this.loadPromise;
      this.cachedData = result;
      return result;
    } finally {
      this.isLoading = false;
      this.loadPromise = null;
    }
  }

  private async performDataLoad(onProgress?: (step: number, description: string, percentage: number) => void): Promise<ComprehensiveAppData> {
    console.log('🚀 Starting comprehensive data load...');
    
    // Clear fixture cache for fresh data
    this.fixtureCache.clear();
    
    try {
      // Step 1: Fetch all player data from FPL API
      onProgress?.(1, 'Fetching player data from FPL...', 10);
      console.log('📊 Step 1: Fetching FPL player data...');
      const fplPlayers = await fplApiService.fetchAllPlayers();
      console.log(`✅ Fetched ${fplPlayers.length} players`);
      


      // Step 2: Fetch teams data
      onProgress?.(2, 'Fetching team data...', 20);
      console.log('🏟️ Step 2: Fetching teams data...');
      const teams = await fplApiService.fetchAllTeams();
      console.log(`✅ Fetched ${teams.length} teams`);

      // Step 3: Fetch fixtures data
      onProgress?.(3, 'Fetching fixture data...', 30);
      console.log('📅 Step 3: Fetching fixtures data...');
      const fixtures = await fplApiService.fetchFixturesData();
      console.log(`✅ Fetched ${fixtures.length} fixtures`);
      


      // Step 4: Fetch current gameweek
      onProgress?.(4, 'Getting current gameweek...', 40);
      console.log('🎯 Step 4: Fetching current gameweek...');
      const currentGameweek = await fplApiService.getCurrentGameweek();
      console.log(`✅ Current gameweek: ${currentGameweek.id}`);

      // Step 5: Process expected points logic
      onProgress?.(5, 'Calculating expected points...', 50);
      console.log('🧮 Step 5: Processing expected points...');
      const playersWithXP = await this.processExpectedPoints(fplPlayers, teams, fixtures, currentGameweek.id, onProgress);
      console.log(`✅ Processed XP for ${playersWithXP.length} players`);

      // Step 6: Sort by 3 gameweek XP
      onProgress?.(6, 'Sorting players by expected points...', 70);
      console.log('📈 Step 6: Sorting players by 3GW XP...');
      const sortedPlayers = playersWithXP.sort((a, b) => (b.total_3gw_xp || 0) - (a.total_3gw_xp || 0));
      console.log(`✅ Sorted ${sortedPlayers.length} players`);

      // Step 7: Pre-calculate all display values and fixtures
      onProgress?.(7, 'Pre-calculating display data...', 80);
      console.log('🎨 Step 7: Pre-calculating display values...');
      const processedPlayers = this.preprocessPlayerData(sortedPlayers, teams, fixtures, currentGameweek.id);
      console.log(`✅ Pre-processed ${processedPlayers.length} players`);

      // Step 8: Skip image pre-loading (handled in UI)
      onProgress?.(8, 'Downloading player photos...', 90);
      // Removed verbose photo loading logs
      
      // Check existing photos first
      const existingCount = await fplApiService.getDownloadedPhotoCount();
      
      const playersWithPhotos = await this.preloadPlayerPhotos(processedPlayers);
      console.log(`✅ Photo processing completed for ${playersWithPhotos.length} players`);

      // Step 9: Create best 11 teams
      console.log('🏆 Step 9: Creating best 11 teams...');
      const best11Teams = await this.createBest11Teams(playersWithPhotos, currentGameweek.id);
      console.log(`✅ Created best 11 teams`);

      const result: ComprehensiveAppData = {
        players: playersWithPhotos, // Use players with photo paths instead of processedPlayers
        teams,
        fixtures,
        currentGameweek: currentGameweek.id,
        best11Teams,
        timestamp: Date.now()
      };

      console.log('🎉 Comprehensive data load complete!');
      return result;

    } catch (error) {
      console.error('❌ Error loading comprehensive data:', error);
      throw error;
    }
  }

  private async processExpectedPoints(
    players: any[], 
    teams: any[], 
    fixtures: any[], 
    currentGameweek: number,
    onProgress?: (step: number, description: string, percentage: number) => void
  ): Promise<ComprehensivePlayerData[]> {
    const predictor = new FPLPredictor2025_26();
    
    console.log('🔄 Processing predictions for all players...');
    const predictions = await predictor.predictAllPlayers(fplApiService, (current: number, total: number) => {
      // Convert predictor progress to our progress format
      const percentage = Math.floor((current / total) * 30) + 50; // 50-80% range for predictions
      const description = `Calculating XP for player ${current}/${total}...`;
      onProgress?.(5, description, percentage);
    });
    

    
    // Merge predictions with FPL data
    const mergedPlayers = players.map(player => {
      const prediction = predictions.find(p => p.player_id === player.id);
      

      
      const mergedPlayer = {
        ...player,
        total_3gw_xp: prediction?.total_3gw_xp || 0,
        total_8gw_xp: prediction?.total_8gw_xp || 0,
        gwp1_xp: prediction?.gwp1_xp || 0,
        gwp2_xp: prediction?.gwp2_xp || 0,
        gwp3_xp: prediction?.gwp3_xp || 0,
        gwp4_xp: prediction?.gwp4_xp || 0,
        gwp5_xp: prediction?.gwp5_xp || 0,
        gwp6_xp: prediction?.gwp6_xp || 0,
        gwp7_xp: prediction?.gwp7_xp || 0,
        gwp8_xp: prediction?.gwp8_xp || 0,
        baselineHistoryLength: prediction?.baselineHistoryLength || 0,
        isHighlighted: !prediction?.baselineHistoryLength || (prediction.baselineHistoryLength || 0) === 0
      } as ComprehensivePlayerData;
      

      
      return mergedPlayer;
    });
    
    console.log(`✅ Merged ${mergedPlayers.length} players with predictions`);
    return mergedPlayers;
  }

  private preprocessPlayerData(
    players: ComprehensivePlayerData[], 
    teams: any[], 
    fixtures: any[], 
    currentGameweek: number
  ): ComprehensivePlayerData[] {
    // Helper: robust baseline length lookup when predictor didn't populate it
    const getBaselineLen = (player: any): number => {
      try {
        const baselinePlayers: Record<string, any> | undefined = baselineData2024_25?.players;
        if (!baselinePlayers) return 0;
        const firstName = player.first_name || player.name?.split(' ')?.[0] || '';
        const secondName = player.second_name || player.name?.split(' ')?.slice(1).join(' ') || '';
        const key1 = `${firstName}_${secondName}`;
        const key2 = `${secondName}_${firstName}`;
        if (baselinePlayers[key1]) return (baselinePlayers[key1]?.season_history || []).length;
        if (baselinePlayers[key2]) return (baselinePlayers[key2]?.season_history || []).length;
        // Strict web_name underscore equality (preserve accents)
        const webUnderscore = String(player.web_name || '').replace(/\s+/g, '_');
        if (baselinePlayers[webUnderscore]) return (baselinePlayers[webUnderscore]?.season_history || []).length;
        // Strict normalized equality only (no substring fuzzy matching)
        const normalize = (s: string) => String(s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_\s]/g, '');
        const allKeys = Object.keys(baselinePlayers);
        const normWeb = normalize(webUnderscore);
        const exactNormKey = allKeys.find(k => normalize(k) === normWeb);
        if (exactNormKey) return (baselinePlayers[exactNormKey]?.season_history || []).length;
        return 0;
      } catch {
        return 0;
      }
    };

    return players.map(player => {
      const team = teams.find(t => t.id === player.team);
      const position = ['', 'GK', 'DEF', 'MID', 'FWD'][player.element_type] || 'TBD';
      const price = (player.now_cost || 0) / 10;
      // Use predictor/cached baseline unless missing; recompute only if 0
      const effectiveBaseline = (player.baselineHistoryLength || 0) > 0
        ? player.baselineHistoryLength
        : getBaselineLen(player);


      // Pre-calculate next 3 fixtures
      const next3Fixtures = this.calculateNext3Fixtures(player.team, fixtures, currentGameweek, teams);

      return {
        ...player,
        baselineHistoryLength: effectiveBaseline,
        isHighlighted: (effectiveBaseline || 0) === 0,
        displayName: player.web_name || player.name,
        displayTeam: team?.short_name || 'TBD',
        displayPosition: position,
        displayPrice: price,
        next3Fixtures
      };
    });
  }

  private fixtureCache: Map<string, any[]> = new Map();

  private calculateNext3Fixtures(teamId: number, fixtures: any[], currentGameweek: number, teams?: any[]) {
    if (!fixtures.length) return [];
    
    // Cache fixtures to avoid recalculating for the same team
    const cacheKey = `${teamId}-${currentGameweek}`;
    if (this.fixtureCache.has(cacheKey)) {
      return this.fixtureCache.get(cacheKey)!;
    }
    
    // Removed verbose fixture logging
    
    const teamFixtures = fixtures.filter(fixture => 
      fixture.team_h === teamId || fixture.team_a === teamId
    );
    
    const nextGameweeks = [currentGameweek + 1, currentGameweek + 2, currentGameweek + 3];
    
    const nextFixtures = teamFixtures
      .filter(fixture => nextGameweeks.includes(fixture.event))
      .sort((a, b) => a.event - b.event)
      .slice(0, 3);
    
    return nextFixtures.map(fixture => {
      const isHome = fixture.team_h === teamId;
      const opponentId = isHome ? fixture.team_a : fixture.team_h;
      
      // Get opponent name from teams array
      const opponentTeam = teams?.find(team => team.id === opponentId);
      const opponent = opponentTeam ? opponentTeam.short_name : `Team ${opponentId}`;
      const venue = isHome ? '(H)' : '(A)';
      
      // Get difficulty rating from FPL API fields
      let difficulty: number;
      if (isHome) {
        difficulty = fixture.team_h_difficulty || 3;
      } else {
        difficulty = fixture.team_a_difficulty || 3;
      }
      
      // Validate difficulty value
      if (typeof difficulty !== 'number' || isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
        difficulty = 3; // Default to medium
      }
      
      let difficultyLevel: 'Easy' | 'Medium' | 'Hard' = 'Medium';
      if (difficulty <= 2) difficultyLevel = 'Easy';
      else if (difficulty >= 4) difficultyLevel = 'Hard';
      
      const result = {
        fixture: `${opponent} ${venue}`,
        difficulty: difficultyLevel,
        gameweek: fixture.event,
        opponent,
        isHome
      };
      
      // Removed verbose fixture logging
      
      return result;
    });
    
    // Cache the result
    this.fixtureCache.set(cacheKey, nextFixtures);
    return nextFixtures;
  }

  private async preloadPlayerPhotos(players: ComprehensivePlayerData[]): Promise<ComprehensivePlayerData[]> {
    // Removed verbose photo loading logs
    
    try {
      // Get ghost image path for players without photos
      const ghostImagePath = await fplApiService.getGhostImagePath();
      
      // Use the new batch download method - convert to FPLPlayer format
      const fplPlayers = players.map(player => ({
        id: player.id,
        photo: player.photo,
        web_name: player.web_name
      } as any));
      const photoMap = await fplApiService.batchDownloadPhotos(fplPlayers, 50);
      
      // Store the local photo paths in the player data for instant access
      // For players without photos, use the stored ghost image path
      const playersWithPhotos = players.map(player => {
        const localPhotoPath = photoMap.get(player.id);
        return {
          ...player,
          photoUrl: localPhotoPath || ghostImagePath || undefined
        };
      });
      
      console.log(`✅ Batch photo pre-loading completed. Cached ${photoMap.size} photo URLs, ${players.length - photoMap.size} players set to ghost image.`);
      return playersWithPhotos;
    } catch (error) {
      console.error('❌ Error in batch photo pre-loading:', error);
      // Return players without photo URLs if there's an error
      return players;
    }
  }

  private async createBest11Teams(players: ComprehensivePlayerData[], currentGameweek: number): Promise<any> {
    try {
      console.log('🏆 Creating Best 11 teams for gameweeks 2, 3, 4...');
      
      // Convert ComprehensivePlayerData to PlayerPrediction format for the optimizer
      const playerPredictions = players.map(player => ({
        player_id: player.id,
        name: player.web_name,
        team: player.displayTeam,
        position: player.displayPosition,
        price: player.now_cost / 10,
        gwp1_xp: player.gwp1_xp,
        gwp2_xp: player.gwp2_xp,
        gwp3_xp: player.gwp3_xp,
        gwp4_xp: player.gwp4_xp,
        gwp5_xp: player.gwp5_xp,
        gwp6_xp: player.gwp6_xp,
        gwp7_xp: player.gwp7_xp,
        gwp8_xp: player.gwp8_xp,
        total_3gw_xp: player.total_3gw_xp,
        total_8gw_xp: player.total_8gw_xp,
        fixtures: [], // Not needed for Best 11
        teams: [] // Not needed for Best 11
      }));

      // Import the optimizer
      const { OptimalTeamBuilder } = await import('./optimalTeamBuilder');
      const optimizer = new OptimalTeamBuilder();

      // Generate teams for the next 3 gameweeks from current
      const best11Teams: any = {};
      const nextGameweeks = [currentGameweek + 1, currentGameweek + 2, currentGameweek + 3];
      
      for (const gw of nextGameweeks) {
        console.log(`  📊 Generating Best 11 for GW${gw}...`);
        const team = optimizer.generateOptimalTeam(playerPredictions, gw);
        best11Teams[`gw${gw}`] = team;
        console.log(`  ✅ GW${gw} Best 11: ${team.formation} formation, ${team.total_expected_points.toFixed(1)} expected points`);
      }

      console.log('✅ Best 11 teams creation completed');
      return best11Teams;
    } catch (error) {
      console.error('❌ Error creating Best 11 teams:', error);
      return {};
    }
  }

  getCachedData(): ComprehensiveAppData | null {
    return this.cachedData;
  }

  isDataLoaded(): boolean {
    return this.cachedData !== null;
  }

  clearCache(): void {
    this.cachedData = null;
  }
}

export const comprehensiveDataService = new ComprehensiveDataService();
