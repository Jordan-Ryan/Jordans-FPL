import { PlayerPrediction } from './fplPredictor2025-26';

interface OptimalTeam {
  gameweek: number;
  formation: string;
  total_cost: number;
  total_expected_points: number;
  starting_xi: PlayerPrediction[];
  bench: PlayerPrediction[];
  captain: PlayerPrediction;
  vice_captain: PlayerPrediction;
}

interface FormationConstraint {
  name: string;
  GK: number;
  DEF: number;
  MID: number;
  FWD: number;
}

interface PlayerWithValue extends PlayerPrediction {
  xp: number;
  valueEfficiency: number;
}

export class OptimalTeamBuilder {
  private readonly BUDGET = 100.0;
  private readonly SQUAD_LIMITS = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
  
  private readonly VALID_FORMATIONS: FormationConstraint[] = [
    { name: '3-4-3', GK: 1, DEF: 3, MID: 4, FWD: 3 },
    { name: '3-5-2', GK: 1, DEF: 3, MID: 5, FWD: 2 },
    { name: '4-3-3', GK: 1, DEF: 4, MID: 3, FWD: 3 },
    { name: '4-4-2', GK: 1, DEF: 4, MID: 4, FWD: 2 },
    { name: '4-5-1', GK: 1, DEF: 4, MID: 5, FWD: 1 },
    { name: '5-3-2', GK: 1, DEF: 5, MID: 3, FWD: 2 },
    { name: '5-4-1', GK: 1, DEF: 5, MID: 4, FWD: 1 }
  ];

  /**
   * Generate optimal team for specific gameweek using our predicted expected points
   */
  generateOptimalTeam(players: PlayerPrediction[], gameweek: number): OptimalTeam {
    // Map gameweek to correct field: GW3 -> gwp1_xp, GW4 -> gwp2_xp, GW5 -> gwp3_xp
    const fieldIndex = gameweek - 2; // Convert GW3->1, GW4->2, GW5->3
    const xpField = `gwp${fieldIndex}_xp`;
    
    console.log(`🔍 Best 11 Debug - GW${gameweek}: Starting with ${players.length} players`);
    
    // Convert players to PlayerWithValue format
    const playersWithValue: PlayerWithValue[] = players.map(player => ({
      ...player,
      xp: player[xpField] as number,
      valueEfficiency: (player[xpField] as number) / player.price
    }));
    
    // Filter players with positive XP
    const playersWithXP = playersWithValue.filter(p => p.xp > 0);
    console.log(`🔍 Best 11 Debug - GW${gameweek}: ${playersWithXP.length} players with positive XP`);
    
    if (playersWithXP.length === 0) {
      console.log(`❌ Best 11 Debug - GW${gameweek}: No players with positive XP, returning empty team`);
      return this.createEmptyTeam(gameweek);
    }
    
    // Try each formation to find the best one
    let bestTeam: OptimalTeam | null = null;
    let bestScore = -1;
    
    for (const formation of this.VALID_FORMATIONS) {
      console.log(`🔍 Best 11 Debug - GW${gameweek}: Trying formation ${formation.name}`);
      const team = this.buildTeamForFormation(playersWithXP, formation, gameweek, xpField);
      if (team && team.total_expected_points > bestScore) {
        bestScore = team.total_expected_points;
        bestTeam = team;
        console.log(`✅ Best 11 Debug - GW${gameweek}: Found better team with ${formation.name}: ${team.total_expected_points} points`);
      } else {
        console.log(`❌ Best 11 Debug - GW${gameweek}: Formation ${formation.name} failed or worse`);
      }
    }
    
    if (!bestTeam) {
      console.log(`❌ Best 11 Debug - GW${gameweek}: No valid teams found, returning empty team`);
    }
    
    return bestTeam || this.createEmptyTeam(gameweek);
  }

  /**
   * Build team for specific formation
   */
  private buildTeamForFormation(
    players: PlayerWithValue[],
    formation: FormationConstraint,
    gameweek: number,
    xpField: keyof PlayerPrediction
  ): OptimalTeam | null {
    
    // Step 1: Build 15-player squad within budget
    const squad = this.buildSquad(players, formation);
    if (!squad || squad.totalCost > this.BUDGET) {
      return null;
    }
    
    // Step 2: Select starting XI based on expected points for this gameweek
    const startingXI = this.selectStartingXI(squad.players, formation, xpField);
    if (!startingXI || startingXI.length !== 11) {
      return null;
    }
    
    // Step 3: Remaining players go to bench
    const bench = squad.players.filter(p => !startingXI.includes(p));
    
    // Step 4: Select captain and vice-captain (highest expected points)
    const { captain, viceCaptain } = this.selectCaptains(startingXI, xpField);
    
    // Step 5: Calculate total expected points (including captain bonus)
    const basePoints = startingXI.reduce((sum, p) => sum + (p[xpField] as number), 0);
    const captainBonus = captain ? (captain[xpField] as number) : 0;
    const totalExpectedPoints = basePoints + captainBonus;
    
    return {
      gameweek,
      formation: formation.name,
      total_cost: Math.round(squad.totalCost * 10) / 10,
      total_expected_points: Math.round(totalExpectedPoints * 10) / 10,
      starting_xi: startingXI,
      bench,
      captain,
      vice_captain: viceCaptain
    };
  }

  /**
   * Build 15-player squad within budget constraints
   */
  private buildSquad(players: PlayerWithValue[], formation: FormationConstraint): { players: PlayerWithValue[], totalCost: number } | null {
    const squad: PlayerWithValue[] = [];
    let remainingBudget = this.BUDGET;
    
    // Group players by position and sort by value efficiency
    const playersByPosition = {
      GK: players.filter(p => p.position === 'GK').sort((a, b) => b.valueEfficiency - a.valueEfficiency),
      DEF: players.filter(p => p.position === 'DEF').sort((a, b) => b.valueEfficiency - a.valueEfficiency),
      MID: players.filter(p => p.position === 'MID').sort((a, b) => b.valueEfficiency - a.valueEfficiency),
      FWD: players.filter(p => p.position === 'FWD').sort((a, b) => b.valueEfficiency - a.valueEfficiency)
    };
    
    // Check if we have enough players in each position
    const positions = [
      { pos: 'GK' as keyof typeof playersByPosition, needed: this.SQUAD_LIMITS.GK, starting: formation.GK },
      { pos: 'DEF' as keyof typeof playersByPosition, needed: this.SQUAD_LIMITS.DEF, starting: formation.DEF },
      { pos: 'MID' as keyof typeof playersByPosition, needed: this.SQUAD_LIMITS.MID, starting: formation.MID },
      { pos: 'FWD' as keyof typeof playersByPosition, needed: this.SQUAD_LIMITS.FWD, starting: formation.FWD }
    ];
    
    for (const { pos, needed, starting } of positions) {
      const availablePlayers = playersByPosition[pos].filter(p => 
        !squad.includes(p) && p.price <= remainingBudget
      );
      
      if (availablePlayers.length < needed) {
        return null; // Can't fill this position
      }
      
      // Use a greedy approach: select the best value players first
      // Then fill remaining spots with cheapest available
      let selectedPlayers: PlayerWithValue[] = [];
      let positionBudget = remainingBudget;
      
      // Try to select players that fit within budget
      const sortedPlayers = [...availablePlayers].sort((a, b) => {
        // Prioritize value efficiency for starting players, then price for bench
        if (selectedPlayers.length < starting) {
          return b.valueEfficiency - a.valueEfficiency;
        } else {
          return a.price - b.price;
        }
      });
      
      for (const player of sortedPlayers) {
        if (selectedPlayers.length < needed && player.price <= positionBudget) {
          selectedPlayers.push(player);
          positionBudget -= player.price;
        }
      }
      
      if (selectedPlayers.length < needed) {
        return null; // Couldn't fill this position within budget
      }
      
      squad.push(...selectedPlayers);
      remainingBudget = positionBudget;
    }
    
    return {
      players: squad,
      totalCost: this.BUDGET - remainingBudget
    };
  }

  /**
   * Select best starting XI from 15-player squad based on expected points
   */
  private selectStartingXI(squad: PlayerWithValue[], formation: FormationConstraint, xpField: keyof PlayerPrediction): PlayerWithValue[] {
    const squadByPosition = {
      GK: squad.filter(p => p.position === 'GK').sort((a, b) => (b[xpField] as number) - (a[xpField] as number)),
      DEF: squad.filter(p => p.position === 'DEF').sort((a, b) => (b[xpField] as number) - (a[xpField] as number)),
      MID: squad.filter(p => p.position === 'MID').sort((a, b) => (b[xpField] as number) - (a[xpField] as number)),
      FWD: squad.filter(p => p.position === 'FWD').sort((a, b) => (b[xpField] as number) - (a[xpField] as number))
    };
    
    const startingXI: PlayerWithValue[] = [];
    
    // Select best players for each position based on expected points
    startingXI.push(...squadByPosition.GK.slice(0, formation.GK));
    startingXI.push(...squadByPosition.DEF.slice(0, formation.DEF));
    startingXI.push(...squadByPosition.MID.slice(0, formation.MID));
    startingXI.push(...squadByPosition.FWD.slice(0, formation.FWD));
    
    return startingXI;
  }

  /**
   * Select captain and vice-captain (highest expected points)
   */
  private selectCaptains(startingXI: PlayerWithValue[], xpField: keyof PlayerPrediction): { captain: PlayerWithValue, viceCaptain: PlayerWithValue } {
    const sortedByPoints = [...startingXI].sort((a, b) => (b[xpField] as number) - (a[xpField] as number));
    
    return {
      captain: sortedByPoints[0] || null,
      viceCaptain: sortedByPoints[1] || null
    };
  }

  /**
   * Generate optimal teams for all 3 gameweeks
   */
  generateAllOptimalTeams(players: PlayerPrediction[]) {
    const teams = {
      gw2: this.generateOptimalTeam(players, 2),
      gw3: this.generateOptimalTeam(players, 3),
      gw4: this.generateOptimalTeam(players, 4)
    };
    
    return teams;
  }

  /**
   * Create empty team for failed optimization
   */
  private createEmptyTeam(gameweek: number): OptimalTeam {
    return {
      gameweek,
      formation: 'N/A',
      total_cost: 0,
      total_expected_points: 0,
      starting_xi: [],
      bench: [],
      captain: {} as PlayerPrediction,
      vice_captain: {} as PlayerPrediction
    };
  }
}

export type { OptimalTeam, FormationConstraint };
