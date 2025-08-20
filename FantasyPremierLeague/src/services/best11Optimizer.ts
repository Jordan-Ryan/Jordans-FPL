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

export class Best11Optimizer {
  private readonly BUDGET = 100.0;
  private readonly SQUAD_LIMITS = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
  
  private readonly FORMATIONS = [
    { GK: 1, DEF: 3, MID: 4, FWD: 3, name: '3-4-3' },
    { GK: 1, DEF: 3, MID: 5, FWD: 2, name: '3-5-2' },
    { GK: 1, DEF: 4, MID: 3, FWD: 3, name: '4-3-3' },
    { GK: 1, DEF: 4, MID: 4, FWD: 2, name: '4-4-2' },
    { GK: 1, DEF: 5, MID: 3, FWD: 2, name: '5-3-2' }
  ];

  generateOptimalTeam(players: PlayerPrediction[], gameweek: 2 | 3 | 4): OptimalTeam {
    const xpField = `gw${gameweek}_xp` as keyof PlayerPrediction;
    
    const availablePlayers = players.filter(p => (p[xpField] as number) > 0);
    
    const playersWithValue = availablePlayers.map(player => ({
      ...player,
      xp: player[xpField] as number,
      valueEfficiency: (player[xpField] as number) / player.price
    }));

    const playersByPosition = {
      GK: playersWithValue.filter(p => p.position === 'GK'),
      DEF: playersWithValue.filter(p => p.position === 'DEF'),
      MID: playersWithValue.filter(p => p.position === 'MID'),
      FWD: playersWithValue.filter(p => p.position === 'FWD')
    };

    Object.keys(playersByPosition).forEach(pos => {
      playersByPosition[pos as keyof typeof playersByPosition]
        .sort((a, b) => b.valueEfficiency - a.valueEfficiency);
    });

    let bestTeam: OptimalTeam | null = null;

    for (const formation of this.FORMATIONS) {
      const team = this.optimizeTeamForFormation(playersByPosition, formation, gameweek, xpField as string);
      
      if (team && (!bestTeam || team.total_expected_points > bestTeam.total_expected_points)) {
        bestTeam = team;
      }
    }

    return bestTeam || this.createEmptyTeam(gameweek);
  }

  private optimizeTeamForFormation(
    playersByPosition: any,
    formation: any,
    gameweek: number,
    xpField: string
  ): OptimalTeam | null {
    
    const squad: PlayerPrediction[] = [];
    let remainingBudget = this.BUDGET;

    for (const [position, maxCount] of Object.entries(this.SQUAD_LIMITS)) {
      const positionPlayers = playersByPosition[position];
      const formationNeed = formation[position] || 0;

      let selectedCount = 0;

      // Select players needed for starting XI first
      for (let i = 0; i < formationNeed && selectedCount < maxCount; i++) {
        const player = positionPlayers.find((p: any) => 
          !squad.includes(p) && p.price <= remainingBudget
        );

        if (player) {
          squad.push(player);
          remainingBudget -= player.price;
          selectedCount++;
        }
      }

      // Fill remaining squad spots with cheapest players for bench
      const remainingNeeded = maxCount - selectedCount;
      const cheapestAvailable = positionPlayers
        .filter((p: any) => !squad.includes(p) && p.price <= remainingBudget)
        .sort((a: any, b: any) => a.price - b.price);

      for (let i = 0; i < remainingNeeded && i < cheapestAvailable.length; i++) {
        const player = cheapestAvailable[i];
        if (remainingBudget >= player.price) {
          squad.push(player);
          remainingBudget -= player.price;
          selectedCount++;
        }
      }

      if (selectedCount < formationNeed) {
        return null;
      }
    }

    const startingXI: PlayerPrediction[] = [];
    const squadByPosition = {
      GK: squad.filter(p => p.position === 'GK'),
      DEF: squad.filter(p => p.position === 'DEF'),
      MID: squad.filter(p => p.position === 'MID'),
      FWD: squad.filter(p => p.position === 'FWD')
    };

    for (const [position, count] of Object.entries(formation)) {
      if (position === 'name') continue;

      const positionSquad = squadByPosition[position as keyof typeof squadByPosition];
      const bestForPosition = positionSquad
        .sort((a, b) => (b[xpField] as number) - (a[xpField] as number))
        .slice(0, count as number);

      startingXI.push(...bestForPosition);
    }

    const bench = squad.filter(p => !startingXI.includes(p));

    const captainCandidates = startingXI
      .sort((a, b) => (b[xpField] as number) - (a[xpField] as number));

    const captain = captainCandidates[0];
    const viceCaptain = captainCandidates[1];

    const totalCost = squad.reduce((sum, p) => sum + p.price, 0);
    const startingPoints = startingXI.reduce((sum, p) => sum + (p[xpField] as number), 0);
    const captainBonus = captain ? (captain[xpField] as number) : 0;
    const totalExpectedPoints = startingPoints + captainBonus;

    return {
      gameweek,
      formation: formation.name,
      total_cost: Math.round(totalCost * 10) / 10,
      total_expected_points: Math.round(totalExpectedPoints * 10) / 10,
      starting_xi: startingXI,
      bench,
      captain,
      vice_captain: viceCaptain
    };
  }

  private createEmptyTeam(gameweek: number): OptimalTeam {
    return {
      gameweek,
      formation: '0-0-0',
      total_cost: 0,
      total_expected_points: 0,
      starting_xi: [],
      bench: [],
      captain: null as any,
      vice_captain: null as any
    };
  }

  generateAllOptimalTeams(players: PlayerPrediction[]) {
    console.log('🎯 Generating optimal teams for next 3 gameweeks...');
    
    return {
      gw2: this.generateOptimalTeam(players, 2),
      gw3: this.generateOptimalTeam(players, 3),
      gw4: this.generateOptimalTeam(players, 4)
    };
  }
}
