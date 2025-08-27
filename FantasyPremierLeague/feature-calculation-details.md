# 📊 Feature Calculation Details - Exact Data Structure & Methods

## 🔍 **Complete Data Structure for Each Player**

This document shows the exact data structure, calculation methods, and formulas used for every feature in the expected points system.

---

## 📋 **Player Data Structure**

### **Base Player Information**
```typescript
interface FPLPlayer {
  id: number;
  web_name: string;
  element_type: number; // 1=GK, 2=DEF, 3=MID, 4=FWD
  team: number;
  now_cost: number; // Price in 0.1 increments
  chance_of_playing_next_round: number | null;
  chance_of_playing_next_next_round: number | null;
}
```

### **Historical Game Data**
```typescript
interface GameHistory {
  round: number;           // Gameweek number
  total_points: number;    // Points scored
  minutes: number;         // Minutes played
  was_home: boolean;       // Home/Away indicator
  opponent_team: number;   // Opponent team ID
  ict_index: number;       // Influence, Creativity, Threat
  bps: number;             // Bonus Points System score
  expected_goal_involvements: number; // xG + xA
}
```

---

## 🔄 **Rolling Averages Calculation**

### **1. Points Rolling Averages**
```typescript
// Get last N games from combined history (baseline + current season)
const last3 = combinedHistory.slice(-3);
const last5 = combinedHistory.slice(-5);
const last8 = combinedHistory.slice(-8);
const last15 = combinedHistory.slice(-15);

// Calculate averages with spike smoothing
const lastGamePts = last3.length > 0 ? last3[last3.length - 1].total_points : 0;
const recentMean = getAvg(last5.map(g => g.total_points));
const spikeFactor = recentMean > 0 && lastGamePts > 2 * recentMean ? 0.85 : 1.0;

// Apply spike smoothing to last game only
const last3Pts = last3.map((g, idx) => 
  idx === last3.length - 1 ? g.total_points * spikeFactor : g.total_points
);

// Final rolling averages
roll3_points: getAvg(last3Pts),
roll5_points: getAvg(last5.map(g => g.total_points)),
roll8_points: getAvg(last8.map(g => g.total_points)),
roll15_points: getAvg(last15.map(g => g.total_points))
```

### **2. Minutes Rolling Averages**
```typescript
// Calculate average minutes for different periods
roll3_minutes: getAvg(last3.map(g => g.minutes)),
roll5_minutes: getAvg(last5.map(g => g.minutes)),
roll8_minutes: getAvg(last8.map(g => g.minutes))

// Minutes reliability factor (capped at 1.2x)
const minutesReliability = Math.min(roll5_minutes / 90.0, 1.2);
```

### **3. Consistency Calculation**
```typescript
// Standard deviation of last 5 games
const getStd = (arr: number[]) => {
  if (arr.length <= 1) return 1;
  const avg = getAvg(arr);
  const variance = getAvg(arr.map(x => (x - avg) ** 2));
  return Math.sqrt(variance);
};

// Consistency factor (lower std = higher consistency)
roll5_consistency: 1 / (1 + getStd(last5.map(g => g.total_points)))
```

### **4. Starts Reliability**
```typescript
// Percentage of games with ≥60 minutes in last 5
roll5_starts: getAvg(last5.map(g => g.minutes >= 60 ? 1 : 0))
```

---

## 📈 **Advanced Statistics Calculation**

### **1. ICT Index Average**
```typescript
// Average ICT index across all historical games
avg_ict: getAvg(combinedHistory.map(g => g.ict_index))

// ICT Index Components:
// - Influence: Ball recoveries, tackles, interceptions
// - Creativity: Key passes, crosses, through balls
// - Threat: Shots, shots on target, goals
```

### **2. BPS Average**
```typescript
// Average Bonus Points System score across all games
avg_bps: getAvg(combinedHistory.map(g => g.bps))

// BPS Components (2025-26):
// - Playing time: 3 points for 60+ minutes
// - Goals: 24 points (GK/DEF), 18 points (MID), 12 points (FWD)
// - Assists: 9 points
// - Clean sheets: 12 points (GK/DEF), 6 points (MID), 4 points (FWD)
// - Saves: 3 points inside box, 2 outside, 8 for penalties
// - Goal-line clearances: 9 points (was 3)
```

### **3. Expected Goal Involvements**
```typescript
// Average expected goals + assists across all games
avg_expected_gi: getAvg(combinedHistory.map(g => g.expected_goal_involvements))

// Expected Goals (xG):
// - Based on shot quality, distance, angle, defender pressure
// - Ranges from 0.01 (very low chance) to 0.95+ (penalty)

// Expected Assists (xA):
// - Based on pass quality, receiver position, defender pressure
// - Ranges from 0.01 (simple pass) to 0.80+ (perfect through ball)
```

---

## 🏟️ **Fixture & Context Features**

### **1. Home/Away Calculation**
```typescript
// From fixture data
const isHome = fixture.team_h === player.team;

if (isHome) {
  prediction *= 1.10; // Home advantage
} else {
  prediction *= 0.94; // Away penalty
}
```

### **2. FDR Multiplier Calculation**
```typescript
private getFixtureDifficultyMultiplier(fixture: any, isHome: boolean): number {
  // Get difficulty rating for the team
  const difficulty = isHome 
    ? fixture.team_h_difficulty 
    : fixture.team_a_difficulty;
  
  switch (difficulty) {
    case 1: return 1.25; // Easy (Green)
    case 2: return 1.0;  // Medium (Yellow)
    case 3: return 0.85; // Hard (Red)
    case 4: return 0.70; // Very Hard (Dark Red)
    default: return 1.0;
  }
}
```

---

## 🎮 **Position-Specific Calculations**

### **1. Position Multipliers (2025-26)**
```typescript
private getPositionMultiplier2025_26(elementType: number): number {
  const multipliers = {
    1: 1.08, // GK - Goalkeeper
    2: 1.23, // DEF - Defender
    3: 1.20, // MID - Midfielder
    4: 1.23  // FWD - Forward
  };
  return multipliers[elementType] || 1.0;
}
```

### **2. 2025-26 Rule Adjustments**
```typescript
private apply2025_26Rules(player: any, basePrediction: number): number {
  let adjustedPrediction = basePrediction;
  
  // Defensive contributions boost
  const defensiveContributionBoost = {
    1: 0.00, // GK - no defensive contributions
    2: 0.20, // DEF - +20% from 10+ clearances/blocks/interceptions/tackles
    3: 0.15, // MID - +15% from 12+ defensive actions including recoveries
    4: 0.08  // FWD - +8% from limited defensive actions
  };
  
  const positionBoost = defensiveContributionBoost[player.element_type] || 0;
  adjustedPrediction *= (1 + positionBoost);
  
  // Liberal assists (+5% boost across all positions)
  adjustedPrediction *= 1.05;
  
  // BPS system changes
  if (player.element_type === 1) {
    adjustedPrediction *= 1.08; // GK: Improved save BPS
  } else if (player.element_type === 2) {
    adjustedPrediction *= 1.03; // DEF: Goal-line clearances now 9 BPS
  } else if (basePrediction > 8.0) {
    adjustedPrediction *= 0.95; // High scorers: Penalty goals normalized
  }
  
  return adjustedPrediction;
}
```

---

## 🔧 **Player Classification Logic**

### **1. New to Premier League Detection**
```typescript
private classifyPlayer(player: any, elementSummary: any): PlayerClassification {
  const historyLength = elementSummary.history?.length || 0;
  
  // Check if player has no 2024-25 baseline data
  const has2024_25Data = this.findPlayerBaseline(player.web_name);
  
  // Player is new to PL if they have no historical data and no baseline data
  const isNewToPL = !has2024_25Data && historyLength === 0;
  
  return {
    isNewToPL,
    penaltyMultiplier: isNewToPL ? 0.60 : 1.0, // 40% penalty
    dataQuality: isNewToPL ? 'new_player' : 'good'
  };
}
```

### **2. Promoted Club Detection**
```typescript
// 2025-26 promoted teams
const promotedTeamIds = [3, 11, 17]; // Burnley, Leeds, Sunderland

const isFromPromotedClub = promotedTeamIds.includes(player.team);
const penaltyMultiplier = isFromPromotedClub ? 0.70 : 1.0; // 30% penalty
```

### **3. Young Player Detection**
```typescript
const isYoungPlayer = historyLength < 15 && player.now_cost <= 60; // Under £6m with limited data
const penaltyMultiplier = isYoungPlayer ? 0.75 : 1.0; // 25% penalty
```

---

## 📊 **Conservative Caps Application**

### **1. Cap Logic**
```typescript
private applyConservativeCaps(
  prediction: number, 
  player: any, 
  classification: PlayerClassification, 
  gameweek: number
): number {
  let cappedPrediction = prediction;
  
  // Apply caps based on player classification
  if (classification.isNewToPL) {
    cappedPrediction = Math.min(cappedPrediction, 5.0); // Max 5 points
  }
  if (classification.isFromPromotedClub) {
    cappedPrediction = Math.min(cappedPrediction, 6.0); // Max 6 points
  }
  if (classification.isYoungPlayer) {
    cappedPrediction = Math.min(cappedPrediction, 4.5); // Max 4.5 points
  }
  
  // Additional caps for later gameweeks
  if (gameweek >= 6) {
    cappedPrediction *= 0.95; // 5% reduction
  }
  if (gameweek >= 8) {
    cappedPrediction *= 0.90; // 10% reduction
  }
  
  return cappedPrediction;
}
```

---

## 🔍 **Data Quality Assessment**

### **1. History Length Classification**
```typescript
const historyGames = combinedHistory.length;
const baseQuality = historyGames >= 10 ? 'good' : 
                   historyGames >= 5 ? 'limited' : 'minimal';

const veryNew = (!baselineHistory || baselineHistory.length === 0) && 
                (currentSeasonHistory?.length || 0) < 3;

const dataQuality = veryNew ? 'very_new' : baseQuality;
```

### **2. Spike Detection & Smoothing**
```typescript
// Detect if last game is an outlier
const lastGamePts = last3.length > 0 ? last3[last3.length - 1].total_points : 0;
const recentMean = getAvg(last5.map(g => g.total_points));
const isSpike = recentMean > 0 && lastGamePts > 2 * recentMean;

// Apply smoothing only to the outlier
const spikeFactor = isSpike ? 0.85 : 1.0;
const smoothedLastGame = lastGamePts * spikeFactor;
```

---

## 📱 **Real-Time Update Triggers**

### **1. Gameweek Completion**
- **Trigger**: New gameweek data available
- **Action**: Recalculate all rolling averages
- **Impact**: Form trends updated, consistency recalculated

### **2. Player Availability Changes**
- **Trigger**: `chance_of_playing_next_round` updates
- **Action**: Apply availability multiplier
- **Impact**: Predictions scaled by playing probability

### **3. Fixture Changes**
- **Trigger**: FDR updates, venue changes
- **Action**: Recalculate FDR multipliers
- **Impact**: Home/away and difficulty adjustments

### **4. Transfer Market Updates**
- **Trigger**: Player moves between teams
- **Action**: Reclassify player, update team context
- **Impact**: Promoted club status, fixture difficulty changes

---

## 🎯 **Complete Calculation Flow**

### **Step-by-Step Process**
1. **Data Collection**: Gather baseline + current season history
2. **Rolling Averages**: Calculate 3, 5, 8, 15-game form
3. **Spike Smoothing**: Reduce outlier impact
4. **Base Prediction**: Weighted average of rolling features
5. **Minutes Adjustment**: Reliability factor based on playing time
6. **Consistency Boost**: Reward stable performers
7. **Starts Reliability**: Boost regular starters
8. **Advanced Stats**: Add ICT, BPS, expected GI boosts
9. **2025-26 Rules**: Apply position-specific adjustments
10. **Position Multiplier**: Role-based scaling
11. **Home/Away**: Venue advantage/penalty
12. **FDR**: Fixture difficulty multiplier
13. **Classification**: New player penalties
14. **Conservative Caps**: Prevent unrealistic predictions
15. **Availability**: Injury/suspension scaling
16. **Final Bounds**: Ensure 0.5-15.0 range

This comprehensive system ensures that every data point, from recent form to historical consistency, is properly weighted and incorporated into the final expected points calculation.

