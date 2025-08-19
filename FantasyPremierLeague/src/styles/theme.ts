export const theme = {
  colors: {
    // Primary colors
    primary: '#004526',
    primaryLight: 'rgba(0, 69, 38, 0.1)',
    secondary: '#006241',
    
    // Text colors
    textPrimary: '#000000',
    textSecondary: '#6B7280',
    textWhite: '#FFFFFF',
    
    // Background colors
    background: '#F8F9FA',
    cardBackground: 'rgba(0, 69, 38, 0.1)',
    white: '#FFFFFF',
    
    // Status colors
    success: '#10B981',
    warning: '#F59E0B',
    info: '#245F73',
    
    // UI colors
    border: '#E5E7EB',
    shadow: '#000000',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
  },
  
  typography: {
    xs: 8,
    sm: 10,
    md: 12,
    lg: 14,
    xl: 16,
    xxl: 18,
    xxxl: 20,
    xxxxl: 24,
  },
  
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
    },
  },
};

export type Theme = typeof theme; 