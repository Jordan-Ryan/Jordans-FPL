import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { comprehensiveDataService } from '../services/comprehensiveDataService';

const LoadingScreen: React.FC = () => {
  const theme = useTheme();
  const { setCachedData, setIsLoading } = useData();
  const [progress, setProgress] = useState('Initializing...');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps] = useState(9);
  const [playerProgress, setPlayerProgress] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

  const updateProgress = (step: number, stepDescription: string, stepPercentage: number) => {
    setCurrentStep(step);
    setProgress(stepDescription);
    setProgressPercentage(stepPercentage);
  };

  const loadAllData = async () => {
    try {
      // Step 1: Fetch FPL player data
      updateProgress(1, 'Fetching player data from FPL...', 10);
      const data = await comprehensiveDataService.loadAllData((step: number, description: string, percentage: number) => {
        // Handle special case for player predictions step
        if (step === 5 && description.includes('Calculating XP for player')) {
          // Extract player progress from description
          const match = description.match(/player (\d+)\/(\d+)/);
          if (match) {
            const current = parseInt(match[1]);
            const total = parseInt(match[2]);
            setPlayerProgress(current);
            setTotalPlayers(total);
          }
        } else {
          // Reset player progress for other steps
          setPlayerProgress(0);
          setTotalPlayers(0);
        }
        
        updateProgress(step, description, percentage);
      });
      
      console.log('🔍 Data received from comprehensive service:');
      console.log('  - Players count:', data.players.length);
      console.log('  - Sample player (first):', data.players[0] ? {
        name: data.players[0].web_name,
        gwp1_xp: data.players[0].gwp1_xp,
        total_3gw_xp: data.players[0].total_3gw_xp
      } : 'No players');
      
      // Check specific players for XP values
      const salah = data.players.find(p => p.web_name === 'M.Salah');
      const raya = data.players.find(p => p.web_name === 'Raya');
      
      if (salah) {
        console.log('🔍 Salah XP data:', {
          gwp1_xp: salah.gwp1_xp,
          gwp2_xp: salah.gwp2_xp,
          gwp3_xp: salah.gwp3_xp,
          total_3gw_xp: salah.total_3gw_xp
        });
      }
      
      if (raya) {
        console.log('🔍 Raya XP data:', {
          gwp1_xp: raya.gwp1_xp,
          gwp2_xp: raya.gwp2_xp,
          gwp3_xp: raya.gwp3_xp,
          total_3gw_xp: raya.total_3gw_xp
        });
      }
      
      console.log('🔍 Setting cached data...');
      setCachedData({
        // Map to the existing DataContext structure
        fplPlayers: data.players,
        teams: data.teams,
        fixtures: data.fixtures,
        currentGameweek: { id: data.currentGameweek },
        playerPredictions: data.players, // Players already have XP data
        best11Teams: data.best11Teams,
        playersModel: data.players, // Use comprehensive players as model
        processedPlayerData: {
          allPlayers: data.players,
          metadata: {
            totalPlayers: data.players.length
          }
        },
        // Add the pre-rendered data that Players screen expects
        preRenderedPlayersTable: data.players,
        preRenderedBest11Data: data.best11Teams,
        preRenderedOptimalTeamsData: [],
        preRenderedFixturesData: data.fixtures,
        preRenderedTeamData: data.teams,
        timestamp: data.timestamp
      });
      
      console.log('🔍 Cached data verification:');
      const cachedPlayer = data.players.find((p: any) => p.web_name === 'M.Salah');
      if (cachedPlayer) {
        console.log('🔍 Salah in data to be cached:', {
          gwp1_xp: cachedPlayer.gwp1_xp,
          gwp2_xp: cachedPlayer.gwp2_xp,
          gwp3_xp: cachedPlayer.gwp3_xp,
          total_3gw_xp: cachedPlayer.total_3gw_xp
        });
      }
      
      const cachedRaya = data.players.find((p: any) => p.web_name === 'Raya');
      if (cachedRaya) {
        console.log('🔍 Raya in data to be cached:', {
          gwp1_xp: cachedRaya.gwp1_xp,
          gwp2_xp: cachedRaya.gwp2_xp,
          gwp3_xp: cachedRaya.gwp3_xp,
          total_3gw_xp: cachedRaya.total_3gw_xp
        });
      }
      
      console.log('✅ Data caching complete!');
      
      // Debug: Check what's in the cache after setting
      console.log('🔍 Cache set complete. Checking preRenderedPlayersTable...');
      console.log('🔍 preRenderedPlayersTable length:', data.players.length);
      if (data.players && data.players.length > 0) {
        const cachedPlayer = data.players[0];
        console.log('🔍 First cached player:', {
          id: cachedPlayer.id,
          name: cachedPlayer.web_name,
          next3Fixtures: cachedPlayer.next3Fixtures,
          hasNext3Fixtures: !!cachedPlayer.next3Fixtures,
          next3FixturesLength: cachedPlayer.next3Fixtures?.length || 0
        });
      }
      
      updateProgress(9, 'Complete!', 100);
      
      // Signal that loading is complete
      setIsLoading(false);
      
    } catch (err) {
      console.error('❌ Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  };

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          ❌ Error Loading App
        </Text>
        <Text style={[styles.errorDetails, { color: theme.colors.textSecondary }]}>
          {error}
        </Text>
        <Text style={[styles.retryText, { color: theme.colors.textSecondary }]}>
          Please restart the app to try again
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          FPL Optimizer
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Loading your fantasy football data...
        </Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.stepInfo}>
            <Text style={[styles.stepText, { color: theme.colors.textSecondary }]}>
              Step {currentStep} of {totalSteps}
            </Text>
          </View>
          
          <View style={[styles.progressBar, { backgroundColor: theme.colors.surface }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: theme.colors.primary,
                  width: `${progressPercentage}%`
                }
              ]} 
            />
          </View>
          
          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
              {progressPercentage}%
            </Text>
            {playerProgress > 0 && totalPlayers > 0 && (
              <Text style={[styles.playerProgressText, { color: theme.colors.textSecondary }]}>
                Players: {playerProgress}/{totalPlayers}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.stepsBreakdown}>
          <Text style={[styles.stepsTitle, { color: theme.colors.textSecondary }]}>
            Loading Steps:
          </Text>
          {[
            'Fetching player data',
            'Fetching team data', 
            'Fetching fixture data',
            'Getting current gameweek',
            'Calculating expected points',
            'Sorting players',
            'Pre-calculating display data',
            'Pre-loading player photos',
            'Complete!'
          ].map((stepText, index) => (
            <View key={index} style={styles.stepRow}>
              <Text style={[
                styles.stepItem, 
                { 
                  color: index < currentStep ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: index < currentStep ? '600' : '400'
                }
              ]}>
                {index < currentStep ? '✓' : '○'} {stepText}
              </Text>
            </View>
          ))}
        </View>
        
        <Text style={[styles.statusText, { color: theme.colors.textSecondary }]}>
          {progress}
        </Text>
        
        <ActivityIndicator 
          size="large" 
          color={theme.colors.primary} 
          style={styles.spinner}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    textAlign: 'center',
    lineHeight: 24,
  },
  progressContainer: {
    width: '100%',
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center',
  },
  spinner: {
    marginTop: 16,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  stepInfo: {
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  playerProgressText: {
    fontSize: 14,
  },
  stepsBreakdown: {
    width: '100%',
    marginTop: 24,
    paddingHorizontal: 10,
  },
  stepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'left',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepItem: {
    fontSize: 14,
  },
});

export default LoadingScreen;
