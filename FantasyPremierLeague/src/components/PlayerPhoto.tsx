import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Image as RNImage } from 'react-native';
import { fplApiService } from '../services/fplApi';

interface PlayerPhotoProps {
  playerId: number;
  width: number;
  height: number;
  showName?: boolean;
  style?: any;
}

const PlayerPhoto: React.FC<PlayerPhotoProps> = ({ playerId, width, height, showName = false, style }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const [fplPlayer, setFplPlayer] = useState<any>(null);

  // Get the photo URL from FPL API
  React.useEffect(() => {
    const getPlayerPhoto = async () => {
      try {
        const player = await fplApiService.getPlayerById(playerId);
        setFplPlayer(player);
      } catch (error) {
        console.error('Error fetching player photo:', error);
        setImageFailed(true);
      }
    };

    if (playerId && playerId !== 0) {
      getPlayerPhoto();
    } else {
      setImageFailed(true);
    }
  }, [playerId]);

  if (imageFailed || !fplPlayer?.photo) {
    return (
      <Image
        source={require('../../assets/Ghost Player.png')}
        style={[styles.image, { width, height }, style]}
        resizeMode="cover"
      />
    );
  }

  const photoUrl = fplApiService.getPlayerPhotoUrl(fplPlayer.photo);

  return (
    <Image 
      source={{ uri: photoUrl }} 
      style={[styles.image, { width, height }, style]}
      onError={() => setImageFailed(true)}
      defaultSource={require('../../assets/Ghost Player.png')}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  image: {
    borderRadius: 8,
  },
});

export default PlayerPhoto; 