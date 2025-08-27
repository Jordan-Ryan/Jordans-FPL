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
    console.log('🔍 DataContext: Setting cached data...');
    console.log('  - Players count:', data.preRenderedPlayersTable?.length || 0);
    
    // Check specific players for XP values
    const salah = data.preRenderedPlayersTable?.find(p => p.web_name === 'M.Salah');
    if (salah) {
      console.log('🔍 DataContext: Salah XP data being cached:', {
        gwp1_xp: salah.gwp1_xp,
        gwp2_xp: salah.gwp2_xp,
        gwp3_xp: salah.gwp3_xp,
        total_3gw_xp: salah.total_3gw_xp
      });
    }
    
    const raya = data.preRenderedPlayersTable?.find(p => p.web_name === 'Raya');
    if (raya) {
      console.log('🔍 DataContext: Raya XP data being cached:', {
        gwp1_xp: raya.gwp1_xp,
        gwp2_xp: raya.gwp2_xp,
        gwp3_xp: raya.gwp3_xp,
        total_3gw_xp: raya.total_3gw_xp
      });
    }
    
    setCachedDataState(data);
    console.log('✅ DataContext: Cached data set successfully');
  };

  const setIsLoading = (loading: boolean) => {
    setIsLoadingState(loading);
  };

  const clearCache = () => {
    setCachedDataState(null);
  };

  const isDataLoaded = cachedData !== null && !isLoading && cachedData.preRenderedPlayersTable && cachedData.preRenderedPlayersTable.length > 0;
  
  // Debug logging for data loading state
  console.log('🔍 DataContext state:', {
    hasCachedData: !!cachedData,
    isLoading,
    hasPreRenderedPlayers: !!(cachedData?.preRenderedPlayersTable && cachedData.preRenderedPlayersTable.length > 0),
    isDataLoaded,
    preRenderedPlayersCount: cachedData?.preRenderedPlayersTable?.length || 0
  });

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
