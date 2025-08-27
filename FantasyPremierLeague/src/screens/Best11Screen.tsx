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
import PlayerDetailsModal from '../components/PlayerDetailsModal';
import { styles } from '../styles/Best11Screen.styles';
import { FPLPlayer, FPLTeam } from '../types';

const Best11Screen: React.FC = () => {
  const theme = useTheme();
  const { cachedData, isDataLoaded } = useData();
  const { width } = Dimensions.get('window');
  
  const [currentGameweek, setCurrentGameweek] = useState(() => {
    const baseGW = cachedData?.currentGameweek?.id || 2;
    return baseGW + 1; // Start with next gameweek
  });
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<FPLPlayer | null>(null);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);


  // Get current team data from cache only (moved up to fix temporal dead zone)
  const currentTeam = cachedData?.best11Teams?.[`gw${currentGameweek}` as keyof typeof cachedData.best11Teams];



  useEffect(() => {
    console.log('🔍 Best11Screen: useEffect triggered', {
      hasCachedData: !!cachedData,
      hasBest11Teams: !!cachedData?.best11Teams,
      hasPreRenderedBest11: !!cachedData?.preRenderedBest11Data,
      best11TeamsKeys: cachedData?.best11Teams ? Object.keys(cachedData.best11Teams) : [],
      currentGameweek
    });
    
    if (cachedData) {
      // Use pre-rendered data if available for instant display
      if (cachedData.preRenderedBest11Data) {
        console.log('🚀 Using pre-rendered Best 11 data for instant display!');
        setLoading(false);
      } else if (cachedData.best11Teams) {
        console.log('✅ Using cached best11Teams data');
        setLoading(false);
      }
      
      // Update currentGameweek to next gameweek if it's still on current
      const baseGW = cachedData.currentGameweek?.id || 2;
      if (currentGameweek <= baseGW) {
        setCurrentGameweek(baseGW + 1);
      }
    }
  }, [cachedData, currentGameweek]);

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

  // Use next 3 gameweeks from current (not including current)
  const baseGameweek = cachedData?.currentGameweek?.id || 2;
  const gameweekOptions = [baseGameweek + 1, baseGameweek + 2, baseGameweek + 3];

  // Use the current team directly
  const displayTeam = currentTeam;

  // Debug: Log team data to see what we're working with
  useEffect(() => {
    if (displayTeam) {
      // Check if starting XI is sorted by expected points
      if (displayTeam.starting_xi && displayTeam.starting_xi.length > 0) {
        const xpField = `gw${currentGameweek}_xp` as keyof typeof displayTeam.starting_xi[0];
        const isSorted = displayTeam.starting_xi.every((player: any, index: number) => {
          if (index === 0) return true;
          const currentXP = player[xpField] as number;
          const previousXP = displayTeam.starting_xi[index - 1][xpField] as number;
          return currentXP <= previousXP; // Should be descending order
        });
      }
    }
  }, [displayTeam, currentGameweek]);



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

  if (!displayTeam) {
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

  // Helper function to get player by ID from cached data
  const getPlayerById = (id: number): FPLPlayer | undefined => {
    return cachedData?.fplPlayers?.find(p => p.id === id);
  };

  // Handle player press to show details
  const handlePlayerPress = (player: any) => {
    const fplPlayer = getPlayerById(player.player_id);
    if (fplPlayer) {
      setSelectedPlayer(fplPlayer);
      setShowPlayerDetails(true);
    }
  };

  const getPositionName = (position: number) => {
    if (position === 1) return 'GK';
    if (position >= 2 && position <= 4) return 'DEF';
    if (position >= 5 && position <= 8) return 'MID';
    if (position >= 9 && position <= 11) return 'FWD';
    return 'BENCH';
  };

  const getDefPosition = (index: number) => {
    const defenders = displayTeam.starting_xi.filter((p: any) => p.position === 'DEF').length;
    const spacing = width / defenders;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 154, left };
  };

  const getMidPosition = (index: number) => {
    const midfielders = displayTeam.starting_xi.filter((p: any) => p.position === 'MID').length;
    const spacing = width / midfielders;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 264, left };
  };

  const getFwdPosition = (index: number) => {
    const forwards = displayTeam.starting_xi.filter((p: any) => p.position === 'FWD').length;
    const spacing = width / forwards;
    const left = (spacing * index) + (spacing / 2) - 36;
    return { top: 374, left };
  };

  const getPlayerPosition = (player: any, index: number) => {
    if (player.position === 'GK') {
      return { top: 44, left: (width / 2) - 36 };
    } else if (player.position === 'DEF') {
      const defIndex = displayTeam.starting_xi
        .filter((p: any) => p.position === 'DEF')
        .findIndex((p: any) => p.player_id === player.player_id);
      return getDefPosition(defIndex);
    } else if (player.position === 'MID') {
      const midIndex = displayTeam.starting_xi
        .filter((p: any) => p.position === 'MID')
        .findIndex((p: any) => p.player_id === player.player_id);
      return getMidPosition(midIndex);
    } else if (player.position === 'FWD') {
      const fwdIndex = displayTeam.starting_xi
        .filter((p: any) => p.position === 'FWD')
        .findIndex((p: any) => p.player_id === player.player_id);
      return getFwdPosition(fwdIndex);
    }
    return { top: 0, left: 0 };
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>
              Best 11 - Gameweek {currentGameweek}
            </Text>
            <View style={styles.teamInfo}>
              <Text style={styles.formationText}>
                Formation: {displayTeam.formation}
              </Text>
              <Text style={styles.costText}>
                Total Cost: £{displayTeam.total_cost}m
              </Text>
              <Text style={styles.pointsText}>
                Starting XI Expected Points: {displayTeam.starting_xi.reduce((total: number, player: any) => 
                  total + (player[`gw${currentGameweek}_xp` as keyof typeof player] || 0), 0
                ).toFixed(1)}
              </Text>
              <Text style={styles.pointsText}>
                Bench Expected Points: {displayTeam.bench.reduce((total: number, player: any) => 
                  total + (player[`gw${currentGameweek}_xp` as keyof typeof player] || 0), 0
                ).toFixed(1)}
              </Text>
            </View>
          </View>
        </View>

        {/* Gameweek Selector */}
        <View style={styles.gameweekSelector}>
          <Text style={styles.gameweekLabel}>
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
                  currentGameweek === gw && { backgroundColor: '#245F73' }
                ]}
                onPress={() => setCurrentGameweek(gw)}
              >
                <Text style={[
                  styles.gameweekButtonText,
                  currentGameweek === gw && { color: '#FFFFFF' }
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
            {displayTeam.starting_xi.filter((p: any) => p.position === 'GK').map((player: any, index: number) => (
              <View key={player.player_id} style={[styles.playerPosition, getPlayerPosition(player, index)]}>
                <TouchableOpacity style={styles.playerCard} onPress={() => handlePlayerPress(player)}>
                  {/* Captain/Vice-Captain Badge */}
                  {player.player_id === displayTeam.captain?.player_id && (
                    <View style={[styles.captainBadge, { 
                      backgroundColor: '#245F73',
                      borderColor: '#FFFFFF' 
                    }]}>
                      <Text style={[styles.captainText, { color: '#FFFFFF' }]}>C</Text>
                    </View>
                  )}
                  {player.player_id === displayTeam.vice_captain?.player_id && (
                    <View style={[styles.viceCaptainBadge, { 
                      backgroundColor: '#733E24',
                      borderColor: '#FFFFFF' 
                    }]}>
                      <Text style={[styles.viceCaptainText, { color: '#FFFFFF' }]}>VC</Text>
                    </View>
                  )}
                  
                  <PlayerPhoto 
                    playerId={player.player_id}
                    width={55}
                    height={70}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {player.name}
                  </Text>
                  
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {player[`gw${currentGameweek}_xp` as keyof typeof player]} XP
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Defenders */}
            {displayTeam.starting_xi.filter((p: any) => p.position === 'DEF').map((player: any, index: number) => (
              <View key={player.player_id} style={[styles.playerPosition, getPlayerPosition(player, index)]}>
                <TouchableOpacity style={styles.playerCard} onPress={() => handlePlayerPress(player)}>
                  {/* Captain/Vice-Captain Badge */}
                  {player.player_id === displayTeam.captain?.player_id && (
                    <View style={[styles.captainBadge, { 
                      backgroundColor: '#245F73',
                      borderColor: '#FFFFFF' 
                    }]}>
                      <Text style={[styles.captainText, { color: '#FFFFFF' }]}>C</Text>
                    </View>
                  )}
                  {player.player_id === displayTeam.vice_captain?.player_id && (
                    <View style={[styles.viceCaptainBadge, { 
                      backgroundColor: '#733E24',
                      borderColor: '#FFFFFF' 
                    }]}>
                      <Text style={[styles.viceCaptainText, { color: '#FFFFFF' }]}>VC</Text>
                    </View>
                  )}
                  
                  <PlayerPhoto 
                    playerId={player.player_id}
                    size={55}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {player.name}
                  </Text>
                  
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {player[`gw${currentGameweek}_xp` as keyof typeof player]} XP
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Midfielders */}
            {displayTeam.starting_xi.filter((p: any) => p.position === 'MID').map((player: any, index: number) => (
              <View key={player.player_id} style={[styles.playerPosition, getPlayerPosition(player, index)]}>
                <TouchableOpacity style={styles.playerCard} onPress={() => handlePlayerPress(player)}>
                  {/* Captain/Vice-Captain Badge */}
                  {player.player_id === displayTeam.captain?.player_id && (
                    <View style={[styles.captainBadge, { 
                      backgroundColor: '#245F73',
                      borderColor: '#FFFFFF' 
                    }]}>
                      <Text style={[styles.captainText, { color: '#FFFFFF' }]}>C</Text>
                    </View>
                  )}
                  {player.player_id === displayTeam.vice_captain?.player_id && (
                    <View style={[styles.viceCaptainBadge, { 
                      backgroundColor: '#733E24',
                      borderColor: '#FFFFFF' 
                    }]}>
                      <Text style={[styles.viceCaptainText, { color: '#FFFFFF' }]}>VC</Text>
                    </View>
                  )}
                  
                  <PlayerPhoto 
                    playerId={player.player_id}
                    width={55}
                    height={70}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {player.name}
                  </Text>
                  
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {player[`gw${currentGameweek}_xp` as keyof typeof player]} XP
                  </Text>
                </TouchableOpacity>
              </View>
            ))}

            {/* Forwards */}
            {displayTeam.starting_xi.filter((p: any) => p.position === 'FWD').map((player: any, index: number) => (
              <View key={player.player_id} style={[styles.playerPosition, getPlayerPosition(player, index)]}>
                <TouchableOpacity style={styles.playerCard} onPress={() => handlePlayerPress(player)}>
                  {/* Captain/Vice-Captain Badge */}
                  {player.player_id === displayTeam.captain?.player_id && (
                    <View style={[styles.captainBadge, { 
                      backgroundColor: '#245F73',
                      borderColor: '#FFFFFF' 
                    }]}>
                      <Text style={[styles.captainText, { color: '#FFFFFF' }]}>C</Text>
                    </View>
                  )}
                  {player.player_id === displayTeam.vice_captain?.player_id && (
                    <View style={[styles.viceCaptainBadge, { 
                      backgroundColor: '#733E24',
                      borderColor: '#FFFFFF' }]}>
                      <Text style={[styles.viceCaptainText, { color: '#FFFFFF' }]}>VC</Text>
                    </View>
                  )}
                  
                  <PlayerPhoto 
                    playerId={player.player_id}
                    width={55}
                    height={70}
                  />
                  <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                    {player.name}
                  </Text>
                  
                  <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                    {player[`gw${currentGameweek}_xp` as keyof typeof player]} XP
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
            {displayTeam.bench.map((player: any, index: number) => (
              <TouchableOpacity key={player.player_id} style={styles.playerCard} onPress={() => handlePlayerPress(player)}>
                <PlayerPhoto 
                  playerId={player.player_id}
                  size={55}
                />
                <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                  {player.name}
                </Text>
                
                <Text style={styles.playerFixture} numberOfLines={1} ellipsizeMode="tail">
                  {player[`gw${currentGameweek}_xp` as keyof typeof player]} XP
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Team Statistics */}
        <View style={styles.statsSection}>
          <Text style={styles.statsTitle}>Team Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{displayTeam.starting_xi.length}</Text>
              <Text style={styles.statLabel}>Starting XI</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{displayTeam.bench.length}</Text>
              <Text style={styles.statLabel}>Bench</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{displayTeam.formation}</Text>
              <Text style={styles.statLabel}>Formation</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>£{displayTeam.total_cost}m</Text>
              <Text style={styles.statLabel}>Total Cost</Text>
            </View>
          </View>
          
          {/* Expected Points Breakdown */}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {displayTeam.starting_xi.reduce((total: number, player: any) => 
                  total + (player[`gw${currentGameweek}_xp` as keyof typeof player] || 0), 0
                ).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Starting XI XP</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {displayTeam.bench.reduce((total: number, player: any) => 
                  total + (player[`gw${currentGameweek}_xp` as keyof typeof player] || 0), 0
                ).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>Bench XP</Text>
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

export default Best11Screen;
