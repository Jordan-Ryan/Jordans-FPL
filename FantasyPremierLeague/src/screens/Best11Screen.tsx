import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { fplApiService } from '../services/fplApi';
import PlayerPhoto from '../components/PlayerPhoto';
import { styles } from '../styles/Best11Screen.styles';

const Best11Screen: React.FC = () => {
  const theme = useTheme();
  const { cachedData, isDataLoaded } = useData();
  const { width } = Dimensions.get('window');
  
  const [currentGameweek, setCurrentGameweek] = useState(2);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (cachedData && isDataLoaded) {
      console.log('📦 Using cached data for Best 11 screen');
      setTeams(cachedData.teams);
      setLoading(false);
    } else if (!isDataLoaded) {
      console.log('⏳ Data still loading...');
    } else {
      // Fallback: fetch teams if no cache
      console.log('⚠️ No cached data, fetching teams from API');
      fetchTeams();
    }
  }, [cachedData, isDataLoaded]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const teamsData = await fplApiService.fetchAllTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get current team data
  const currentTeam = cachedData?.best11Teams?.[`gw${currentGameweek}` as keyof typeof cachedData.best11Teams];
  const gameweekOptions = [2, 3, 4];

  if (!isDataLoaded) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading app data...</Text>
        </View>
      </View>
    );
  }

  if (!cachedData?.best11Teams) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No Best 11 data available. Please restart the app.</Text>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading teams...</Text>
        </View>
      </View>
    );
  }

  if (!currentTeam) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No team data for GW{currentGameweek}</Text>
        </View>
      </View>
    );
  }

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
    const defenders = currentTeam.starting_xi.filter((p: any) => p.position === 'DEF').length;
    const spacing = width / defenders;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 154, left };
  };

  const getMidPosition = (index: number) => {
    const midfielders = currentTeam.starting_xi.filter((p: any) => p.position === 'MID').length;
    const spacing = width / midfielders;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 264, left };
  };

  const getFwdPosition = (index: number) => {
    const forwards = currentTeam.starting_xi.filter((p: any) => p.position === 'FWD').length;
    const spacing = width / forwards;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 374, left };
  };

  const getPlayerPosition = (player: any, index: number) => {
    if (player.position === 'GK') {
      return { top: 44, left: (width / 2) - 36 };
    } else if (player.position === 'DEF') {
      const defIndex = currentTeam.starting_xi
        .filter((p: any) => p.position === 'DEF')
        .findIndex((p: any) => p.player_id === player.player_id);
      return getDefPosition(defIndex);
    } else if (player.position === 'MID') {
      const midIndex = currentTeam.starting_xi
        .filter((p: any) => p.position === 'MID')
        .findIndex((p: any) => p.player_id === player.player_id);
      return getMidPosition(midIndex);
    } else if (player.position === 'FWD') {
      const fwdIndex = currentTeam.starting_xi
        .filter((p: any) => p.position === 'FWD')
        .findIndex((p: any) => p.player_id === player.player_id);
      return getFwdPosition(fwdIndex);
    }
    return { top: 0, left: 0 };
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>
              Best 11 - Gameweek {currentGameweek}
            </Text>
            <View style={styles.teamInfo}>
              <Text style={styles.formationText}>
                Formation: {currentTeam.formation}
              </Text>
              <Text style={styles.costText}>
                Total Cost: £{currentTeam.total_cost}m
              </Text>
              <Text style={styles.pointsText}>
                Expected Points: {currentTeam.total_expected_points}
              </Text>
            </View>
          </View>
        </View>

        {/* Gameweek Selector */}
        <View style={styles.gameweekSelector}>
          <Text style={[styles.gameweekLabel, { color: theme.colors.textSecondary }]}>
            Select Gameweek:
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.gameweekScroll}
          >
            {gameweekOptions.map((gw) => (
              <TouchableOpacity
                key={gw}
                style={[
                  styles.gameweekButton,
                  currentGameweek === gw && { backgroundColor: theme.colors.primary }
                ]}
                onPress={() => setCurrentGameweek(gw)}
              >
                <Text style={[
                  styles.gameweekButtonText,
                  currentGameweek === gw && { color: theme.colors.surface }
                ]}>
                  GW{gw}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Football Pitch */}
        <View style={styles.pitchContainer}>
          <Image 
            source={require('../../assets/JORDANS FPL.png')} 
            style={styles.pitchBackground}
            resizeMode="cover"
          />
          
          {/* Starting XI */}
          <View style={styles.formation}>
            {/* Goalkeeper */}
            {currentTeam.starting_xi.filter((p: any) => p.position === 'GK').map((player: any, index: number) => (
              <View key={player.player_id} style={[styles.playerPosition, getPlayerPosition(player, index)]}>
                <View style={styles.playerCard}>
                  {/* Captain/Vice-Captain Badge */}
                  {player.player_id === currentTeam.captain?.player_id && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>C</Text>
                    </View>
                  )}
                  {player.player_id === currentTeam.vice_captain?.player_id && (
                    <View style={styles.viceCaptainBadge}>
                      <Text style={styles.viceCaptainText}>VC</Text>
                    </View>
                  )}
                  
                  <PlayerPhoto 
                    playerId={player.player_id}
                    width={55}
                    height={70}
                    showName={false}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {player.name}
                  </Text>
                  
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {player[`gw${currentGameweek}_xp` as keyof typeof player]} XP
                  </Text>
                </View>
              </View>
            ))}

            {/* Defenders */}
            {currentTeam.starting_xi.filter((p: any) => p.position === 'DEF').map((player: any, index: number) => (
              <View key={player.player_id} style={[styles.playerPosition, getPlayerPosition(player, index)]}>
                <View style={styles.playerCard}>
                  {/* Captain/Vice-Captain Badge */}
                  {player.player_id === currentTeam.captain?.player_id && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>C</Text>
                    </View>
                  )}
                  {player.player_id === currentTeam.vice_captain?.player_id && (
                    <View style={styles.viceCaptainBadge}>
                      <Text style={styles.viceCaptainText}>VC</Text>
                    </View>
                  )}
                  
                  <PlayerPhoto 
                    playerId={player.player_id}
                    width={55}
                    height={70}
                    showName={false}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {player.name}
                  </Text>
                  
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {player[`gw${currentGameweek}_xp` as keyof typeof player]} XP
                  </Text>
                </View>
              </View>
            ))}

            {/* Midfielders */}
            {currentTeam.starting_xi.filter((p: any) => p.position === 'MID').map((player: any, index: number) => (
              <View key={player.player_id} style={[styles.playerPosition, getPlayerPosition(player, index)]}>
                <View style={styles.playerCard}>
                  {/* Captain/Vice-Captain Badge */}
                  {player.player_id === currentTeam.captain?.player_id && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>C</Text>
                    </View>
                  )}
                  {player.player_id === currentTeam.vice_captain?.player_id && (
                    <View style={styles.viceCaptainBadge}>
                      <Text style={styles.viceCaptainText}>VC</Text>
                    </View>
                  )}
                  
                  <PlayerPhoto 
                    playerId={player.player_id}
                    width={55}
                    height={70}
                    showName={false}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {player.name}
                  </Text>
                  
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {player[`gw${currentGameweek}_xp` as keyof typeof player]} XP
                  </Text>
                </View>
              </View>
            ))}

            {/* Forwards */}
            {currentTeam.starting_xi.filter((p: any) => p.position === 'FWD').map((player: any, index: number) => (
              <View key={player.player_id} style={[styles.playerPosition, getPlayerPosition(player, index)]}>
                <View style={styles.playerCard}>
                  {/* Captain/Vice-Captain Badge */}
                  {player.player_id === currentTeam.captain?.player_id && (
                    <View style={styles.captainBadge}>
                      <Text style={styles.captainText}>C</Text>
                    </View>
                  )}
                  {player.player_id === currentTeam.vice_captain?.player_id && (
                    <View style={styles.viceCaptainBadge}>
                      <Text style={styles.viceCaptainText}>VC</Text>
                    </View>
                  )}
                  
                  <PlayerPhoto 
                    playerId={player.player_id}
                    width={55}
                    height={70}
                    showName={false}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {player.name}
                  </Text>
                  
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {player[`gw${currentGameweek}_xp` as keyof typeof player]} XP
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bench Section */}
        <View style={styles.benchSection}>
          <Text style={styles.benchTitle}>Bench</Text>
          <View style={styles.benchContainer}>
            {currentTeam.bench.map((player: any, index: number) => (
              <View key={player.player_id} style={styles.playerCard}>
                <PlayerPhoto 
                  playerId={player.player_id}
                  width={55}
                  height={70}
                  showName={false}
                />
                <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                  {player.name}
                </Text>
                
                <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                  {player[`gw${currentGameweek}_xp` as keyof typeof player]} XP
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Team Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Team Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{currentTeam.starting_xi.length}</Text>
              <Text style={styles.statLabel}>Starting XI</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{currentTeam.bench.length}</Text>
              <Text style={styles.statLabel}>Bench</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{currentTeam.formation}</Text>
              <Text style={styles.statLabel}>Formation</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>£{currentTeam.total_cost}m</Text>
              <Text style={styles.statLabel}>Total Cost</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Best11Screen;
