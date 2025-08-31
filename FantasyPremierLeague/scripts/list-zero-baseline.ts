/*
  Script: list-zero-baseline.ts
  Purpose: Output players with 0 baseline gameweeks, excluding promoted clubs, to a CSV file.
  Output: ./zero-baseline-non-promoted.csv
*/

/* eslint-disable @typescript-eslint/no-var-requires */
import * as fs from 'fs';
import path from 'path';

// Load baseline data
const baselineData = require('../src/data/2024-25-baseline-processed.json');

// Bootstrap data loader using the existing service endpoint
async function fetchBootstrap(): Promise<any> {
  const res = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function normalize(s: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_\s]/g, '');
}

function getBaselineLen(player: any, baselinePlayers: Record<string, any>): number {
  try {
    const firstName = player.first_name || player.web_name?.split(' ')?.[0] || '';
    const secondName = player.second_name || player.web_name?.split(' ')?.slice(1).join(' ') || '';
    const key1 = `${firstName}_${secondName}`;
    const key2 = `${secondName}_${firstName}`;
    if (baselinePlayers[key1]) return (baselinePlayers[key1]?.season_history || []).length;
    if (baselinePlayers[key2]) return (baselinePlayers[key2]?.season_history || []).length;
    const webUnderscore = String(player.web_name || '').replace(/\s+/g, '_');
    if (baselinePlayers[webUnderscore]) return (baselinePlayers[webUnderscore]?.season_history || []).length;
    const allKeys = Object.keys(baselinePlayers);
    const normWeb = normalize(webUnderscore);
    const exactNormKey = allKeys.find(k => normalize(k) === normWeb);
    if (exactNormKey) return (baselinePlayers[exactNormKey]?.season_history || []).length;
    return 0;
  } catch {
    return 0;
  }
}

async function main(): Promise<void> {
  const bootstrap = await fetchBootstrap();
  const players = bootstrap.elements || [];
  const teams = bootstrap.teams || [];

  // Map team id -> team name
  const teamById = new Map<number, string>();
  teams.forEach((t: any) => teamById.set(t.id, t.name));

  const baselinePlayers: Record<string, any> = baselineData?.players || {};

  // Promoted club IDs (align with predictor)
  const promotedTeamIds = new Set<number>([3, 11, 17]);

  const zeroBaseline = players.filter((p: any) => {
    if (promotedTeamIds.has(p.team)) return false; // exclude promoted clubs
    const len = getBaselineLen(p, baselinePlayers);
    return (len || 0) === 0;
  });

  // Prepare CSV
  const header = ['first_name', 'second_name', 'web_name', 'club'].join(',');
  const rows = zeroBaseline.map((p: any) => {
    const first = (p.first_name || '').replaceAll(',', '');
    const second = (p.second_name || '').replaceAll(',', '');
    const web = (p.web_name || '').replaceAll(',', '');
    const club = (teamById.get(p.team) || 'Unknown').replaceAll(',', '');
    return [first, second, web, club].join(',');
  });

  const outPath = path.resolve(__dirname, '../zero-baseline-non-promoted.csv');
  fs.writeFileSync(outPath, [header, ...rows].join('\n'), 'utf8');
  // eslint-disable-next-line no-console
  console.log(`✅ Wrote ${rows.length} players to ${outPath}`);
}

main().catch(err => {
  // eslint-disable-next-line no-console
  console.error('❌ Failed to list zero-baseline players:', err);
  process.exit(1);
});


