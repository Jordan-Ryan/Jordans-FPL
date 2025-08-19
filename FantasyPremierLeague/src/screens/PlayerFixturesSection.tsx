import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FPLPlayer, FPLTeam } from '../types';
import { fplApiService } from '../services/fplApi';

interface PlayerFixturesSectionProps {
  fplPlayer: FPLPlayer;
}

const PlayerFixturesSection: React.FC<PlayerFixturesSectionProps> = ({ fplPlayer }) => {
  const theme = useTheme();
  const [teams, setTeams] = useState<FPLTeam[]>([]);
  const [playerFixtures, setPlayerFixtures] = useState<any[]>([]);
  const [currentGameweek, setCurrentGameweek] = useState<number>(1);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFixture, setSelectedFixture] = useState<any>(null);
  const [fixtureDetails, setFixtureDetails] = useState<any>(null);
  const [showFixtureModal, setShowFixtureModal] = useState(false);
  const [allFixtures, setAllFixtures] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamsData = await fplApiService.fetchAllTeams();
        setTeams(teamsData);
        
        const allFixturesData = await fplApiService.fetchFixturesData();
        setAllFixtures(allFixturesData);
        
        // Filter fixtures for the player's team (home or away)
        const playerTeamFixtures = allFixturesData.filter(fixture => 
          fixture.team_h === fplPlayer.team || fixture.team_a === fplPlayer.team
        );
        
        // Convert to the format we need
        const convertedFixtures = playerTeamFixtures.map(fixture => {
          const isHome = fixture.team_h === fplPlayer.team;
          const opponentTeamId = isHome ? fixture.team_a : fixture.team_h;
          
          return {
            id: fixture.id,
            event: fixture.event,
            kickoff_time: fixture.kickoff_time,
            is_home: isHome,
            opponent_team: opponentTeamId,
            difficulty: isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty
          };
        });
        
        setPlayerFixtures(convertedFixtures);
        
        const gameweekData = await fplApiService.getCurrentGameweek();
        setCurrentGameweek(gameweekData.id);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fplPlayer.id]);

  const handleFixtureDetails = async (fixture: any) => {
    try {
      setSelectedFixture(fixture);
      setShowFixtureModal(true);
      
      // Fetch detailed fixture data
      const allFixtures = await fplApiService.fetchFixturesData();
      const fixtureDetail = allFixtures.find(f => f.id === fixture.id);
      
      if (fixtureDetail) {
        setFixtureDetails(fixtureDetail);
      }
    } catch (error) {
      console.error('Error fetching fixture details:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading fixtures...
        </Text>
      </View>
    );
  }

  // Filter to only show future fixtures (not started/finished)
  const filteredFixtures = playerFixtures
    .filter(fixture => {
      // Only show fixtures from current gameweek onwards
      if (fixture.event < currentGameweek) return false;
      
      // Check if fixture has already started or finished
      const fixtureDate = new Date(fixture.kickoff_time);
      const now = new Date();
      
      // Return true only if fixture is in the future
      return fixtureDate > now;
    });

  if (teams.length === 0) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
          Loading team data...
        </Text>
      </View>
    );
  }

  if (filteredFixtures.length === 0) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
          No future fixtures available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Table Header */}
      <View style={styles.matchHeader}>
        <Text style={[styles.matchHeaderTextLarge, { color: theme.colors.textSecondary }]}>Date</Text>
        <Text style={[styles.matchHeaderTextExtraSmall, { color: theme.colors.textSecondary }]}>GW</Text>
        <Text style={[styles.matchHeaderTextLarge, { color: theme.colors.textSecondary }]}>Opponent</Text>
        <Text style={[styles.matchHeaderTextExtraSmall, { color: theme.colors.textSecondary }]}>FDR</Text>
      </View>

      {/* Fixtures Rows */}
      {filteredFixtures.map((fixture, index) => {
        const isHome = fixture.is_home;
        
        // Try different lookup methods
        const directMatch = teams.find(t => t.id === fixture.opponent_team);
        const parseIntMatch = teams.find(t => t.id === parseInt(fixture.opponent_team));
        const stringMatch = teams.find(t => t.id.toString() === fixture.opponent_team);
        
        const opponentTeam = directMatch || parseIntMatch || stringMatch;
        
        const fixtureDate = new Date(fixture.kickoff_time);
        const dateString = fixtureDate.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short'
        }) + ', ' + fixtureDate.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        
        return (
          <View key={fixture.id || index} style={styles.matchRow}>
            <View style={styles.matchCellLarge}>
              <Text style={[styles.matchValue, { color: theme.colors.text }]}>
                {dateString}
              </Text>
            </View>
            <View style={styles.matchCellExtraSmall}>
              <Text style={[styles.matchValue, { color: theme.colors.text }]}>
                {fixture.event}
              </Text>
            </View>
            <View style={styles.matchCellLarge}>
              <View style={styles.opponentCell}>
                {opponentTeam ? (
                  <>
                    <Image 
                      source={{ uri: fplApiService.getTeamBadgeUrl(opponentTeam.code) }}
                      style={styles.teamBadgeImage}
                    />
                    <Text style={[styles.opponentText, { color: theme.colors.text }]}>
                      {opponentTeam.short_name} ({isHome ? 'H' : 'A'})
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.opponentText, { color: theme.colors.textSecondary }]}>
                    Unknown Team
                  </Text>
                )}
              </View>
            </View>
            <View style={styles.matchCellExtraSmall}>
              <View style={[
                styles.fdrBadge,
                { 
                  backgroundColor: fixture.difficulty === 2 ? '#10B981' : 
                                 fixture.difficulty === 3 ? '#6B7280' : 
                                 fixture.difficulty === 4 ? '#EF4444' : 
                                 '#9CA3AF'
                }
              ]}>
                <Text style={[styles.fdrText, { color: 'white' }]}>
                  {fixture.difficulty}
                </Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* Fixture Details Modal */}
      <Modal
        visible={showFixtureModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFixtureModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                {selectedFixture ? `Gameweek ${selectedFixture.event}` : 'Fixture Details'}
              </Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowFixtureModal(false)}
              >
                <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Fixture Details */}
            {fixtureDetails && (
              <View style={styles.fixtureDetailsContainer}>
                {/* Match Result */}
                <View style={styles.matchResultSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Match Details</Text>
                  
                  <View style={styles.matchResultRow}>
                    <View style={styles.teamSection}>
                      <Text style={[styles.teamName, { color: 'red' }]}>
                        HOME: {teams.find(t => t.id === fixtureDetails.team_h)?.name || 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.scoreSection}>
                      <Text style={[styles.matchScore, { color: 'green' }]}>
                        {fixtureDetails.team_h_score !== null ? fixtureDetails.team_h_score : '-'} - {fixtureDetails.team_a_score !== null ? fixtureDetails.team_a_score : '-'}
                      </Text>
                    </View>
                    <View style={styles.teamSection}>
                      <Text style={[styles.teamName, { color: 'blue' }]}>
                        AWAY: {teams.find(t => t.id === fixtureDetails.team_a)?.name || 'Unknown'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.matchDate, { color: theme.colors.textSecondary }]}>
                    {new Date(fixtureDetails.kickoff_time).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </Text>
                </View>

                {/* Fixture Stats */}
                <View style={styles.statsSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Fixture Stats</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Home Difficulty</Text>
                      <Text style={[styles.statValue, { color: theme.colors.text }]}>{fixtureDetails.team_h_difficulty}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Away Difficulty</Text>
                      <Text style={[styles.statValue, { color: theme.colors.text }]}>{fixtureDetails.team_a_difficulty}</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Status</Text>
                      <Text style={[styles.statValue, { color: theme.colors.text }]}>
                        {fixtureDetails.finished ? 'Finished' : fixtureDetails.started ? 'Live' : 'TBC'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  sectionHeader: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center' as const,
  },
  loadingText: {
    fontSize: 14,
    fontStyle: 'italic' as const,
  },
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center' as const,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  matchHeader: {
    flexDirection: 'row' as const,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  matchHeaderTextLarge: {
    fontSize: 12,
    fontWeight: '600' as const,
    flex: 1.5,
    textAlign: 'center' as const,
  },
  matchHeaderTextExtraSmall: {
    fontSize: 12,
    fontWeight: '600' as const,
    flex: 0.3,
    textAlign: 'center' as const,
  },
  matchRow: {
    flexDirection: 'row' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  matchCellLarge: {
    flex: 1.5,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  matchCellExtraSmall: {
    flex: 0.3,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  matchValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  opponentCell: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  teamBadgeImage: {
    width: 24,
    height: 24,
    marginRight: 4,
    borderRadius: 4,
  },
  opponentText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  fdrBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  fdrText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold' as const,
  },
  moreButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  moreButtonText: {
    fontSize: 16,
    fontWeight: 'bold' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold' as const,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  fixtureDetailsContainer: {
    gap: 20,
  },
  matchResultSection: {
    alignItems: 'stretch' as const,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    marginBottom: 15,
  },
  matchResultRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    width: '100%',
    marginBottom: 10,
  },
  teamSection: {
    flex: 1,
    alignItems: 'center' as const,
    backgroundColor: 'rgba(255, 0, 0, 0.1)' as const,
    padding: 8,
  },
  scoreSection: {
    flex: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    minWidth: 60,
  },
  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  teamNameHome: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'right' as const,
  },
  teamNameAway: {
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'left' as const,
  },
  matchScore: {
    fontSize: 18,
    fontWeight: 'bold' as const,
  },
  matchDate: {
    fontSize: 14,
    fontStyle: 'italic' as const,
  },
  statsSection: {
    marginTop: 20,
  },
  statsGrid: {
    gap: 15,
  },
  statItem: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 14,
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600' as const,
    textAlign: 'right' as const,
  },
});

export default PlayerFixturesSection; 