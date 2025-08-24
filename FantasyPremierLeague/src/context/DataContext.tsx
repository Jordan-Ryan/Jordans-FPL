import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CachedAppData {
  fplPlayers: any[];
  teams: any[];
  fixtures: any[];
  currentGameweek: any;
  playerPredictions: any[];
  best11Teams: any;
  optimalTeams?: any; // New optimal teams with FPL rules
  playersModel?: any[]; // premerged players with XP for Players tab
  processedPlayerData?: any; // Pre-processed player data for instant Players tab loading
  timestamp: number;
}

interface DataContextType {
  cachedData: CachedAppData | null;
  setCachedData: (data: CachedAppData) => void;
  clearCache: () => void;
  isDataLoaded: boolean;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [cachedData, setCachedDataState] = useState<CachedAppData | null>(null);
  const [isLoading, setIsLoadingState] = useState<boolean>(false);

  const setCachedData = (data: CachedAppData) => {
    setCachedDataState(data);
  };

  const setIsLoading = (loading: boolean) => {
    setIsLoadingState(loading);
  };

  const clearCache = () => {
    setCachedDataState(null);
  };

  const isDataLoaded = cachedData !== null && !isLoading;

  return (
    <DataContext.Provider value={{
      cachedData,
      setCachedData,
      clearCache,
      isDataLoaded,
      isLoading,
      setIsLoading
    }}>
      {children}
    </DataContext.Provider>
  );
};
