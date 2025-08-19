import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface GhostPlayerProps {
  size: number;
  name?: string;
  showName?: boolean;
}

const GhostPlayer: React.FC<GhostPlayerProps> = ({ size, name, showName = false }) => {
  const isRectangular = size > 50; // If it's a larger photo, make it rectangular
  
  return (
    <View style={[styles.container, { 
      width: size, 
      height: isRectangular ? size * 1.27 : size // 70/55 = 1.27 aspect ratio
    }]}>
      {/* Improved ghost icon - more detailed silhouette */}
      <View style={styles.ghostIcon}>
        {/* Head */}
        <View style={[styles.head, { 
          width: size * 0.35, 
          height: size * 0.35 
        }]} />
        
        {/* Body */}
        <View style={[styles.body, { 
          width: size * 0.5, 
          height: size * 0.4 
        }]} />
        
        {/* Legs */}
        <View style={styles.legsContainer}>
          <View style={[styles.leg, { 
            width: size * 0.2, 
            height: size * 0.3 
          }]} />
          <View style={[styles.leg, { 
            width: size * 0.2, 
            height: size * 0.3 
          }]} />
        </View>
      </View>
      
      {/* Player name below if requested */}
      {showName && name && (
        <Text style={[styles.playerName, { fontSize: size * 0.15 }]} numberOfLines={1}>
          {name}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 69, 38, 0.3)', // #004526 with 30% opacity
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 69, 38, 0.5)', // #004526 with 50% opacity
  },
  ghostIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    backgroundColor: 'rgba(156, 163, 175, 0.8)', // Gray with opacity
    borderRadius: 50,
    marginBottom: 2,
  },
  body: {
    backgroundColor: 'rgba(156, 163, 175, 0.8)', // Gray with opacity
    borderRadius: 6,
    marginBottom: 2,
  },
  legsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  leg: {
    backgroundColor: 'rgba(156, 163, 175, 0.8)', // Gray with opacity
    borderRadius: 4,
    marginHorizontal: 2,
  },
  playerName: {
    color: 'rgba(156, 163, 175, 0.9)',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default GhostPlayer; 