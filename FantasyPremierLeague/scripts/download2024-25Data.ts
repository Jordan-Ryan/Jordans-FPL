import AsyncStorage from '@react-native-async-storage/async-storage';

interface SeasonMatchRow {
  round: number;
  total_points: number;
  minutes: number;
  was_home: boolean;
  opponent_team: string;
  ict_index: number;
  bps: number;
  expected_goal_involvements: number;
}

export interface PlayerSeasonData {
  name: string;
  element_type: number; // 1 GK, 2 DEF, 3 MID, 4 FWD
  team: string;
  season_history: SeasonMatchRow[];
}

export class Data2024_25Downloader {
  private readonly STORAGE_KEY = 'fpl_2024_25_baseline_data';
  private readonly DATA_URL = 'https://raw.githubusercontent.com/vaastav/Fantasy-Premier-League/master/data/2024-25/gws/merged_gw.csv';

  async getBaselineData(): Promise<Record<string, PlayerSeasonData>> {
    try {
      const cached = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch {}
      }
      const data = await this.downloadAndProcessData();
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return data;
    } catch (error) {
      console.error('❌ Error in getBaselineData:', error);
      // Fallback: return empty data if storage fails
      return {};
    }
  }

  async refreshData(): Promise<Record<string, PlayerSeasonData>> {
    await AsyncStorage.removeItem(this.STORAGE_KEY);
    const data = await this.downloadAndProcessData();
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    return data;
  }

  async downloadAndProcessData(): Promise<Record<string, PlayerSeasonData>> {
    console.log('📥 Downloading 2024-25 season data from GitHub...');
    
    const resp = await fetch(this.DATA_URL, {
      headers: { 'User-Agent': 'FPL-App/1.0' },
    });
    if (!resp.ok) throw new Error(`Failed to fetch 2024-25 CSV: ${resp.status}`);
    const csvText = await resp.text();

    const lines = csvText.split('\n').filter(line => line.trim().length > 0);
    if (lines.length < 2) return {};

    const headers = this.parseCSVLine(lines[0]);
    const hIdx = (name: string) => headers.indexOf(name);

    const idx = {
      name: hIdx('name'),
      element_type: hIdx('element_type'),
      team: hIdx('team'),
      GW: hIdx('GW'),
      total_points: hIdx('total_points'),
      minutes: hIdx('minutes'),
      was_home: hIdx('was_home'),
      opponent_team: hIdx('opponent_team'),
      ict_index: hIdx('ict_index'),
      bps: hIdx('bps'),
      xGI: hIdx('expected_goal_involvements'),
    };

    const playerMap: Record<string, PlayerSeasonData> = {};
    let valid = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length < headers.length - 4) continue;

      const name = values[idx.name] || `player_${i}`;
      const round = parseInt(values[idx.GW] || '0', 10);
      if (!Number.isFinite(round) || round < 1 || round > 38) continue;

      const element_type = parseInt(values[idx.element_type] || '3', 10);
      const team = values[idx.team] || 'Unknown';

      if (!playerMap[name]) {
        playerMap[name] = {
          name,
          element_type: Number.isFinite(element_type) ? element_type : 3,
          team,
          season_history: [],
        };
      }

      const row: SeasonMatchRow = {
        round,
        total_points: parseFloat(values[idx.total_points] || '0'),
        minutes: parseInt(values[idx.minutes] || '0', 10),
        was_home: (values[idx.was_home] || '').toLowerCase() === 'true',
        opponent_team: values[idx.opponent_team] || 'Unknown',
        ict_index: parseFloat(values[idx.ict_index] || '0'),
        bps: parseInt(values[idx.bps] || '0', 10),
        expected_goal_involvements: parseFloat(values[idx.xGI] || '0'),
      };

      playerMap[name].season_history.push(row);
      valid++;
    }

    // Sort history by round
    Object.values(playerMap).forEach(p => {
      p.season_history.sort((a, b) => a.round - b.round);
    });

    console.log(`✅ Processed 2024-25 data: ${Object.keys(playerMap).length} players, ${valid} records`);
    return playerMap;
  }

  // Robust CSV line parser to handle quotes and commas
  private parseCSVLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        const next = line[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out.map(s => s.trim());
  }

  findPlayerBaseline(currentPlayerName: string, baselineData: Record<string, PlayerSeasonData>): SeasonMatchRow[] | null {
    if (baselineData[currentPlayerName]) return baselineData[currentPlayerName].season_history;

    const norm = (s: string) => s.toLowerCase().replace(/[\s_\-]/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const target = norm(currentPlayerName);

    // exact normalized
    for (const [name, pdata] of Object.entries(baselineData)) {
      if (norm(name) === target) return pdata.season_history;
    }
    
    // partial matching
    const parts = currentPlayerName.toLowerCase().split(/[\s_\-]+/).filter(Boolean);
    for (const [name, pdata] of Object.entries(baselineData)) {
      const nParts = name.toLowerCase().split(/[\s_\-]+/).filter(Boolean);
      let matches = 0;
      for (const part of parts) {
        if (part.length > 2 && nParts.some(np => np.includes(part) || part.includes(np))) {
          matches++;
        }
      }
      if (matches >= 2 || (matches >= 1 && parts.length === 1)) {
        return pdata.season_history;
      }
    }

    return null;
  }
}
