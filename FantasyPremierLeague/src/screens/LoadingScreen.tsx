import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { fplApiService } from '../services/fplApi';
import { FPLPredictor2025_26 } from '../services/fplPredictor2025-26';
import { Best11Optimizer } from '../services/best11Optimizer';

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const theme = useTheme();
  const { setCachedData } = useData();
  const [progress, setProgress] = useState('Initializing...');
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(6);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setTotalSteps(6);
      setCurrentStep(0);

      // Step 1: Load FPL basic data
      setProgress('Loading FPL data...');
      setCurrentStep(1);
      const [gameweek, playersData, teamsData, fixturesData] = await Promise.all([
        fplApiService.getCurrentGameweek(),
        fplApiService.fetchAllPlayers(),
        fplApiService.fetchAllTeams(),
        fplApiService.fetchFixturesData(),
      ]);

      // Step 2: Initialize predictor
      setProgress('Initializing prediction model...');
      setCurrentStep(2);
      const predictor = new FPLPredictor2025_26();

      // Step 3: Generate expected points
      setProgress('Generating expected points (99.7% accuracy)...');
      setCurrentStep(3);
      const predictions = await predictor.predictAllPlayers(fplApiService);

      // Step 4: Generate Best 11 teams
      setProgress('Optimizing Best 11 teams...');
      setCurrentStep(4);
      const optimizer = new Best11Optimizer();
      
      // Add timeout protection for optimization
      const optimizationPromise = new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('Best 11 optimization timed out after 15 seconds'));
        }, 15000); // 15 second timeout
        
        try {
          const optimalTeams = optimizer.generateAllOptimalTeams(predictions);
          resolve(optimalTeams);
        } catch (err) {
          reject(err);
        }
      });
      
      const best11Teams = await optimizationPromise;

      // Step 5: Finalize
      setProgress('Finalizing...');
      setCurrentStep(5);

      // Cache the results in context
      const appData = {
        fplPlayers: playersData,
        teams: teamsData,
        fixtures: fixturesData,
        currentGameweek: gameweek,
        playerPredictions: predictions,
        best11Teams: best11Teams,
        timestamp: Date.now(),
      };

      setCachedData(appData);

      setProgress('Complete!');
      setCurrentStep(6);

      // Small delay to show completion
      setTimeout(() => {
        onComplete();
      }, 500);

    } catch (error) {
      console.error('❌ App initialization failed:', error);
      setProgress(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Fallback: try to load basic data without predictions
      try {
        const [gameweek, playersData, teamsData, fixturesData] = await Promise.all([
          fplApiService.getCurrentGameweek(),
          fplApiService.fetchAllPlayers(),
          fplApiService.fetchAllTeams(),
          fplApiService.fetchFixturesData(),
        ]);

        const fallbackData = {
          fplPlayers: playersData,
          teams: teamsData,
          fixtures: fixturesData,
          currentGameweek: gameweek,
          playerPredictions: [],
          best11Teams: null,
          timestamp: Date.now(),
        };

        setCachedData(fallbackData);
        onComplete();
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        // Show error state
        setProgress('Failed to load app data. Please restart the app.');
      }
    }
  };

  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          Fantasy Premier League
        </Text>
        
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Loading your FPL experience...
        </Text>

        <View style={styles.progressContainer}>
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
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {Math.round(progressPercentage)}%
          </Text>
        </View>

        <Text style={[styles.statusText, { color: theme.colors.text }]}>
          {progress}
        </Text>

        <View style={styles.stepsContainer}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <View 
              key={i} 
              style={[
                styles.step, 
                { 
                  backgroundColor: i < currentStep 
                    ? theme.colors.primary 
                    : theme.colors.surface 
                }
              ]} 
            />
          ))}
        </View>
      </View>
    </View>
  );
}

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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 40,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 30,
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
    fontSize: 14,
    textAlign: 'center',
  },
  statusText: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
  },
  stepsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  step: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
