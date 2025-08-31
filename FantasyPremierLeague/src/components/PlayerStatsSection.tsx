import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Modal,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useData } from '../context/DataContext';
import { FPLPlayer, FPLTeam } from '../types';
import { fplApiService } from '../services/fplApi';
import PlayerFixturesSection from '../screens/PlayerFixturesSection';
import PlayerHeaderSection from '../screens/PlayerHeaderSection';
import { FPLPointsCalculator, FPLMatchStats } from '../utils/fplPointsCalculator';
// Lightweight baseline access for rolling calculations in XP tab
// Same dataset used by the predictor
// eslint-disable-next-line @typescript-eslint/no-var-requires
const baselineData2024_25 = require('../data/2024-25-baseline-processed.json');

interface PlayerStatsSectionProps {
  fplPlayer: FPLPlayer;
}

const PlayerStatsSection: React.FC<PlayerStatsSectionProps> = ({ fplPlayer }) => {
  const theme = useTheme();
  const { cachedData } = useData();
  const [activeTab, setActiveTab] = useState<'matches' | 'stats' | 'history' | 'xp'>('matches');
  const [matchesSubTab, setMatchesSubTab] = useState<'results' | 'fixtures'>('results');
  const [teams, setTeams] = useState<FPLTeam[]>([]);
  const [playerHistory, setPlayerHistory] = useState<any[]>([]);
  const [playerSeasonHistory, setPlayerSeasonHistory] = useState<any[]>([]);
  const [currentGameweek, setCurrentGameweek] = useState<number>(1);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [playerRankings, setPlayerRankings] = useState<{
    pointsRank: string;
    formRank: string;
    ownershipRank: string;
    valueRank: string;
  } | null>(null);
  const [showDebug, setShowDebug] = useState<boolean>(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const teamsData = await fplApiService.fetchAllTeams();
        setTeams(teamsData);
        
        const historyData = await fplApiService.getPlayerHistory(fplPlayer.id);
        setPlayerHistory(historyData);
        
        const seasonHistoryData = await fplApiService.getPlayerSeasonHistory(fplPlayer.id);
        setPlayerSeasonHistory(seasonHistoryData);
        
        const gameweekData = await fplApiService.getCurrentGameweek();
        setCurrentGameweek(gameweekData.id);
        
        // Get player rankings
        const rankingsData = await fplApiService.getPlayerRankings(fplPlayer.id);
        console.log('Player rankings fetched:', rankingsData);
        setPlayerRankings(rankingsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [fplPlayer.id]);

  // Debug logging when XP tab is opened
  useEffect(() => {
    if (activeTab !== 'xp') return;
    console.log('🔎 XP DEBUG: tab_open', {
      playerId: (fplPlayer as any).id,
      web_name: (fplPlayer as any).web_name,
      hasCachedData: !!cachedData,
      playerHistoryLen: playerHistory?.length || 0
    });

    try {
      // Global zero-baseline snapshot: total and excluding promoted (heuristic)
      try {
        const allPlayers: any[] = cachedData?.fplPlayers || [];
        const byTeam: Record<number, { total: number; withBaseline: number }> = {} as any;
        (cachedData?.players || []).forEach((p: any) => {
          const teamId = p.team;
          if (!byTeam[teamId]) byTeam[teamId] = { total: 0, withBaseline: 0 };
          byTeam[teamId].total += 1;
          if ((p.baselineHistoryLength || 0) > 0) byTeam[teamId].withBaseline += 1;
        });
        const promoted = new Set<number>();
        Object.entries(byTeam).forEach(([tid, s]) => {
          const t = Number(tid);
          const cov = s.total ? s.withBaseline / s.total : 0;
          if (s.total >= 15 && s.withBaseline <= 3 && cov <= 0.15) promoted.add(t);
        });
        const zeroAll = (cachedData?.players || []).filter((p: any) => (p.baselineHistoryLength || 0) === 0).length;
        const zeroExProm = (cachedData?.players || []).filter((p: any) => (p.baselineHistoryLength || 0) === 0 && !promoted.has(p.team)).length;
        console.log('🔎 ZERO-BASELINE SNAPSHOT:', { totalZero: zeroAll, excludingPromoted: zeroExProm, promotedTeams: Array.from(promoted.values()) });
      } catch {}

      const apiPlayer = (cachedData?.fplPlayers || []).find((p: any) => p.id === (fplPlayer as any).id);
      const firstName = apiPlayer?.first_name || (fplPlayer as any).first_name || '';
      const secondName = apiPlayer?.second_name || (fplPlayer as any).second_name || '';
      const key1 = `${firstName}_${secondName}`;
      const key2 = `${secondName}_${firstName}`;
      const normalize = (s: string) => s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9_\s]/g, '');
      const normalizedWeb = normalize((fplPlayer as any).web_name || apiPlayer?.web_name || '');
      const normalizedWebUnderscore = normalizedWeb.replace(/\s+/g, '_');

      const baselinePlayers: Record<string, any> | undefined = baselineData2024_25?.players;
      let matchedKey: string | null = null;
      let baselineHistory: any[] = [];
      if (baselinePlayers) {
        if (baselinePlayers[key1]) { matchedKey = key1; baselineHistory = baselinePlayers[key1]?.season_history || []; }
        else if (baselinePlayers[key2]) { matchedKey = key2; baselineHistory = baselinePlayers[key2]?.season_history || []; }
        else {
          const allKeys = Object.keys(baselinePlayers);
          const firstN = normalize(firstName);
          const secondN = normalize(secondName);
          const firstTokens = firstN.split(/\s+/).filter(Boolean);
          const lastFirstToken = firstTokens.length ? firstTokens[firstTokens.length - 1] : firstN;
          const byBoth = allKeys.find(k => {
            const kn = normalize(k);
            return kn.includes(secondN) && (kn.includes(firstN) || kn.includes(lastFirstToken));
          });
          if (byBoth) { matchedKey = byBoth; baselineHistory = baselinePlayers[byBoth]?.season_history || []; }
          else {
            const byWeb = allKeys.find(k => {
              const kn = normalize(k);
              return kn.includes(normalizedWeb) || kn.includes(normalizedWebUnderscore);
            });
            if (byWeb) { matchedKey = byWeb; baselineHistory = baselinePlayers[byWeb]?.season_history || []; }
            else {
              // Extra accent-insensitive fallback: try stripping all diacritics from provided names again and compare tokens
              const tokens = [firstN, secondN, lastFirstToken].filter(Boolean);
              const best = allKeys.find(k => {
                const kn = normalize(k);
                return tokens.every(tok => kn.includes(tok));
              });
              if (best) { matchedKey = best; baselineHistory = baselinePlayers[best]?.season_history || []; }
            }
          }
        }
      }

      // Get player classification and baseline data from predictor (use same logic as prediction)
      const { FPLPredictor2025_26 } = require('../services/fplPredictor2025-26');
      const predictor = new FPLPredictor2025_26();
      const predictorBaselineData = predictor.findPlayerBaseline('', fplPlayer);
      const predictorBaselineHistory = predictorBaselineData?.season_history || [];

      const last5Baseline = (predictorBaselineHistory || []).slice(-5).map((g: any) => g.minutes ?? 0);
      const last5Current = (playerHistory || []).slice(-5).map((g: any) => g.minutes ?? 0);
      const combined = [
        ...(predictorBaselineHistory || []),
        ...(playerHistory || [])
      ];
      combined.sort((a: any, b: any) => (a.round || 0) - (b.round || 0));
      const last5Combined = combined.slice(-5).map((g: any) => ({ gw: g.round, mins: g.minutes, pts: g.total_points }));

      const p: any = fplPlayer as any;
      const gw1 = Number(p.gwp1_xp ?? 0);
      const gw2 = Number(p.gwp2_xp ?? 0);
      const gw3 = Number(p.gwp3_xp ?? 0);
      const fixtures = Array.isArray(p.fixtures) ? p.fixtures.slice(0, 3) : [];

      // Get player classification using predictor's baseline data
      const classification = predictor.classifyPlayer(p, {}, predictorBaselineData);

      // Debug logging for Ekitike only (moved to main render function to avoid scope issues)
    } catch (err) {
      console.warn('XP DEBUG error:', err);
    }
  }, [activeTab, cachedData, fplPlayer, playerHistory]);

  const handleMatchDetails = (match: any) => {
    setSelectedMatch(match);
    setShowMatchModal(true);
  };

  const renderMatchesTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.subTabContainer}>
        <TouchableOpacity
          style={[
            styles.subTabButton,
            matchesSubTab === 'results' && { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => setMatchesSubTab('results')}
        >
          <Text style={[
            styles.subTabText,
            { color: matchesSubTab === 'results' ? 'white' : theme.colors.textSecondary }
          ]}>
            Results
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.subTabButton,
            matchesSubTab === 'fixtures' && { backgroundColor: theme.colors.primary }
          ]}
          onPress={() => setMatchesSubTab('fixtures')}
        >
          <Text style={[
            styles.subTabText,
            { color: matchesSubTab === 'fixtures' ? 'white' : theme.colors.textSecondary }
          ]}>
            Fixtures
          </Text>
        </TouchableOpacity>
      </View>

      {matchesSubTab === 'results' && (
        <View>
          <View style={styles.matchHeader}>
            <Text style={[styles.matchHeaderTextExtraSmall, { color: theme.colors.textSecondary }]}>GW</Text>
            <Text style={[styles.matchHeaderTextLarge, { color: theme.colors.textSecondary }]}>Opponent</Text>
            <Text style={[styles.matchHeaderTextMedium, { color: theme.colors.textSecondary }]}>Results</Text>
            <Text style={[styles.matchHeaderTextMedium, { color: theme.colors.textSecondary }]}>Points</Text>
            <Text style={[styles.matchHeaderTextMore, { color: theme.colors.textSecondary }]}>More</Text>
          </View>

          {playerHistory.slice(0, 5).map((match, index) => {
            const opponentTeam = teams.find(t => t.id === match.opponent_team);
            const isHome = match.was_home;
            const result = match.team_h_score !== null && match.team_a_score !== null 
              ? `${match.team_h_score}-${match.team_a_score}` 
              : 'TBD';
            
            return (
              <View key={index} style={styles.matchRow}>
                <View style={styles.matchCellExtraSmall}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>{match.round}</Text>
                </View>
                <View style={styles.matchCellLarge}>
                  <View style={styles.opponentInfo}>
                    {opponentTeam?.code && (
                      <Image 
                        source={{ uri: fplApiService.getTeamBadgeUrl(opponentTeam.code) }}
                        style={styles.teamBadgeImage}
                      />
                    )}
                    <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                      {opponentTeam?.short_name || 'Unknown'} {isHome ? '(H)' : '(A)'}
                    </Text>
                  </View>
                </View>
                <View style={styles.matchCellMedium}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>{result}</Text>
                </View>
                <View style={styles.matchCellMedium}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>{match.total_points} pts</Text>
                </View>
                <View style={styles.matchCellMore}>
                  <TouchableOpacity 
                    style={styles.moreButton}
                    onPress={() => handleMatchDetails(match)}
                  >
                    <Text style={styles.moreButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {matchesSubTab === 'fixtures' && (
        <PlayerFixturesSection fplPlayer={fplPlayer} />
      )}
    </View>
  );

  const renderStatsTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>FPL Stats</Text>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>{fplPlayer.total_points}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Total Points</Text>
          <Text style={[styles.rankText, { color: theme.colors.textSecondary }]}>
            {playerRankings ? playerRankings.pointsRank : 'Loading...'}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>{parseFloat(fplPlayer.points_per_game).toFixed(1)}</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Points per Game</Text>
          <Text style={[styles.rankText, { color: theme.colors.textSecondary }]}>
            {playerRankings ? playerRankings.pointsRank : 'Loading...'}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>£{(fplPlayer.now_cost / 10).toFixed(1)}m</Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Current Price</Text>
          <Text style={[styles.rankText, { color: theme.colors.textSecondary }]}>
            {playerRankings ? playerRankings.valueRank : 'Loading...'}
          </Text>
        </View>
      </View>
      
      {playerRankings && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>Position Rankings</Text>
          <View style={styles.rankingsGrid}>
            <View style={styles.rankingItem}>
              <Text style={[styles.rankingValue, { color: theme.colors.primary }]}>{fplPlayer.form}</Text>
              <Text style={[styles.rankingLabel, { color: theme.colors.textSecondary }]}>Form</Text>
              <Text style={[styles.rankText, { color: theme.colors.textSecondary }]}>
                {playerRankings.formRank}
              </Text>
            </View>
            <View style={styles.rankingItem}>
              <Text style={[styles.rankingValue, { color: theme.colors.primary }]}>{fplPlayer.selected_by_percent}%</Text>
              <Text style={[styles.rankingLabel, { color: theme.colors.textSecondary }]}>Selected By</Text>
              <Text style={[styles.rankText, { color: theme.colors.textSecondary }]}>
                {playerRankings.ownershipRank}
              </Text>
            </View>
            <View style={styles.rankingItem}>
              <Text style={[styles.rankingValue, { color: theme.colors.primary }]}>{fplPlayer.value_form}</Text>
              <Text style={[styles.rankingLabel, { color: theme.colors.textSecondary }]}>Value Form</Text>
              <Text style={[styles.rankText, { color: theme.colors.textSecondary }]}>
                {playerRankings.valueRank}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );

  const renderXpTab = () => {
    const p: any = fplPlayer as any;
    const gw1 = Number(p.gwp1_xp ?? 0);
    const gw2 = Number(p.gwp2_xp ?? 0);
    const gw3 = Number(p.gwp3_xp ?? 0);
    

    const total3 = Number(p.total_3gw_xp ?? (gw1 + gw2 + gw3));
    const total8 = typeof p.total_8gw_xp === 'number' ? Number(p.total_8gw_xp) : null;
    
    // Calculate points before penalty for display
    const gw1BeforePenalty = penaltyMultiplier !== 1.0 ? gw1 / penaltyMultiplier : gw1;
    const gw2BeforePenalty = penaltyMultiplier !== 1.0 ? gw2 / penaltyMultiplier : gw2;
    const gw3BeforePenalty = penaltyMultiplier !== 1.0 ? gw3 / penaltyMultiplier : gw3;
    // Strict baseline length (ignore any prefilled predictor field)
    const strictBaselineLen = (() => {
      try {
        const baselinePlayers: Record<string, any> | undefined = baselineData2024_25?.players;
        if (!baselinePlayers) return 0;
        const apiPlayer = cachedData?.fplPlayers?.find((pp: any) => pp.id === (fplPlayer as any).id);
        const firstName = apiPlayer?.first_name || (fplPlayer as any).first_name || '';
        const secondName = apiPlayer?.second_name || (fplPlayer as any).second_name || '';
        const key1 = `${firstName}_${secondName}`;
        const key2 = `${secondName}_${firstName}`;
        if (baselinePlayers[key1]) return (baselinePlayers[key1]?.season_history || []).length;
        if (baselinePlayers[key2]) return (baselinePlayers[key2]?.season_history || []).length;
        const webUnderscore = String((fplPlayer as any).web_name || '').replace(/\s+/g, '_');
        if (baselinePlayers[webUnderscore]) return (baselinePlayers[webUnderscore]?.season_history || []).length;
        const normalize = (s: string) => String(s || '')
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9_\s]/g, '');
        const allKeys = Object.keys(baselinePlayers);
        const exactNormKey = allKeys.find(k => normalize(k) === normalize(webUnderscore));
        if (exactNormKey) return (baselinePlayers[exactNormKey]?.season_history || []).length;
        const byId = Object.values(baselinePlayers).find((v: any) => v && Number(v.fpl_id) === Number((fplPlayer as any).id));
        if (byId) return ((byId as any).season_history || []).length;
        return 0;
      } catch {
        return 0;
      }
    })();
    // Get fresh baseline data from predictor
    let baselineGwCount = 0;
    let penaltyMultiplier = 1.0;
    
    try {
      const { FPLPredictor2025_26 } = require('../services/fplPredictor2025-26');
      const predictor = new FPLPredictor2025_26();
      
      if (predictor.isInitialized()) {
        const predictorBaselineData = predictor.findPlayerBaseline('', fplPlayer);
        const predictorBaselineHistory = predictorBaselineData?.season_history || [];
        baselineGwCount = predictorBaselineHistory?.length || 0;
        
        // Get classification for penalty multiplier
        const classification = predictor.classifyPlayer(p, {}, predictorBaselineData);
        penaltyMultiplier = classification.penaltyMultiplier;
      } else {
        console.warn('Predictor not initialized, using fallback values');
      }
    } catch (error) {
      console.warn('Error getting predictor data:', error);
    }
    
    // Debug logging for Ekitike only (in main render function where variables are in scope)
    if ((fplPlayer as any).web_name && (fplPlayer as any).web_name.includes('Ekit')) {
      console.log('🔍 EKITIKE XP DEBUG (main render):', {
        player: { id: (fplPlayer as any).id, web_name: (fplPlayer as any).web_name },
        baselineGwCount,
        penaltyMultiplier,
        gw1BeforePenalty,
        gw2BeforePenalty,
        gw3BeforePenalty
      });
    }
    const currentSeasonMinutes = Array.isArray(playerHistory)
      ? playerHistory.reduce((sum, m) => sum + (Number(m.minutes) || 0), 0)
      : 0;

    // Prefer pre-rendered next3Fixtures, else fallback to predictor fixtures
    const next3Fixtures = Array.isArray(p.next3Fixtures) && p.next3Fixtures.length > 0
      ? p.next3Fixtures.slice(0, 3)
      : Array.isArray(p.fixtures) && p.fixtures.length > 0
        ? p.fixtures.slice(0, 3).map((fx: any) => ({
            fixture: `${fx.opponent || 'TBD'} ${fx.home_away === 'H' ? '(H)' : '(A)'}\u00a0`,
            difficulty: (() => {
              const d = Number(fx.team_h_difficulty ?? fx.team_a_difficulty ?? fx.difficulty ?? 3);
              if (d <= 2) return 'Easy';
              if (d >= 4) return 'Hard';
              return 'Medium';
            })()
          }))
        : [];

    const getFdrColor = (difficulty: 'Easy' | 'Medium' | 'Hard') => {
      switch (difficulty) {
        case 'Easy': return '#10B981';
        case 'Hard': return '#EF4444';
        default: return '#F59E0B';
      }
    };

    // Helpers
    const diffToMultiplier = (d: number) => {
      if (d <= 1) return 1.25;
      if (d === 2) return 1.15;
      if (d === 3) return 1.0;
      if (d === 4) return 0.85;
      return 0.70; // 5
    };

    const posMultiplier = (() => {
      const mult = { 1: 1.08, 2: 1.23, 3: 1.20, 4: 1.23 } as any;
      return mult[fplPlayer.element_type] || 1.0;
    })();

    const computeRolling = () => {
      // Combine baseline + current season history (matches predictor logic)
      const baselinePlayers: Record<string, any> | undefined = baselineData2024_25?.players;
      let baselineHistory: any[] = [];
      if (baselinePlayers) {
        const apiPlayer = cachedData?.fplPlayers?.find((p: any) => p.id === (fplPlayer as any).id);
        const firstName = apiPlayer?.first_name || (fplPlayer as any).first_name || '';
        const secondName = apiPlayer?.second_name || (fplPlayer as any).second_name || '';

        const key1 = `${firstName}_${secondName}`;
        const key2 = `${secondName}_${firstName}`;
        // 1) Exact key
        if (baselinePlayers[key1]) {
          baselineHistory = baselinePlayers[key1]?.season_history || [];
        } else if (baselinePlayers[key2]) {
          baselineHistory = baselinePlayers[key2]?.season_history || [];
        } else {
          // 2) Normalized (remove accents/punctuation) search containing both names
          const normalize = (s: string) => s
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9_\s]/g, '');
          const firstN = normalize(firstName);
          const secondN = normalize(secondName);
          const allKeys = Object.keys(baselinePlayers);
          const matchKey = allKeys.find(k => {
            const kn = normalize(k);
            return kn.includes(firstN) && kn.includes(secondN);
          });
          if (matchKey) {
            baselineHistory = baselinePlayers[matchKey]?.season_history || [];
          } else {
            // 3) Fallback to web_name only
            const web = normalize((fplPlayer as any).web_name || apiPlayer?.web_name || '');
            const byWeb = allKeys.find(k => normalize(k).includes(web));
            if (byWeb) {
              baselineHistory = baselinePlayers[byWeb]?.season_history || [];
            } else {
              // 4) Final fallback: match by fpl_id in value
              try {
                const byId = Object.values(baselinePlayers).find((v: any) => v && Number(v.fpl_id) === Number((fplPlayer as any).id));
                if (byId) {
                  baselineHistory = (byId as any).season_history || [];
                }
              } catch {}
            }
          }
        }
      }

      const hist = [
        ...(Array.isArray(baselineHistory) ? baselineHistory : []),
        ...(Array.isArray(playerHistory) ? playerHistory : []),
      ];
      hist.sort((a, b) => (a.round || 0) - (b.round || 0));
      
      // Debug logging for Ekitike
      if ((fplPlayer as any).web_name?.includes('Ekit')) {
        console.log(`🔍 EKITIKE DATA DEBUG:`, {
          playerName: (fplPlayer as any).web_name,
          baselineHistoryLength: baselineHistory?.length || 0,
          playerHistoryLength: playerHistory?.length || 0,
          combinedHistLength: hist.length,
          playerHistory: playerHistory?.map(g => ({ gw: g.round, pts: g.total_points, mins: g.minutes })),
          baselineHistory: baselineHistory?.slice(0, 3).map(g => ({ gw: g.round, pts: g.total_points, mins: g.minutes }))
        });
      }
      
      const lastNAvg = (n: number, key: string) => {
        if (hist.length === 0) return 0;
        
        // Prioritize current season data over baseline data
        // Current season games have lower round numbers (1, 2, 3...)
        // Baseline games have higher round numbers (5, 6, 7... 38)
        const currentSeasonGames = hist.filter((g: any) => (g.round || 0) <= 3); // Current season
        const baselineGames = hist.filter((g: any) => (g.round || 0) > 3); // Previous season
        
        // Use current season games first, then fill with baseline if needed
        let slice: any[] = [];
        if (currentSeasonGames.length >= n) {
          // Use only current season games
          slice = currentSeasonGames.slice(-n);
        } else {
          // Use all current season games + some baseline games
          const neededFromBaseline = n - currentSeasonGames.length;
          slice = [
            ...currentSeasonGames,
            ...baselineGames.slice(-neededFromBaseline)
          ];
        }
        
        const vals = slice.map((g: any) => Number(g[key]) || 0);
        
        // Debug logging for rolling points calculation
        if (key === 'total_points' && (fplPlayer as any).web_name?.includes('Ekit')) {
          console.log(`🔍 EKITIKE ROLLING DEBUG (${n}GW):`, {
            histLength: hist.length,
            currentSeasonGames: currentSeasonGames.length,
            baselineGames: baselineGames.length,
            sliceLength: slice.length,
            slice: slice.map(g => ({ gw: g.round, pts: g.total_points, mins: g.minutes })),
            vals: vals,
            avg: vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
          });
        }
        
        return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      };
      return {
        roll3_points: lastNAvg(3, 'total_points'),
        roll5_points: lastNAvg(5, 'total_points'),
        roll8_points: lastNAvg(8, 'total_points'),
        roll15_points: lastNAvg(15, 'total_points'),
        roll5_minutes: lastNAvg(5, 'minutes'),
      };
    };

    const rolling = computeRolling();
    const combinedHistory: any[] = (() => {
      const baselinePlayers: Record<string, any> | undefined = baselineData2024_25?.players;
      let baselineHistory: any[] = [];
      if (baselinePlayers) {
        const key1 = `${(fplPlayer as any).first_name || ''}_${(fplPlayer as any).second_name || ''}`;
        const key2 = `${(fplPlayer as any).second_name || ''}_${(fplPlayer as any).first_name || ''}`;
        if (baselinePlayers[key1]) baselineHistory = baselinePlayers[key1]?.season_history || [];
        else if (baselinePlayers[key2]) baselineHistory = baselinePlayers[key2]?.season_history || [];
      }
      const hist = [
        ...(Array.isArray(baselineHistory) ? baselineHistory : []),
        ...(Array.isArray(playerHistory) ? playerHistory : []),
      ];
      hist.sort((a, b) => (a.round || 0) - (b.round || 0));
      return hist;
    })();
    const last5CombinedMinsStr = combinedHistory.slice(-5).map((g: any) => String(g.minutes ?? 0)).join(', ');
    const currentSeasonMinsStr = (Array.isArray(playerHistory) ? playerHistory.slice(-5) : []).map((g: any) => String(g.minutes ?? 0)).join(', ');

    // Build tiles data for the next 3 GWs
    const tiles = [gw1, gw2, gw3].map((xp, idx) => {
      // Determine opponent and difficulty if available
      let opponent = 'TBD';
      let homeAwayLabel = '';
      let difficultyLevel: 'Easy' | 'Medium' | 'Hard' = 'Medium';
      let difficultyNumeric = 3;
      if (Array.isArray(p.fixtures) && p.fixtures[idx]) {
        const fx = p.fixtures[idx];
        opponent = `${fx.opponent || 'TBD'} ${fx.home_away === 'H' ? '(H)' : '(A)'}\u00a0`;
        homeAwayLabel = fx.home_away === 'H' ? 'Home' : 'Away';
        const d = Number(fx.team_h_difficulty ?? fx.team_a_difficulty ?? fx.difficulty ?? 3);
        difficultyNumeric = isNaN(d) ? 3 : d;
        if (difficultyNumeric <= 2) difficultyLevel = 'Easy';
        else if (difficultyNumeric >= 4) difficultyLevel = 'Hard';
        else difficultyLevel = 'Medium';
      } else if (Array.isArray(p.next3Fixtures) && p.next3Fixtures[idx]) {
        const fx = p.next3Fixtures[idx];
        opponent = fx.fixture || 'TBD';
        difficultyLevel = (fx.difficulty as any) || 'Medium';
        difficultyNumeric = difficultyLevel === 'Easy' ? 2 : difficultyLevel === 'Hard' ? 4 : 3;
      }

      const homeAwayMultiplier = homeAwayLabel === 'Home' ? 1.12 : homeAwayLabel === 'Away' ? 0.93 : 1.0;
      const fdrMultiplier = diffToMultiplier(difficultyNumeric);

      return {
        label: `GW+${idx + 1}`,
        xp,
        opponent,
        difficultyLevel,
        homeAwayLabel,
        fdrMultiplier,
        posMultiplier,
        penaltyMultiplier: penaltyMultiplier,
        rolling,
      };
    });

    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Expected Points (XP)</Text>

        {/* Next 3 GW tiles */}
        <View style={styles.xpTilesContainer}>
          {tiles.map((t, idx) => (
            <View key={idx} style={styles.xpTile}>
              <Text style={[styles.xpTileHeader, { color: theme.colors.text }]}>{t.label}: {t.xp.toFixed(1)} pts</Text>
              <Text style={[styles.xpTileSub, { color: theme.colors.textSecondary }]}>{t.opponent}</Text>
              <View style={styles.xpTileDivider} />
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• Difficulty: {t.difficultyLevel} (×{t.fdrMultiplier.toFixed(2)})</Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• Venue: {t.homeAwayLabel || 'N/A'} {t.homeAwayLabel ? `(×${(t.homeAwayLabel === 'Home' ? 1.12 : 0.93).toFixed(2)})` : ''}</Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• Position Multiplier: ×{t.posMultiplier.toFixed(2)}</Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• Penalty Multiplier: ×{t.penaltyMultiplier.toFixed(2)}</Text>
              <View style={styles.xpTileDivider} />
              <Text style={[styles.xpTileSection, { color: theme.colors.text }]}>Rolling Inputs</Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• 3-GW Avg Pts: {rolling.roll3_points.toFixed(2)}</Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• 5-GW Avg Pts: {rolling.roll5_points.toFixed(2)}</Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• 8-GW Avg Pts: {rolling.roll8_points.toFixed(2)}</Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• 15-GW Avg Pts: {rolling.roll15_points.toFixed(2)}</Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• 5-GW Avg Minutes: {rolling.roll5_minutes.toFixed(0)} mins</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.rankingsGrid}>
          <View style={styles.rankingItem}>
            <Text style={[styles.rankingValue, { color: theme.colors.primary }]}>{total3.toFixed(1)}</Text>
            <Text style={[styles.rankingLabel, { color: theme.colors.textSecondary }]}>Total 3GW XP</Text>
          </View>
          {total8 !== null && (
            <View style={styles.rankingItem}>
              <Text style={[styles.rankingValue, { color: theme.colors.primary }]}>{total8.toFixed(1)}</Text>
              <Text style={[styles.rankingLabel, { color: theme.colors.textSecondary }]}>Total 8GW XP</Text>
            </View>
          )}
        </View>

        {/* Per-GW Fixtures and XP breakdown */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>Fixtures & XP Breakdown</Text>
        <View style={styles.matchHeader}>
          <Text style={[styles.matchHeaderTextExtraSmall, { color: theme.colors.textSecondary }]}>GW</Text>
          <Text style={[styles.matchHeaderTextLarge, { color: theme.colors.textSecondary }]}>Opponent</Text>
          <Text style={[styles.matchHeaderTextMedium, { color: theme.colors.textSecondary }]}>FDR</Text>
          <Text style={[styles.matchHeaderTextMedium, { color: theme.colors.textSecondary }]}>XP</Text>
        </View>
        {next3Fixtures.length > 0 ? (
          next3Fixtures.map((fx: any, idx: number) => (
            <View key={idx} style={styles.matchRow}>
              <View style={styles.matchCellExtraSmall}>
                <Text style={[styles.matchCellText, { color: theme.colors.text }]}>{idx + 1}</Text>
              </View>
              <View style={styles.matchCellLarge}>
                <Text style={[styles.matchCellText, { color: theme.colors.text }]}>{fx.fixture || 'TBD'}</Text>
              </View>
              <View style={styles.matchCellMedium}>
                <View style={{
                  backgroundColor: getFdrColor((fx.difficulty as 'Easy' | 'Medium' | 'Hard') || 'Medium'),
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12
                }}>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>
                    {fx.difficulty || 'Medium'}
                  </Text>
                </View>
              </View>
              <View style={styles.matchCellMedium}>
                <Text style={[styles.matchCellText, { color: theme.colors.text }]}>{[gw1, gw2, gw3][idx]?.toFixed(1) ?? '-'}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>No upcoming fixtures available.</Text>
        )}

        {/* Detailed cards for Next+1 and Next+2 GW with key drivers */}
        <View style={{ marginTop: 24 }}>
          {[
            { label: 'Next+1 GW', value: gw1, beforePenalty: gw1BeforePenalty }, 
            { label: 'Next+2 GW', value: gw2, beforePenalty: gw2BeforePenalty }, 
            { label: 'Next+3 GW', value: gw3, beforePenalty: gw3BeforePenalty }
          ].map((row, idx) => (
            <View key={idx} style={styles.xpCard}>
              <Text style={[styles.xpCardTitle, { color: theme.colors.primary }]}>
                {row.label}: {row.value.toFixed(1)} points
                {penaltyMultiplier !== 1.0 && (
                  <Text style={[styles.xpCardSubtitle, { color: theme.colors.textSecondary }]}>
                    {' '}(before penalty: {row.beforePenalty.toFixed(1)})
                  </Text>
                )}
              </Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• Baseline History: {baselineGwCount} gameweeks</Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• Current Form: {Number(fplPlayer.form).toFixed(1)}</Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• ICT Index: {Number(fplPlayer.ict_index).toFixed(1)}</Text>
              <Text style={[styles.xpBullet, { color: theme.colors.textSecondary }]}>• Minutes: {currentSeasonMinutes} mins</Text>
            </View>
          ))}
        </View>

        {/* XP Calculation Details */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>XP Calculation Details</Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Baseline History:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{baselineGwCount} gameweeks</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Current Form:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{Number(fplPlayer.form).toFixed(1)}</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>ICT Index:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{Number(fplPlayer.ict_index).toFixed(1)}</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Minutes Played (Current Season):</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{currentSeasonMinutes} mins</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Total 8-GW XP:</Text><Text style={[styles.detailsValueAccent, { color: theme.colors.primary }]}>{total8 !== null ? `${total8.toFixed(1)} points` : '—'}</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>3-GW Rolling Points:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{rolling.roll3_points.toFixed(2)} points</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>5-GW Rolling Points:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{rolling.roll5_points.toFixed(2)} points</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>8-GW Rolling Points:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{rolling.roll8_points.toFixed(2)} points</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>15-GW Rolling Points:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{rolling.roll15_points.toFixed(2)} points</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>5-GW Avg Minutes:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{rolling.roll5_minutes.toFixed(0)} mins</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Last 5 GW Minutes (combined):</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{last5CombinedMinsStr || '—'}</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Current Season GW Minutes:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{currentSeasonMinsStr || '—'}</Text></View>
        </View>

        {/* XP Calculation Factors */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>XP Calculation Factors</Text>
        <View style={styles.detailsGrid}>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Penalty Multiplier:</Text><Text style={[styles.detailsValueAccent, { color: theme.colors.primary }]}>{typeof penaltyMultiplier === 'number' ? `${penaltyMultiplier.toFixed(2)}x` : '1.00x'}</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Fixture Difficulty (FDR):</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>N/A</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>FDR Multiplier:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>N/A</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Penalty System:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{penaltyMultiplier !== 1.0 ? 'Penalties applied' : 'No penalties - No caps'}</Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Position Multiplier:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>
            {(() => {
              const mult = { 1: 1.08, 2: 1.23, 3: 1.20, 4: 1.23 } as any;
              const m = mult[fplPlayer.element_type] || 1.0;
              return `${m.toFixed(2)}x`;
            })()}
          </Text></View>
          <View style={styles.detailsRow}><Text style={[styles.detailsLabel, { color: theme.colors.textSecondary }]}>Availability:</Text><Text style={[styles.detailsValue, { color: theme.colors.text }]}>{
            (fplPlayer.chance_of_playing_next_round ?? 100) + '%'
          }</Text></View>
        </View>

        {/* Rules & multipliers summary */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>Rules & Multipliers (2025/26)</Text>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Applied in this order:</Text>
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.matchCellText, { color: theme.colors.textSecondary }]}>• Position multipliers: GK 1.08, DEF 1.23, MID 1.20, FWD 1.23</Text>
          <Text style={[styles.matchCellText, { color: theme.colors.textSecondary }]}>• 2025/26 adjustments: Liberal assists (+5%), Defensive contributions (+0/20/15/8%)</Text>
          <Text style={[styles.matchCellText, { color: theme.colors.textSecondary }]}>• BPS changes: GK +8%, DEF +3%, high scorers −5%</Text>
          <Text style={[styles.matchCellText, { color: theme.colors.textSecondary }]}>• Home/Away: Home ×1.12, Away ×0.93</Text>
          <Text style={[styles.matchCellText, { color: theme.colors.textSecondary }]}>• FDR multipliers: 1→1.25, 2→1.15, 3→1.00, 4→0.85, 5→0.70</Text>
          <Text style={[styles.matchCellText, { color: theme.colors.textSecondary }]}>• Availability scaling: 100% 1.0, 75% 0.9, 50% 0.7, 25% 0.5</Text>
        </View>

        {/* Data quality and penalties */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text, marginTop: 24 }]}>Data Quality & Penalties</Text>
        <View style={styles.rankingsGrid}>
          <View style={styles.rankingItem}>
            <Text style={[styles.rankingLabel, { color: theme.colors.textSecondary }]}>Quality</Text>
            <Text style={[styles.rankingValue, { color: theme.colors.primary }]}>{p.dataQuality || 'good'}</Text>
          </View>
          <View style={styles.rankingItem}>
            <Text style={[styles.rankingLabel, { color: theme.colors.textSecondary }]}>Penalty</Text>
            <Text style={[styles.rankingValue, { color: theme.colors.primary }]}>{typeof penaltyMultiplier === 'number' ? `${(penaltyMultiplier * 100).toFixed(0)}%` : '—'}</Text>
          </View>
          <View style={styles.rankingItem}>
            <Text style={[styles.rankingLabel, { color: theme.colors.textSecondary }]}>History (24/25 + current)</Text>
            <Text style={[styles.rankingValue, { color: theme.colors.primary }]}>{(p.effectiveHistoryLength ?? p.baselineHistoryLength ?? 0)}</Text>
          </View>
        </View>
        <Text style={[styles.sectionSubtitle, { color: theme.colors.textSecondary }]}>Flags: {p.isNewToPL ? 'New to PL, ' : ''}{p.isFromPromotedClub ? 'Promoted club, ' : ''}{p.isYoungPlayer ? 'Young player' : ''}</Text>
      </View>
    );
  };

  const renderHistoryTab = () => {
    return (
      <View style={styles.tabContent}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Previous Seasons</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.historyTable}>
            <View style={styles.matchHeader}>
              <Text style={[styles.matchHeaderTextExtraWide, { color: theme.colors.textSecondary }]}>Season</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>Pts</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>ST</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>MP</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>GS</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>A</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>xG</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>xA</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>xGI</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>CS</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>GC</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>xGC</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>T</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>CBI</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>R</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>DC</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>OG</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>PS</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>PM</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>YC</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>RC</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>S</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>BP</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>BPS</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>I</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>C</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>T</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>II</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>£S</Text>
              <Text style={[styles.matchHeaderTextWide, { color: theme.colors.textSecondary }]}>£E</Text>
            </View>
            
            {/* Show season history data */}
            {playerSeasonHistory.map((season, index) => (
              <View key={index} style={styles.matchRow}>
                <View style={styles.matchCellExtraWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.season_name || season.season || `Season ${season.start_year || 'Unknown'}`}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.total_points || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.starts || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.minutes || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.goals_scored || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.assists || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.expected_goals ? Number(season.expected_goals).toFixed(2) : '0.00'}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.expected_assists ? Number(season.expected_assists).toFixed(2) : '0.00'}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.expected_goal_involvements ? Number(season.expected_goal_involvements).toFixed(2) : '0.00'}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.clean_sheets || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.goals_conceded || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.expected_goals_conceded ? Number(season.expected_goals_conceded).toFixed(2) : '0.00'}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.threat || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.creativity_bonus_index || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.influence || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.dreamteam_count || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.own_goals || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.penalties_saved || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.penalties_missed || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.yellow_cards || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.red_cards || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.saves || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.bonus || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.bps || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.influence || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.creativity || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.threat || 0}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.ict_index ? Number(season.ict_index).toFixed(2) : '0.00'}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.start_cost ? (season.start_cost / 10).toFixed(1) : '0.0'}
                  </Text>
                </View>
                <View style={styles.matchCellWide}>
                  <Text style={[styles.matchCellText, { color: theme.colors.text }]}>
                    {season.end_cost ? (season.end_cost / 10).toFixed(1) : '0.0'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'matches' && { borderBottomColor: theme.colors.primary }
          ]}
          onPress={() => setActiveTab('matches')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'matches' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Matches
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'stats' && { borderBottomColor: theme.colors.primary }
          ]}
          onPress={() => setActiveTab('stats')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'stats' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'history' && { borderBottomColor: theme.colors.primary }
          ]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'history' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'xp' && { borderBottomColor: theme.colors.primary }
          ]}
          onPress={() => setActiveTab('xp')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'xp' ? theme.colors.primary : theme.colors.textSecondary }
          ]}>
            XP
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'matches' && renderMatchesTab()}
      {activeTab === 'stats' && renderStatsTab()}
      {activeTab === 'xp' && renderXpTab()}
      {activeTab === 'history' && renderHistoryTab()}

      <Modal
        visible={showMatchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowMatchModal(false)}
      >
        <View style={styles.modalFullScreen}>
          <ScrollView style={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
            <PlayerHeaderSection 
              fplPlayer={fplPlayer}
              team={teams.find(t => t.id === fplPlayer.team) || teams[0]}
              showCloseButton={true}
              onClose={() => setShowMatchModal(false)}
              isMatchContext={true}
              selectedMatch={selectedMatch}
            />

            {selectedMatch && (
              <View style={styles.matchDetailsContainer}>

                <View style={styles.matchResultSection}>
                  <View style={styles.matchResultRow}>
                    <View style={styles.teamSectionHome}>
                      <Text style={[styles.teamName, { color: theme.colors.text, flexShrink: 1 }]} numberOfLines={1}>
                        {teams.find(t => t.id === fplPlayer.team)?.name || 'Unknown'}
                      </Text>
                      {teams.find(t => t.id === fplPlayer.team)?.code && (
                        <Image 
                          source={{ uri: fplApiService.getTeamBadgeUrl(teams.find(t => t.id === fplPlayer.team)?.code!) }}
                          style={styles.teamBadgeImage}
                        />
                      )}
                    </View>
                    <View style={styles.scoreSection}>
                      <Text style={[styles.matchScore, { color: theme.colors.text }]} numberOfLines={1}>
                        {selectedMatch.team_h_score !== null ? selectedMatch.team_h_score : '-'} - {selectedMatch.team_a_score !== null ? selectedMatch.team_a_score : '-'}
                      </Text>
                    </View>
                    <View style={styles.teamSectionAway}>
                      {teams.find(t => t.id === selectedMatch.opponent_team)?.code && (
                        <Image 
                          source={{ uri: fplApiService.getTeamBadgeUrl(teams.find(t => t.id === selectedMatch.opponent_team)?.code!) }}
                          style={styles.teamBadgeImage}
                        />
                      )}
                      <Text style={[styles.teamName, { color: theme.colors.text, flexShrink: 1 }]} numberOfLines={1}>
                        {teams.find(t => t.id === selectedMatch.opponent_team)?.name || 'Unknown'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.pointsSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Points Breakdown</Text>
                  
                  <View style={styles.pointsTableHeader}>
                    <Text style={[styles.pointsHeaderText, { flex: 3 }]}>Type</Text>
                    <Text style={[styles.pointsHeaderText, { flex: 1, textAlign: 'center' }]}>Value</Text>
                    <Text style={[styles.pointsHeaderText, { flex: 1, textAlign: 'center' }]}>Points</Text>
                  </View>
                  
                  <View style={styles.pointsGrid}>
                    {/* Calculate and show points for each stat using FPL rules */}
                    {(() => {
                      const matchStats: FPLMatchStats = {
                        minutes: selectedMatch.minutes || 0,
                        goals_scored: selectedMatch.goals_scored || 0,
                        assists: selectedMatch.assists || 0,
                        clean_sheets: selectedMatch.clean_sheets || 0,
                        goals_conceded: selectedMatch.goals_conceded || 0,
                        yellow_cards: selectedMatch.yellow_cards || 0,
                        red_cards: selectedMatch.red_cards || 0,
                        saves: selectedMatch.saves || 0,
                        penalties_saved: selectedMatch.penalties_saved || 0,
                        penalties_missed: selectedMatch.penalties_missed || 0,
                        own_goals: selectedMatch.own_goals || 0,
                        bonus: selectedMatch.bonus || 0,
                        element_type: fplPlayer.element_type,
                        // Additional 2025/26 season stats
                        defensive_contributions: selectedMatch.defensive_contributions,
                        clearances_blocks_interceptions: selectedMatch.clearances_blocks_interceptions,
                        recoveries: selectedMatch.recoveries,
                        tackles: selectedMatch.tackles,
                        passes_completed: selectedMatch.passes_completed,
                        passes_attempted: selectedMatch.passes_attempted,
                        successful_crosses: selectedMatch.successful_crosses,
                        big_chances_created: selectedMatch.big_chances_created,
                        key_passes: selectedMatch.key_passes,
                        successful_dribbles: selectedMatch.successful_dribbles,
                        shots_on_target: selectedMatch.shots_on_target,
                        shots_off_target: selectedMatch.shots_off_target,
                        fouls_won: selectedMatch.fouls_won,
                        fouls_conceded: selectedMatch.fouls_conceded,
                        offsides: selectedMatch.offsides,
                        big_chances_missed: selectedMatch.big_chances_missed,
                        errors_leading_to_goal: selectedMatch.errors_leading_to_goal,
                        errors_leading_to_shot: selectedMatch.errors_leading_to_shot,
                        times_tackled: selectedMatch.times_tackled,
                        goal_line_clearances: selectedMatch.goal_line_clearances,
                        match_winner_goal: selectedMatch.match_winner_goal
                      };
                      
                      const pointsBreakdown = FPLPointsCalculator.calculateMatchPoints(matchStats);
                      
                      return (
                        <>
                          {/* Minutes played */}
                          {selectedMatch.minutes > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Minutes Played</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.minutes}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.minutes_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Goals */}
                          {selectedMatch.goals_scored > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Goals</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.goals_scored}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.goals_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Assists */}
                          {selectedMatch.assists > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Assists</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.assists}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.assists_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Clean Sheets */}
                          {pointsBreakdown.clean_sheet_points > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Clean Sheets</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.clean_sheets}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.clean_sheet_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Goals Conceded */}
                          {pointsBreakdown.goals_conceded_points < 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Goals Conceded</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.goals_conceded}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.goals_conceded_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Saves (Goalkeepers only) */}
                          {pointsBreakdown.saves_points > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Saves</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.saves}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.saves_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Defensive Contributions */}
                          {pointsBreakdown.defensive_contributions_points > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Defensive Contributions</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>
                                {selectedMatch.defensive_contributions || 'N/A'} actions
                              </Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.defensive_contributions_points} pts
                              </Text>
                            </View>
                          )}

                          {/* Pass Completion */}
                          {pointsBreakdown.pass_completion_points > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Pass Completion</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>
                                {selectedMatch.passes_completed}/{selectedMatch.passes_attempted}
                              </Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.pass_completion_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Penalties Saved */}
                          {pointsBreakdown.penalties_points > 0 && selectedMatch.penalties_saved > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Penalties Saved</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.penalties_saved}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.penalties_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Penalties Missed */}
                          {pointsBreakdown.penalties_points < 0 && selectedMatch.penalties_missed > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Penalties Missed</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.penalties_missed}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.penalties_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Own Goals */}
                          {pointsBreakdown.own_goals_points < 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Own Goals</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.own_goals}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.own_goals_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Yellow Cards */}
                          {pointsBreakdown.cards_points < 0 && selectedMatch.yellow_cards > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Yellow Cards</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.yellow_cards}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.cards_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Red Cards */}
                          {pointsBreakdown.cards_points < 0 && selectedMatch.red_cards > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Red Cards</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.red_cards}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.cards_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Bonus Points */}
                          {selectedMatch.bonus > 0 && (
                            <View style={styles.pointItem}>
                              <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Bonus Points</Text>
                              <Text style={[styles.pointValue, { color: theme.colors.text }]}>{selectedMatch.bonus}</Text>
                              <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                                {pointsBreakdown.bonus_points} pts
                              </Text>
                            </View>
                          )}
                          
                          {/* Total Points from API at the bottom */}
                          <View style={[styles.pointItem, { backgroundColor: '#F8FAFC' }]}>
                            <Text style={[styles.pointLabel, { color: theme.colors.textSecondary }]}>Total Points</Text>
                            <Text style={[styles.pointValue, { color: theme.colors.text }]}></Text>
                            <Text style={[styles.pointPoints, { color: theme.colors.primary }]}>
                              {selectedMatch.total_points} pts
                            </Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                </View>

                {/* Match Stats Section - All available stats */}
                <View style={styles.matchStatsSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Match Stats</Text>
                  
                  <View style={styles.matchStatsTableHeader}>
                    <Text style={[styles.matchStatsHeaderText, { flex: 4, textAlign: 'left' }]}>Type</Text>
                    <Text style={[styles.matchStatsHeaderText, { flex: 1, textAlign: 'center' }]}>Value</Text>
                  </View>
                  
                  <View style={styles.matchStatsGrid}>
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Goals</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.goals_scored || 0}</Text>
                    </View>
                    
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Assists</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.assists || 0}</Text>
                    </View>
                    
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Expected Goals</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.expected_goals || 0}</Text>
                    </View>
                    
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Expected Assists</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.expected_assists || 0}</Text>
                    </View>
                    
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Expected Goals Involvements</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.expected_goal_involvements || 0}</Text>
                    </View>
                    
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Expected Goals Against</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.expected_goals_against || 0}</Text>
                    </View>
                    
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Own Goals</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.own_goals || 0}</Text>
                    </View>
                    
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Penalties Saved</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.penalties_saved || 0}</Text>
                    </View>
                    
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Penalties Missed</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.penalties_missed || 0}</Text>
                    </View>
                    
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Red Cards</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.red_cards || 0}</Text>
                    </View>
                    
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Saves</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.saves || 0}</Text>
                    </View>
                    
                    <View style={styles.matchStatItem}>
                      <Text style={[styles.matchStatLabel, { color: theme.colors.textSecondary }]}>Defensive Contributions</Text>
                      <Text style={[styles.matchStatValue, { color: theme.colors.text }]}>{selectedMatch.defensive_contributions || 0}</Text>
                    </View>
                  </View>
                </View>

                {/* ICT Stats Section */}
                <View style={styles.ictStatsSection}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>FPL Match Stats</Text>
                  
                  <View style={styles.ictStatsTableHeader}>
                    <Text style={[styles.ictStatsHeaderText, { flex: 4, textAlign: 'left' }]}>Type</Text>
                    <Text style={[styles.ictStatsHeaderText, { flex: 1, textAlign: 'center' }]}>Value</Text>
                  </View>
                  
                  <View style={styles.ictStatsGrid}>
                    <View style={styles.ictStatItem}>
                      <Text style={[styles.ictStatLabel, { color: theme.colors.textSecondary }]}>ICT Influence</Text>
                      <Text style={[styles.ictStatValue, { color: theme.colors.text }]}>{selectedMatch.influence || 0}</Text>
                    </View>
                    
                    <View style={styles.ictStatItem}>
                      <Text style={[styles.ictStatLabel, { color: theme.colors.textSecondary }]}>ICT Creativity</Text>
                      <Text style={[styles.ictStatValue, { color: theme.colors.text }]}>{selectedMatch.creativity || 0}</Text>
                    </View>
                    
                    <View style={styles.ictStatItem}>
                      <Text style={[styles.ictStatLabel, { color: theme.colors.textSecondary }]}>ICT Threat</Text>
                      <Text style={[styles.ictStatValue, { color: theme.colors.text }]}>{selectedMatch.threat || 0}</Text>
                    </View>
                    
                    <View style={styles.ictStatItem}>
                      <Text style={[styles.ictStatLabel, { color: theme.colors.textSecondary }]}>ICT Index</Text>
                      <Text style={[styles.ictStatValue, { color: theme.colors.text }]}>{selectedMatch.ict_index || 0}</Text>
                    </View>
                    
                    <View style={styles.ictStatItem}>
                      <Text style={[styles.ictStatLabel, { color: theme.colors.textSecondary }]}>Bonus Points System</Text>
                      <Text style={[styles.ictStatValue, { color: theme.colors.text }]}>{selectedMatch.bps || 0}</Text>
                    </View>
                    
                    <View style={styles.ictStatItem}>
                      <Text style={[styles.ictStatLabel, { color: theme.colors.textSecondary }]}>Total Bonus Points</Text>
                      <Text style={[styles.ictStatValue, { color: theme.colors.text }]}>{selectedMatch.bonus || 0}</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderRadius: 0,
    margin: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tabContent: {
    padding: 20,
  },
  subTabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  subTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  matchHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  matchHeaderTextExtraSmall: {
    fontSize: 12,
    fontWeight: '600',
    flex: 0.08, // 8% for GW
    textAlign: 'center',
  },
  matchHeaderTextLarge: {
    fontSize: 12,
    fontWeight: '600',
    flex: 0.32, // 32% for Opponent
    textAlign: 'center',
  },
  matchHeaderTextMedium: {
    fontSize: 12,
    fontWeight: '600',
    flex: 0.2, // 20% for Results and Points
    textAlign: 'center',
  },
  matchHeaderTextMore: {
    fontSize: 12,
    fontWeight: '600',
    flex: 0.2, // 20% for More
    textAlign: 'center',
  },
  matchHeaderTextWide: {
    fontSize: 12,
    fontWeight: '600',
    flex: 0.6, // 60% for much wider columns
    textAlign: 'center',
  },
  matchHeaderTextExtraWide: {
    fontSize: 12,
    fontWeight: '600',
    flex: 0.8, // 80% for very wide columns
    textAlign: 'center',
  },
  matchRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  matchCellExtraSmall: {
    flex: 0.08, // 8% for GW
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCellLarge: {
    flex: 0.32, // 32% for Opponent
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCellMedium: {
    flex: 0.2, // 20% for Results and Points
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCellMore: {
    flex: 0.2, // 20% for More
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCellWide: {
    flex: 0.6, // 60% for much wider columns
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCellExtraWide: {
    flex: 0.8, // 80% for very wide columns
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchCellText: {
    fontSize: 14,
    fontWeight: '500',
  },
  opponentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBadgeImage: {
    width: 18,
    height: 18,
    marginRight: 8,
  },
  moreButton: {
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 24,
  },
  sectionSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  rankingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  rankingItem: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  rankingValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rankingLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  historyTable: {
    backgroundColor: 'white',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
    minWidth: 1000, // Much wider to accommodate 30 columns with proper spacing
  },
  modalFullScreen: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalScrollContent: {
    flex: 1,
  },
  matchDetailsContainer: {
    padding: 20,
  },
  matchResultSection: {
    marginBottom: 16,
  },
  matchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderRadius: 8,
  },
  teamSection: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    flexDirection: 'row',
  },
  teamSectionHome: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 0,
    flexDirection: 'row',
  },
  teamSectionAway: {
    flex: 0.45,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 0,
    flexDirection: 'row',
  },
  scoreSection: {
    flex: 0.1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 0,
    minWidth: 60,
  },

  teamInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    flexShrink: 1,
  },
  matchScore: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 0,
    textAlign: 'center',
  },
  pointsSection: {
    marginTop: 16,
  },
  pointsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  pointsHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  pointsGrid: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  pointItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'white',
  },
  pointLabel: {
    flex: 3,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  pointValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointPoints: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchStatsSection: {
    marginTop: 24,
  },
  matchStatsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  matchStatsHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  matchStatsGrid: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  matchStatItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'white',
  },
  matchStatLabel: {
    flex: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  matchStatValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
    marginRight: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ictStatsSection: {
    marginTop: 24,
  },
  ictStatsTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  ictStatsHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  ictStatsGrid: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  ictStatItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: 'white',
  },
  ictStatLabel: {
    flex: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  ictStatValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    textAlign: 'center',
  },
  xpCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  xpCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  xpCardSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
  xpBullet: {
    fontSize: 14,
    marginBottom: 6,
  },
  detailsGrid: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  detailsValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailsValueAccent: {
    fontSize: 14,
    fontWeight: '700',
  },
  xpTilesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  xpTile: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
  },
  xpTileHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  xpTileSub: {
    fontSize: 12,
    marginBottom: 8,
  },
  xpTileDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  xpTileSection: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
} as const);

export default PlayerStatsSection; 