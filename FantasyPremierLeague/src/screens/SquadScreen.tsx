import React, { useState, useEffect } from 'react';
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
import { FPLPlayer } from '../types';
import { styles } from '../styles/PointsScreen.styles';
import PlayerPhoto from '../components/PlayerPhoto';
import PlayerDetailsModal from '../components/PlayerDetailsModal';

const { width } = Dimensions.get('window');

const SquadScreen: React.FC = () => {
  const theme = useTheme();
  const { cachedData, isDataLoaded } = useData();
  
  // State for squad data
  const [players, setPlayers] = useState<FPLPlayer[]>([]);
  const [squadId, setSquadId] = useState('397418'); // Default squad ID
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadDataFetched, setSquadDataFetched] = useState(false);
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<FPLPlayer | null>(null);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);
  
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

  // Use current gameweek as base, but allow navigation between 3 gameweeks
  const baseGameweek = cachedData?.currentGameweek?.id || 1;
  const [selectedGameweek, setSelectedGameweek] = useState(baseGameweek + 1);
  
  // Available gameweeks to view (next 3 gameweeks from current)
  const availableGameweeks = [baseGameweek + 1, baseGameweek + 2, baseGameweek + 3];

  // Auto-fetch squad once FPL data is present
  useEffect(() => {
    if (cachedData?.fplPlayers?.length > 0 && !squadDataFetched && !squadLoading && baseGameweek > 0) {
      console.log('🚀 Auto-fetching base gameweek squad for GW', baseGameweek);
      fetchSquadData(baseGameweek);
    }
  }, [cachedData?.fplPlayers?.length, baseGameweek]);

  // Navigation functions
  const goToPreviousGameweek = () => {
    const currentIndex = availableGameweeks.indexOf(selectedGameweek);
    if (currentIndex > 0) {
      setSelectedGameweek(availableGameweeks[currentIndex - 1]);
    }
  };

  const goToNextGameweek = () => {
    const currentIndex = availableGameweeks.indexOf(selectedGameweek);
    if (currentIndex < availableGameweeks.length - 1) {
      setSelectedGameweek(availableGameweeks[currentIndex + 1]);
    }
  };

  // Fetch squad data from FPL API
  const fetchSquadData = async (gameweek: number = selectedGameweek) => {
    console.log('🚀 fetchSquadData called with:', { gameweek, squadId, fplPlayersLength: cachedData?.fplPlayers?.length });
    
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
          const fplPlayer = cachedData?.fplPlayers?.find(p => p.id === pick.element);
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

  // Function to get player expected points for a specific gameweek
  const getPlayerXP = (playerId: number, gameweek: number) => {
    // Get the player from cached predictions
    const playerPrediction = cachedData?.playerPredictions?.find(p => p.player_id === playerId);
    if (!playerPrediction) return 0;
    
    // Map gameweek to the correct XP property for next 3 gameweeks from current
    if (gameweek === baseGameweek + 1) {
      return playerPrediction.gw2_xp || 0;
    } else if (gameweek === baseGameweek + 2) {
      return playerPrediction.gw3_xp || 0;
    } else if (gameweek === baseGameweek + 3) {
      return playerPrediction.gw4_xp || 0;
    }
    
    return 0;
  };

  // Function to get total squad XP for a specific gameweek
  const getSquadTotalXP = (gameweek: number) => {
    let totalXP = 0;
    
    // Sum up XP for all players in the squad
    players.forEach(player => {
      totalXP += getPlayerXP(player.id, gameweek);
    });
    
    return Math.round(totalXP * 10) / 10; // Round to 1 decimal place
  };

  // Helper functions for the pitch layout
  const startingXI = players.filter(p => p.is_starter && p.id !== 0);
  const benchPlayers = players.filter(p => !p.is_starter && p.id !== 0);

  // Helper function to get player by ID
  const getPlayerById = (id: number): FPLPlayer | undefined => {
    return cachedData?.fplPlayers?.find(p => p.id === id);
  };

  // Helper function to get fixture for a player in selected gameweek
  const getFixtureForPlayer = (playerId: number, gameweek: number): string => {
    try {
      // If fixtures aren't loaded yet, show loading
      if (!cachedData?.fixtures || cachedData.fixtures.length === 0) return 'Loading...';
      
      const player = getPlayerById(playerId);
      if (!player) return 'No fixture';
      
      // Find fixtures for this team
      const teamFixtures = cachedData.fixtures.filter(fixture => 
        fixture.team_h === player.team || fixture.team_a === player.team
      );
      
      // Find the fixture for the specific gameweek
      const gameweekFixture = teamFixtures.find(fixture => 
        fixture.event === gameweek
      );
      
      if (gameweekFixture) {
        const homeTeam = cachedData?.teams?.find(t => t.id === gameweekFixture.team_h);
        const awayTeam = cachedData?.teams?.find(t => t.id === gameweekFixture.team_a);
        
        if (homeTeam && awayTeam) {
          const isHome = gameweekFixture.team_h === player.team;
          const opponent = isHome ? awayTeam : homeTeam;
          const venue = isHome ? '(H)' : '(A)';
          
          return `${opponent.short_name} ${venue}`;
        }
      }
      
      return 'No fixture';
    } catch (error) {
      console.error('Error getting fixture for player:', error);
      return 'No fixture';
    }
  };

  const getTeamById = (teamId: number) => {
    const team = cachedData?.teams?.find(t => t.id === teamId);
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
    const spacing = width / (defenders + 1); // Add 1 for better spacing
    const left = (spacing * (index + 1)) - 36; // Start from spacing, not 0
    return { top: 154, left };
  };

  const getMidPosition = (index: number) => {
    const midfielders = startingXI.filter(p => p.squad_position && getPositionName(p.squad_position) === 'MID').length;
    const spacing = width / (midfielders + 1); // Add 1 for better spacing
    const left = (spacing * (index + 1)) - 36; // Start from spacing, not 0
    return { top: 240, left };
  };

  const getFwdPosition = (index: number) => {
    const forwards = startingXI.filter(p => p.squad_position && getPositionName(p.squad_position) === 'FWD').length;
    const spacing = width / (forwards + 1); // Add 1 for better spacing
    const left = (spacing * (index + 1)) - 36; // Start from spacing, not 0
    return { top: 326, left };
  };

  const handlePlayerPress = (player: FPLPlayer) => {
    setSelectedPlayer(player);
    setShowPlayerDetails(true);
  };

  if (!isDataLoaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading FPL data...</Text>
      </View>
    );
  }

  if (squadLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading squad...</Text>
      </View>
    );
  }

  // Don't render players until we have FPL data
  if (!cachedData?.fplPlayers || cachedData.fplPlayers.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading FPL data...</Text>
      </View>
    );
  }

  // Show squad loading state if we don't have squad data yet
  if (!squadDataFetched || startingXI.length === 0) {
    console.log('🔍 Debug - Loading state:', {
      squadDataFetched,
      squadLoading,
      startingXILength: startingXI.length,
      playersLength: players.length,
      fplPlayersLength: cachedData.fplPlayers?.length
    });
    
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.squadLoadingContainer}>
            <Text style={styles.squadLoadingText}>
              {squadLoading 
                ? '🔄 Loading current gameweek squad...' 
                : squadDataFetched 
                  ? 'Squad data loaded successfully!' 
                  : 'Click "Fetch Squad Data" to load your current gameweek team'
              }
            </Text>
            {!squadDataFetched && !squadLoading && (
              <TouchableOpacity
                style={[styles.fetchButton, { backgroundColor: theme.colors.primary, marginTop: 20 }]}
                onPress={() => setShowSquadModal(true)}
              >
                <Text style={styles.fetchButtonText}>📊 Load Next GW Squad</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Gameweek Title with Navigation */}
      {squadDataFetched && (
        <View style={styles.gameweekSelector}>
          <View style={styles.gameweekTitleContainer}>
            <TouchableOpacity
              style={styles.titleArrowButton}
              onPress={goToPreviousGameweek}
              disabled={selectedGameweek === availableGameweeks[0]}
            >
              <Text style={[styles.titleArrowText, { 
                color: selectedGameweek === availableGameweeks[0] ? theme.colors.textSecondary : theme.colors.primary 
              }]}>
                ←
              </Text>
            </TouchableOpacity>
            
            <Text style={[styles.gameweekTitle, { color: theme.colors.text }]}>
              Gameweek {selectedGameweek}{squadLoading ? ' (Loading...)' : (() => {
                const gameweekData = squadDataByGameweek[selectedGameweek];
                const totalXP = getSquadTotalXP(selectedGameweek);
                if (gameweekData) {
                  return ` (${gameweekData.totalPoints} pts, ${totalXP} XP)`;
                }
                return ` (${totalXP} XP)`;
              })()}
            </Text>
            
            <TouchableOpacity
              style={styles.titleArrowButton}
              onPress={goToNextGameweek}
              disabled={selectedGameweek === availableGameweeks[availableGameweeks.length - 1]}
            >
              <Text style={[styles.titleArrowText, { 
                color: selectedGameweek === availableGameweeks[availableGameweeks.length - 1] ? theme.colors.textSecondary : theme.colors.primary 
              }]}>
                →
              </Text>
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
              Fetch Current Gameweek Squad
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
                style={styles.playerCard}
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
                  width={55}
                  height={70}
                  showName={false}
                />
                <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                  {getPlayerById(startingXI[0].id)?.web_name || 'Player'}
                </Text>
                
                  {/* Show fixture and XP for selected gameweek */}
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {getFixtureForPlayer(startingXI[0].id, selectedGameweek)} ({getPlayerXP(startingXI[0].id, selectedGameweek)} XP)
                  </Text>
              </TouchableOpacity>
            </View>

            {/* Defenders */}
            {startingXI.slice(1, 4).map((player, index) => (
              <View key={player.id} style={[styles.playerPosition, getDefPosition(index)]}>
                <TouchableOpacity 
                  style={styles.playerCard}
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
                    width={55}
                    height={70}
                    showName={false}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {getPlayerById(player.id)?.web_name || 'Player'}
                  </Text>
                  
                  {/* Show fixture and XP for selected gameweek */}
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {getFixtureForPlayer(player.id, selectedGameweek)} ({getPlayerXP(player.id, selectedGameweek)} XP)
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Midfielders */}
            {startingXI.slice(4, 8).map((player, index) => (
              <View key={player.id} style={[styles.playerPosition, getMidPosition(index)]}>
                <TouchableOpacity 
                  style={styles.playerCard}
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
                    width={55}
                    height={70}
                    showName={false}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {getPlayerById(player.id)?.web_name || 'Player'}
                  </Text>
                  
                  {/* Show fixture and XP for selected gameweek */}
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {getFixtureForPlayer(player.id, selectedGameweek)} ({getPlayerXP(player.id, selectedGameweek)} XP)
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Forwards */}
            {startingXI.slice(8, 11).map((player, index) => (
              <View key={player.id} style={[styles.playerPosition, getFwdPosition(index)]}>
                <TouchableOpacity 
                  style={styles.playerCard}
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
                    width={55}
                    height={70}
                    showName={false}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {getPlayerById(player.id)?.web_name || 'Player'}
                  </Text>
                  
                  {/* Show fixture and XP for selected gameweek */}
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {getFixtureForPlayer(player.id, selectedGameweek)} ({getPlayerXP(player.id, selectedGameweek)} XP)
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
                style={styles.playerCard}
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
                  width={55}
                  height={70}
                  showName={false}
                />
                <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                  {getPlayerById(player.id)?.web_name || 'Player'}
                </Text>
                
                {/* Show fixture and XP for selected gameweek */}
                <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                  {getFixtureForPlayer(player.id, selectedGameweek)} ({getPlayerXP(player.id, selectedGameweek)} XP)
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Squad Summary Section */}
        <View style={[styles.squadIdSection, { backgroundColor: theme.colors.surface, borderColor: theme.colors.textSecondary }]}>
          <Text style={[styles.squadIdTitle, { color: theme.colors.text }]}>
            📊 Squad Expected Points Summary
          </Text>
          <View style={styles.xpSummaryContainer}>
            <View style={styles.xpSummaryItem}>
              <Text style={[styles.xpSummaryLabel, { color: theme.colors.textSecondary }]}>
                GW{baseGameweek + 1} Total XP
              </Text>
              <Text style={[styles.xpSummaryValue, { color: theme.colors.primary }]}>
                {getSquadTotalXP(baseGameweek + 1)} XP
              </Text>
            </View>
            <View style={styles.xpSummaryItem}>
              <Text style={[styles.xpSummaryLabel, { color: theme.colors.textSecondary }]}>
                GW{baseGameweek + 2} Total XP
              </Text>
              <Text style={[styles.xpSummaryValue, { color: theme.colors.primary }]}>
                {getSquadTotalXP(baseGameweek + 2)} XP
              </Text>
            </View>
            <View style={styles.xpSummaryItem}>
              <Text style={[styles.xpSummaryLabel, { color: theme.colors.primary }]}>
                GW{baseGameweek + 3} Total XP
              </Text>
              <Text style={[styles.xpSummaryValue, { color: theme.colors.primary }]}>
                {getSquadTotalXP(baseGameweek + 3)} XP
              </Text>
            </View>
          </View>
        </View>

        {/* Squad ID Input Section */}
        <View style={styles.squadIdSection}>
          <Text style={[styles.squadIdTitle, { color: theme.colors.text }]}>
            Squad ID
          </Text>
          <View style={styles.squadIdInputContainer}>
            <TextInput
              style={[styles.squadIdInput, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.textSecondary 
              }]}
              value={squadId}
              onChangeText={setSquadId}
              placeholder="Enter Squad ID"
              placeholderTextColor={theme.colors.textSecondary}
              keyboardType="numeric"
            />
            <TouchableOpacity
              style={[styles.squadIdButton, { backgroundColor: theme.colors.primary }]}
                              onPress={() => fetchSquadData(selectedGameweek)}
              disabled={squadLoading}
            >
              <Text style={styles.squadIdButtonText}>
                {squadLoading ? 'Updating...' : 'Update Squad'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Player Details Modal */}
      <PlayerDetailsModal
        visible={showPlayerDetails}
        player={selectedPlayer}
        onClose={() => {
          setShowPlayerDetails(false);
          setSelectedPlayer(null);
        }}
        fplPlayer={selectedPlayer}
      />
    </View>
  );
};

export default SquadScreen;
