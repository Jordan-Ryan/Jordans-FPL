import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FPLPlayer } from '../types';

interface PlayerHistorySectionProps {
  fplPlayer: FPLPlayer;
}

const PlayerHistorySection: React.FC<PlayerHistorySectionProps> = ({ fplPlayer }) => {
  const theme = useTheme();

  const getPositionName = (position: number) => {
    if (position === 1) return 'Goalkeeper';
    if (position >= 2 && position <= 4) return 'Defender';
    if (position >= 5 && position <= 8) return 'Midfielder';
    if (position >= 9 && position <= 11) return 'Forward';
    return 'Unknown';
  };

  const formatPrice = (cost: number) => {
    return `£${(cost / 10).toFixed(1)}m`;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return '#10B981'; // Green for increase
    if (change < 0) return '#EF4444'; // Red for decrease
    return '#6B7280'; // Gray for no change
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Player History</Text>
      
      <ScrollView style={styles.historyContainer} showsVerticalScrollIndicator={false}>
        {/* Price History */}
        <View style={styles.historySection}>
          <Text style={[styles.historySectionTitle, { color: theme.colors.text }]}>Price History</Text>
          
          <View style={styles.priceHistoryContainer}>
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Current Price</Text>
              <Text style={[styles.priceValue, { color: theme.colors.text }]}>
                {formatPrice(fplPlayer.now_cost)}
              </Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>Start of Season</Text>
              <Text style={[styles.priceValue, { color: theme.colors.text }]}>
                {formatPrice(fplPlayer.now_cost - fplPlayer.cost_change_start)}
              </Text>
            </View>
            
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.colors.textSecondary }]}>This Gameweek</Text>
              <View style={styles.priceChangeContainer}>
                <Text style={[styles.priceValue, { color: theme.colors.text }]}>
                  {formatPrice(fplPlayer.now_cost - fplPlayer.cost_change_event)}
                </Text>
                <Text style={[
                  styles.priceChange, 
                  { color: getPriceChangeColor(fplPlayer.cost_change_event) }
                ]}>
                  {getPriceChangeIcon(fplPlayer.cost_change_event)} {Math.abs(fplPlayer.cost_change_event / 10).toFixed(1)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transfer History */}
        <View style={styles.historySection}>
          <Text style={[styles.historySectionTitle, { color: theme.colors.text }]}>Transfer Activity</Text>
          
          <View style={styles.transferContainer}>
            <View style={styles.transferRow}>
              <Text style={[styles.transferLabel, { color: theme.colors.textSecondary }]}>Transfers In (This GW)</Text>
              <Text style={[styles.transferValue, { color: theme.colors.text }]}>
                {fplPlayer.transfers_in_event.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.transferRow}>
              <Text style={[styles.transferLabel, { color: theme.colors.textSecondary }]}>Transfers Out (This GW)</Text>
              <Text style={[styles.transferValue, { color: theme.colors.text }]}>
                {fplPlayer.transfers_out_event.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.transferRow}>
              <Text style={[styles.transferLabel, { color: theme.colors.textSecondary }]}>Total Transfers In</Text>
              <Text style={[styles.transferValue, { color: theme.colors.text }]}>
                {fplPlayer.transfers_in.toLocaleString()}
              </Text>
            </View>
            
            <View style={styles.transferRow}>
              <Text style={[styles.transferLabel, { color: theme.colors.textSecondary }]}>Total Transfers Out</Text>
              <Text style={[styles.transferValue, { color: theme.colors.text }]}>
                {fplPlayer.transfers_out.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Performance History */}
        <View style={styles.historySection}>
          <Text style={[styles.historySectionTitle, { color: theme.colors.text }]}>Performance Metrics</Text>
          
          <View style={styles.performanceContainer}>
            <View style={styles.performanceRow}>
              <Text style={[styles.performanceLabel, { color: theme.colors.textSecondary }]}>Dream Team Appearances</Text>
              <Text style={[styles.performanceValue, { color: theme.colors.text }]}>
                {fplPlayer.dreamteam_count}
              </Text>
            </View>
            
            <View style={styles.performanceRow}>
              <Text style={[styles.performanceLabel, { color: theme.colors.textSecondary }]}>Value for Form</Text>
              <Text style={[styles.performanceValue, { color: theme.colors.text }]}>
                {fplPlayer.value_form}
              </Text>
            </View>
            
            <View style={styles.performanceRow}>
              <Text style={[styles.performanceLabel, { color: theme.colors.textSecondary }]}>Value for Season</Text>
              <Text style={[styles.performanceValue, { color: theme.colors.text }]}>
                {fplPlayer.value_season}
              </Text>
            </View>
            
            <View style={styles.performanceRow}>
              <Text style={[styles.performanceLabel, { color: theme.colors.textSecondary }]}>Expected Points (Next)</Text>
              <Text style={[styles.performanceValue, { color: theme.colors.text }]}>
                {fplPlayer.ep_next}
              </Text>
            </View>
            
            <View style={styles.performanceRow}>
              <Text style={[styles.performanceLabel, { color: theme.colors.textSecondary }]}>Expected Points (This)</Text>
              <Text style={[styles.performanceValue, { color: theme.colors.text }]}>
                {fplPlayer.ep_this}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Information */}
        <View style={styles.historySection}>
          <Text style={[styles.historySectionTitle, { color: theme.colors.text }]}>Status & Availability</Text>
          
          <View style={styles.statusContainer}>
            <View style={styles.statusRow}>
              <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Current Status</Text>
              <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                {fplPlayer.status === 'a' ? 'Available' : 
                 fplPlayer.status === 'u' ? 'Unavailable' : 
                 fplPlayer.status === 'i' ? 'Injured' : 
                 fplPlayer.status === 's' ? 'Suspended' : 'Unknown'}
              </Text>
            </View>
            
            {fplPlayer.chance_of_playing_next_round && (
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Chance of Playing Next Round</Text>
                <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                  {fplPlayer.chance_of_playing_next_round}%
                </Text>
              </View>
            )}
            
            {fplPlayer.chance_of_playing_this_round && (
              <View style={styles.statusRow}>
                <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>Chance of Playing This Round</Text>
                <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                  {fplPlayer.chance_of_playing_this_round}%
                </Text>
              </View>
            )}
            
            {fplPlayer.news && (
              <View style={styles.newsContainer}>
                <Text style={[styles.newsLabel, { color: theme.colors.textSecondary }]}>Latest News</Text>
                <Text style={[styles.newsText, { color: theme.colors.text }]}>
                  {fplPlayer.news}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  historyContainer: {
    maxHeight: 500,
  },
  historySection: {
    marginBottom: 24,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#374151',
  },
  priceHistoryContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  priceChangeContainer: {
    alignItems: 'flex-end',
  },
  priceChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  transferContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  transferRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  transferLabel: {
    fontSize: 14,
  },
  transferValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  performanceContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  performanceLabel: {
    fontSize: 14,
  },
  performanceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statusLabel: {
    fontSize: 14,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  newsContainer: {
    paddingTop: 8,
  },
  newsLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  newsText: {
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 20,
  },
});

export default PlayerHistorySection; 