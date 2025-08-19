import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FPLPlayer, FPLTeam } from '../types';
import { fplApiService } from '../services/fplApi';
import PlayerStatsSection from './PlayerStatsSection';
import PlayerPhoto from './PlayerPhoto';
import { getPositionName, formatPrice } from '../utils/helpers';

interface PlayerDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  fplPlayer: FPLPlayer;
  team: FPLTeam | null;
}

const PlayerDetailsModal: React.FC<PlayerDetailsModalProps> = ({
  visible,
  onClose,
  fplPlayer,
  team,
}) => {
  const theme = useTheme();
  const [playerRankings, setPlayerRankings] = useState<{
    pointsRank: string;
    formRank: string;
    ownershipRank: string;
    valueRank: string;
  } | null>(null);

  useEffect(() => {
    if (visible && fplPlayer) {
      const fetchRankings = async () => {
        try {
          const rankingsData = await fplApiService.getPlayerRankings(fplPlayer.id);
          setPlayerRankings(rankingsData);
        } catch (error) {
          console.error('Error fetching player rankings:', error);
        }
      };
      
      fetchRankings();
    }
  }, [visible, fplPlayer]);

  if (!fplPlayer || !team) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: 'white' }]}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Player Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.playerHeader}>
              <View style={styles.playerInfo}>
                <PlayerPhoto playerId={fplPlayer.id} width={80} height={100} />
                <View style={styles.playerDetails}>
                  <Text style={[styles.playerName, { color: theme.colors.text }]}>
                    {fplPlayer.web_name}
                  </Text>
                  <Text style={[styles.playerPosition, { color: theme.colors.textSecondary }]}>
                    {getPositionName(fplPlayer.element_type)}
                  </Text>
                  <Text style={[styles.playerTeam, { color: theme.colors.textSecondary }]}>
                    {team.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Key Stats Grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {formatPrice(fplPlayer.now_cost)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Price
                </Text>
                <Text style={[styles.statRank, { color: theme.colors.textSecondary }]}>
                  {playerRankings ? playerRankings.valueRank : 
                   `${fplPlayer.element_type === 1 ? 'GK' : 
                     fplPlayer.element_type === 2 ? 'DEF' : 
                     fplPlayer.element_type === 3 ? 'MID' : 'FWD'} Rank`}
                </Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {parseFloat(fplPlayer.points_per_game).toFixed(1)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Pts/Match
                </Text>
                <Text style={[styles.statRank, { color: theme.colors.textSecondary }]}>
                  {playerRankings ? playerRankings.pointsRank : 
                   `${fplPlayer.element_type === 1 ? 'GK' : 
                     fplPlayer.element_type === 2 ? 'MID' : 'FWD'} Rank`}
                </Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {parseFloat(fplPlayer.form).toFixed(1)}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Form
                </Text>
                <Text style={[styles.statRank, { color: theme.colors.textSecondary }]}>
                  {playerRankings ? playerRankings.formRank : 
                   `${fplPlayer.element_type === 1 ? 'GK' : 
                     fplPlayer.element_type === 2 ? 'DEF' : 
                     fplPlayer.element_type === 3 ? 'MID' : 'FWD'} Rank`}
                </Text>
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {parseFloat(fplPlayer.selected_by_percent).toFixed(1)}%
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Selected
                </Text>
                <Text style={[styles.statRank, { color: theme.colors.textSecondary }]}>
                  {playerRankings ? playerRankings.ownershipRank : 
                   `${fplPlayer.element_type === 1 ? 'GK' : 
                     fplPlayer.element_type === 2 ? 'DEF' : 
                     fplPlayer.element_type === 3 ? 'MID' : 'FWD'} Rank`}
                </Text>
              </View>
            </View>
            
            <Text style={[styles.rankingLabel, { color: theme.colors.textSecondary }]}>
              Ranking for {getPositionName(fplPlayer.element_type)}s
            </Text>
          </View>

          {/* Tabs Section */}
          <View style={styles.tabsContainer}>
            <PlayerStatsSection fplPlayer={fplPlayer} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 20,
    zIndex: 1000,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    padding: 20,
    backgroundColor: 'white',
    margin: 0,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playerDetails: {
    marginLeft: 20,
  },
  playerName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  playerPosition: {
    fontSize: 16,
    marginBottom: 4,
  },
  playerTeam: {
    fontSize: 16,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statRank: {
    fontSize: 10,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  rankingLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
  },
  tabsContainer: {
    paddingBottom: 40,
  },
});

export default PlayerDetailsModal; 