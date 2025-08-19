import { FPLPlayer, FPLTeam } from '../types';
import { computeOptimizedXpForNextThreeGWs } from './xpEngine';

export interface FixtureData {
  id: number;
  event: number;
  team_h: number;
  team_a: number;
  team_h_difficulty?: number;
  team_a_difficulty?: number;
  kickoff_time: string;
  finished: boolean;
  started: boolean;
}

export interface ExpectedPointsResult {
  gw2Xp: number;
  gw3Xp: number;
  gw4Xp: number;
  threeGwXp: number;
}



// Main function to compute XP for next three gameweeks
export function computeXpForNextThreeGWs(
  players: FPLPlayer[],
  teams: FPLTeam[],
  fixtures: FixtureData[],
  targetGws: number[]
): FPLPlayer[] {
  // Convert to the format expected by the new XP engine
  const xpPlayers = players.map(p => ({
    id: p.id,
    web_name: p.web_name,
    element_type: p.element_type as 1 | 2 | 3 | 4,
    team: p.team,
    now_cost: p.now_cost,
    total_points: p.total_points,
    form: p.form,
    chance_of_playing_next_round: p.chance_of_playing_next_round || null,
    status: p.status
  }));

  const xpTeams = teams.map(t => ({
    id: t.id,
    short_name: t.short_name,
    strength_attack_home: t.strength_attack_home,
    strength_attack_away: t.strength_attack_away,
    strength_defence_home: t.strength_defence_home,
    strength_defence_away: t.strength_defence_away
  }));

  const xpFixtures = fixtures.map(f => ({
    id: f.id,
    event: f.event,
    team_h: f.team_h,
    team_a: f.team_a,
    finished: f.finished
  }));

  // Use the new optimized XP engine with 2024/25 season analysis
  const currentGw = targetGws[0] || 1;
  
  // Convert to OptimizedXPPlayer format with current season data from FPL
  const optimizedPlayers = xpPlayers.map(p => {
    const originalPlayer = players.find(op => op.id === p.id);
    return {
      ...p,
      goals_scored: originalPlayer?.goals_scored || 0,
      assists: originalPlayer?.assists || 0,
      bonus: originalPlayer?.bonus || 0,
      clean_sheets: originalPlayer?.clean_sheets || 0,
      minutes: originalPlayer?.minutes || 0,
      total_points: originalPlayer?.total_points || 0
    };
  });
  
  const playersWithXp = computeOptimizedXpForNextThreeGWs(optimizedPlayers, xpTeams, xpFixtures, currentGw);

  // Map the XP values back to the original player objects
  return players.map(player => {
    const playerCopy = { ...player };
    const xpPlayer = playersWithXp.find(p => p.id === player.id);
    
    if (xpPlayer) {
      playerCopy.gw2Xp = xpPlayer.gw2Xp;
      playerCopy.gw3Xp = xpPlayer.gw3Xp;
      playerCopy.gw4Xp = xpPlayer.gw4Xp;
      playerCopy.threeGwXp = xpPlayer.threeGwXp;
    } else {
      playerCopy.gw2Xp = 0;
      playerCopy.gw3Xp = 0;
      playerCopy.gw4Xp = 0;
      playerCopy.threeGwXp = 0;
    }

    return playerCopy;
  });
}
