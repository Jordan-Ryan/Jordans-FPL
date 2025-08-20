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
import { Player, FPLPlayer, FPLTeam } from '../types';
import { fplApiService } from '../services/fplApi';
import { squadData, squadHelpers } from '../data/squadData';
import SquadManager from '../components/SquadManager';
import PlayerPhoto from '../components/PlayerPhoto';
import PlayerDetailsModal from '../components/PlayerDetailsModal';
import { styles } from '../styles/PointsScreen.styles';

const PointsScreen: React.FC = () => {
  const theme = useTheme();
  const { width } = Dimensions.get('window');
  
  // Use the squad data model instead of hardcoded data
  const [players, setPlayers] = useState<Player[]>([]);
  const [fplPlayers, setFplPlayers] = useState<FPLPlayer[]>([]);
  const [teams, setTeams] = useState<FPLTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSquadManager, setShowSquadManager] = useState(false);
  const [currentGameweek, setCurrentGameweek] = useState<{ id: number; name: string; deadline: string }>({ id: 1, name: 'Gameweek 1', deadline: 'TBD' });
  const [fixtures, setFixtures] = useState<any[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);

  // New state for squad data fetching
  const [showSquadModal, setShowSquadModal] = useState(false);
  const [squadId, setSquadId] = useState('397418');
  const [selectedGameweek, setSelectedGameweek] = useState(1);
  const [squadLoading, setSquadLoading] = useState(false);
  const [squadDataFetched, setSquadDataFetched] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch current gameweek
        const gameweek = await fplApiService.getCurrentGameweek();
        setCurrentGameweek(gameweek);
        
        // Fetch FPL data
        const [playersData, teamsData, fixturesData] = await Promise.all([
          fplApiService.fetchAllPlayers(),
          fplApiService.fetchAllTeams(),
          fplApiService.fetchFixturesData(),
        ]);
        
        setFplPlayers(playersData);
        setTeams(teamsData);
        setFixtures(fixturesData);
        setPlayers(squadData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle squad updates from SquadManager
  const handleSquadUpdate = (updatedSquad: Player[]) => {
    setPlayers(updatedSquad);
    console.log('Squad updated in PointsScreen:', updatedSquad);
    
    // Here you could save to AsyncStorage or send to your backend
    // For now, we'll just update the local state
  };

  // Fetch squad data from FPL API
  const fetchSquadData = async () => {
    if (!squadId.trim()) {
      Alert.alert('Error', 'Please enter a valid Squad ID');
      return;
    }

    setSquadLoading(true);
    try {
      const response = await fetch(`https://fantasy.premierleague.com/api/entry/${squadId.trim()}/event/${selectedGameweek}/picks/`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.picks && data.picks.length > 0) {
        // Convert FPL API data to our Player format
        const convertedPlayers: Player[] = data.picks.map((pick: any, index: number) => {
          const fplPlayer = fplPlayers.find(p => p.id === pick.element);
          const isStarter = pick.position <= 11;
          
          return {
            id: pick.element,
            name: fplPlayer?.web_name || `Player ${pick.element}`,
            team: fplPlayer?.team || 0,
            team_position: pick.position,
            starter: isStarter,
            captain: pick.is_captain,
            vice_captain: pick.is_vice_captain,
            multiplier: pick.multiplier,
            points: pick.multiplier > 0 ? (fplPlayer?.event_points || 0) * pick.multiplier : 0,
            price: fplPlayer?.now_cost || 0,
            form: fplPlayer?.form || '0.0',
            total_points: fplPlayer?.total_points || 0,
            ict_index: fplPlayer?.ict_index || '0.0',
            selected_by_percent: fplPlayer?.selected_by_percent || '0.0',
            transfers_in: fplPlayer?.transfers_in || 0,
            transfers_out: fplPlayer?.transfers_out || 0,
            dreamteam_count: fplPlayer?.dreamteam_count || 0,
            status: fplPlayer?.status || 'a',
            special: fplPlayer?.special || false,
            chance_of_playing_next_round: fplPlayer?.chance_of_playing_next_round,
            chance_of_playing_this_round: fplPlayer?.chance_of_playing_this_round,
            news: fplPlayer?.news || '',
          };
        });
        
        setPlayers(convertedPlayers);
        setSquadDataFetched(true);
        setShowSquadModal(false);
        
        Alert.alert(
          'Success!', 
          `Squad data fetched for Gameweek ${selectedGameweek}\nTotal Points: ${data.entry_history?.points || 0}\nRank: ${data.entry_history?.rank || 'N/A'}`
        );
      } else {
        Alert.alert('Error', 'No squad data found for this gameweek');
      }
    } catch (error) {
      console.error('Error fetching squad data:', error);
      Alert.alert('Error', 'Failed to fetch squad data. Please check your Squad ID and try again.');
    } finally {
      setSquadLoading(false);
    }
  };

  // Get squad statistics
  const squadStats = squadHelpers.getSquadStats();

  // Helper functions for the pitch layout
  const startingXI = players.filter(p => p.starter && p.id !== 0);
  const benchPlayers = players.filter(p => !p.starter && p.id !== 0);

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
    const defenders = startingXI.filter(p => p.team_position && getPositionName(p.team_position) === 'DEF').length;
    const spacing = width / defenders;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 154, left };
  };

  const getMidPosition = (index: number) => {
    const midfielders = startingXI.filter(p => p.team_position && getPositionName(p.team_position) === 'MID').length;
    const spacing = width / midfielders;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 264, left };
  };

  const getFwdPosition = (index: number) => {
    const forwards = startingXI.filter(p => p.team_position && getPositionName(p.team_position) === 'FWD').length;
    const spacing = width / forwards;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 374, left };
  };

  const handlePlayerPress = (player: Player) => {
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

  // Don't render players until we have FPL data and have found our players
  if (fplPlayers.length === 0 || startingXI.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading FPL data and finding your players...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>
              {loading ? 'Loading...' : currentGameweek.name}
            </Text>
            <Text style={styles.deadlineText}>
              {loading ? 'Loading deadline...' : fplApiService.formatDeadline(currentGameweek.deadline)}
            </Text>
          </View>
          
          {/* Fetch Squad Data Button - Right side */}
          <TouchableOpacity
            style={[styles.fetchButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowSquadModal(true)}
          >
            <Text style={styles.fetchButtonText}>
              {squadDataFetched ? '🔄 Refresh Squad' : '📊 Fetch Squad Data'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Gameweek Selector */}
        {squadDataFetched && (
          <View style={styles.gameweekSelector}>
            <Text style={[styles.gameweekLabel, { color: theme.colors.textSecondary }]}>
              Select Gameweek:
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.gameweekScroll}
            >
              {Array.from({ length: currentGameweek.id }, (_, i) => i + 1).map((gw) => (
                <TouchableOpacity
                  key={gw}
                  style={[
                    styles.gameweekButton,
                    selectedGameweek === gw && { backgroundColor: theme.colors.primary }
                  ]}
                  onPress={() => setSelectedGameweek(gw)}
                >
                  <Text style={[
                    styles.gameweekButtonText,
                    selectedGameweek === gw && { color: theme.colors.surface }
                  ]}>
                    GW{gw}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

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
                onPress={fetchSquadData}
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
                {startingXI[0] && startingXI[0].captain && (
                  <View style={styles.captainBadge}>
                    <Text style={styles.captainText}>C</Text>
                  </View>
                )}
                {startingXI[0] && startingXI[0].vice_captain && (
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
                
                {/* Show either next fixture or points from last game */}
                <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                  {(getPlayerById(startingXI[0].id)?.event_points || 0) > 0 
                    ? `${getPlayerById(startingXI[0].id)?.event_points || 0} pts`
                    : getNextFixtureForPlayer(startingXI[0].id)
                  }
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
                  {player.captain && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>C</Text>
                    </View>
                  )}
                  {player.vice_captain && (
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
                  
                  {/* Show either next fixture or points from last game */}
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {(getPlayerById(player.id)?.event_points || 0) > 0 
                      ? `${getPlayerById(player.id)?.event_points || 0} pts`
                      : getNextFixtureForPlayer(player.id)
                    }
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
                  {player.captain && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>C</Text>
                    </View>
                  )}
                  {player.vice_captain && (
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
                  
                  {/* Show either next fixture or points from last game */}
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {(getPlayerById(player.id)?.event_points || 0) > 0 
                      ? `${getPlayerById(player.id)?.event_points || 0} pts`
                      : getNextFixtureForPlayer(player.id)
                    }
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
                  {player.captain && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>C</Text>
                    </View>
                  )}
                  {player.vice_captain && (
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
                  
                  {/* Show either next fixture or points from last game */}
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {(getPlayerById(player.id)?.event_points || 0) > 0 
                      ? `${getPlayerById(player.id)?.event_points || 0} pts`
                      : getNextFixtureForPlayer(player.id)
                    }
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
                {player.captain && (
                  <View style={styles.captainBadge}>
                    <Text style={styles.captainText}>C</Text>
                  </View>
                )}
                {player.vice_captain && (
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
                
                {/* Show either next fixture or points from last game */}
                <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                  {(getPlayerById(player.id)?.event_points || 0) > 0 
                    ? `${getPlayerById(player.id)?.event_points || 0} pts`
                    : getNextFixtureForPlayer(player.id)
                  }
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Squad Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Squad Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{squadStats.totalPlayers}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{squadStats.activePlayers}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{squadStats.startingXI}</Text>
              <Text style={styles.statLabel}>Starting XI</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{squadStats.benchPlayers}</Text>
              <Text style={styles.statLabel}>Bench</Text>
            </View>
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