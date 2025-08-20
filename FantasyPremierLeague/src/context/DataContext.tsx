import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CachedAppData {
  fplPlayers: any[];
  teams: any[];
  fixtures: any[];
  currentGameweek: any;
  playerPredictions: any[];
  best11Teams: any;
  playersModel?: any[]; // premerged players with XP for Players tab
  timestamp: number;
}

interface DataContextType {
  cachedData: CachedAppData | null;
  setCachedData: (data: CachedAppData) => void;
  clearCache: () => void;
  isDataLoaded: boolean;
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

  const setCachedData = (data: CachedAppData) => {
    console.log('💾 Setting cached data in context:', {
      playersCount: data.fplPlayers?.length,
      predictionsCount: data.playerPredictions?.length,
      best11Count: data.best11Teams ? Object.keys(data.best11Teams).length : 0,
      playersModelCount: data.playersModel?.length || 0
    });
    setCachedDataState(data);
  };

  const clearCache = () => {
    console.log('🗑️ Clearing cached data from context');
    setCachedDataState(null);
  };

  const isDataLoaded = cachedData !== null;

  return (
    <DataContext.Provider value={{
      cachedData,
      setCachedData,
      clearCache,
      isDataLoaded
    }}>
      {children}
    </DataContext.Provider>
  );
};
