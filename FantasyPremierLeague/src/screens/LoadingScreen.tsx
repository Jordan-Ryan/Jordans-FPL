import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { fplApiService } from '../services/fplApi';
import { FPLPredictor2025_26 } from '../services/fplPredictor2025-26';
import { Best11Optimizer } from '../services/best11Optimizer';
import { OptimalTeamBuilder } from '../services/optimalTeamBuilder';

interface LoadingScreenProps {
  onComplete: () => void;
}

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const theme = useTheme();
  const { setCachedData, setIsLoading } = useData();
  const [progress, setProgress] = useState('Initializing...');
  const [progressPercentage, setProgressPercentage] = useState(0);



  // Merge predictions with original FPL data to get both expected points and FPL stats
  const mergePredictionsWithFPLData = (predictions: any[], fplPlayers: any[]) => {
    console.log('🔍 LoadingScreen: Merging data:', {
      predictionsLength: predictions.length,
      fplPlayersLength: fplPlayers.length,
      firstPrediction: predictions[0],
      firstFPLPlayer: fplPlayers[0],
      predictionKeys: predictions[0] ? Object.keys(predictions[0]) : [],
      fplPlayerKeys: fplPlayers[0] ? Object.keys(fplPlayers[0]) : []
    });

    const mergedData = predictions.map(prediction => {
      // Try multiple ways to match players
      let fplPlayer = fplPlayers.find(p => p.id === prediction.player_id);
      
      if (!fplPlayer) {
        // Try matching by name as fallback
        fplPlayer = fplPlayers.find(p => 
          p.web_name?.toLowerCase() === prediction.name?.toLowerCase() ||
          p.first_name?.toLowerCase() === prediction.name?.toLowerCase() ||
          p.second_name?.toLowerCase() === prediction.name?.toLowerCase()
        );
      }
      
      if (!fplPlayer) {
        console.warn(`⚠️ No FPL player found for prediction: ${prediction.name || prediction.player_id}`);
        // Return a minimal merged object with prediction data
        return {
          id: prediction.player_id,
          web_name: prediction.name,
          element_type: prediction.position === 'Goalkeeper' ? 1 : 
                       prediction.position === 'Defender' ? 2 : 
                       prediction.position === 'Midfielder' ? 3 : 4,
          now_cost: prediction.price ? prediction.price * 10 : 0,
          team: prediction.team,
          form: '0.0',
          selected_by_percent: '0.0',
          event_points: 0,
          total_points: 0,
          ict_index: '0.0',
          transfers_in: 0,
          transfers_out: 0,
          dreamteam_count: 0,
          ...prediction // Include all prediction fields
        };
      }

      // Merge FPL data with prediction data (prediction data takes priority for expected points)
      return {
        ...fplPlayer, // All original FPL fields (form, selected_by_percent, total_points, etc.)
        ...prediction, // Expected points and other prediction fields
        // Ensure we keep the FPL ID format for compatibility
        id: fplPlayer.id,
        web_name: fplPlayer.web_name,
        element_type: fplPlayer.element_type,
        now_cost: fplPlayer.now_cost,
        team: fplPlayer.team
      };
    });

    console.log('🔍 LoadingScreen: Merged data sample:', {
      mergedLength: mergedData.length,
      firstMerged: mergedData[0],
      hasFPLFields: !!mergedData[0]?.form,
      hasExpectedPoints: !!mergedData[0]?.gw2_xp,
      mergedKeys: mergedData[0] ? Object.keys(mergedData[0]) : []
    });

    return mergedData;
  };

  // Pre-process all player data for instant Players tab loading
  const preprocessPlayerData = (playerData: any[]) => {
    
    // Pre-sort by different criteria (now using merged data which has both FPL and prediction fields)
    const sortedByTotalXP = [...playerData].sort((a, b) => (b.total_3gw_xp || 0) - (a.total_3gw_xp || 0));
    const sortedByName = [...playerData].sort((a, b) => {
      const nameA = a.web_name || a.name || '';
      const nameB = b.web_name || b.name || '';
      return nameA.localeCompare(nameB);
    });
    const sortedByForm = [...playerData].sort((a, b) => (parseFloat(b.form || '0') || 0) - (parseFloat(a.form || '0') || 0));
    const sortedByPrice = [...playerData].sort((a, b) => (a.now_cost || (a.price ? a.price * 10 : 0) || 0) - (b.now_cost || (b.price ? b.price * 10 : 0) || 0));
    const sortedByPoints = [...playerData].sort((a, b) => (b.total_points || 0) - (a.total_points || 0));
    
    // Pre-filter by position (using both FPL element_type and prediction position)
    const goalkeepers = playerData.filter(p => p.element_type === 1 || p.position === 'Goalkeeper');
    const defenders = playerData.filter(p => p.element_type === 2 || p.position === 'Defender');
    const midfielders = playerData.filter(p => p.element_type === 3 || p.position === 'Midfielder');
    const forwards = playerData.filter(p => p.element_type === 4 || p.position === 'Forward');
    
    // Pre-filter by club (using team ID for consistency)
    const playersByClub = playerData.reduce((acc, player) => {
      const clubId = player.team;
      if (!acc[clubId]) acc[clubId] = [];
      acc[clubId].push(player);
      return acc;
    }, {} as { [key: number]: any[] });
    
    // Pre-calculate price ranges (using FPL now_cost format)
    const priceRanges = {
      '4.0-5.0': playerData.filter(p => {
        const cost = p.now_cost || (p.price ? p.price * 10 : 0);
        return cost >= 40 && cost <= 50;
      }),
      '5.5-6.5': playerData.filter(p => {
        const cost = p.now_cost || (p.price ? p.price * 10 : 0);
        return cost >= 55 && cost <= 65;
      }),
      '7.0-8.0': playerData.filter(p => {
        const cost = p.now_cost || (p.price ? p.price * 10 : 0);
        return cost >= 70 && cost <= 80;
      }),
      '8.5-9.5': playerData.filter(p => {
        const cost = p.now_cost || (p.price ? p.price * 10 : 0);
        return cost >= 85 && cost <= 95;
      }),
      '10.0+': playerData.filter(p => {
        const cost = p.now_cost || (p.price ? p.price * 10 : 0);
        return cost >= 100;
      }),
    };

    // Pre-calculate common filter combinations for instant loading
    const preFilteredData = {
      // Default view (no filters, sorted by XP)
      default: sortedByTotalXP,
      
      // Position-based views
      positionFiltered: {
        goalkeepers: sortedByTotalXP.filter(p => p.element_type === 1 || p.position === 'Goalkeeper'),
        defenders: sortedByTotalXP.filter(p => p.element_type === 2 || p.position === 'Defender'),
        midfielders: sortedByTotalXP.filter(p => p.element_type === 3 || p.position === 'Midfielder'),
        forwards: sortedByTotalXP.filter(p => p.element_type === 4 || p.position === 'Forward'),
      },
      
      // Price-based views (sorted by XP within each range)
      priceFiltered: {
        '4.0-5.0': sortedByTotalXP.filter(p => {
          const cost = p.now_cost || (p.price ? p.price * 10 : 0);
          return cost >= 40 && cost <= 50;
        }),
        '5.5-6.5': sortedByTotalXP.filter(p => {
          const cost = p.now_cost || (p.price ? p.price * 10 : 0);
          return cost >= 55 && cost <= 65;
        }),
        '7.0-8.0': sortedByTotalXP.filter(p => {
          const cost = p.now_cost || (p.price ? p.price * 10 : 0);
          return cost >= 70 && cost <= 80;
        }),
        '8.5-9.5': sortedByTotalXP.filter(p => {
          const cost = p.now_cost || (p.price ? p.price * 10 : 0);
          return cost >= 85 && cost <= 95;
        }),
        '10.0+': sortedByTotalXP.filter(p => {
          const cost = p.now_cost || (p.price ? p.price * 10 : 0);
          return cost >= 100;
        }),
      }
    };
    
    return {
      allPlayers: playerData,
      sorted: {
        byTotalXP: sortedByTotalXP,
        byName: sortedByName,
        byForm: sortedByForm,
        byPrice: sortedByPrice,
        byPoints: sortedByPoints,
      },
      filtered: {
        byPosition: {
          goalkeepers,
          defenders,
          midfielders,
          forwards,
        },
        byClub: playersByClub,
        byPrice: priceRanges,
      },
      preFiltered: preFilteredData, // New pre-filtered data for instant loading
      metadata: {
        totalPlayers: playerData.length,
        positions: {
          goalkeepers: goalkeepers.length,
          defenders: defenders.length,
          midfielders: midfielders.length,
          forwards: forwards.length,
        },
        priceRanges: Object.fromEntries(
          Object.entries(priceRanges).map(([range, players]) => [range, players.length])
        ),
      }
    };
  };

  useEffect(() => {
    initializeApp();
  }, []);



  const initializeApp = async () => {
    try {
      setIsLoading(true);
      setProgress('Loading FPL data...');
      setProgressPercentage(10);

      // Step 1: Load basic FPL data
      const currentGameweek = await fplApiService.getCurrentGameweek();
      const allPlayers = await fplApiService.fetchAllPlayers();
      const allTeams = await fplApiService.fetchAllTeams();
      const fixturesData = await fplApiService.fetchFixturesData();

      setProgress('Initializing predictor...');
      setProgressPercentage(20);

      // Step 2: Initialize predictor
      const predictor = new FPLPredictor2025_26();

      setProgress('Generating player predictions...');
      setProgressPercentage(40);

      // Step 3: Generate player predictions with progress updates
      console.log('🔍 LoadingScreen: Starting prediction generation...');
      const predictions = await predictor.predictAllPlayers(fplApiService, (current, total) => {
        const percentage = 40 + (current / total) * 50; // 40% to 90%
        setProgressPercentage(Math.round(percentage));
        setProgress(`Generating predictions... ${current}/${total} players`);
        console.log(`🔍 LoadingScreen: Prediction progress: ${current}/${total} (${Math.round(percentage)}%)`);
      });

      console.log('🔍 LoadingScreen: Predictions generated:', {
        predictionsLength: predictions?.length,
        firstPrediction: predictions?.[0],
        hasExpectedPoints: predictions?.[0]?.gw2_xp !== undefined,
        predictionsType: Array.isArray(predictions) ? 'Array' : typeof predictions,
        firstPredictionKeys: predictions?.[0] ? Object.keys(predictions[0]) : []
      });

      // Validate that we have predictions with expected points
      if (!predictions || predictions.length === 0) {
        throw new Error('No predictions generated - prediction system failed');
      }

      if (!predictions[0]?.gw2_xp && !predictions[0]?.gw3_xp && !predictions[0]?.gw4_xp) {
        throw new Error('Predictions generated but missing expected points - data structure issue');
      }

      setProgress('Building optimal teams...');
      setProgressPercentage(85);

      // Step 4: Generate Optimal Teams
      const teamBuilder = new OptimalTeamBuilder();
      const optimalTeams = teamBuilder.generateAllOptimalTeams(predictions);

      setProgress('Building Best 11 teams...');
      setProgressPercentage(90);

      // Step 5: Generate Best 11 teams
      const best11Optimizer = new Best11Optimizer();
      const best11Teams = await best11Optimizer.generateAllOptimalTeams(predictions, currentGameweek.id);
      
      console.log('🔍 LoadingScreen: Best 11 teams generated:', {
        best11TeamsLength: best11Teams ? Object.keys(best11Teams).length : 0,
        best11TeamsKeys: best11Teams ? Object.keys(best11Teams) : [],
        firstTeam: best11Teams ? Object.values(best11Teams)[0] : null
      });

      setProgress('Pre-processing player data...');
      setProgressPercentage(95);

      // Step 6: Merge predictions with original FPL data and pre-process
      setProgress('Merging player data...');
      const mergedPlayerData = mergePredictionsWithFPLData(predictions, allPlayers);
      const processedPlayerData = preprocessPlayerData(mergedPlayerData);
      
      console.log('🔍 LoadingScreen: Pre-processed player data:', {
        totalPlayers: processedPlayerData.metadata?.totalPlayers,
        allPlayersLength: processedPlayerData.allPlayers?.length,
        sortedLength: processedPlayerData.sorted?.byTotalXP?.length,
        firstPlayer: processedPlayerData.allPlayers?.[0]
      });

      setProgress('Finalizing...');
      setProgressPercentage(100);

      // Step 7: Set all data
      const appData = {
        currentGameweek,
        fplPlayers: allPlayers,
        teams: allTeams,
        fixtures: fixturesData,
        playerPredictions: predictions,
        best11Teams,
        optimalTeams,
        playersModel: mergedPlayerData, // Use merged data instead of just predictions
        processedPlayerData,
        timestamp: Date.now()
      };
      
      console.log('🔍 LoadingScreen: Setting app data:', {
        hasProcessedPlayerData: !!appData.processedPlayerData,
        processedPlayerDataKeys: Object.keys(appData.processedPlayerData || {}),
        predictionsLength: appData.playerPredictions?.length,
        fplPlayersLength: appData.fplPlayers?.length
      });

      setCachedData(appData);
      setIsLoading(false);
      
      // Small delay to show completion
      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (error) {
      console.error('❌ Error initializing app:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        errorType: typeof error
      });
      setProgress('Failed to load app data. Please restart the app.');
    }
  };



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
                  width: `${progressPercentage}%`,
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


});
