import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { FPLPlayer, FPLTeam } from '../types';
import { styles } from '../styles/PlayersScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import PlayerPhoto from '../components/PlayerPhoto';
import { FPLPredictor2025_26 } from '../services/fplPredictor2025-26';
import PlayerDetailsModal from '../components/PlayerDetailsModal';
// (Revert to using cached baseline from pre-rendered data)

  interface SortConfig {
    key: keyof FPLPlayer | 'gw1' | 'total_points' | 'ict_index' | 'transfers_in' | 'transfers_out' | 'bonus_points' | 'next_gw1' | 'next_gw2' | 'next_gw3' | 'gwp1_xp' | 'gwp2_xp' | 'gwp3_xp' | 'total_3gw_xp' | 'baselineHistoryLength';
    direction: 'asc' | 'desc';
  }

interface FilterConfig {
  position: string;
  maxPrice: number | null; // null means Unlimited
  club: string;
}

const PlayersScreen: React.FC = () => {
  const theme = useTheme();
  const { cachedData, isDataLoaded, clearCache } = useData();
  const { width } = Dimensions.get('window');
  
  const [players, setPlayers] = useState<FPLPlayer[]>([]);
  const [teams, setTeams] = useState<FPLTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'total_3gw_xp', direction: 'desc' });
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({
    position: 'All',
    maxPrice: null,
    club: 'All clubs'
  });
  const [showPriceFilter, setShowPriceFilter] = useState(false);
  const [showPositionFilter, setShowPositionFilter] = useState(false);
  const [showClubFilter, setShowClubFilter] = useState(false);
  const [currentGameweek, setCurrentGameweek] = useState(1);
  const [lastGameweek, setLastGameweek] = useState(1);
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<FPLPlayer | null>(null);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  // Remove displayedPlayersCount - show all players

  // Function to recalculate baseline data using fresh logic
  const recalculateBaselineData = (player: any) => {
    try {
      const predictor = new FPLPredictor2025_26();
      const baselineData = predictor.findPlayerBaseline('', player);
      return baselineData ? (baselineData.season_history || []).length : 0;
    } catch (error) {
      console.error('Error recalculating baseline for', player.web_name, error);
      return player.baselineHistoryLength || 0; // Fallback to cached value
    }
  };

  // Derived: estimate promoted teams from baseline coverage and expose zero-baseline counts
  const { promotedTeamIds, zeroBaselineAll, zeroBaselineExcludingPromoted } = useMemo(() => {
    try {
      if (!players || players.length === 0) {
        return { promotedTeamIds: new Set<number>(), zeroBaselineAll: 0, zeroBaselineExcludingPromoted: 0 };
      }

      const byTeam: Record<number, { total: number; withBaseline: number }> = {};
      for (const p of players) {
        const teamId = (p as any).team as number;
        if (!byTeam[teamId]) byTeam[teamId] = { total: 0, withBaseline: 0 };
        byTeam[teamId].total += 1;
        if ((p as any).baselineHistoryLength && (p as any).baselineHistoryLength > 0) {
          byTeam[teamId].withBaseline += 1;
        }
      }

      // Heuristic: teams with very low baseline coverage are likely newly promoted
      const promoted = new Set<number>();
      Object.entries(byTeam).forEach(([teamIdStr, stats]) => {
        const teamId = parseInt(teamIdStr, 10);
        const coverage = stats.total > 0 ? stats.withBaseline / stats.total : 0;
        if (stats.total >= 15 && stats.withBaseline <= 3 && coverage <= 0.15) {
          promoted.add(teamId);
        }
      });

      const zeroAll = players.filter(p => (p as any).baselineHistoryLength === 0).length;
      const zeroExProm = players.filter(p => (p as any).baselineHistoryLength === 0 && !promoted.has((p as any).team)).length;

      // Log details for investigation
      try {
        const list = players
          .filter(p => (p as any).baselineHistoryLength === 0 && !promoted.has((p as any).team))
          .map(p => ({ id: (p as any).id, web_name: (p as any).web_name, team: getClubName((p as any).team) }));
        console.log('🔎 Zero-baseline (excluding promoted) count:', zeroExProm);
        console.log('🔎 Estimated promoted team IDs:', Array.from(promoted.values()));
        console.log('🔎 Players with baseline=0 (excluding promoted):', list);
      } catch {}

      return { promotedTeamIds: promoted, zeroBaselineAll: zeroAll, zeroBaselineExcludingPromoted: zeroExProm };
    } catch {
      return { promotedTeamIds: new Set<number>(), zeroBaselineAll: 0, zeroBaselineExcludingPromoted: 0 };
    }
  }, [players, teams]);

  // Use cached data when available
  useEffect(() => {
    const startTime = Date.now();
    console.log('🚀 PlayersScreen: Starting to load...');

    console.log('  - cachedData exists:', !!cachedData);
    console.log('  - isDataLoaded:', isDataLoaded);
    
    if (cachedData && isDataLoaded) {
      console.log('📦 PlayersScreen: Using cached data');
      console.log('📊 Cached data summary:');
      console.log(`  - PlayersModel: ${cachedData.playersModel?.length || 0}`);
      console.log(`  - Player Predictions: ${cachedData.playerPredictions?.length || 0}`);
      console.log(`  - Pre-rendered Players Table: ${cachedData.preRenderedPlayersTable?.length || 0}`);
      console.log(`  - Pre-rendered data keys:`, Object.keys(cachedData).filter(key => key.startsWith('preRendered')));
      
      // PRIORITY 1: Use pre-rendered data for INSTANT display
      if (cachedData.preRenderedPlayersTable && cachedData.preRenderedPlayersTable.length > 0) {
        console.log('🚀 INSTANT DISPLAY: Using pre-rendered players table data!');
        console.log('📊 Pre-rendered data sample:', cachedData.preRenderedPlayersTable[0]);
        
        // Set all data immediately for instant display
        setPlayers(cachedData.preRenderedPlayersTable);
        setTeams(cachedData.teams);
        setFixtures(cachedData.fixtures);
        setCurrentGameweek(cachedData.currentGameweek.id);
        setLastGameweek(Math.max(1, cachedData.currentGameweek.id - 1));
        setLoading(false);
        

        
        const loadTime = Date.now() - startTime;
        console.log(`✅ PlayersScreen: Loaded in ${loadTime}ms - should be instant now!`);
        return; // Exit early - we have everything we need
      }
      
      // PRIORITY 2: Fallback to processed data
      if (cachedData.processedPlayerData?.allPlayers && cachedData.processedPlayerData.allPlayers.length > 0) {
        console.log('✅ Fallback: Using processed player data');
        setPlayers(cachedData.processedPlayerData.allPlayers);
        setTeams(cachedData.teams);
        setFixtures(cachedData.fixtures);
        setCurrentGameweek(cachedData.currentGameweek.id);
        setLastGameweek(Math.max(1, cachedData.currentGameweek.id - 1));
        setLoading(false);
        return;
      }
      
      // PRIORITY 3: Last resort - playersModel
      if (cachedData.playersModel && cachedData.playersModel.length > 0) {
        console.log('⚠️ Last resort: Using playersModel');
        setPlayers(cachedData.playersModel);
        setTeams(cachedData.teams);
        setFixtures(cachedData.fixtures);
        setCurrentGameweek(cachedData.currentGameweek.id);
        setLastGameweek(Math.max(1, cachedData.currentGameweek.id - 1));
        setLoading(false);
        return;
      }
      
      console.log('❌ No usable data found');
      setLoading(true);
    } else if (!isDataLoaded) {
      console.log('⏳ Data still loading...');
      setLoading(true);
    } else {
      console.log('❌ No cached data available');
      setLoading(false);
    }
  }, [cachedData, isDataLoaded]);

  // Remove the playersWithXP logic - we use playersModel directly
  // const playersWithXP = useMemo(() => { ... });

  // Price options from £4.0m to £14.5m in £0.5m increments
  const priceOptions = useMemo<(string | number)[]>(() => {
    const values: number[] = [];
    for (let v = 4.0; v <= 14.5 + 1e-9; v += 0.5) {
      // Round to 1 decimal to avoid float artifacts
      values.push(Math.round(v * 10) / 10);
    }
    return ['Unlimited', ...values];
  }, []);

  // Get team by ID
  const getTeamById = (teamId: number): FPLTeam | undefined => {
    return teams.find(t => t.id === teamId);
  };

  // Get club name by team ID
  const getClubName = (teamId: number): string => {
    const team = getTeamById(teamId);
    return team ? team.name : 'Unknown';
  };

  // Removed strict resolver; we trust cached pre-rendered baseline



  // Get position name by element type
  const getPositionName = (elementType: number): string => {
    const positions = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'];
    return positions[elementType - 1] || 'Unknown';
  };

  // Get position short name
  const getPositionShort = (elementType: number): string => {
    const positions = ['GK', 'DEF', 'MID', 'FWD'];
    return positions[elementType - 1] || '?';
  };

  // Filter and sort players - optimized to use pre-filtered data when possible
  const filteredAndSortedPlayers = useMemo(() => {
    const startTime = performance.now();
    
    // PRIORITY 1: Use pre-rendered data for INSTANT display
    if (cachedData?.preRenderedPlayersTable && cachedData.preRenderedPlayersTable.length > 0) {
      console.log('🚀 INSTANT: Using pre-rendered players table for filtering');
      
      // Apply filters to pre-rendered data
      let filtered = cachedData.preRenderedPlayersTable.filter(player => {
        // Search filter
        if (searchQuery && !player.web_name.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        
        // Position filter
        if (filterConfig.position !== 'All') {
          const playerPosition = getPositionName(player.element_type);
          if (playerPosition !== filterConfig.position) {
            return false;
          }
        }
        
        // Price filter (null means Unlimited)
        if (filterConfig.maxPrice !== null) {
          if (player.now_cost / 10 > filterConfig.maxPrice) {
            return false;
          }
        }
        
        // Club filter
        if (filterConfig.club !== 'All clubs') {
          const playerClub = getClubName(player.team);
          if (playerClub !== filterConfig.club) {
            return false;
          }
        }
        
        return true;
      });
      
      // Sort players
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'baselineHistoryLength':
            aValue = a.baselineHistoryLength || 0;
            bValue = b.baselineHistoryLength || 0;
            break;
          case 'web_name':
            aValue = a.web_name.toLowerCase();
            bValue = b.web_name.toLowerCase();
            break;
          case 'form':
            aValue = parseFloat(a.form) || 0;
            bValue = parseFloat(b.form) || 0;
            break;
          case 'now_cost':
            aValue = a.now_cost;
            bValue = b.now_cost;
            break;
          case 'selected_by_percent':
            aValue = parseFloat(a.selected_by_percent) || 0;
            bValue = parseFloat(b.selected_by_percent) || 0;
            break;
          case 'total_points':
            aValue = a.total_points;
            bValue = b.total_points;
            break;
          case 'ict_index':
            aValue = parseFloat(a.ict_index) || 0;
            bValue = parseFloat(b.ict_index) || 0;
            break;
          case 'transfers_in':
            aValue = a.transfers_in;
            bValue = b.transfers_in;
            break;
          case 'transfers_out':
            aValue = a.transfers_out;
            bValue = b.transfers_out;
            break;
          case 'event_points':
            aValue = a.event_points;
            bValue = b.event_points;
            break;
          case 'dreamteam_count':
            aValue = a.dreamteam_count;
            bValue = b.dreamteam_count;
            break;
          case 'gwp1_xp':
            aValue = a.gwp1_xp || 0;
            bValue = b.gwp1_xp || 0;
            break;
          case 'gwp2_xp':
            aValue = a.gwp2_xp || 0;
            bValue = b.gwp2_xp || 0;
            break;
          case 'gwp3_xp':
            aValue = a.gwp3_xp || 0;
            bValue = b.gwp3_xp || 0;
            break;
          case 'total_3gw_xp':
            aValue = a.total_3gw_xp || 0;
            bValue = b.total_3gw_xp || 0;
            break;
          case 'next_gw1':
          case 'next_gw2':
          case 'next_gw3':
            // Use pre-calculated fixtures for instant sorting
            const gameweekIndex = parseInt(sortConfig.key.slice(-1)) - 1;
            const aFixtures = a.next3Fixtures || [];
            const bFixtures = b.next3Fixtures || [];
            const aFixture = aFixtures[gameweekIndex];
            const bFixture = bFixtures[gameweekIndex];
            
            if (!aFixture || !bFixture) {
              aValue = 0;
              bValue = 0;
            } else {
              // Sort by difficulty: Easy (1) < Medium (2) < Hard (3)
              const difficultyMap = { 'Easy': 1, 'Medium': 2, 'Hard': 3 } as const;
              const aDifficulty = aFixture.difficulty as keyof typeof difficultyMap;
              const bDifficulty = bFixture.difficulty as keyof typeof difficultyMap;
              aValue = difficultyMap[aDifficulty] || 2;
              bValue = difficultyMap[bDifficulty] || 2;
            }
            break;
          default:
            aValue = 0;
            bValue = 0;
        }

        if (sortConfig.key === 'web_name') {
          if (sortConfig.direction === 'asc') {
            return (aValue as string).localeCompare(bValue as string);
          } else {
            return (bValue as string).localeCompare(aValue as string);
          }
        } else {
          if (sortConfig.direction === 'asc') {
            return (aValue as number) - (bValue as number);
          } else {
            return (bValue as number) - (aValue as number);
          }
        }
      });
      
      const endTime = performance.now();
      console.log(`✅ Pre-rendered filtering completed in ${(endTime - startTime).toFixed(2)}ms`);
      return filtered;
    }
    
    // PRIORITY 2: Fallback to pre-filtered data
    if (cachedData?.processedPlayerData?.preFiltered?.default) {
      // If no filters are active and we're sorting by total_3gw_xp (default), use pre-filtered data
      if (!searchQuery && 
          filterConfig.position === 'All' && 
          filterConfig.maxPrice === null && 
          filterConfig.club === 'All clubs' && 
          sortConfig.key === 'total_3gw_xp' && 
          sortConfig.direction === 'desc') {
        const endTime = performance.now();
        console.log(`🚀 Using pre-filtered default data for instant loading (${(endTime - startTime).toFixed(2)}ms)`);
        return cachedData.processedPlayerData.preFiltered.default;
      }

      // If only position filter is active, use pre-filtered position data
      if (!searchQuery && 
          filterConfig.maxPrice === null && 
          filterConfig.club === 'All clubs' && 
          sortConfig.key === 'total_3gw_xp' && 
          sortConfig.direction === 'desc') {
        const positionKey = filterConfig.position.toLowerCase();
        if (cachedData.processedPlayerData.preFiltered.positionFiltered?.[positionKey]) {
          console.log(`🚀 Using pre-filtered ${positionKey} data for instant loading`);
          return cachedData.processedPlayerData.preFiltered.positionFiltered[positionKey];
        }
      }

      // If only price filter is active, use pre-filtered price data
      if (!searchQuery && 
          filterConfig.position === 'All' && 
          filterConfig.club === 'All clubs' && 
          sortConfig.key === 'total_3gw_xp' && 
          sortConfig.direction === 'desc') {
        const priceKey = `≤ £${filterConfig.maxPrice}m`;
        if (filterConfig.maxPrice !== null && cachedData.processedPlayerData.preFiltered.priceFiltered?.[priceKey]) {
          console.log(`🚀 Using pre-filtered ${priceKey} data for instant loading`);
          return cachedData.processedPlayerData.preFiltered.priceFiltered[priceKey];
        }
      }
    }

    // PRIORITY: Use cached playersModel immediately for instant display
    const sourceData = cachedData?.playersModel || players;
    if (sourceData.length === 0) {
      console.log('⚠️ No players data available, returning empty array');
      return [];
    }

    // Use basic data immediately, then optimize with pre-filtered data when available
    console.log('🔄 Using immediate data display with dynamic filtering');
    let filtered = sourceData.filter(player => {
      // Search filter
      if (searchQuery && !player.web_name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Position filter
      if (filterConfig.position !== 'All') {
        const playerPosition = getPositionName(player.element_type);
        if (playerPosition !== filterConfig.position) {
          return false;
        }
      }
      
      // Price filter (null means Unlimited)
      if (filterConfig.maxPrice !== null) {
        if (player.now_cost / 10 > filterConfig.maxPrice) {
          return false;
        }
      }
      
      // Club filter
      if (filterConfig.club !== 'All clubs') {
        const playerClub = getClubName(player.team);
        if (playerClub !== filterConfig.club) {
          return false;
        }
      }
      
      return true;
    });

    // Sort players
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'baselineHistoryLength':
          aValue = a.baselineHistoryLength || 0;
          bValue = b.baselineHistoryLength || 0;
          break;
        case 'web_name':
          aValue = a.web_name.toLowerCase();
          bValue = b.web_name.toLowerCase();
          break;
        case 'form':
          aValue = parseFloat(a.form) || 0;
          bValue = parseFloat(b.form) || 0;
          break;
        case 'now_cost':
          aValue = a.now_cost;
          bValue = b.now_cost;
          break;
        case 'selected_by_percent':
          aValue = parseFloat(a.selected_by_percent) || 0;
          bValue = parseFloat(b.selected_by_percent) || 0;
          break;
        case 'total_points':
          aValue = a.total_points;
          bValue = b.total_points;
          break;
        case 'ict_index':
          aValue = parseFloat(a.ict_index) || 0;
          bValue = parseFloat(b.ict_index) || 0;
          break;
        case 'transfers_in':
          aValue = a.transfers_in;
          bValue = b.transfers_in;
          break;
        case 'transfers_out':
          aValue = a.transfers_out;
          bValue = b.transfers_out;
          break;
        case 'event_points':
          aValue = a.event_points;
          bValue = b.event_points;
          break;
        case 'dreamteam_count':
          aValue = a.dreamteam_count;
          bValue = b.dreamteam_count;
          break;
        case 'gwp1_xp':
          aValue = a.gwp1_xp || 0;
          bValue = b.gwp1_xp || 0;
          break;
        case 'gwp2_xp':
          aValue = a.gwp2_xp || 0;
          bValue = b.gwp2_xp || 0;
          break;
        case 'gwp3_xp':
          aValue = a.gwp3_xp || 0;
          bValue = b.gwp3_xp || 0;
          break;
        case 'total_3gw_xp':
          aValue = a.total_3gw_xp || 0;
          bValue = b.total_3gw_xp || 0;
          break;
        case 'next_gw1':
        case 'next_gw2':
        case 'next_gw3':
          // Use pre-calculated fixtures for instant sorting
          const gameweekIndex = parseInt(sortConfig.key.slice(-1)) - 1;
          const aFixtures = a.next3Fixtures || [];
          const bFixtures = b.next3Fixtures || [];
          const aFixture = aFixtures[gameweekIndex];
          const bFixture = bFixtures[gameweekIndex];
          
          if (!aFixture || !bFixture) {
            aValue = 0;
            bValue = 0;
          } else {
            // Sort by difficulty: Easy (1) < Medium (2) < Hard (3)
            const difficultyMap = { 'Easy': 1, 'Medium': 2, 'Hard': 3 } as const;
            const aDifficulty = aFixture.difficulty as keyof typeof difficultyMap;
            const bDifficulty = bFixture.difficulty as keyof typeof difficultyMap;
            aValue = difficultyMap[aDifficulty] || 2;
            bValue = difficultyMap[bDifficulty] || 2;
          }
          break;
        default:
          aValue = 0;
          bValue = 0;
      }

      if (sortConfig.key === 'web_name') {
        if (sortConfig.direction === 'asc') {
          return (aValue as string).localeCompare(bValue as string);
        } else {
          return (bValue as string).localeCompare(aValue as string);
        }
      } else {
        if (sortConfig.direction === 'asc') {
          return (aValue as number) - (bValue as number);
        } else {
          return (bValue as number) - (aValue as number);
        }
      }
    });

    return filtered;
  }, [players, searchQuery, filterConfig, sortConfig, cachedData?.playersModel]);

  // Update displayed players when filtered results change (now shows all players)
  useEffect(() => {
    // No pagination - show all filtered and sorted players
  }, [filteredAndSortedPlayers]);

  // Handle sort
  const handleSort = (key: SortConfig['key']) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Get sort indicator
  const getSortIndicator = (key: SortConfig['key']) => {
    const isActive = sortConfig.key === key;
    const color = isActive ? theme.colors.text : theme.colors.textSecondary;
    if (!isActive) {
      return <Ionicons name="swap-vertical-outline" size={14} color={color} style={{ marginLeft: 6 }} />;
    }
    return (
      <Ionicons
        name={sortConfig.direction === 'asc' ? 'chevron-up-outline' : 'chevron-down-outline'}
        size={14}
        color={color}
        style={{ marginLeft: 6 }}
      />
    );
  };

  // Format price
  const formatPrice = (cost: number): string => {
    return `£${(cost / 10).toFixed(1)}m`;
  };

  // Format percentage
  const formatPercentage = (percentage: string): string => {
    const num = parseFloat(percentage);
    return isNaN(num) ? '0.0%' : `${num.toFixed(1)}%`;
  };

  // Get team jersey color (simplified)
  const getTeamJerseyColor = (teamId: number): string => {
    const team = getTeamById(teamId);
    if (!team) return '#ccc';
    
    // Simple color mapping based on team
    const colors: { [key: string]: string } = {
      'Arsenal': '#EF4444',
      'Chelsea': '#3B82F6',
      'Liverpool': '#EF4444',
      'Manchester City': '#87CEEB',
      'Manchester United': '#DC2626',
      'Tottenham Hotspur': '#FFFFFF',
      'Aston Villa': '#DC2626',
      'Newcastle United': '#000000',
      'Brighton & Hove Albion': '#3B82F6',
      'West Ham United': '#DC2626',
      'Crystal Palace': '#3B82F6',
      'Brentford': '#F59E0B',
      'Fulham': '#000000',
      'Wolverhampton Wanderers': '#F59E0B',
      'Burnley': '#DC2626',
      'Nottingham Forest': '#10B981',
      'Luton Town': '#8B5CF6',
      'Sheffield United': '#DC2626',
      'Everton': '#3B82F6',
      'Bournemouth': '#DC2626'
    };
    
    return colors[team.name] || '#ccc';
  };

  // Get next 3 fixtures with FDR ratings (matching prediction system logic)
  const getNext3Fixtures = (teamId: number): { fixture: string; difficulty: 'Easy' | 'Medium' | 'Hard' }[] => {
    if (!fixtures.length) return [];
    
    const teamFixtures = fixtures.filter(fixture => 
      fixture.team_h === teamId || fixture.team_a === teamId
    );
    
    // Get next 3 fixtures starting from current gameweek + 1 (matching prediction system)
    const baseGameweek = currentGameweek;
    const nextGameweeks = [baseGameweek + 1, baseGameweek + 2, baseGameweek + 3];
    
    const nextFixtures = teamFixtures
      .filter(fixture => nextGameweeks.includes(fixture.event))
      .sort((a, b) => a.event - b.event)
      .slice(0, 3);
    
    return nextFixtures.map(fixture => {
      const isHome = fixture.team_h === teamId;
      const opponentId = isHome ? fixture.team_a : fixture.team_h;
      const opponent = teams.find(t => t.id === opponentId);
      const venue = isHome ? '(H)' : '(A)';
      
      // Get difficulty rating using the same logic as prediction system
      let difficulty: number;
      if (isHome) {
        difficulty = fixture.team_h_difficulty || fixture.difficulty_score || 3;
      } else {
        difficulty = fixture.team_a_difficulty || fixture.difficulty_score || 3;
      }
      
      // Validate difficulty value
      if (typeof difficulty !== 'number' || isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
        difficulty = 3; // Default to medium
      }
      
      let difficultyLevel: 'Easy' | 'Medium' | 'Hard' = 'Medium';
      if (difficulty <= 2) difficultyLevel = 'Easy';
      else if (difficulty >= 4) difficultyLevel = 'Hard';
      
      return {
        fixture: `${opponent?.short_name || 'UNK'} ${venue}`,
        difficulty: difficultyLevel,
        gameweek: fixture.event
      };
    });
  };

  // Get FDR color for difficulty
  const getFDRColor = (difficulty: 'Easy' | 'Medium' | 'Hard'): string => {
    switch (difficulty) {
      case 'Easy': return '#10B981'; // Green
      case 'Medium': return '#F59E0B'; // Yellow/Orange
      case 'Hard': return '#EF4444'; // Red
      default: return '#F59E0B';
    }
  };



  // Handle player press to open details modal
  const handlePlayerPress = (player: FPLPlayer) => {
    setSelectedPlayer(player);
    setShowPlayerDetails(true);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.loadingText, { color: theme.colors.text }]}>Loading players...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {/* Search Bar */}
      <View style={[styles.searchContainer, { borderColor: theme.colors.textSecondary }]}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search By Name"
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {/* Price Dropdown */}
        <TouchableOpacity
          style={[styles.filterButton, { borderColor: theme.colors.textSecondary }]}
          onPress={() => setShowPriceFilter(!showPriceFilter)}
        >
          <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>
            {filterConfig.maxPrice === null ? 'Unlimited' : `≤ £${filterConfig.maxPrice}m`}
          </Text>
          <Text style={styles.chevronIcon}>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterButton, { borderColor: theme.colors.textSecondary }]}
          onPress={() => setShowPositionFilter(!showPositionFilter)}
        >
          <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>
            {filterConfig.position === 'All' ? 'Positions' : filterConfig.position}
          </Text>
          <Text style={styles.chevronIcon}>▼</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterButton, { borderColor: theme.colors.textSecondary }]}
          onPress={() => setShowClubFilter(!showClubFilter)}
        >
          <Text style={[styles.filterButtonText, { color: theme.colors.text }]}>
            {filterConfig.club}
          </Text>
          <Text style={styles.chevronIcon}>▼</Text>
        </TouchableOpacity>

        {/* Refresh Button */}
        <TouchableOpacity
          style={[styles.filterButton, { borderColor: theme.colors.textSecondary, backgroundColor: theme.colors.primary }]}
          onPress={() => {
            Alert.alert(
              'Refresh Data',
              'This will clear the cache and reload all data. This may take a few minutes.',
              [
                { text: 'Cancel', style: 'cancel' },
                { 
                  text: 'Refresh', 
                  style: 'destructive',
                  onPress: () => {
                    clearCache();
                    // Force a reload by setting loading to true
                    setLoading(true);
                    // The app will automatically reload when cache is cleared
                  }
                }
              ]
            );
          }}
        >
          <Text style={[styles.filterButtonText, { color: '#FFFFFF' }]}>
            🔄 Refresh
          </Text>
        </TouchableOpacity>
        
      </View>

      {/* Position Filter Dropdown */}
      {showPositionFilter && (
        <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textSecondary }]}>
          {['Positions', 'Goalkeeper', 'Defender', 'Midfielder', 'Forward'].map((label) => (
            <TouchableOpacity
              key={label}
              style={styles.dropdownItem}
              onPress={() => {
                const value = label === 'Positions' ? 'All' : label;
                setFilterConfig(prev => ({ ...prev, position: value }));
                setShowPositionFilter(false);
              }}
            >
              <Text style={[styles.dropdownText, { color: theme.colors.text }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      

      {/* Club Filter Dropdown */}
      {showClubFilter && (
        <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textSecondary }]}>
          <TouchableOpacity
            key="All clubs"
            style={styles.dropdownItem}
            onPress={() => {
              setFilterConfig(prev => ({ ...prev, club: 'All clubs' }));
              setShowClubFilter(false);
            }}
          >
            <Text style={[styles.dropdownText, { color: theme.colors.text }]}>All clubs</Text>
          </TouchableOpacity>
          
          {teams.map((team) => (
            <TouchableOpacity
              key={team.id}
              style={styles.dropdownItem}
              onPress={() => {
                setFilterConfig(prev => ({ ...prev, club: team.name }));
                setShowClubFilter(false);
              }}
            >
              <View style={styles.clubDropdownItem}>
                <Image 
                  source={{ uri: `https://fantasy.premierleague.com/api/bootstrap-static/2023/img/teams/${team.code}.png` }}
                  style={[
                    styles.clubBadge,
                    // Only apply red tint to Liverpool badge
                    team.name === 'Liverpool' && { tintColor: '#C8102E' }
                  ]}
                />
                <Text style={[styles.dropdownText, { color: theme.colors.text }]}>{team.name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Price Filter Dropdown */}
      {showPriceFilter && (
        <View style={[styles.dropdown, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textSecondary }]}>
          {priceOptions.map((option) => (
            <TouchableOpacity
              key={String(option)}
              style={styles.dropdownItem}
              onPress={() => {
                const value = option === 'Unlimited' ? null : Number(option);
                setFilterConfig(prev => ({ ...prev, maxPrice: value }));
                setShowPriceFilter(false);
              }}
            >
              <Text style={[styles.dropdownText, { color: theme.colors.text }]}>
                {option === 'Unlimited' ? 'Unlimited' : `≤ £${Number(option).toFixed(1)}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Player Count */}
      <View style={[styles.playerCountContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textSecondary }]}>
        <Text style={[styles.playerCountText, { color: theme.colors.text }]}>
          Showing {filteredAndSortedPlayers.length} players
        </Text>
      </View>



      {/* Horizontal Scrollable Table */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={[styles.tableHeader, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textSecondary }]}>
            <TouchableOpacity
              style={[styles.headerCell, styles.playerHeaderCell]}
              onPress={() => handleSort('web_name')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                Player {getSortIndicator('web_name')}
              </Text>
            </TouchableOpacity>
            
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('form')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                Form {getSortIndicator('form')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('now_cost')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                Price {getSortIndicator('now_cost')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('selected_by_percent')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                Selected {getSortIndicator('selected_by_percent')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('event_points')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                GW{currentGameweek} {getSortIndicator('event_points')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('total_points')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                Total {getSortIndicator('total_points')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('ict_index')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                ICT {getSortIndicator('ict_index')}
              </Text>
            </TouchableOpacity>
            
            {/* Baseline GW header aligned with row position (after ICT) */}
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('baselineHistoryLength')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                Baseline GW {getSortIndicator('baselineHistoryLength')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('transfers_in')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                Trans In {getSortIndicator('transfers_in')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('transfers_out')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                Trans Out {getSortIndicator('transfers_out')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('dreamteam_count')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                Bonus {getSortIndicator('dreamteam_count')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('gwp1_xp')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                GW{currentGameweek + 1} Fixture {getSortIndicator('gwp1_xp')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('gwp2_xp')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                GW{currentGameweek + 2} Fixture {getSortIndicator('gwp2_xp')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('gwp3_xp')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                GW{currentGameweek + 3} Fixture {getSortIndicator('gwp3_xp')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('gwp1_xp')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                GW{currentGameweek + 1} XP {getSortIndicator('gwp1_xp')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('gwp2_xp')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                GW{currentGameweek + 2} XP {getSortIndicator('gwp2_xp')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('gwp3_xp')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                GW{currentGameweek + 3} XP {getSortIndicator('gwp3_xp')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('total_3gw_xp')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                Total 3GW XP {getSortIndicator('total_3gw_xp')}
              </Text>
            </TouchableOpacity>
            

            
          </View>

          {/* Players List */}
          <ScrollView 
            style={styles.playersList} 
            showsVerticalScrollIndicator={false}
          >
            {filteredAndSortedPlayers.map((player: any, index: number) => {
              // Check if player has 24/25 baseline history using fresh calculation
              // This ensures consistency with XP calculation
              const freshBaselineLength = recalculateBaselineData(player);
              const hasBaselineHistory = freshBaselineLength > 0;
              
              // Highlight ALL players who have NO baseline history (regardless of XP)
              // This shows which players are new to the Premier League
              const shouldHighlightOrange = !hasBaselineHistory;
              
              // Debug logging for specific players
              if (player.web_name === 'Salah' || player.web_name === 'Elkitike' || player.web_name === 'Savinho') {
                console.log(`${player.web_name} debug:`, {
                  gwp1_xp: player.gwp1_xp,
                  gwp2_xp: player.gwp2_xp,
                  gwp3_xp: player.gwp3_xp,
                  total_3gw_xp: player.total_3gw_xp,
                  cachedBaselineLength: player.baselineHistoryLength || 0,
                  freshBaselineLength: freshBaselineLength,
                  season_history_length: player.season_history?.length,
                  hasBaselineHistory: hasBaselineHistory,
                  // Check if this is a new player (no baseline history)
                  isNewPlayer: !hasBaselineHistory
                });
              }
              
              return (
                <TouchableOpacity 
                  key={player.id} 
                  style={[
                    styles.playerRow,
                    index === filteredAndSortedPlayers.length - 1 && { marginBottom: 0 },
                    // Highlight players without 24/25 history (new to Premier League)
                    shouldHighlightOrange && { 
                      backgroundColor: 'rgba(255, 165, 0, 0.2)' // Light orange with opacity
                    }
                  ]}
                  onPress={() => handlePlayerPress(player)}
                  activeOpacity={0.7}
                >
                {/* Player Info */}
                <View style={[styles.playerInfoCell, styles.playerHeaderCell]}>
                  <PlayerPhoto 
                    playerId={player.id}
                    photoCode={player.photo}
                    photoUrl={player.photoUrl}
                    width={45}
                    height={56}
                    resizeMode="cover"
                    style={{ marginRight: 8 }}
                  />
                  <View style={styles.playerDetails}>
                    <Text style={[styles.playerName, { color: theme.colors.text }]}> 
                      {player.web_name}
                    </Text>
                    <Text style={[styles.playerTeam, { color: theme.colors.textSecondary }]}>
                      {getClubName(player.team)} {getPositionShort(player.element_type)}
                    </Text>
                  </View>
                  {player.status !== 'a' && (
                    <Text style={styles.warningIcon}>⚠️</Text>
                  )}
                  {player.special && (
                    <Text style={styles.starIcon}>⭐</Text>
                  )}
                </View>
                

                
                {/* Form */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {parseFloat(player.form) || 0}
                  </Text>
                </View>
                
                {/* Current Price */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {formatPrice(player.now_cost)}
                  </Text>
                </View>
                
                {/* Selected */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {formatPercentage(player.selected_by_percent)}
                  </Text>
                </View>
                
                {/* GW Points */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {player.event_points}
                  </Text>
                </View>
                
                {/* Total Points */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {player.total_points}
                  </Text>
                </View>
                
                {/* ICT Index */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {parseFloat(player.ict_index) || 0}
                  </Text>
                </View>

                {/* Baseline GW count (using fresh calculation) */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: freshBaselineLength === 0 ? '#DC2626' : theme.colors.text }]}> 
                    {freshBaselineLength}
                  </Text>
                </View>
                
                {/* Transfers In */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {player.transfers_in}
                  </Text>
                </View>
                
                {/* Transfers Out */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {player.transfers_out}
                  </Text>
                </View>
                
                {/* Bonus Points */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {player.dreamteam_count}
                  </Text>
                </View>
                
                {/* GW3 Fixture (corresponds to gwp1_xp) */}
                <View style={styles.statCell}>
                  {(() => {
                    const fixtures = player.next3Fixtures || [];
                    const fixture = fixtures[0]; // GW3
                    if (!fixture) return <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>-</Text>;
                    
                    return (
                      <View style={[
                        styles.fixtureItem,
                        { backgroundColor: getFDRColor(fixture.difficulty) }
                      ]}>
                        <Text style={[styles.fixtureText, { color: 'white' }]}>
                          {fixture.fixture}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                
                {/* GW4 Fixture (corresponds to gwp2_xp) */}
                <View style={styles.statCell}>
                  {(() => {
                    const fixtures = player.next3Fixtures || [];
                    const fixture = fixtures[1]; // GW4
                    if (!fixture) return <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>-</Text>;
                    
                    return (
                      <View style={[
                        styles.fixtureItem,
                        { backgroundColor: getFDRColor(fixture.difficulty) }
                      ]}>
                        <Text style={[styles.fixtureText, { color: 'white' }]}>
                          {fixture.fixture}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                
                {/* GW5 Fixture (corresponds to gwp3_xp) */}
                <View style={styles.statCell}>
                  {(() => {
                    const fixtures = player.next3Fixtures || [];
                    const fixture = fixtures[2]; // GW5
                    if (!fixture) return <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>-</Text>;
                    
                    return (
                      <View style={[
                        styles.fixtureItem,
                        { backgroundColor: getFDRColor(fixture.difficulty) }
                      ]}>
                        <Text style={[styles.fixtureText, { color: 'white' }]}>
                          {fixture.fixture}
                        </Text>
                      </View>
                    );
                  })()}
                </View>
                
                {/* GW+2 XP */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {player.gwp1_xp || 0}
                  </Text>
                </View>
                
                {/* GW+3 XP */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {player.gwp2_xp || 0}
                  </Text>
                </View>
                
                {/* GW+4 XP */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {player.gwp3_xp || 0}
                  </Text>
                </View>
                
                {/* Total 3GW XP */}
                <View style={styles.statCell}>
                  <Text style={[styles.statText, { color: theme.colors.text }]}> 
                    {player.total_3gw_xp || 0}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
            
                    {/* All players are now displayed */}

          </ScrollView>
        </View>
      </ScrollView>

      {/* Player Details Modal */}
      {selectedPlayer && (
        <PlayerDetailsModal
          visible={showPlayerDetails}
          onClose={() => {
            const startTime = Date.now();
            console.log('🚀 PlayersScreen: Starting to close player details modal...');
            
            setShowPlayerDetails(false);
            setSelectedPlayer(null);
            
            const closeTime = Date.now() - startTime;
            console.log(`✅ PlayersScreen: Player details modal closed in ${closeTime}ms`);
          }}
          fplPlayer={selectedPlayer}
          team={getTeamById(selectedPlayer.team) || null}
        />
      )}
    </SafeAreaView>
  );
};

export default PlayersScreen; 