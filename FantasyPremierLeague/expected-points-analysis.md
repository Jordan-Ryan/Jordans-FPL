# 🎯 Expected Points Calculation - Full Logic & Analysis

## 📋 **Calculation Overview**

The FPL prediction system calculates expected points using a multi-step process that combines historical performance, fixture difficulty, player classification, and 2025-26 rule adjustments.

---

## 🔧 **Step-by-Step Calculation Process**

### **Step 1: Base Prediction from Rolling Features**
```typescript
// Calculate base prediction using rolling averages and ML weights
let prediction = this.calculateBasePrediction(features, weights);
```

**Features Used:**
- Form (last 5 games)
- Home/Away performance
- Fixture difficulty
- Recent goals/assists
- Clean sheet probability
- Bonus point potential

### **Step 2: Apply 2025-26 FPL Rule Adjustments**
```typescript
prediction = this.apply2025_26Rules(context.player, prediction);
```

**Rule Changes Applied:**
1. **Defensive Contributions Boost:**
   - GK: +0% (no defensive contributions)
   - DEF: +20% (10+ clearances/blocks/interceptions/tackles)
   - MID: +15% (12+ defensive actions including recoveries)
   - FWD: +8% (limited defensive actions)

2. **Liberal Assists:**
   - +5% boost across all positions

3. **BPS System Changes:**
   - GK: +8% (improved save BPS: 3 pts inside box, 2 outside)
   - DEF: +3% (goal-line clearances now 9 BPS vs 3)
   - High scorers: -5% (penalty goals normalized to 12 BPS)

### **Step 3: Position Multipliers (5 Roles)**
```typescript
const positionMultipliers = {
  1: 1.08, // GK - Goalkeeper
  2: 1.23, // DEF - Defender  
  3: 1.20, // MID - Midfielder
  4: 1.23  // FWD - Forward
};
prediction *= positionMultipliers[context.player.element_type] || 1.0;
```

**Position-Specific Logic:**
- **Position 1 (GK)**: Base 1.08x, +8% from 2025-26 save BPS improvements
- **Position 2 (DEF)**: Base 1.23x, +3% from goal-line clearances, +20% defensive contributions
- **Position 3 (MID)**: Base 1.20x, +5% liberal assists, +15% defensive contributions  
- **Position 4 (FWD)**: Base 1.23x, +5% liberal assists, +8% defensive contributions

### **Step 4: Home/Away Adjustments**
```typescript
if (context.is_home) {
  prediction *= 1.12; // Home advantage
} else {
  prediction *= 0.93; // Away penalty
}
```

### **Step 5: Fixture Difficulty Rating (FDR) Multiplier**
```typescript
if (context.fixture) {
  const fdrMultiplier = this.getFixtureDifficultyMultiplier(context.fixture, context.is_home);
  prediction *= fdrMultiplier;
}
```

**FDR Multipliers:**
- **Easy (Green)**: 1.25x boost
- **Medium (Yellow)**: 1.0x (no change)
- **Hard (Red)**: 0.85x reduction
- **Very Hard (Dark Red)**: 0.70x reduction

### **Step 6: Player Classification Penalties**
```typescript
const classification = this.classifyPlayer(context.player, context.elementSummary);
prediction *= classification.penaltyMultiplier;
```

**Classification Logic:**
1. **New to Premier League**: 40% penalty (0.60x)
   - Criteria: No baseline data AND no FPL history
2. **From Promoted Club**: 30% penalty (0.70x)
   - Teams: Burnley (ID: 3), Leeds (ID: 11), Sunderland (ID: 17)
3. **Young Player**: 25% penalty (0.75x)
   - Criteria: <15 games history AND ≤£6.0m
4. **Insufficient Data**: 15-35% penalty (0.65x - 0.85x)
   - Based on history length: <3 games (35%), <6 games (25%), <10 games (15%)

### **Step 7: Conservative Caps**
```typescript
prediction = this.applyConservativeCaps(prediction, context.player, classification, context.gameweek);
```

**Caps Applied:**
- **New to PL**: Max 5.0 points
- **Promoted Club**: Max 6.0 points
- **Young Player**: Max 4.5 points
- **Insufficient Data**: Max 4.0 points
- **Later Gameweeks**: GW6+ (5% reduction), GW8+ (10% reduction)

### **Step 8: Availability Scaling**
```typescript
if (context.player.chance_of_playing_next_round !== null) {
  const availabilityFactor = this.getAvailabilityMultiplier(context.player.chance_of_playing_next_round);
  prediction *= availabilityFactor;
}
```

**Availability Multipliers:**
- 100% chance: 1.0x
- 75% chance: 0.8x
- 50% chance: 0.6x
- 25% chance: 0.4x
- 0% chance: 0.0x

### **Step 9: Final Bounds**
```typescript
const minPrediction = classification.penaltyMultiplier < 0.8 ? 0.5 : 1.0;
return Math.max(minPrediction, Math.min(15.0, prediction));
```

---

## 🎮 **The 5 FPL Positions (Roles) - Complete Logic**

### **Position 1: Goalkeeper (GK)**
**Base Multiplier:** 1.08x
**2025-26 Rule Adjustments:**
- **Save BPS Improvements**: +8% (3 pts inside box, 2 outside, 8 for penalties)
- **Defensive Contributions**: +0% (no defensive actions count)
- **Clean Sheet Bonus**: +4 points for 0 goals conceded
- **Penalty Saves**: +5 points + bonus potential

**Calculation Example:**
```typescript
// Alisson (Liverpool) - GW2 vs Arsenal (A)
Base: 5.2 points
Position multiplier: ×1.08 = 5.6
2025-26 rules: ×1.08 = 6.0
Away penalty: ×0.93 = 5.6
FDR (Hard): ×0.85 = 4.8
Final: 4.8 points
```

### **Position 2: Defender (DEF)**
**Base Multiplier:** 1.23x
**2025-26 Rule Adjustments:**
- **Goal-line Clearances**: +3% (now 9 BPS vs 3 previously)
- **Defensive Contributions**: +20% (10+ clearances/blocks/interceptions/tackles)
- **Clean Sheet Bonus**: +4 points for 0 goals conceded
- **Goal Bonus**: +6 points + bonus potential

**Calculation Example:**
```typescript
// Van Dijk (Liverpool) - GW2 vs Arsenal (A)
Base: 6.8 points
Position multiplier: ×1.23 = 8.4
2025-26 rules: ×1.03 = 8.6
Defensive boost: ×1.20 = 10.3
Away penalty: ×0.93 = 9.6
FDR (Hard): ×0.85 = 8.2
Final: 8.2 points
```

### **Position 3: Midfielder (MID)**
**Base Multiplier:** 1.20x
**2025-26 Rule Adjustments:**
- **Liberal Assists**: +5% boost across all positions
- **Defensive Contributions**: +15% (12+ defensive actions including recoveries)
- **Goal Bonus**: +5 points + bonus potential
- **Assist Bonus**: +3 points + bonus potential

**Calculation Example:**
```typescript
// Mohamed Salah (Liverpool) - GW2 vs Arsenal (A)
Base: 9.2 points
Position multiplier: ×1.20 = 11.0
2025-26 rules: ×1.05 = 11.6
Defensive boost: ×1.15 = 13.3
Away penalty: ×0.93 = 12.4
FDR (Hard): ×0.85 = 10.5
Final: 10.5 points
```

### **Position 4: Forward (FWD)**
**Base Multiplier:** 1.23x
**2025-26 Rule Adjustments:**
- **Liberal Assists**: +5% boost across all positions
- **Defensive Contributions**: +8% (limited defensive actions)
- **Goal Bonus**: +4 points + bonus potential
- **Assist Bonus**: +3 points + bonus potential

**Calculation Example:**
```typescript
// Erling Haaland (Man City) - GW2 vs Newcastle (H)
Base: 10.5 points
Position multiplier: ×1.23 = 12.9
2025-26 rules: ×1.05 = 13.5
Defensive boost: ×1.08 = 14.6
Home advantage: ×1.12 = 16.4
FDR (Medium): ×1.0 = 16.4
Final: 15.0 points (capped at 15.0)
```

---

## 📊 **Player Classification Examples**

### **Promoted Club Players (30% penalty)**
- **Teams**: Burnley, Leeds, Sunderland
- **Penalty**: 0.70x multiplier
- **Max Points**: 6.0 per gameweek

### **Young Players (25% penalty)**
- **Criteria**: <15 games history + ≤£6.0m
- **Penalty**: 0.75x multiplier
- **Max Points**: 4.5 per gameweek

### **Insufficient Data (15-35% penalty)**
- **<3 games**: 35% penalty (0.65x)
- **<6 games**: 25% penalty (0.75x)
- **<10 games**: 15% penalty (0.85x)
- **Max Points**: 4.0 per gameweek

---

## 🎮 **Expected Points Output Structure**

Each player gets predictions for the next 8 gameweeks:

```typescript
interface PlayerPrediction {
  player_id: number;
  name: string;
  team: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  
  // 8 gameweek predictions
  gw2_xp: number;
  gw3_xp: number;
  gw4_xp: number;
  gw5_xp: number;
  gw6_xp: number;
  gw7_xp: number;
  gw8_xp: number;
  gw9_xp: number;
  
  total_8gw_xp: number;
  
  fixtures: Array<{
    gameweek: number;
    opponent: string;
    home_away: 'H' | 'A';
    difficulty?: number;
    expected_points: number;
  }>;
}
```

---

## 🔍 **Calculation Validation**

### **Logging Output Examples:**
```
🔧 PENALTY APPLIED: Wirtz
  penalty: 0.60x
  newToPL: true
  promotedClub: false
  dataQuality: new_player

🏟️ FDR APPLIED: Salah GW4
  opponent: Burnley
  homeAway: H
  difficulty: 2
  multiplier: 1.25x
  adjustedPoints: 8.5

📊 CAP APPLIED: Wirtz
  original: 7.2
  capped: 5.0
  reason: new_player
```

---

## 📈 **Expected Results by Player Type**

### **Elite Established Players (Salah, Haaland, etc.)**
- **Base Range**: 8-12 points per gameweek
- **FDR Adjustments**: ±15-25% based on fixture difficulty
- **Final Range**: 6-15 points per gameweek

### **New Premier League Players**
- **Base Range**: 4-8 points per gameweek
- **Penalty Applied**: 40% reduction
- **Cap Applied**: Max 5.0 points
- **Final Range**: 2-5 points per gameweek

### **Promoted Club Players**
- **Base Range**: 5-9 points per gameweek
- **Penalty Applied**: 30% reduction
- **Cap Applied**: Max 6.0 points
- **Final Range**: 3-6 points per gameweek

### **Young/Unproven Players**
- **Base Range**: 3-7 points per gameweek
- **Penalty Applied**: 25% reduction
- **Cap Applied**: Max 4.5 points
- **Final Range**: 2-4.5 points per gameweek

---

## 🎯 **Key Benefits of This System**

1. **Realistic Predictions**: Conservative caps prevent unrealistic scores
2. **Fixture-Aware**: FDR properly influences expected points
3. **Player-Aware**: New players get appropriate penalties
4. **Rule-Compliant**: 2025-26 FPL changes are incorporated
5. **Strategic Planning**: 8-gameweek horizon for transfer planning
6. **Self-Updating**: Automatically detects new players without manual lists

---

## 📝 **Usage in App**

This calculation runs during app startup in `LoadingScreen.tsx` and generates predictions for all players. The results are stored in `DataContext` and used across:

- **Players Tab**: Shows XP for next 3 gameweeks
- **Best 11 Tab**: Generates optimal teams for next 3 gameweeks
- **Squad Tab**: Shows current team XP for next 3 gameweeks
- **Points Tab**: Historical performance data

The system ensures consistency between displayed FDR colors and calculated expected points, providing users with accurate predictions for FPL decision-making.
