import { Player, Formation } from '../types';

export const getFormationText = (formation: Formation): string => {
  return `${formation.defenders}-${formation.midfielders}-${formation.forwards}`;
};

export const getPositionColor = (position: string): string => {
  switch (position) {
    case 'GK':
      return '#FF6B35';
    case 'DEF':
      return '#4A90E2';
    case 'MID':
      return '#50C878';
    case 'FWD':
      return '#F59E0B';
    default:
      return '#8E8E93';
  }
};

export const getDifficultyColor = (difficulty: string): string => {
  switch (difficulty) {
    case 'Easy':
      return '#10B981';
    case 'Medium':
      return '#F59E0B';
    case 'Hard':
      return '#EF4444';
    default:
      return '#8E8E93';
  }
};

export const isValidFormation = (formation: Formation): boolean => {
  const { defenders, midfielders, forwards, total } = formation;
  
  // Must have exactly 11 players total
  if (total !== 11) return false;
  
  // Must have exactly 1 GK
  const gk = total - defenders - midfielders - forwards;
  if (gk !== 1) return false;
  
  // Must have at least 3 defenders, 2 midfielders, 1 forward
  if (defenders < 3) return false;
  if (midfielders < 2) return false;
  if (forwards < 1) return false;
  
  // Cannot have more than 5 defenders or 3 forwards
  if (defenders > 5) return false;
  if (forwards > 3) return false;
  
  return true;
};

export const getPositionName = (elementType: number): string => {
  switch (elementType) {
    case 1:
      return 'Goalkeeper';
    case 2:
      return 'Defender';
    case 3:
      return 'Midfielder';
    case 4:
      return 'Forward';
    default:
      return 'Unknown';
  }
};

export const formatPrice = (price: number): string => {
  return `£${(price / 10).toFixed(1)}m`;
}; 