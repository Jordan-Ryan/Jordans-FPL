export interface PremierLeagueClub {
  id: number;
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
}

export const premierLeagueClubs: PremierLeagueClub[] = [
  { id: 1, name: "Arsenal", short_name: "ARS", primary_color: "#EF0107", secondary_color: "#FFFFFF" },
  { id: 2, name: "Aston Villa", short_name: "AVL", primary_color: "#95BFE5", secondary_color: "#7B003C" },
  { id: 3, name: "Bournemouth", short_name: "BOU", primary_color: "#DA291C", secondary_color: "#000000" },
  { id: 4, name: "Brentford", short_name: "BRE", primary_color: "#E30613", secondary_color: "#FFFFFF" },
  { id: 5, name: "Brighton", short_name: "BHA", primary_color: "#0057B8", secondary_color: "#FFFFFF" },
  { id: 6, name: "Burnley", short_name: "BUR", primary_color: "#6C1D45", secondary_color: "#99D6EA" },
  { id: 7, name: "Chelsea", short_name: "CHE", primary_color: "#034694", secondary_color: "#FFFFFF" },
  { id: 8, name: "Crystal Palace", short_name: "CRY", primary_color: "#1B458F", secondary_color: "#C4122E" },
  { id: 9, name: "Everton", short_name: "EVE", primary_color: "#003399", secondary_color: "#FFFFFF" },
  { id: 10, name: "Fulham", short_name: "FUL", primary_color: "#FFFFFF", secondary_color: "#000000" },
  { id: 11, name: "Leeds", short_name: "LEE", primary_color: "#FFCD00", secondary_color: "#FFFFFF" },
  { id: 12, name: "Leicester", short_name: "LEI", primary_color: "#003090", secondary_color: "#FDBE11" },
  { id: 13, name: "Liverpool", short_name: "LIV", primary_color: "#C8102E", secondary_color: "#FFFFFF" },
  { id: 14, name: "Luton", short_name: "LUT", primary_color: "#FF6B35", secondary_color: "#FFFFFF" },
  { id: 15, name: "Manchester City", short_name: "MCI", primary_color: "#6CABDD", secondary_color: "#FFFFFF" },
  { id: 16, name: "Manchester United", short_name: "MUN", primary_color: "#DA291C", secondary_color: "#FBE122" },
  { id: 17, name: "Newcastle", short_name: "NEW", primary_color: "#241F20", secondary_color: "#FFFFFF" },
  { id: 18, name: "Nottingham Forest", short_name: "NFO", primary_color: "#DD0000", secondary_color: "#FFFFFF" },
  { id: 19, name: "Southampton", short_name: "SOU", primary_color: "#ED1A3B", secondary_color: "#FFFFFF" },
  { id: 20, name: "Sunderland", short_name: "SUN", primary_color: "#DC143C", secondary_color: "#FFFFFF" },
  { id: 21, name: "Tottenham", short_name: "TOT", primary_color: "#FFFFFF", secondary_color: "#132257" },
  { id: 22, name: "West Ham", short_name: "WHU", primary_color: "#7A263A", secondary_color: "#1BB1E7" },
  { id: 23, name: "Wolves", short_name: "WOL", primary_color: "#FDB913", secondary_color: "#000000" }
];

// Helper functions
export const getClubByName = (name: string): PremierLeagueClub | undefined => {
  return premierLeagueClubs.find(club => club.name === name);
};

export const getClubByShortName = (shortName: string): PremierLeagueClub | undefined => {
  return premierLeagueClubs.find(club => club.short_name === shortName);
};

export const getClubById = (id: number): PremierLeagueClub | undefined => {
  return premierLeagueClubs.find(club => club.id === id);
}; 