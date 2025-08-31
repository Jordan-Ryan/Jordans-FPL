import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { FPLPlayer, FPLTeam } from '../types';
import { fplApiService } from '../services/fplApi';
import SquadManager from '../components/SquadManager';
import PlayerPhoto from '../components/PlayerPhoto';
import PlayerDetailsModal from '../components/PlayerDetailsModal';
import { styles } from '../styles/PointsScreen.styles';

const PointsScreen: React.FC = () => {
  const theme = useTheme();
  const { cachedData, isDataLoaded } = useData();
  const { width } = Dimensions.get('window');
  
  // State for FPL data
  const [fplPlayers, setFplPlayers] = useState<FPLPlayer[]>([]);
  const [teams, setTeams] = useState<FPLTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSquadManager, setShowSquadManager] = useState(false);
  const [currentGameweek, setCurrentGameweek] = useState<{ id: number; name: string; deadline: string }>({ id: 1, name: 'Gameweek 1', deadline: 'TBD' });
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<FPLPlayer | null>(null);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);

  // Squad data fetching state
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [squadId, setSquadId] = useState('397418');
  const [selectedGameweek, setSelectedGameweek] = useState(1);
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadDataFetched, setSquadDataFetched] = useState(false);
  const [players, setPlayers] = useState<FPLPlayer[]>([]);
  
  // Squad performance data
  const [squadPerformance, setSquadPerformance] = useState<{
    totalPoints: number;
    gameweek: number;
  } | null>(null);

  // Store squad data for each gameweek
  const [squadDataByGameweek, setSquadDataByGameweek] = useState<{
    [gameweek: number]: {
      players: FPLPlayer[];
      totalPoints: number;
    };
  }>({});

  // Fallback function to fetch data if no cache
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch current gameweek and FPL data
      const [gameweek, playersData, teamsData, fixturesData] = await Promise.all([
        fplApiService.getCurrentGameweek(),
        fplApiService.fetchAllPlayers(),
        fplApiService.fetchAllTeams(),
        fplApiService.fetchFixturesData(),
      ]);
      
      setCurrentGameweek(gameweek);
      setFplPlayers(playersData);
      setTeams(teamsData);
      setFixtures(fixturesData);
      setSelectedGameweek(gameweek.id);
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (cachedData && isDataLoaded) {
      // Use cached data
      console.log('📦 Using cached data for Points screen');
      // Use playersModel which has photoUrl, fallback to fplPlayers if not available
      setFplPlayers(cachedData.playersModel || cachedData.fplPlayers);
      setTeams(cachedData.teams);
      setFixtures(cachedData.fixtures);
      setCurrentGameweek(cachedData.currentGameweek);
      setSelectedGameweek(cachedData.currentGameweek.id);
    } else if (!isDataLoaded) {
      // Still loading
      console.log('⏳ Data still loading...');
    } else {
      // Fallback: fetch data if no cache
      console.log('⚠️ No cached data, fetching from API');
      fetchData();
    }
  }, [cachedData, isDataLoaded]);

  // Auto-fetch squad once FPL data is present
  useEffect(() => {
    if (fplPlayers.length > 0 && !squadDataFetched && !squadLoading && selectedGameweek > 0) {
      console.log('🚀 Auto-fetching squad for GW', selectedGameweek);
      fetchSquadData(selectedGameweek);
    }
  }, [fplPlayers.length, selectedGameweek]);

  // Auto-fetch squad data when gameweek changes (if we already have squad data)
  useEffect(() => {
    if (fplPlayers.length > 0 && squadDataFetched && selectedGameweek > 0) {
      console.log('🔄 Gameweek changed to GW', selectedGameweek, '- fetching new squad data');
      fetchSquadData(selectedGameweek);
    }
  }, [selectedGameweek]);

  // Fetch squad data from FPL API
  const fetchSquadData = async (gameweek: number = selectedGameweek) => {
    console.log('🚀 fetchSquadData called with:', { gameweek, squadId, fplPlayersLength: fplPlayers.length });
    
    if (!squadId.trim()) {
      Alert.alert('Error', 'Please enter a valid Squad ID');
      return;
    }

    setSquadLoading(true);
    try {
      console.log('📡 Fetching squad data from FPL API...');
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      // Fetch squad data for this gameweek
      const squadResponse = await fetch(`https://fantasy.premierleague.com/api/entry/${squadId.trim()}/event/${gameweek}/picks/`, {
        signal: controller.signal
      });
      
      if (!squadResponse.ok) {
        throw new Error(`HTTP error! status: ${squadResponse.status}`);
      }
      
      const squadData = await squadResponse.json();
      
      // Fetch live stats for this gameweek to get actual points
      const liveResponse = await fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`, {
        signal: controller.signal
      });
      
      if (!liveResponse.ok) {
        throw new Error(`HTTP error! status: ${liveResponse.status}`);
      }
      
      const liveData = await liveResponse.json();
      
      clearTimeout(timeoutId);
      
      const data = squadData;
      const liveStats = liveData;
      console.log('📊 FPL API responses:', { 
        squadData: {
          picksCount: data.picks?.length, 
          entryHistory: data.entry_history,
          gameweek
        },
        liveData: {
          elementsCount: liveStats.elements?.length,
          samplePlayer: liveStats.elements?.[0]?.id ? {
            id: liveStats.elements[0].id,
            points: liveStats.elements[0].stats?.total_points
          } : null
        }
      });
      
      if (data.picks && data.picks.length > 0) {
        // Convert FPL API data to FPLPlayer format for display
        const convertedPlayers: FPLPlayer[] = data.picks.map((pick: any) => {
          const fplPlayer = fplPlayers.find(p => p.id === pick.element);
          if (fplPlayer) {
            // Get the actual points for this gameweek from the live stats
            const livePlayerStats = liveStats.elements?.find((element: any) => element.id === pick.element);
            const actualGameweekPoints = livePlayerStats?.stats?.total_points || 0;
            
            return {
              ...fplPlayer,
              // Add squad-specific data
              squad_position: pick.position,
              is_starter: pick.position <= 11,
              is_captain: pick.is_captain,
              is_vice_captain: pick.is_vice_captain,
              multiplier: pick.multiplier,
              // Store the actual points for this gameweek from the live stats
              gameweekPoints: actualGameweekPoints,
            };
          }
          return fplPlayer;
        }).filter(Boolean);
        
        console.log('✅ Converted players:', { 
          convertedCount: convertedPlayers.length,
          startingXICount: convertedPlayers.filter(p => p.is_starter).length,
          benchCount: convertedPlayers.filter(p => !p.is_starter).length
        });
        
        // Store squad data for this gameweek
        const gameweekData = {
          players: convertedPlayers,
          totalPoints: data.entry_history?.points || 0,
        };
        
        setSquadDataByGameweek(prev => ({
          ...prev,
          [gameweek]: gameweekData
        }));
        
        setPlayers(convertedPlayers);
        setSquadDataFetched(true);
        setShowSquadModal(false);
        
        // Store squad performance data for header display
        setSquadPerformance({
          totalPoints: data.entry_history?.points || 0,
          gameweek: gameweek
        });
        
        console.log('🎯 Squad data set successfully for GW', gameweek, 'Total points:', data.entry_history?.points);
      } else {
        console.log('⚠️ No squad data found in response');
        Alert.alert('Error', 'No squad data found for this gameweek');
      }
    } catch (error) {
      console.error('❌ Error fetching squad data:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        Alert.alert('Error', 'Request timed out. Please check your connection and try again.');
      } else {
        Alert.alert('Error', 'Failed to fetch squad data. Please check your Squad ID and try again.');
      }
    } finally {
      console.log('🏁 fetchSquadData completed, setting squadLoading to false');
      setSquadLoading(false);
    }
  };

  // Handle squad updates from SquadManager
  const handleSquadUpdate = (updatedSquad: any[]) => {
    console.log('Squad updated in PointsScreen:', updatedSquad);
    // This is no longer needed since we're using FPL API data
  };

  // Function to get player points for a specific gameweek with captain doubling
  const getPlayerPointsForGameweek = (playerId: number, gameweek: number) => {
    // Find the player in the current squad to get their gameweek points
    const squadPlayer = players.find(p => p.id === playerId);
    if (!squadPlayer) return 0;
    
    // Use the stored gameweek points from the FPL API response
    const basePoints = squadPlayer.gameweekPoints || 0;
    
    // IMPORTANT: The FPL API live stats already include captain doubling!
    // So we should NOT double the points again, just return them as-is
    console.log(`📊 Player ${playerId} (${squadPlayer.is_captain ? 'C' : squadPlayer.is_vice_captain ? 'VC' : 'Regular'}): ${basePoints} pts`);
    
    return basePoints;
  };





  // Helper functions for the pitch layout
  const startingXI = players.filter(p => p.is_starter && p.id !== 0);
  const benchPlayers = players.filter(p => !p.is_starter && p.id !== 0);

  // Helper function to get player by ID
  const getPlayerById = (id: number): FPLPlayer | undefined => {
    return fplPlayers.find(p => p.id === id);
  };

  // Helper function to get next fixture for a player
  const getNextFixtureForPlayer = (playerId: number): string => {
    try {
      // If fixtures aren't loaded yet, show loading
      if (fixtures.length === 0) return 'Loading...';
      
      const player = getPlayerById(playerId);
      if (!player) return 'No fixture';
      
      // Find fixtures for this team in current or next gameweek
      const teamFixtures = fixtures.filter(fixture => 
        fixture.team_h === player.team || fixture.team_a === player.team
      );
      
      // Find the next fixture (current or next gameweek)
      const nextFixture = teamFixtures.find(fixture => 
        fixture.event >= currentGameweek.id
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
  };

  const getTeamById = (teamId: number) => {
    const team = teams.find(t => t.id === teamId);
    return team || { name: `Team ${teamId}`, short_name: `T${teamId}` };
  };

  const getPositionName = (position: number) => {
    if (position === 1) return 'GK';
    if (position >= 2 && position <= 4) return 'DEF';
    if (position >= 5 && position <= 8) return 'MID';
    if (position >= 9 && position <= 11) return 'FWD';
    return 'BENCH';
  };

  const getDefPosition = (index: number) => {
    const defenders = startingXI.filter(p => p.squad_position && getPositionName(p.squad_position) === 'DEF').length;
    const spacing = width / defenders;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 154, left };
  };

  const getMidPosition = (index: number) => {
    const midfielders = startingXI.filter(p => p.squad_position && getPositionName(p.squad_position) === 'MID').length;
    const spacing = width / midfielders;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 264, left };
  };

  const getFwdPosition = (index: number) => {
    const forwards = startingXI.filter(p => p.squad_position && getPositionName(p.squad_position) === 'FWD').length;
    const spacing = width / forwards;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 374, left };
  };

  const handlePlayerPress = (player: FPLPlayer) => {
    setSelectedPlayer(player);
    setShowPlayerDetails(true);
  };

  if (showSquadManager) {
    return (
      <SquadManager 
        onSquadUpdate={handleSquadUpdate}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading squad...</Text>
      </View>
    );
  }

  // Don't render players until we have FPL data
  if (fplPlayers.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading FPL data...</Text>
      </View>
    );
  }

  // Show squad loading state if we don't have squad data yet
  if (!squadDataFetched || startingXI.length === 0) {


    
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.squadLoadingContainer}>
            <Text style={styles.squadLoadingText}>
              {squadLoading 
                ? '🔄 Loading squad data...' 
                : squadDataFetched 
                  ? 'Squad data loaded successfully!' 
                  : 'Click "Fetch Squad Data" to load your FPL team'
              }
            </Text>
            {!squadDataFetched && !squadLoading && (
              <TouchableOpacity
                style={[styles.fetchButton, { backgroundColor: theme.colors.primary, marginTop: 20 }]}
                onPress={() => setShowSquadModal(true)}
              >
                <Text style={styles.fetchButtonText}>📊 Load My Squad</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gameweek Selector */}
      {squadDataFetched && (
        <View style={styles.gameweekSelector}>
          {/* Gameweek Title with Navigation Arrows */}
          <View style={styles.gameweekTitleContainer}>
                          <TouchableOpacity
                style={[
                  styles.titleArrowButton,
                  (selectedGameweek <= 1 || squadLoading) && { opacity: 0.5 }
                ]}
                onPress={() => {
                  if (selectedGameweek > 1 && !squadLoading) {
                    setSelectedGameweek(selectedGameweek - 1);
                  }
                }}
                disabled={selectedGameweek <= 1 || squadLoading}
              >
              <Text style={[styles.titleArrowText, { color: theme.colors.text }]}>←</Text>
            </TouchableOpacity>
            
            <View style={styles.gameweekTitleContainer}>
              <Text style={[styles.gameweekTitle, { color: theme.colors.text }]}>
                Gameweek {selectedGameweek}
              </Text>
              {squadLoading ? (
                <Text style={[styles.loadingIndicator, { color: theme.colors.textSecondary }]}>
                  Loading...
                </Text>
              ) : squadPerformance ? (
                <Text style={[styles.pointsIndicator, { color: theme.colors.textSecondary }]}>
                  ({squadPerformance.totalPoints} pts)
                </Text>
              ) : null}
            </View>
            
                          <TouchableOpacity
                style={[
                  styles.titleArrowButton,
                  (selectedGameweek >= currentGameweek.id || squadLoading) && { opacity: 0.5 }
                ]}
                onPress={() => {
                  if (selectedGameweek < currentGameweek.id && !squadLoading) {
                    setSelectedGameweek(selectedGameweek + 1);
                  }
                }}
                disabled={selectedGameweek >= currentGameweek.id || squadLoading}
              >
              <Text style={[styles.titleArrowText, { color: theme.colors.text }]}>→</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Squad Data Modal - Simplified to only Squad ID */}
      <Modal
        visible={showSquadModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSquadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Fetch Squad Data
            </Text>
            
            <Text style={[styles.modalLabel, { color: theme.colors.textSecondary }]}>
              Squad ID:
            </Text>
            <TextInput
              style={[styles.modalInput, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.textSecondary 
              }]}
              value={squadId}
              onChangeText={setSquadId}
              placeholder="Enter your Squad ID (e.g., 397418)"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowSquadModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.fetchButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => fetchSquadData(selectedGameweek)}
                disabled={squadLoading}
              >
                <Text style={styles.fetchButtonText}>
                  {squadLoading ? 'Fetching...' : 'Fetch Data'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Football Pitch */}
        <View style={styles.pitchContainer}>
          <Image 
            source={require('../../assets/JORDANS FPL.png')} 
            style={styles.pitchBackground}
            resizeMode="cover"
          />
          
          {/* Starting XI - 3-4-3 Formation */}
          <View style={styles.formation}>
            {/* Goalkeeper */}
            <View style={[styles.playerPosition, styles.gkPosition]}>
              <TouchableOpacity 
                style={[
                  styles.playerCard,
                  // The selectedPlayer state was removed, so this style is removed
                ]}
                onPress={() => handlePlayerPress(startingXI[0])}
              >
                {/* Captain/Vice-Captain Badge */}
                {startingXI[0] && startingXI[0].is_captain && (
                  <View style={styles.captainBadge}>
                    <Text style={styles.captainText}>C</Text>
                  </View>
                )}
                {startingXI[0] && startingXI[0].is_vice_captain && (
                  <View style={styles.viceCaptainBadge}>
                    <Text style={styles.viceCaptainText}>VC</Text>
                  </View>
                )}
                
                <PlayerPhoto 
                  playerId={startingXI[0].id}
                  photoUrl={getPlayerById(startingXI[0].id)?.photoUrl}
                  width={55}
                  height={70}
                />
                <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                  {getPlayerById(startingXI[0].id)?.web_name || 'Player'}
                </Text>
                
                                  {/* Show either next fixture or points from last game */}
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {(() => {
                      const points = getPlayerPointsForGameweek(startingXI[0].id, selectedGameweek);
                      if (points > 0) {
                        return `${points} pts`;
                      }
                      return getNextFixtureForPlayer(startingXI[0].id);
                    })()}
                  </Text>
              </TouchableOpacity>
            </View>

            {/* Defenders */}
            {startingXI.slice(1, 4).map((player, index) => (
              <View key={player.id} style={[styles.playerPosition, getDefPosition(index)]}>
                <TouchableOpacity 
                  style={[
                    styles.playerCard,
                    // The selectedPlayer state was removed, so this style is removed
                  ]}
                  onPress={() => handlePlayerPress(player)}
                >
                  {/* Captain/Vice-Captain Badge */}
                  {player.is_captain && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>C</Text>
                    </View>
                  )}
                  {player.is_vice_captain && (
                    <View style={styles.viceCaptainBadge}>
                      <Text style={styles.viceCaptainText}>VC</Text>
                    </View>
                  )}
                  
                  <PlayerPhoto 
                    playerId={player.id}
                    photoUrl={getPlayerById(player.id)?.photoUrl}
                    width={55}
                    height={70}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {getPlayerById(player.id)?.web_name || 'Player'}
                  </Text>
                  
                  {/* Show either next fixture or points from last game */}
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {(() => {
                      const points = getPlayerPointsForGameweek(player.id, selectedGameweek);
                      if (points > 0) {
                        // Apply captain doubling if this player is captain
                        const isCaptain = player.is_captain;
                        const displayPoints = isCaptain ? points * 2 : points;
                        return `${displayPoints} pts${isCaptain ? ' (C)' : ''}`;
                      }
                      return getNextFixtureForPlayer(player.id);
                    })()}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Midfielders */}
            {startingXI.slice(4, 8).map((player, index) => (
              <View key={player.id} style={[styles.playerPosition, getMidPosition(index)]}>
                <TouchableOpacity 
                  style={[
                    styles.playerCard,
                    // The selectedPlayer state was removed, so this style is removed
                  ]}
                  onPress={() => handlePlayerPress(player)}
                >
                  {/* Captain/Vice-Captain Badge */}
                  {player.is_captain && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>C</Text>
                    </View>
                  )}
                  {player.is_vice_captain && (
                    <View style={styles.viceCaptainBadge}>
                      <Text style={styles.viceCaptainText}>VC</Text>
                    </View>
                  )}
                  
                  <PlayerPhoto 
                    playerId={player.id}
                    photoUrl={getPlayerById(player.id)?.photoUrl}
                    width={55}
                    height={70}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {getPlayerById(player.id)?.web_name || 'Player'}
                  </Text>
                  
                  {/* Show either next fixture or points from last game */}
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {(() => {
                      const points = getPlayerPointsForGameweek(player.id, selectedGameweek);
                      if (points > 0) {
                        return `${points} pts`;
                      }
                      return getNextFixtureForPlayer(player.id);
                    })()}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Forwards */}
            {startingXI.slice(8, 11).map((player, index) => (
              <View key={player.id} style={[styles.playerPosition, getFwdPosition(index)]}>
                <TouchableOpacity 
                  style={[
                    styles.playerCard,
                    // The selectedPlayer state was removed, so this style is removed
                  ]}
                  onPress={() => handlePlayerPress(player)}
                >
                  {/* Captain/Vice-Captain Badge */}
                  {player.is_captain && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>C</Text>
                    </View>
                  )}
                  {player.is_vice_captain && (
                    <View style={styles.viceCaptainBadge}>
                      <Text style={styles.viceCaptainText}>VC</Text>
                    </View>
                  )}
                  
                  <PlayerPhoto 
                    playerId={player.id}
                    photoUrl={getPlayerById(player.id)?.photoUrl}
                    width={55}
                    height={70}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {getPlayerById(player.id)?.web_name || 'Player'}
                  </Text>
                  
                  {/* Show either next fixture or points from last game */}
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {(() => {
                      const points = getPlayerPointsForGameweek(player.id, selectedGameweek);
                      if (points > 0) {
                        return `${points} pts`;
                      }
                      return getNextFixtureForPlayer(player.id);
                    })()}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* Bench Section */}
        <View style={styles.benchSection}>
          <Text style={styles.benchTitle}>Bench</Text>
          <View style={styles.benchContainer}>
            {benchPlayers.map((player, index) => (
              <TouchableOpacity 
                key={player.id} 
                style={[
                  styles.playerCard, // Use same card style as playing field
                  // The selectedPlayer state was removed, so this style is removed
                ]}
                onPress={() => handlePlayerPress(player)}
              >
                {/* Captain/Vice-Captain Badge */}
                {player.is_captain && (
                  <View style={styles.captainBadge}>
                    <Text style={styles.captainText}>C</Text>
                  </View>
                )}
                {player.is_vice_captain && (
                  <View style={styles.viceCaptainBadge}>
                    <Text style={styles.viceCaptainText}>VC</Text>
                  </View>
                )}
                
                <PlayerPhoto 
                  playerId={player.id}
                  photoUrl={getPlayerById(player.id)?.photoUrl}
                  width={55}
                  height={70}
                />
                <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                  {getPlayerById(player.id)?.web_name || 'Player'}
                </Text>
                
                {/* Show either next fixture or points from last game */}
                <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                  {(() => {
                    const points = getPlayerPointsForGameweek(player.id, selectedGameweek);
                    if (points > 0) {
                      return `${points} pts`;
                    }
                    return getNextFixtureForPlayer(player.id);
                  })()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Squad ID Input Section */}
        <View style={styles.squadIdSection}>
          <Text style={styles.squadIdTitle}>Change Squad ID</Text>
          <View style={styles.squadIdInputContainer}>
            <TextInput
              style={[styles.squadIdInput, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.textSecondary 
              }]}
              value={squadId}
              onChangeText={setSquadId}
              placeholder="Enter your Squad ID (e.g., 397418)"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.squadIdButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => fetchSquadData(selectedGameweek)}
              disabled={squadLoading}
            >
              <Text style={styles.squadIdButtonText}>
                {squadLoading ? 'Fetching...' : 'Update Squad'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      {/* Player Details Modal */}
      {selectedPlayer && getPlayerById(selectedPlayer.id) && (
        <PlayerDetailsModal
          visible={showPlayerDetails}
          onClose={() => {
            setShowPlayerDetails(false);
            setSelectedPlayer(null);
          }}
          fplPlayer={getPlayerById(selectedPlayer.id)!}
          team={teams.find(t => t.id === (getPlayerById(selectedPlayer.id)?.team || 0)) || null}
        />
      )}
    </View>
  );
};

export default PointsScreen; 