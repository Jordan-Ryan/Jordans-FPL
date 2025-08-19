import { FPLPlayer, FPLTeam } from '../types';

// Configuration for XP blending weights by gameweek phase
export const xpConfig = {
  teamWeightsByPhase: [
    { untilGw: 2, w_cur: 0.15, w_last_adj: 0.55, w_base: 0.30 },
    { untilGw: 5, w_cur: 0.35, w_last_adj: 0.45, w_base: 0.20 },
    { untilGw: 8, w_cur: 0.60, w_last_adj: 0.30, w_base: 0.10 },
    { untilGw: 38, w_cur: 0.75, w_last_adj: 0.20, w_base: 0.05 }
  ],
  playerWeightsByPhase: [
    { untilGw: 2, w_pc: 0.20, w_pl: 0.50, w_role: 0.30 },
    { untilGw: 5, w_pc: 0.40, w_pl: 0.40, w_role: 0.20 },
    { untilGw: 8, w_pc: 0.60, w_pl: 0.25, w_role: 0.15 },
    { untilGw: 38, w_pc: 0.75, w_pl: 0.15, w_role: 0.10 }
  ],
  minutesWeightsByPhase: [
    { untilGw: 2, w_prior: 0.70, w_cur: 0.30 },
    { untilGw: 5, w_prior: 0.55, w_cur: 0.45 },
    { untilGw: 8, w_prior: 0.40, w_cur: 0.60 },
    { untilGw: 38, w_prior: 0.30, w_cur: 0.70 }
  ],
  // New-transfers: how much to trust cross-league priors initially, then hand off to EPL current-season
  transferRampByPhase: [
    { untilGw: 2, w_cross: 0.70, w_pre: 0.20, w_cur: 0.10 },
    { untilGw: 5, w_cross: 0.55, w_pre: 0.25, w_cur: 0.20 },
    { untilGw: 8, w_cross: 0.40, w_pre: 0.20, w_cur: 0.40 },
    { untilGw: 38, w_cross: 0.25, w_pre: 0.15, w_cur: 0.60 }
  ],
  // Clamps
  teamScalarClamp: { min: 0.75, max: 1.25 },
  rateClamp: { min: 0.0, max: 1.5 }, // per-90 rates
  minutesClamp: { min: 20, max: 90 }
};

// Diagnostics configuration
export const xpDebug = { logComponents: true, sampleN: 10 };

// League translation factors (configurable, rough priors)
const leagueTranslation = {
  EPL: { xg: 1.00, xa: 1.00, defActions: 1.00 },
  LaLiga: { xg: 0.92, xa: 0.95, defActions: 1.02 },
  Bundesliga: { xg: 0.90, xa: 0.95, defActions: 0.98 },
  SerieA: { xg: 0.92, xa: 0.94, defActions: 1.00 },
  Ligue1: { xg: 0.88, xa: 0.92, defActions: 0.98 },
  Championship: { xg: 0.80, xa: 0.85, defActions: 1.05 },
  Default: { xg: 0.90, xa: 0.92, defActions: 1.00 }
};

// Position role baselines (stabilizers in small samples)
const roleBaselines = {
  GKP: { xg: 0.00, xa: 0.02, defActions: 1.0 },
  DEF: { xg: 0.05, xa: 0.06, defActions: 7.0 },
  MID: { xg: 0.18, xa: 0.16, defActions: 3.0 },
  FWD: { xg: 0.30, xa: 0.12, defActions: 2.0 }
};

// Helper functions
function clamp(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, x));
}

function weightsForGw(phaseList: any[], gw: number) {
  return phaseList.find(p => gw <= p.untilGw) || phaseList[phaseList.length - 1];
}

function elementTypeToPosName(elementType: number): string {
  return elementType === 1 ? 'GKP' : elementType === 2 ? 'DEF' : elementType === 3 ? 'MID' : 'FWD';
}

// Team strength blending with promoted-team adjustment
function adjustPromotedLastSeasonTeamMetrics(last: any) {
  const attack = clamp((last?.attack ?? 1.0) * 0.85, 0.65, 1.15);
  const defense = clamp((last?.defense ?? 1.0) * 1.15, 0.65, 1.35);
  return { attack, defense };
}

// teamMetrics: { current?:{attack,defense}, last?:{attack,defense}, isPromoted:boolean }
export function blendTeamStrength(teamMetrics: any, currentGw: number, cfg = xpConfig) {
  const { w_cur, w_last_adj, w_base } = weightsForGw(cfg.teamWeightsByPhase, currentGw);
  const lastAdj = teamMetrics.isPromoted
    ? adjustPromotedLastSeasonTeamMetrics(teamMetrics.last)
    : (teamMetrics.last || { attack: 1.0, defense: 1.0 });

  const attack =
    w_cur * (teamMetrics.current?.attack ?? 1.0) +
    w_last_adj * (lastAdj.attack ?? 1.0) +
    w_base * 1.0;

  const defense =
    w_cur * (teamMetrics.current?.defense ?? 1.0) +
    w_last_adj * (lastAdj.defense ?? 1.0) +
    w_base * 1.0;

  return {
    attack: clamp(attack, cfg.teamScalarClamp.min, cfg.teamScalarClamp.max),
    defense: clamp(defense, cfg.teamScalarClamp.min, cfg.teamScalarClamp.max)
  };
}

// Player per-90 blending with NEW-TRANSFER cross-league translation
function translateCrossLeague(per90: any, league: string) {
  const f = leagueTranslation[league as keyof typeof leagueTranslation] || leagueTranslation.Default;
  return {
    xg: per90?.xg != null ? per90.xg * f.xg : 0,
    xa: per90?.xa != null ? per90.xa * f.xa : 0,
    defActions: per90?.defActions != null ? per90.defActions * f.defActions : 0
  };
}

// Identify "new transfer" - simplified heuristic
function isNewTransfer(player: FPLPlayer) {
  // Placeholder heuristic; refine if we store transfer metadata
  // For now, treat players with 0 minutes this season as potential transfers
  return player.event_points === 0 && player.total_points === 0;
}

// Main blender for per-90 with transfer handling
export function blendPlayerPer90WithTransfers(
  player: FPLPlayer, 
  currentGw: number, 
  per90Current: any, 
  per90PrevEPL: any, 
  crossLeagueInfo: any, 
  cfg = xpConfig
) {
  const pos = elementTypeToPosName(player.element_type);
  const roleBase = roleBaselines[pos as keyof typeof roleBaselines];
  const { w_pc, w_pl, w_role } = weightsForGw(cfg.playerWeightsByPhase, currentGw);

  // Base blend with previous EPL + role
  const prev = per90PrevEPL || { xg: 0, xa: 0, defActions: 0 };

  let xg_base = w_pc * (per90Current?.xg ?? 0) + w_pl * prev.xg + w_role * roleBase.xg;
  let xa_base = w_pc * (per90Current?.xa ?? 0) + w_pl * prev.xa + w_role * roleBase.xa;
  let def_base = w_pc * (per90Current?.defActions ?? 0) + w_pl * prev.defActions + w_role * roleBase.defActions;

  // If new transfer with cross-league history, blend in a transfer ramp
  if (isNewTransfer(player) && crossLeagueInfo?.per90) {
    const ramp = weightsForGw(cfg.transferRampByPhase, currentGw);
    const cross = translateCrossLeague(crossLeagueInfo.per90, crossLeagueInfo.league);
    // Pre-EPL (previous club same league data if exists); fallback to prev EPL or role base
    const pre = prev.xg + prev.xa + prev.defActions > 0 ? prev : roleBase;

    const xg = clamp(
      ramp.w_cross * cross.xg + ramp.w_pre * (pre.xg ?? 0) + ramp.w_cur * (per90Current?.xg ?? 0),
      cfg.rateClamp.min, cfg.rateClamp.max
    );
    const xa = clamp(
      ramp.w_cross * cross.xa + ramp.w_pre * (pre.xa ?? 0) + ramp.w_cur * (per90Current?.xa ?? 0),
      cfg.rateClamp.min, cfg.rateClamp.max
    );
    const defActions = clamp(
      ramp.w_cross * cross.defActions + ramp.w_pre * (pre.defActions ?? 0) + ramp.w_cur * (per90Current?.defActions ?? 0),
      cfg.rateClamp.min, cfg.rateClamp.max
    );
    return { xg, xa, defActions };
  }

  return {
    xg: clamp(xg_base, cfg.rateClamp.min, cfg.rateClamp.max),
    xa: clamp(xa_base, cfg.rateClamp.min, cfg.rateClamp.max),
    defActions: clamp(def_base, cfg.rateClamp.min, cfg.rateClamp.max)
  };
}

// Minutes blending with archetype prior
function priorMinutesArchetype(player: FPLPlayer) {
  if (player.element_type === 1) return 90; // GK
  if (player.status && player.status !== 'a') return 20;
  if (player.now_cost >= 80) return 82; // premium usually nailed
  if (player.now_cost >= 60) return 72;
  return 60;
}

function recentMinutesSignal(player: FPLPlayer) {
  // Use basic proxies available without new endpoints
  const form = player.form ? parseFloat(player.form) : 3.0;
  if (form >= 5.0) return 85;
  if (form >= 3.0) return 75;
  return 60;
}

export function blendedExpectedMinutes(player: FPLPlayer, currentGw: number, cfg = xpConfig) {
  const { w_prior, w_cur } = weightsForGw(cfg.minutesWeightsByPhase, currentGw);
  let Emin = w_prior * priorMinutesArchetype(player) + w_cur * recentMinutesSignal(player);
  
  // Early-season caps and safer mapping
  if (player.element_type === 1) {
    // GKP: keep 90, clamp to
    Emin = 90;
  } else if (currentGw <= 2) {
    // Outfield and early season: conservative caps
    if (player.now_cost >= 80 || (player.form && parseFloat(player.form) >= 5.0)) {
      // Premium or strong starter signal
      Emin = Math.min(Emin, 82);
    } else {
      // Otherwise cap at 78
      Emin = Math.min(Emin, 78);
    }
  } else if (currentGw >= 3) {
    // Allow up to 86 for nailed players, else normal clamp
    if (player.now_cost >= 80 && player.status === 'a') {
      Emin = Math.min(Emin, 86);
    }
  }
  
  // Final clamp for all
  return clamp(Math.round(Emin), cfg.minutesClamp.min, cfg.minutesClamp.max);
}

// Expected points calculation functions
function homeAdvantage(isHome: boolean): number {
  return isHome ? 1.05 : 0.97;
}

function goalPointsFor(pos: string) {
  if (pos === 'FWD') return 4;
  if (pos === 'MID') return 5;
  if (pos === 'DEF') return 6;
  return 0.5; // GKP tiny
}

function csPointsFor(pos: string) {
  if (pos === 'GKP' || pos === 'DEF') return 4;
  if (pos === 'MID') return 1;
  return 0;
}



// New 25/26 defensive-contribution expected points
function newDefContributionXp(posName: string, defActionsPer90: number, Emin: number, oppAttackScalar: number, isHome: boolean) {
  // Clamp per-90 baselines by role to realistic ranges
  const defRate = clamp(
    defActionsPer90,
    posName === 'DEF' ? 3.5 : posName === 'MID' ? 2.0 : 0.8,
    posName === 'DEF' ? 8.5 : posName === 'MID' ? 5.0 : 2.0
  );
  
  // Narrow pressure band
  const pressure = clamp(oppAttackScalar * (isHome ? 0.97 : 1.03), 0.90, 1.15);
  const expectedCount = defRate * (Emin / 90) * pressure;

  // Poisson CDF helper (k inclusive)
  function poissonCDF(k: number, lambda: number) {
    let sum = 0, term = Math.exp(-lambda);
    sum += term;
    for (let i = 1; i <= k; i++) {
      term *= lambda / i;
      sum += term;
    }
    return sum;
  }

  if (posName === 'DEF') {
    const pHit = 1 - poissonCDF(9, expectedCount); // CBIT ≥10
    return 2 * pHit;
  }
  if (posName === 'MID' || posName === 'FWD') {
    const pHit = 1 - poissonCDF(11, expectedCount); // CBIRT ≥12
    return 2 * pHit;
  }
  return 0;
}

function appearancePoints(Emin: number) {
  const p1 = clamp(Emin / 90 + 0.05, 0, 1);
  const p60 = clamp((Emin - 35) / 55, 0, 1);
  return p1 + p60; // 0..2
}

// Main expected points function for a single fixture
export function expectedPointsForFixture({
  player,
  currentGw,
  isHome,
  opponentTeamBlended,
  playerPer90Blended
}: {
  player: FPLPlayer;
  currentGw: number;
  isHome: boolean;
  opponentTeamBlended: any;
  playerPer90Blended: any;
}) {
  const posName = elementTypeToPosName(player.element_type);
  const Emin = blendedExpectedMinutes(player, currentGw);

  // Attacking EV (cap and single scaling)
  const ease = clamp(1.0 / (opponentTeamBlended.defense || 1.0), 0.95, 1.05) * homeAdvantage(isHome);
  let goals_ev = playerPer90Blended.xg * (Emin / 90) * 0.85;
  let assists_ev = playerPer90Blended.xa * (Emin / 90) * 0.90;
  goals_ev = clamp(goals_ev * ease, 0, 0.7); // cap goals expectation per fixture
  assists_ev = clamp(assists_ev * ease, 0, 0.7); // cap assists expectation per fixture
  const goal_pts = goals_ev * goalPointsFor(posName);
  const assist_pts = assists_ev * 3;

  // Clean-sheet EV (no double-scaling)
  const lambda = clamp((opponentTeamBlended.attack || 1.0) * (isHome ? 0.95 : 1.05), 0.5, 1.8);
  const pCS = Math.exp(-lambda);
  const cs_pts = csPointsFor(posName) * pCS * (Emin >= 60 ? 1 : 0.5);

  // Defensive-contribution EV (tight thresholds)
  const defNew = newDefContributionXp(
    posName, playerPer90Blended.defActions, Emin, opponentTeamBlended.attack || 1.0, isHome
  );

  // Bonus proxy (smaller, gated by minutes)
  let bonus = 0;
  if (Emin >= 60) {
    if (posName === 'GKP') bonus = 0.10 * (isHome ? 0.95 : 1.05);
    else if (posName === 'DEF') bonus = 0.08 * (pCS >= 0.2 ? 1 : 0.7);
    else bonus = 0.05;
  }

  // GK saves proxy (tiny)
  const gkSaves = (posName === 'GKP') ? 0.15 : 0;

  // Appearance
  const appear = appearancePoints(Emin);

  // Component logging for diagnostics
  if (xpDebug.logComponents && Math.random() < xpDebug.sampleN / 1000) {
    console.log('XP Components:', {
      player: player.web_name,
      pos: posName,
      Emin,
      appearance: appear,
      goals_ev,
      goal_pts,
      assists_ev,
      assist_pts,
      pCS,
      cs_pts,
      expectedCount: playerPer90Blended.defActions * (Emin / 90),
      defNew,
      bonus,
      gkSaves,
      total: appear + goal_pts + assist_pts + cs_pts + defNew + bonus + gkSaves
    });
  }

  // Sum
  return appear + goal_pts + assist_pts + cs_pts + defNew + bonus + gkSaves;
}
