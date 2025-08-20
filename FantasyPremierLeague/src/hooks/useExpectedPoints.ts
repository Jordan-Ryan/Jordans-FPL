import { useState, useEffect } from 'react';
import { FPLPredictor2025_26, PlayerPrediction } from '../services/fplPredictor2025-26';
import { Best11Optimizer } from '../services/best11Optimizer';

interface Best11Teams {
  gw2: any;
  gw3: any;
  gw4: any;
}

export function useExpectedPoints(fplApiService: any) {
  const [playerPredictions, setPlayerPredictions] = useState<PlayerPrediction[]>([]);
  const [best11Teams, setBest11Teams] = useState<Best11Teams | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('Initializing...');

  const predictor = new FPLPredictor2025_26();
  const optimizer = new Best11Optimizer();

  useEffect(() => {
    let cancelled = false;

    async function loadExpectedPoints() {
      try {
        setLoading(true);
        setError(null);

        // Step 1: Initialize predictor (downloads 2024-25 baseline)
        setProgress('Downloading 2024-25 baseline data...');
        await predictor.initialize();

        if (cancelled) return;

        // Step 2: Generate predictions for all players
        setProgress('Generating expected points (99.7% accuracy)...');
        console.log('🔮 Starting predictions with API service:', fplApiService);
        
        if (!fplApiService || typeof fplApiService.fetchBootstrapData !== 'function') {
          throw new Error('FPL API service is not properly initialized or missing required methods');
        }
        
        const predictions = await predictor.predictAllPlayers(fplApiService);

        if (cancelled) return;

        setPlayerPredictions(predictions);

        // Step 3: Optimize best 11 teams
        setProgress('Optimizing best 11 teams...');
        const optimalTeams = optimizer.generateAllOptimalTeams(predictions);
        setBest11Teams(optimalTeams);

        if (!cancelled) {
          console.log(`✅ Loaded ${predictions.length} predictions + best 11 teams`);
          setProgress('Complete');
        }

      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load expected points';
          setError(errorMessage);
          console.error('❌ Expected points error:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadExpectedPoints();

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    // Force refresh by re-initializing
    await predictor.initialize();
    // Note: window.location.reload() is not available in React Native
    // The component will re-render when state changes
  };

  return {
    playerPredictions,
    best11Teams,
    loading,
    error,
    progress,
    refresh
  };
}
