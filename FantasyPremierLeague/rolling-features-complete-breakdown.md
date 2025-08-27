# 🔄 Rolling Features & Complete Calculation Breakdown

## 📊 **All Data Points Used in Expected Points Calculation**

This document shows the complete breakdown of every rolling average, feature, and data point that goes into calculating expected points for each player.

---

## 🎯 **Rolling Averages (Form Features)**

### **Points Rolling Averages**
The system calculates 4 different rolling averages for points, each with different weights:

| Rolling Period | Weight | Description | Calculation |
|----------------|--------|-------------|-------------|
| **3-Game** | **35%** | Recent form | Average of last 3 games |
| **5-Game** | **30%** | Short-term form | Average of last 5 games |
| **8-Game** | **25%** | Medium-term form | Average of last 8 games |
| **15-Game** | **10%** | Long-term form | Average of last 15 games |

**Formula:**
```typescript
Base Prediction = 
  (roll3_points × 0.35) + 
  (roll5_points × 0.30) + 
  (roll8_points × 0.25) + 
  (roll15_points × 0.10)
```

### **Minutes Rolling Averages**
| Rolling Period | Purpose | Impact |
|----------------|---------|---------|
| **3-Game** | Recent playing time | Reliability factor |
| **5-Game** | **Minutes reliability** | ×1.15 multiplier if ≥90 mins |
| **8-Game** | Medium-term availability | Consistency check |

**Minutes Reliability Formula:**
```typescript
minutesReliability = Math.min(roll5_minutes / 90.0, 1.2)
prediction *= minutesReliability × 1.15
```

### **Consistency & Starts**
| Feature | Weight | Formula | Impact |
|---------|--------|---------|---------|
| **5-Game Consistency** | 0.85 | 1/(1 + standard_deviation) | ×(0.8 + 0.4 × consistency) |
| **5-Game Starts** | 0.90 | % of games with ≥60 mins | ×(0.7 + 0.3 × starts_rate) |

---

## 📈 **Advanced Statistics Features**

### **ICT Index (Influence, Creativity, Threat)**
- **Weight**: 0.08
- **Calculation**: Average ICT index across all historical games
- **Impact**: Added directly to prediction
- **Formula**: `prediction += avg_ict × 0.08`

### **Bonus Points System (BPS)**
- **Weight**: 0.015
- **Calculation**: Average BPS across all historical games
- **Impact**: Added directly to prediction
- **Formula**: `prediction += avg_bps × 0.015`

### **Expected Goal Involvements**
- **Weight**: 1.05
- **Calculation**: Average expected goals + assists across all games
- **Impact**: Added directly to prediction
- **Formula**: `prediction += avg_expected_gi × 1.05`

---

## 🏟️ **Fixture & Context Features**

### **Home/Away Advantage**
- **Home**: ×1.10 multiplier (10% boost)
- **Away**: ×0.94 multiplier (6% penalty)

### **Fixture Difficulty Rating (FDR)**
| Difficulty | Color | Multiplier | Impact |
|------------|-------|------------|---------|
| **Easy** | Green | 1.25x | +25% boost |
| **Medium** | Yellow | 1.0x | No change |
| **Hard** | Red | 0.85x | -15% reduction |
| **Very Hard** | Dark Red | 0.70x | -30% reduction |

---

## 🎮 **Position-Specific Features (5 Roles)**

### **Position 1: Goalkeeper (GK)**
- **Base Multiplier**: 1.08x
- **2025-26 Rules**: +8% (improved save BPS)
- **Defensive Contributions**: +0% (no defensive actions)
- **Scoring**: 2pts appearance, +4 clean sheet, +1-2 saves, +5 penalty saves

### **Position 2: Defender (DEF)**
- **Base Multiplier**: 1.23x
- **2025-26 Rules**: +3% (goal-line clearances), +20% defensive contributions
- **Scoring**: 2pts appearance, +4 clean sheet, +6 goals, +3 assists

### **Position 3: Midfielder (MID)**
- **Base Multiplier**: 1.20x
- **2025-26 Rules**: +5% liberal assists, +15% defensive contributions
- **Scoring**: 2pts appearance, +1 clean sheet, +5 goals, +3 assists

### **Position 4: Forward (FWD)**
- **Base Multiplier**: 1.23x
- **2025-26 Rules**: +5% liberal assists, +8% defensive contributions
- **Scoring**: 2pts appearance, +1 clean sheet, +4 goals, +3 assists

---

## 🔧 **Complete Calculation Example - Mohamed Salah**

### **Step 1: Rolling Features Calculation**
```typescript
// Historical data (example values)
roll3_points = [12, 8, 15] → average = 11.7
roll5_points = [12, 8, 15, 6, 10] → average = 10.2
roll8_points = [12, 8, 15, 6, 10, 9, 7, 11] → average = 9.8
roll15_points = [12, 8, 15, 6, 10, 9, 7, 11, 13, 5, 8, 12, 9, 10, 11] → average = 9.7

// Base prediction calculation
Base = (11.7 × 0.35) + (10.2 × 0.30) + (9.8 × 0.25) + (9.7 × 0.10)
Base = 4.1 + 3.1 + 2.5 + 1.0 = 10.7 points
```

### **Step 2: Minutes & Consistency Adjustments**
```typescript
// Minutes reliability (last 5 games: 90, 90, 90, 90, 90)
roll5_minutes = 90
minutesReliability = Math.min(90/90, 1.2) = 1.0
prediction *= 1.0 × 1.15 = 12.3

// Consistency (low standard deviation = high consistency)
roll5_consistency = 0.85 (high consistency)
prediction *= (0.8 + 0.4 × 0.85) = 1.14
prediction = 12.3 × 1.14 = 14.0

// Starts reliability (all 5 games ≥60 mins)
roll5_starts = 1.0 (100% starts)
prediction *= (0.7 + 0.3 × 1.0) = 1.0
prediction = 14.0 × 1.0 = 14.0
```

### **Step 3: Advanced Statistics**
```typescript
// ICT Index boost
avg_ict = 8.5
ictBoost = 8.5 × 0.08 = 0.68
prediction += 0.68 = 14.68

// BPS boost
avg_bps = 25.2
bpsBoost = 25.2 × 0.015 = 0.38
prediction += 0.38 = 15.06

// Expected goal involvements
avg_expected_gi = 1.2
expectedBoost = 1.2 × 1.05 = 1.26
prediction += 1.26 = 16.32
```

### **Step 4: 2025-26 Rule Adjustments**
```typescript
// Position 3 (MID) adjustments
2025_26Rules = apply2025_26Rules(player, 16.32)
// +5% liberal assists, +15% defensive contributions
prediction = 16.32 × 1.05 × 1.15 = 19.7
```

### **Step 5: Position Multiplier**
```typescript
// Position 3 (MID) multiplier
positionMultiplier = 1.20
prediction *= 1.20 = 23.6
```

### **Step 6: Home/Away Adjustment**
```typescript
// Away game penalty
awayPenalty = 0.94
prediction *= 0.94 = 22.2
```

### **Step 7: FDR Multiplier**
```typescript
// Hard fixture (Arsenal away)
fdrMultiplier = 0.85
prediction *= 0.85 = 18.9
```

### **Step 8: Player Classification**
```typescript
// Established player - no penalties
classification.penaltyMultiplier = 1.0
prediction *= 1.0 = 18.9
```

### **Step 9: Conservative Caps**
```typescript
// No caps applied for established player
prediction = 18.9
```

### **Step 10: Final Bounds**
```typescript
// Cap at maximum 15.0 points
finalPrediction = Math.min(18.9, 15.0) = 15.0
```

**Final Result: 15.0 points (capped at maximum)**

---

## 📊 **Feature Importance Ranking**

Based on the model weights, here's what matters most:

| Rank | Feature | Weight | Impact |
|------|---------|--------|---------|
| **1** | 15-Game Form | 0.838 | 83.8% of base prediction |
| **2** | Element Type | 0.143 | 14.3% of position influence |
| **3** | Expected GI | 0.013 | 1.3% of goal involvement |
| **4** | 8-Game Form | 0.004 | 0.4% of medium-term form |
| **5** | 5-Game Form | 0.001 | 0.1% of short-term form |
| **6** | ICT Index | 0.0001 | Minimal impact |
| **7** | BPS | 0.0001 | Minimal impact |

---

## 🔍 **Data Quality Indicators**

### **Data Quality Levels**
| Level | Games | Description | Penalty |
|-------|-------|-------------|---------|
| **Excellent** | 15+ | Full historical data | None |
| **Good** | 10-14 | Substantial data | None |
| **Limited** | 6-9 | Some data | 15-25% |
| **Minimal** | 3-5 | Very limited data | 25-35% |
| **New Player** | 0-2 | No data | 40% |

### **Spike Smoothing**
- **Purpose**: Reduce impact of outlier performances
- **Trigger**: Single-game spike > 2× recent mean
- **Effect**: Last game points reduced by 15%
- **Formula**: `spikeFactor = lastGamePts > 2 × recentMean ? 0.85 : 1.0`

---

## 📱 **Real-Time Updates**

### **Dynamic Features**
- **Form**: Updates after each gameweek
- **Minutes**: Real-time availability tracking
- **Consistency**: Rolling standard deviation updates
- **FDR**: Fixture difficulty changes
- **Availability**: Injury/suspension updates

### **Prediction Refresh**
- **Frequency**: Every gameweek
- **Trigger**: New gameweek data available
- **Impact**: All rolling averages recalculated
- **Result**: Updated expected points for next 8 gameweeks

---

## 🎯 **Key Insights**

1. **Form is King**: 15-game form accounts for 83.8% of base prediction
2. **Position Matters**: Each position has unique multipliers and bonuses
3. **Consistency Rewarded**: Players with stable performance get boosts
4. **Minutes Critical**: Playing time directly affects reliability
5. **FDR Integration**: Fixture difficulty properly influences predictions
6. **Conservative Approach**: Caps prevent unrealistic projections
7. **Real-Time**: System adapts to current form and availability

This comprehensive system ensures that every aspect of a player's performance, from recent form to historical consistency, is properly weighted and incorporated into their expected points calculation.

