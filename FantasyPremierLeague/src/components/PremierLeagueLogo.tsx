import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

interface PremierLeagueLogoProps {
  size?: number;
  showText?: boolean;
}

export const PremierLeagueLogo: React.FC<PremierLeagueLogoProps> = ({ 
  size = 24, 
  showText = false 
}) => {
  // Premier League official logo URL
  const premierLeagueLogoUrl = 'https://shop.nottinghamforest.co.uk/cdn/shop/files/premier-league-badge-nottingham-forest-fc-610137.png?v=1730244979&width=700';
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image 
        source={{ uri: premierLeagueLogoUrl }}
        style={[styles.logo, { width: size, height: size }]}
        resizeMode="contain"
      />
      
      {showText && (
        <Text style={styles.text}>Premier League</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logo: {
    borderRadius: 4,
  },
  text: {
    fontSize: 8,
    color: '#37003C',
    fontWeight: 'bold',
    marginTop: 2,
    textAlign: 'center',
  },
}); 