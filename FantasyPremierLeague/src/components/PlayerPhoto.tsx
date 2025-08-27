import React, { useState, useEffect } from 'react';
import { Image, StyleSheet, View, ImageResizeMode } from 'react-native';
import { fplApiService } from '../services/fplApi';

interface PlayerPhotoProps {
  playerId: number;
  photoCode?: string;
  photoUrl?: string;
  width?: number;
  height?: number;
  size?: number; // Keep for backward compatibility
  resizeMode?: ImageResizeMode;
  style?: any;
}

const PlayerPhoto: React.FC<PlayerPhotoProps> = ({ 
  playerId, 
  photoCode, 
  photoUrl, 
  width,
  height,
  size, // For backward compatibility
  resizeMode = 'cover', // Default to cover
  style 
}) => {
  const [localPhotoPath, setLocalPhotoPath] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Use size for both dimensions if provided, otherwise use width/height
  const finalWidth = width || size || 55;
  const finalHeight = height || size || 70;

  useEffect(() => {
    // Only try to get local photo path if we don't have photoUrl
    if (!photoUrl) {
      const getLocalPath = async () => {
        try {
          const path = await fplApiService.getLocalPhotoPath(playerId);
          if (path) {
            setLocalPhotoPath(path);
          }
        } catch (error) {
          console.log(`PlayerPhoto: No local photo found for player ${playerId}`);
        }
      };
      getLocalPath();
    }
  }, [playerId, photoUrl]);

  // If we have a photoUrl, use it directly
  if (photoUrl) {
    return (
      <Image
        source={{ uri: `file://${photoUrl}` }}
        style={[styles.image, { width: finalWidth, height: finalHeight }, style]}
        resizeMode={resizeMode}
        onError={() => {
          console.log(`PlayerPhoto: Local photo failed for player ${playerId}, using ghost`);
          setImageError(true);
        }}
      />
    );
  }

  // If we have a local photo path, use it
  if (localPhotoPath && !imageError) {
    return (
      <Image
        source={{ uri: `file://${localPhotoPath}` }}
        style={[styles.image, { width: finalWidth, height: finalHeight }, style]}
        resizeMode={resizeMode}
        onError={() => {
          console.log(`PlayerPhoto: Local photo failed for player ${playerId}, using ghost`);
          setImageError(true);
        }}
      />
    );
  }

  // Final fallback - this should rarely happen now since ghost image is stored locally
  return (
    <Image
      source={{ uri: `file://${fplApiService.photoStorageDir}ghost_player.png` }}
      style={[styles.image, { width: finalWidth, height: finalHeight }, style]}
      resizeMode={resizeMode}
    />
  );
};

const styles = StyleSheet.create({
  image: {
    borderRadius: 8, // Reduced from 20 to be less circular
  },
});

export default PlayerPhoto; 