import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  
  // NEW: Comprehensive pre-cached data for instant rendering
  preRenderedPlayersTable?: any[]; // Fully processed players table data
  preRenderedBest11Data?: any; // Pre-calculated best 11 data
  preRenderedOptimalTeamsData?: any; // Pre-calculated optimal teams data
  preRenderedFixturesData?: any[]; // Pre-processed fixtures data
  preRenderedTeamData?: any[]; // Pre-processed team data
  
  // Performance metrics
  cachePerformance?: {
    playersTableRenderTime: number;
    best11CalculationTime: number;
    optimalTeamsCalculationTime: number;
    totalProcessingTime: number;
  };
  
  timestamp: number;
}

interface DataContextType {
  cachedData: CachedAppData | null;
  setCachedData: (data: CachedAppData) => void;
  clearCache: () => void;
  forceRefresh: () => void;
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
  const [isLoading, setIsLoadingState] = useState<boolean>(true); // Start true so LoadingScreen shows

  const setCachedData = (data: CachedAppData) => {

    console.log('  - Players count:', data.preRenderedPlayersTable?.length || 0);
    
    // Check specific players for XP values
    const salah = data.preRenderedPlayersTable?.find(p => p.web_name === 'M.Salah');
    if (salah) {

    }
    
    const raya = data.preRenderedPlayersTable?.find(p => p.web_name === 'Raya');
    if (raya) {

    }
    
    setCachedDataState(data);
    console.log('✅ DataContext: Cached data set successfully');
  };

  const setIsLoading = (loading: boolean) => {
    setIsLoadingState(loading);
  };

  const clearCache = () => {
    console.log('🗑️ DataContext: Clearing cache...');
    setCachedDataState(null);
  };

  const forceRefresh = () => {
    console.log('🔄 DataContext: Force refreshing data...');
    setCachedDataState(null);
    // This will trigger a fresh data load with the new logic
  };

  // Auto-clear cache if we detect stale data (for development)
  // DISABLED: This was too aggressive and prevented loading
  // useEffect(() => {
  //   if (cachedData?.preRenderedPlayersTable) {
  //     // Check if we have old cached data that might be incorrect
  //     const hasOldData = cachedData.preRenderedPlayersTable.some(player => 
  //       player.web_name === 'Savinho' && (player.baselineHistoryLength || 0) === 0
  //     );
  //     
  //     if (hasOldData) {
  //       console.log('🔄 DataContext: Detected stale cached data, auto-refreshing...');
  //       setCachedDataState(null);
  //     }
  //   }
  // }, [cachedData]);

  const isDataLoaded = Boolean(cachedData !== null && !isLoading && cachedData.preRenderedPlayersTable && cachedData.preRenderedPlayersTable.length > 0);
  


  return (
    <DataContext.Provider value={{
      cachedData,
      setCachedData,
      clearCache,
      forceRefresh,
      isDataLoaded,
      isLoading,
      setIsLoading
    }}>
      {children}
    </DataContext.Provider>
  );
};
