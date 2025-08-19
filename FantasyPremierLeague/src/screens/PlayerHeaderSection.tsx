import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { FPLPlayer, FPLTeam } from '../types';
import PlayerPhoto from '../components/PlayerPhoto';

interface PlayerHeaderSectionProps {
  fplPlayer: FPLPlayer;
  team: FPLTeam;
  showCloseButton?: boolean;
  onClose?: () => void;
  // For match details modal - show gameweek and date instead of position and club
  isMatchContext?: boolean;
  selectedMatch?: any;
}

const PlayerHeaderSection: React.FC<PlayerHeaderSectionProps> = ({
  fplPlayer,
  team,
  showCloseButton = false,
  onClose,
  isMatchContext = false,
  selectedMatch,
}) => {
  const theme = useTheme();

  const getPositionName = (position: number) => {
    if (position === 1) return 'Goalkeeper';
    if (position >= 2 && position <= 4) return 'Defender';
    if (position >= 5 && position <= 8) return 'Midfielder';
    if (position >= 9 && position <= 11) return 'Forward';
    return 'Unknown';
  };

  const renderSecondaryInfo = () => {
    if (isMatchContext && selectedMatch) {
      // Show gameweek and date for match context
      return (
        <>
          <Text style={[styles.playerPosition, { color: theme.colors.textSecondary }]}>
            Gameweek {selectedMatch?.round || 'Unknown'}
          </Text>
          <Text style={[styles.playerClub, { color: theme.colors.textSecondary }]}>
            {selectedMatch?.kickoff_time ? new Date(selectedMatch.kickoff_time).toLocaleDateString('en-GB', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short',
              hour: '2-digit',
              minute: '2-digit'
            }) : 'Date TBC'}
          </Text>
        </>
      );
    } else {
      // Show position and club for player context
      return (
        <>
          <Text style={[styles.playerPosition, { color: theme.colors.textSecondary }]}>
            {getPositionName(fplPlayer.element_type)}
          </Text>
          <Text style={[styles.playerClub, { color: theme.colors.textSecondary }]}>
            {team.name}
          </Text>
        </>
      );
    }
  };

  return (
    <View style={styles.playerHeaderSection}>
      <PlayerPhoto 
        playerId={fplPlayer.id}
        width={80}
        height={100}
        showName={false}
      />
      <View style={styles.playerHeaderDetails}>
        <Text style={[styles.playerName, { color: theme.colors.text }]}>
          {fplPlayer.web_name}
        </Text>
        {renderSecondaryInfo()}
      </View>
      {showCloseButton && onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeButtonText, { color: theme.colors.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  playerHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  playerHeaderDetails: {
    marginLeft: 16,
    flex: 1,
    marginRight: 16,
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
  playerClub: {
    fontSize: 16,
    fontWeight: '500',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default PlayerHeaderSection; 