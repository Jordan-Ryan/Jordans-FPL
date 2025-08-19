import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PlayerExpectedPoints, FixturePrediction } from '../services/types';

interface PlayerRowProps {
  player: PlayerExpectedPoints;
  onPress?: () => void;
  showConfidence?: boolean;
}

/**
 * PlayerRow component displays expected points for a player
 * Shows individual fixture predictions and 3-GW total
 */
export const PlayerRow: React.FC<PlayerRowProps> = ({
  player,
  onPress,
  showConfidence = true
}) => {
  // Helper function to get difficulty color
  const getDifficultyColor = (difficulty: number): string => {
    switch (difficulty) {
      case 1: return '#4CAF50'; // Very Easy - Green
      case 2: return '#8BC34A'; // Easy - Light Green
      case 3: return '#FFC107'; // Medium - Yellow
      case 4: return '#FF9800'; // Hard - Orange
      case 5: return '#F44336'; // Very Hard - Red
      default: return '#9E9E9E'; // Unknown - Gray
    }
  };

  // Helper function to format expected points
  const formatPoints = (points: number): string => {
    return points.toFixed(1);
  };

  // Helper function to render confidence indicator
  const renderConfidenceIndicator = () => {
    if (!showConfidence) return null;

    const { lower, upper } = player.confidence;
    const range = upper - lower;
    
    // Determine confidence level based on range
    let confidenceLevel: 'high' | 'medium' | 'low';
    let confidenceColor: string;
    
    if (range <= 2.0) {
      confidenceLevel = 'high';
      confidenceColor = '#4CAF50';
    } else if (range <= 3.5) {
      confidenceLevel = 'medium';
      confidenceColor = '#FFC107';
    } else {
      confidenceLevel = 'low';
      confidenceColor = '#F44336';
    }

    return (
      <View style={[styles.confidenceIndicator, { backgroundColor: confidenceColor }]}>
        <Text style={styles.confidenceText}>{confidenceLevel.toUpperCase()}</Text>
      </View>
    );
  };

  // Helper function to render fixture prediction
  const renderFixturePrediction = (prediction: FixturePrediction, index: number) => {
    const difficultyColor = getDifficultyColor(prediction.difficulty);
    
    return (
      <View key={index} style={styles.fixtureContainer}>
        {/* Gameweek */}
        <View style={styles.gwContainer}>
          <Text style={styles.gwText}>GW{prediction.gameweek}</Text>
        </View>
        
        {/* Opponent and Home/Away */}
        <View style={styles.opponentContainer}>
          <Text style={styles.opponentText}>{prediction.opponent}</Text>
          <Text style={styles.homeAwayText}>({prediction.home_away})</Text>
        </View>
        
        {/* Difficulty Rating */}
        <View style={[styles.difficultyContainer, { backgroundColor: difficultyColor }]}>
          <Text style={styles.difficultyText}>{prediction.difficulty}</Text>
        </View>
        
        {/* Expected Points */}
        <View style={styles.pointsContainer}>
          <Text style={styles.pointsText}>{formatPoints(prediction.expected_points)}</Text>
        </View>
      </View>
    );
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Player Header */}
      <View style={styles.playerHeader}>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>{player.name}</Text>
          <View style={styles.playerMeta}>
            <Text style={styles.teamText}>{player.team}</Text>
            <Text style={styles.positionText}>{player.position}</Text>
          </View>
        </View>
        
        {/* Total 3-GW Points */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>3-GW Total</Text>
          <Text style={styles.totalPoints}>{formatPoints(player.total_3gw)}</Text>
          {renderConfidenceIndicator()}
        </View>
      </View>

      {/* Fixture Predictions */}
      <View style={styles.fixturesContainer}>
        {player.predictions.map((prediction, index) => 
          renderFixturePrediction(prediction, index)
        )}
      </View>

      {/* Confidence Range */}
      {showConfidence && (
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>
            Confidence: {formatPoints(player.confidence.lower)} - {formatPoints(player.confidence.upper)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  playerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  playerInfo: {
    flex: 1,
  },
  
  playerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  
  playerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  teamText: {
    fontSize: 14,
    color: '#666666',
    marginRight: 8,
  },
  
  positionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  
  totalContainer: {
    alignItems: 'center',
  },
  
  totalLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  
  totalPoints: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4CAF50',
  },
  
  confidenceIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  
  confidenceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  fixturesContainer: {
    marginBottom: 12,
  },
  
  fixtureContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  gwContainer: {
    width: 40,
    alignItems: 'center',
  },
  
  gwText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
  },
  
  opponentContainer: {
    flex: 1,
    marginLeft: 12,
  },
  
  opponentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
  },
  
  homeAwayText: {
    fontSize: 12,
    color: '#666666',
  },
  
  difficultyContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
  },
  
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  pointsContainer: {
    width: 50,
    alignItems: 'center',
  },
  
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  
  confidenceContainer: {
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  
  confidenceLabel: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
});

export default PlayerRow;
