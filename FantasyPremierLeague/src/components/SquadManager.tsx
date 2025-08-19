import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { squadData, squadHelpers } from '../data/squadData';
import { Player, FPLPlayer, FPLTeam } from '../types';
import { fplApiService } from '../services/fplApi';

interface SquadManagerProps {
  onSquadUpdate?: (updatedSquad: Player[]) => void;
}

const SquadManager: React.FC<SquadManagerProps> = ({ onSquadUpdate }) => {
  const [squad, setSquad] = useState<Player[]>(squadData);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [fplPlayers, setFplPlayers] = useState<FPLPlayer[]>([]);
  const [teams, setTeams] = useState<FPLTeam[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch FPL data for player information
  useEffect(() => {
    const fetchFPLData = async () => {
      try {
        setLoading(true);
        const [allFPLPlayers, teamData] = await Promise.all([
          fplApiService.fetchAllPlayers(),
          fplApiService.fetchAllTeams()
        ]);
        
        setFplPlayers(allFPLPlayers);
        setTeams(teamData);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching FPL data:', error);
        setLoading(false);
      }
    };

    fetchFPLData();
  }, []);

  // Helper function to get FPL player data
  const getFPLPlayer = (playerId: number): FPLPlayer | null => {
    return fplPlayers.find(p => p.id === playerId) || null;
  };

  // Helper function to get team data
  const getTeam = (teamId: number): FPLTeam | null => {
    return teams.find(t => t.id === teamId) || null;
  };

  // Helper function to get position name
  const getPositionName = (elementType: number): string => {
    const positions = ['GK', 'DEF', 'MID', 'FWD'];
    return positions[elementType - 1] || 'Unknown';
  };

  // Function to update player data
  const updatePlayer = (playerId: number, updates: Partial<Player>) => {
    const updatedSquad = squad.map(player => 
      player.id === playerId ? { ...player, ...updates } : player
    );
    
    setSquad(updatedSquad);
    onSquadUpdate?.(updatedSquad);
    
    console.log('Squad updated:', updatedSquad);
  };

  // Function to change captain
  const changeCaptain = (newCaptainId: number) => {
    const updatedSquad = squad.map(player => ({
      ...player,
      captain: player.id === newCaptainId,
      vice_captain: player.id === newCaptainId ? false : player.vice_captain
    }));
    
    setSquad(updatedSquad);
    onSquadUpdate?.(updatedSquad);
    Alert.alert('Captain Changed', 'New captain has been set!');
  };

  // Function to change vice-captain
  const changeViceCaptain = (newViceCaptainId: number) => {
    const updatedSquad = squad.map(player => ({
      ...player,
      vice_captain: player.id === newViceCaptainId,
      captain: player.id === newViceCaptainId ? false : player.captain
    }));
    
    setSquad(updatedSquad);
    onSquadUpdate?.(updatedSquad);
    Alert.alert('Vice-Captain Changed', 'New vice-captain has been set!');
  };

  // Function to substitute player (move between starting XI and bench)
  const substitutePlayer = (playerId: number) => {
    const player = squad.find(p => p.id === playerId);
    if (!player) return;

    const updatedSquad = squad.map(p => {
      if (p.id === playerId) {
        if (p.starter) {
          // Move to bench
          const benchPosition = squad.filter(pl => !pl.starter).length + 1;
          return { ...p, starter: false, bench_position: benchPosition, team_position: undefined };
        } else {
          // Move to starting XI
          const teamPosition = squad.filter(pl => pl.starter).length + 1;
          return { ...p, starter: true, team_position: teamPosition, bench_position: undefined };
        }
      }
      return p;
    });

    setSquad(updatedSquad);
    onSquadUpdate?.(updatedSquad);
    
    const fplPlayer = getFPLPlayer(playerId);
    const playerName = fplPlayer?.web_name || `Player ${playerId}`;
    Alert.alert('Substitution Made', `${playerName} has been ${player.starter ? 'benched' : 'brought on'}!`);
  };

  // Function to update player FPL ID
  const updatePlayerFPLId = (playerId: number, newFplId: number) => {
    const updatedSquad = squad.map(player => 
      player.id === playerId 
        ? { ...player, id: newFplId }
        : player
    );
    
    setSquad(updatedSquad);
    onSquadUpdate?.(updatedSquad);
    Alert.alert('FPL ID Updated', 'Player FPL ID has been updated!');
  };

  // Function to add new player
  const addNewPlayer = (newPlayer: Omit<Player, 'id'>) => {
    const newId = Math.max(...squad.map(p => p.id), 0) + 1;
    const playerWithId: Player = { ...newPlayer, id: newId };
    
    const updatedSquad = [...squad, playerWithId];
    setSquad(updatedSquad);
    onSquadUpdate?.(updatedSquad);
    Alert.alert('Player Added', 'New player has been added to the squad!');
  };

  // Function to remove player
  const removePlayer = (playerId: number) => {
    Alert.alert(
      'Remove Player',
      'Are you sure you want to remove this player from the squad?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedSquad = squad.filter(p => p.id !== playerId);
            setSquad(updatedSquad);
            onSquadUpdate?.(updatedSquad);
            Alert.alert('Player Removed', 'Player has been removed from the squad!');
          }
        }
      ]
    );
  };

  // Get squad statistics
  const stats = squadHelpers.getSquadStats();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading FPL data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Squad Manager</Text>
        <Text style={styles.subtitle}>Manage your FPL squad</Text>
      </View>

      {/* Squad Statistics */}
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Squad Overview</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.totalPlayers}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.activePlayers}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.startingXI}</Text>
            <Text style={styles.statLabel}>Starting XI</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.benchPlayers}</Text>
            <Text style={styles.statLabel}>Bench</Text>
          </View>
        </View>
      </View>

      {/* Starting XI */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Starting XI</Text>
        {squad.filter(p => p.starter).map((player, index) => (
          <PlayerCard
            key={player.id}
            player={player}
            fplPlayer={getFPLPlayer(player.id)}
            team={getTeam(getFPLPlayer(player.id)?.team || 0)}
            onSelect={() => setSelectedPlayer(player)}
            onCaptainChange={() => changeCaptain(player.id)}
            onViceCaptainChange={() => changeViceCaptain(player.id)}
            onSubstitute={() => substitutePlayer(player.id)}
            isCaptain={player.captain}
            isViceCaptain={player.vice_captain}
            position={index + 1}
          />
        ))}
      </View>

      {/* Bench */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bench</Text>
        {squad.filter(p => !p.starter).map((player, index) => (
          <PlayerCard
            key={player.id}
            player={player}
            fplPlayer={getFPLPlayer(player.id)}
            team={getTeam(getFPLPlayer(player.id)?.team || 0)}
            onSelect={() => setSelectedPlayer(player)}
            onCaptainChange={() => changeCaptain(player.id)}
            onViceCaptainChange={() => changeViceCaptain(player.id)}
            onSubstitute={() => substitutePlayer(player.id)}
            isCaptain={false}
            isViceCaptain={false}
            position={index + 1}
            isBench
          />
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              const captain = squad.find(p => p.captain);
              const viceCaptain = squad.find(p => p.vice_captain);
              const captainName = captain ? getFPLPlayer(captain.id)?.web_name || `Player ${captain.id}` : 'None';
              const viceCaptainName = viceCaptain ? getFPLPlayer(viceCaptain.id)?.web_name || `Player ${viceCaptain.id}` : 'None';
              
              Alert.alert('Captain & Vice-Captain', 
                `Captain: ${captainName}\nVice-Captain: ${viceCaptainName}`
              );
            }}
          >
            <Text style={styles.actionButtonText}>View Captain</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              const inactivePlayers = squad.filter(p => p.id === 0);
              if (inactivePlayers.length > 0) {
                Alert.alert('Inactive Players', 
                  `${inactivePlayers.length} players need FPL IDs:\n${inactivePlayers.map(p => `Player ${p.id}`).join('\n')}`
                );
              } else {
                Alert.alert('All Active', 'All players have valid FPL IDs!');
              }
            }}
          >
            <Text style={styles.actionButtonText}>Check Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

// Player Card Component
interface PlayerCardProps {
  player: Player;
  fplPlayer: FPLPlayer | null;
  team: FPLTeam | null;
  onSelect: () => void;
  onCaptainChange: () => void;
  onViceCaptainChange: () => void;
  onSubstitute: () => void;
  isCaptain: boolean;
  isViceCaptain: boolean;
  position: number;
  isBench?: boolean;
}

const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  fplPlayer,
  team,
  onSelect,
  onCaptainChange,
  onViceCaptainChange,
  onSubstitute,
  isCaptain,
  isViceCaptain,
  position,
  isBench = false
}) => {
  const getStatusColor = () => {
    if (player.id === 0) return '#F59E0B'; // Not found
    if (fplPlayer) return '#10B981'; // Active
    return '#6B7280'; // Unknown
  };

  const getStatusText = () => {
    if (player.id === 0) return 'NOT FOUND';
    if (fplPlayer) return 'ACTIVE';
    return 'UNKNOWN';
  };

  return (
    <TouchableOpacity style={styles.playerCard} onPress={onSelect}>
      <View style={styles.playerHeader}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>
            {fplPlayer?.web_name || `Player ${player.id}`}
          </Text>
          <Text style={styles.playerClub}>
            {team?.name || 'Unknown Team'}
          </Text>
          <Text style={styles.playerPosition}>
            {fplPlayer ? getPositionName(fplPlayer.element_type) : 'Unknown'}
          </Text>
        </View>
        
        <View style={styles.playerStatus}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      <View style={styles.playerDetails}>
        <Text style={styles.fplId}>FPL ID: {player.id || 'NOT SET'}</Text>
        <Text style={styles.positionNumber}>
          {isBench ? `Bench ${position}` : `Position ${position}`}
        </Text>
      </View>

      {fplPlayer && (
        <View style={styles.playerStats}>
          <Text style={styles.statText}>Cost: £{(fplPlayer.now_cost / 10).toFixed(1)}m</Text>
          <Text style={styles.statText}>Form: {fplPlayer.form}</Text>
          <Text style={styles.statText}>Points: {fplPlayer.total_points}</Text>
        </View>
      )}

      <View style={styles.playerActions}>
        {!isCaptain && (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.captainBtn]} 
            onPress={onCaptainChange}
          >
            <Text style={styles.actionBtnText}>C</Text>
          </TouchableOpacity>
        )}
        
        {!isViceCaptain && !isCaptain && (
          <TouchableOpacity 
            style={[styles.actionBtn, styles.viceCaptainBtn]} 
            onPress={onViceCaptainChange}
          >
            <Text style={styles.actionBtnText}>VC</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.actionBtn, styles.substituteBtn]} 
          onPress={onSubstitute}
        >
          <Text style={styles.actionBtnText}>
            {isBench ? '→' : '↓'}
          </Text>
        </TouchableOpacity>
      </View>

      {(isCaptain || isViceCaptain) && (
        <View style={[styles.badge, isCaptain ? styles.captainBadge : styles.viceCaptainBadge]}>
          <Text style={styles.badgeText}>
            {isCaptain ? 'CAPTAIN' : 'VICE-CAPTAIN'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Helper function to get position name
const getPositionName = (elementType: number): string => {
  const positions = ['GK', 'DEF', 'MID', 'FWD'];
  return positions[elementType - 1] || 'Unknown';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    fontSize: 18,
    color: '#6B7280',
  },
  header: {
    padding: 20,
    backgroundColor: '#245F73',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
  },
  statsContainer: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1F2937',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#245F73',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },
  positionStats: {
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 15,
  },
  positionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#1F2937',
  },
  positionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  positionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    margin: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1F2937',
  },
  playerCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  playerClub: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  playerPosition: {
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
  },
  playerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  playerDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  fplId: {
    fontSize: 14,
    color: '#6B7280',
  },
  positionNumber: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  playerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#F8F9FA',
    borderRadius: 6,
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
  },
  playerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  captainBtn: {
    backgroundColor: '#F59E0B',
  },
  viceCaptainBtn: {
    backgroundColor: '#8B5CF6',
  },
  substituteBtn: {
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  captainBadge: {
    backgroundColor: '#F59E0B',
  },
  viceCaptainBadge: {
    backgroundColor: '#8B5CF6',
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#245F73',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SquadManager; 