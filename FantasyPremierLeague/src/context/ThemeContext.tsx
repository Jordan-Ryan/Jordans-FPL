import React, { createContext, useContext, ReactNode } from 'react';

export interface Theme {
  colors: {
    primary: string;        // Deep teal #245F73
    secondary: string;      // Rich brown #733E24
    background: string;     // Light neutral #F2F0EF
    surface: string;        // Pure white #FFFFFF
    text: string;          // Dark text for contrast
    textSecondary: string; // Mid grey #BBBDBC
    accent: string;        // Deep teal #245F73
    success: string;       // Success green
    error: string;         // Error red
    warning: string;       // Warning orange
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  shadows: {
    small: object;
    medium: object;
    large: object;
  };
}

export const theme: Theme = {
  colors: {
    primary: '#245F73',      // Deep teal
    secondary: '#733E24',    // Rich brown
    background: '#F2F0EF',   // Light neutral
    surface: '#FFFFFF',      // Pure white
    text: '#1F2937',        // Dark text
    textSecondary: '#BBBDBC', // Mid grey
    accent: '#245F73',       // Deep teal
    success: '#10B981',      // Success green
    error: '#EF4444',        // Error red
    warning: '#F59E0B',      // Warning orange
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    xl: 24,
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
  },
};

const ThemeContext = createContext<Theme>(theme);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}; 