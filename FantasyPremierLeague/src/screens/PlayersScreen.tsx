import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { FPLPlayer, FPLTeam } from '../types';
import { fplApiService } from '../services/fplApi';
import { styles } from '../styles/PlayersScreen.styles';
import { Ionicons } from '@expo/vector-icons';
import PlayerPhoto from '../components/PlayerPhoto';
import PlayerDetailsModal from '../components/PlayerDetailsModal';

interface SortConfig {
  key: keyof FPLPlayer | 'gw1' | 'total_points' | 'ict_index' | 'transfers_in' | 'transfers_out' | 'bonus_points' | 'next_gw1' | 'next_gw2' | 'next_gw3';
  direction: 'asc' | 'desc';
}

interface FilterConfig {
  position: string;
  maxPrice: number | null; // null means Unlimited
  club: string;
}

const PlayersScreen: React.FC = () => {
  const theme = useTheme();
  const { width } = Dimensions.get('window');
  
  const [players, setPlayers] = useState<FPLPlayer[]>([]);
  const [teams, setTeams] = useState<FPLTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'form', direction: 'desc' });
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

  // Price options from £4.0m to £14.5m in £0.5m increments
  const priceOptions = useMemo<(string | number)[]>(() => {
    const values: number[] = [];
    for (let v = 4.0; v <= 14.5 + 1e-9; v += 0.5) {
      // Round to 1 decimal to avoid float artifacts
      values.push(Math.round(v * 10) / 10);
    }
    return ['Unlimited', ...values];
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [playersData, teamsData, gameweekData, fixturesData] = await Promise.all([
          fplApiService.fetchAllPlayers(),
          fplApiService.fetchAllTeams(),
          fplApiService.getCurrentGameweek(),
          fplApiService.fetchFixturesData(),
        ]);
        
        setPlayers(playersData);
        setTeams(teamsData);
        setCurrentGameweek(gameweekData.id);
        setLastGameweek(Math.max(1, gameweekData.id - 1));
        setFixtures(fixturesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = players.filter(player => {
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
        case 'next_gw1':
        case 'next_gw2':
        case 'next_gw3':
          // For sorting by fixture difficulty, we'll use a simple approach
          const gameweekIndex = parseInt(sortConfig.key.slice(-1)) - 1;
          const aFixtures = getNext3Fixtures(a.team);
          const bFixtures = getNext3Fixtures(b.team);
          const aFixture = aFixtures[gameweekIndex];
          const bFixture = bFixtures[gameweekIndex];
          
          if (!aFixture || !bFixture) {
            aValue = 0;
            bValue = 0;
          } else {
            // Sort by difficulty: Easy (1) < Medium (2) < Hard (3)
            const difficultyMap = { 'Easy': 1, 'Medium': 2, 'Hard': 3 } as const;
            aValue = difficultyMap[aFixture.difficulty] || 2;
            bValue = difficultyMap[bFixture.difficulty] || 2;
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
  }, [players, searchQuery, filterConfig, sortConfig]);

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

  // Get next 3 fixtures with FDR ratings
  const getNext3Fixtures = (teamId: number): { fixture: string; difficulty: 'Easy' | 'Medium' | 'Hard' }[] => {
    if (!fixtures.length) return [];
    
    const teamFixtures = fixtures.filter(fixture => 
      fixture.team_h === teamId || fixture.team_a === teamId
    );
    
    // Get next 3 fixtures starting from current gameweek
    const nextFixtures = teamFixtures
      .filter(fixture => fixture.event >= currentGameweek)
      .sort((a, b) => a.event - b.event)
      .slice(0, 3);
    
    return nextFixtures.map(fixture => {
      const isHome = fixture.team_h === teamId;
      const opponentId = isHome ? fixture.team_a : fixture.team_h;
      const opponent = teams.find(t => t.id === opponentId);
      const venue = isHome ? '(H)' : '(A)';
      
      // Get difficulty rating from FPL API
      const difficulty = fixture.team_h_difficulty || fixture.team_a_difficulty || 3;
      let difficultyLevel: 'Easy' | 'Medium' | 'Hard' = 'Medium';
      if (difficulty <= 2) difficultyLevel = 'Easy';
      else if (difficulty >= 4) difficultyLevel = 'Hard';
      
      return {
        fixture: `${opponent?.short_name || 'UNK'} ${venue}`,
        difficulty: difficultyLevel
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
                  source={{ uri: fplApiService.getTeamBadgeUrl(team.code) }}
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
                GW{lastGameweek} {getSortIndicator('event_points')}
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
              onPress={() => handleSort('next_gw1')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                GW{currentGameweek + 1} {getSortIndicator('next_gw1')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('next_gw2')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                GW{currentGameweek + 2} {getSortIndicator('next_gw2')}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.headerCell}
              onPress={() => handleSort('next_gw3')}
            >
              <Text style={[styles.headerText, { color: theme.colors.text }]}> 
                GW{currentGameweek + 3} {getSortIndicator('next_gw3')}
              </Text>
            </TouchableOpacity>
            

            
          </View>

          {/* Players List */}
          <ScrollView 
            style={styles.playersList} 
            showsVerticalScrollIndicator={false}
          >
            {filteredAndSortedPlayers.map((player, index) => (
              <TouchableOpacity 
                key={player.id} 
                style={[
                  styles.playerRow,
                  index === filteredAndSortedPlayers.length - 1 && { marginBottom: 0 }
                ]}
                onPress={() => handlePlayerPress(player)}
                activeOpacity={0.7}
              >
                {/* Player Info */}
                <View style={[styles.playerInfoCell, styles.playerHeaderCell]}>
                  <PlayerPhoto 
                    playerId={player.id}
                    width={32}
                    height={40}
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
                
                {/* GW+1 Fixture */}
                <View style={styles.statCell}>
                  {(() => {
                    const fixtures = getNext3Fixtures(player.team);
                    const fixture = fixtures[0];
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
                
                {/* GW+2 Fixture */}
                <View style={styles.statCell}>
                  {(() => {
                    const fixtures = getNext3Fixtures(player.team);
                    const fixture = fixtures[1];
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
                
                {/* GW+3 Fixture */}
                <View style={styles.statCell}>
                  {(() => {
                    const fixtures = getNext3Fixtures(player.team);
                    const fixture = fixtures[2];
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
                

              </TouchableOpacity>
            ))}
            

          </ScrollView>
        </View>
      </ScrollView>

      {/* Player Details Modal */}
      {selectedPlayer && (
        <PlayerDetailsModal
          visible={showPlayerDetails}
          onClose={() => {
            setShowPlayerDetails(false);
            setSelectedPlayer(null);
          }}
          fplPlayer={selectedPlayer}
          team={getTeamById(selectedPlayer.team) || null}
        />
      )}
    </SafeAreaView>
  );
};

export default PlayersScreen; 