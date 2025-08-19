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
import { FPLPlayer, FPLTeam } from '../types';
import { fplApiService } from '../services/fplApi';
import PlayerFixturesSection from '../screens/PlayerFixturesSection';
import PlayerHeaderSection from '../screens/PlayerHeaderSection';
import { FPLPointsCalculator, FPLMatchStats } from '../utils/fplPointsCalculator';

interface PlayerStatsSectionProps {
  fplPlayer: FPLPlayer;
}

const PlayerStatsSection: React.FC<PlayerStatsSectionProps> = ({ fplPlayer }) => {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<'matches' | 'stats' | 'history'>('matches');
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
      </View>

      {activeTab === 'matches' && renderMatchesTab()}
      {activeTab === 'stats' && renderStatsTab()}
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
                                {fplPlayer.element_type === 2 ? '10+' : '12+'} actions
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
} as const);

export default PlayerStatsSection; 