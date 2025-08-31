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
      
      // Reduce noisy logs during loading
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
      
      // Targeted log for Ekitiké only
      try {
        const ek = data.players.find((p: any) => p.id === 661 || p.web_name === 'Ekitiké' || p.web_name === 'Ekitike');
        if (ek) {
          console.log('🔎 Ekitiké cache snapshot:', {
            id: ek.id,
            web_name: ek.web_name,
            baselineHistoryLength: ek.baselineHistoryLength,
            effectiveHistoryLength: (ek as any).effectiveHistoryLength,
            baselineDataSample: (ek as any).baselineDataSample ? ((ek as any).baselineDataSample.slice ? (ek as any).baselineDataSample.slice(0, 2) : (ek as any).baselineDataSample) : undefined,
          });
        }
      } catch {}
      
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
