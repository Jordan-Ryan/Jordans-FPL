import { Player } from '../types';

// FPL Squad Data - Easy to update and maintain
export const squadData: Player[] = [
  // Starting XI - 3-4-3 formation
  { 
    id: 182, // James Trafford - FOUND at Man City
    starter: true, 
    captain: false, 
    vice_captain: true, 
    team_position: 1
  },
  { 
    id: 575, // Micky van de Ven
    starter: true, 
    captain: false, 
    vice_captain: false, 
    team_position: 2
  },
  { 
    id: 38, // Ezri Konsa
    starter: true, 
    captain: false, 
    vice_captain: false, 
    team_position: 3
  },
  { 
    id: 568, // Pedro Porro
    starter: true, 
    captain: false, 
    vice_captain: false, 
    team_position: 4
  },
  { 
    id: 417, // Rayan Cherki - FOUND at Man City
    starter: true, 
    captain: false, 
    vice_captain: false, 
    team_position: 5
  },
  { 
    id: 381, // Mohamed Salah
    starter: true, 
    captain: false, 
    vice_captain: false, 
    team_position: 6
  },
  { 
    id: 382, // Florian Wirtz - FOUND at Liverpool
    starter: true, 
    captain: false, 
    vice_captain: false, 
    team_position: 7
  },
  { 
    id: 582, // Mohammed Kudus - Now at Spurs
    starter: true, 
    captain: false, 
    vice_captain: false, 
    team_position: 8
  },
  { 
    id: 249, // João Pedro - Now at Chelsea
    starter: true, 
    captain: true, 
    vice_captain: false, 
    team_position: 9
  },
  { 
    id: 624, // Jarrod Bowen
    starter: true, 
    captain: false, 
    vice_captain: false, 
    team_position: 10
  },
  { 
    id: 661, // Hugo Ekitike
    starter: true, 
    captain: false, 
    vice_captain: false, 
    team_position: 11
  },
  
  // Bench players
  { 
    id: 470, // Martin Dúbravka - Now at Burnley
    starter: false, 
    captain: false, 
    vice_captain: false, 
    bench_position: 1
  },
  { 
    id: 260, // Marc Guéhi
    starter: false, 
    captain: false, 
    vice_captain: false, 
    bench_position: 2
  },
  { 
    id: 610, // Aaron Wan-Bissaka - Now at West Ham
    starter: false, 
    captain: false, 
    vice_captain: false, 
    bench_position: 3
  },
  { 
    id: 266, // Eberechi Eze
    starter: false, 
    captain: false, 
    vice_captain: false, 
    bench_position: 4
  }
];

// Helper functions for squad management
export const squadHelpers = {
  // Get all active players (with valid FPL IDs)
  getActivePlayers: () => squadData.filter(player => player.id !== 0),
  
  // Get all inactive players (without FPL IDs)
  getInactivePlayers: () => squadData.filter(player => player.id === 0),
  
  // Get starting XI
  getStartingXI: () => squadData.filter(player => player.starter),
  
  // Get bench players
  getBenchPlayers: () => squadData.filter(player => !player.starter),
  
  // Get captain
  getCaptain: () => squadData.find(player => player.captain),
  
  // Get vice-captain
  getViceCaptain: () => squadData.find(player => player.vice_captain),
  
  // Get squad statistics
  getSquadStats: () => {
    const activePlayers = squadData.filter(player => player.id !== 0);
    const startingXI = squadData.filter(player => player.starter);
    const bench = squadData.filter(player => !player.starter);
    
    return {
      totalPlayers: squadData.length,
      activePlayers: activePlayers.length,
      inactivePlayers: squadData.length - activePlayers.length,
      startingXI: startingXI.length,
      benchPlayers: bench.length
    };
  }
}; 