import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useExpectedPoints, useApiConnectivity } from '../hooks/useExpectedPoints';
import PlayerRow from '../components/PlayerRow';
import { PlayerExpectedPoints } from '../services/types';

// Sample player IDs for testing (replace with actual FPL player IDs)
const SAMPLE_PLAYER_IDS = [
  430,  // Haaland
  123,  // Salah
  456,  // Kane
  789,  // De Bruyne
  321,  // Van Dijk
  654,  // Alisson
  987,  // Alexander-Arnold
  147,  // Robertson
  258,  // Mane
  369   // Aguero
];

/**
 * ExpectedPointsScreen displays a list of players with their expected points
 * for the next 3 gameweeks, with sorting, filtering, and pull-to-refresh
 */
export const ExpectedPointsScreen: React.FC = () => {
  // State for sorting and filtering
  const [sortBy, setSortBy] = useState<'total_3gw' | 'name' | 'team' | 'position'>('total_3gw');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // API connectivity check
  const { connected, latency, checking } = useApiConnectivity();

  // Fetch expected points data
  const {
    data: players,
    loading,
    error,
    lastUpdated,
    cacheHit,
    refetch,
    clearCache,
    isStale
  } = useExpectedPoints(SAMPLE_PLAYER_IDS, 3, true);

  // Filter and sort players
  const filteredAndSortedPlayers = useMemo(() => {
    let filtered = players;

    // Apply position filter
    if (filterPosition !== 'all') {
      filtered = filtered.filter(player => player.position === filterPosition);
    }

    // Apply team filter
    if (filterTeam !== 'all') {
      filtered = filtered.filter(player => player.team === filterTeam);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(query) ||
        player.team.toLowerCase().includes(query)
      );
    }

    // Sort players
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'total_3gw':
          aValue = a.total_3gw;
          bValue = b.total_3gw;
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'team':
          aValue = a.team.toLowerCase();
          bValue = b.team.toLowerCase();
          break;
        case 'position':
          aValue = a.position;
          bValue = b.position;
          break;
        default:
          aValue = a.total_3gw;
          bValue = b.total_3gw;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [players, filterPosition, filterTeam, searchQuery, sortBy, sortOrder]);

  // Get unique positions and teams for filters
  const positions = useMemo(() => {
    const uniquePositions = [...new Set(players.map(p => p.position))];
    return ['all', ...uniquePositions];
  }, [players]);

  const teams = useMemo(() => {
    const uniqueTeams = [...new Set(players.map(p => p.team))];
    return ['all', ...uniqueTeams.sort()];
  }, [players]);

  // Handle player row press
  const handlePlayerPress = useCallback((player: PlayerExpectedPoints) => {
    Alert.alert(
      player.name,
      `Team: ${player.team}\nPosition: ${player.position}\n3-GW Total: ${player.total_3gw.toFixed(1)} pts\nConfidence: ${player.confidence.lower.toFixed(1)} - ${player.confidence.upper.toFixed(1)} pts`,
      [{ text: 'OK' }]
    );
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // Handle cache clear
  const handleClearCache = useCallback(async () => {
    Alert.alert(
      'Clear Cache',
      'Are you sure you want to clear the cached predictions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await clearCache();
            Alert.alert('Cache Cleared', 'Prediction cache has been cleared successfully.');
          }
        }
      ]
    );
  }, [clearCache]);

  // Render filter button
  const renderFilterButton = (
    value: string,
    label: string,
    onPress: () => void,
    isActive: boolean
  ) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Render sort button
  const renderSortButton = (
    value: 'total_3gw' | 'name' | 'team' | 'position',
    label: string
  ) => {
    const isActive = sortBy === value;
    const isDesc = sortOrder === 'desc';
    
    return (
      <TouchableOpacity
        style={[styles.sortButton, isActive && styles.sortButtonActive]}
        onPress={() => {
          if (isActive) {
            setSortOrder(isDesc ? 'asc' : 'desc');
          } else {
            setSortBy(value);
            setSortOrder('desc');
          }
        }}
      >
        <Text style={[styles.sortButtonText, isActive && styles.sortButtonTextActive]}>
          {label} {isActive && (isDesc ? '↓' : '↑')}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render player row
  const renderPlayerRow = useCallback(({ item }: { item: PlayerExpectedPoints }) => (
    <PlayerRow
      player={item}
      onPress={() => handlePlayerPress(item)}
      showConfidence={true}
    />
  ), [handlePlayerPress]);

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.title}>Expected Points</Text>
      
      {/* API Status */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: connected ? '#4CAF50' : '#F44336' }]} />
        <Text style={styles.statusText}>
          {checking ? 'Checking...' : connected ? `Connected (${latency}ms)` : 'Disconnected'}
        </Text>
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search players..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholderTextColor="#999"
      />

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Position:</Text>
        <View style={styles.filterButtons}>
          {positions.map(position => 
            renderFilterButton(
              position,
              position === 'all' ? 'All' : position,
              () => setFilterPosition(position),
              filterPosition === position
            )
          )}
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Team:</Text>
        <View style={styles.filterButtons}>
          {teams.map(team => 
            renderFilterButton(
              team,
              team === 'all' ? 'All' : team,
              () => setFilterTeam(team),
              filterTeam === team
            )
          )}
        </View>
      </View>

      {/* Sorting */}
      <View style={styles.sortingContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortButtons}>
          {renderSortButton('total_3gw', 'Points')}
          {renderSortButton('name', 'Name')}
          {renderSortButton('team', 'Team')}
          {renderSortButton('position', 'Position')}
        </View>
      </View>

      {/* Info Bar */}
      <View style={styles.infoBar}>
        <Text style={styles.infoText}>
          Showing {filteredAndSortedPlayers.length} of {players.length} players
        </Text>
        <Text style={styles.infoText}>
          {cacheHit ? '📱 Cached' : '🌐 Live'} • {isStale ? '🔄 Stale' : '✅ Fresh'}
        </Text>
        {lastUpdated && (
          <Text style={styles.infoText}>
            Updated: {lastUpdated.toLocaleTimeString()}
          </Text>
        )}
      </View>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {loading ? (
        <>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.emptyStateText}>Loading predictions...</Text>
        </>
      ) : error ? (
        <>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.emptyStateText}>No players found</Text>
          <Text style={styles.emptyStateSubtext}>Try adjusting your filters</Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={filteredAndSortedPlayers}
        renderItem={renderPlayerRow}
        keyExtractor={(item) => item.player_id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={handleRefresh}
            colors={['#2196F3']}
            tintColor="#2196F3"
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleRefresh}>
          <Text style={styles.actionButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleClearCache}>
          <Text style={styles.actionButtonText}>🗑️ Clear Cache</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  listContent: {
    flexGrow: 1,
  },

  header: {
    backgroundColor: '#ffffff',
    padding: 16,
    marginBottom: 8,
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },

  statusText: {
    fontSize: 12,
    color: '#666666',
  },

  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 16,
  },

  filtersContainer: {
    marginBottom: 12,
  },

  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },

  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  filterButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  filterButtonActive: {
    backgroundColor: '#2196F3',
  },

  filterButtonText: {
    fontSize: 12,
    color: '#666666',
  },

  filterButtonTextActive: {
    color: '#ffffff',
  },

  sortingContainer: {
    marginBottom: 12,
  },

  sortLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },

  sortButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  sortButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  sortButtonActive: {
    backgroundColor: '#4CAF50',
  },

  sortButtonText: {
    fontSize: 12,
    color: '#666666',
  },

  sortButtonTextActive: {
    color: '#ffffff',
  },

  infoBar: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },

  infoText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 2,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },

  emptyStateText: {
    fontSize: 18,
    color: '#666666',
    marginTop: 16,
    textAlign: 'center',
  },

  emptyStateSubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },

  errorText: {
    fontSize: 16,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 16,
  },

  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },

  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },

  actionButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },

  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExpectedPointsScreen;
