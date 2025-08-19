# Player Details Components

This document describes the reusable player details components that can be used across different screens in the Fantasy Premier League app.

## Components Overview

### 1. PlayerDetailsModal
The main modal component that displays comprehensive player information in a popup format.

**Features:**
- Player profile with photo, name, position, and club
- Key statistics grid (Price, Points/Match, Form, Selected %)
- Form and fixtures section
- Tabbed interface for different data views

**Props:**
```typescript
interface PlayerDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  player: Player | null;
  fplPlayer: FPLPlayer | null;
  team: FPLTeam | null;
}
```

### 2. PlayerStatsSection
A tabbed component that displays player statistics in three categories:
- **Matches**: Recent match results and upcoming fixtures
- **Stats**: Season statistics, FPL stats, price history, and transfer activity
- **History**: Previous seasons performance data in table format

**Props:**
```typescript
interface PlayerStatsSectionProps {
  fplPlayer: FPLPlayer;
}
```

### 3. PlayerFixturesSection
Displays upcoming fixtures for a player with difficulty ratings and match details.

**Props:**
```typescript
interface PlayerFixturesSectionProps {
  fixtures: any[];
  team: FPLTeam;
}
```

### 4. PlayerHistorySection
Shows comprehensive player history including:
- Price changes over time
- Transfer activity
- Performance metrics
- Status and availability information

**Props:**
```typescript
interface PlayerHistorySectionProps {
  fplPlayer: FPLPlayer;
}
```

## Usage Examples

### Basic Implementation in PointsScreen

```typescript
import PlayerDetailsModal from '../components/PlayerDetailsModal';

const PointsScreen: React.FC = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);

  const handlePlayerPress = (player: Player) => {
    setSelectedPlayer(player);
    setShowPlayerDetails(true);
  };

  return (
    <View>
      {/* Your existing screen content */}
      
      {/* Player Details Modal */}
      <PlayerDetailsModal
        visible={showPlayerDetails}
        onClose={() => {
          setShowPlayerDetails(false);
          setSelectedPlayer(null);
        }}
        player={selectedPlayer}
        fplPlayer={selectedPlayer ? getPlayerById(selectedPlayer.id) || null : null}
        team={selectedPlayer ? teams.find(t => t.id === (getPlayerById(selectedPlayer.id)?.team || 0)) || null : null}
        fixtures={fixtures}
        currentGameweek={currentGameweek.id}
      />
    </View>
  );
};
```

### Tab Structure

The PlayerDetailsModal now has three organized tabs:

1. **Matches Tab**: Shows match results in a table format with columns: GW, Opponent, Results, Points, More
2. **Stats Tab**: Contains four sections:
   - Season Stats (starts, minutes, goals, assists, etc.)
   - FPL Stats (total points, form, ICT indices, selection %)
   - Price History (current, start of season, this gameweek)
   - Transfer Activity (transfers in/out for current GW and total)
3. **History Tab**: Displays previous seasons performance data in a table format with columns:
   - Season (e.g., 2024/25, 2023/24)
   - Pts (Points)
   - St (Starts)
   - MP (Minutes Played)
   - GS (Goals Scored)
   - A (Assists)
   - xG (Expected Goals)

### Implementation in FixturesScreen

```typescript
import PlayerDetailsModal from '../components/PlayerDetailsModal';

const FixturesScreen: React.FC = () => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);

  // You can trigger this from fixture details or team player lists
  const handlePlayerPress = (player: Player) => {
    setSelectedPlayer(player);
    setShowPlayerDetails(true);
  };

  return (
    <View>
      {/* Your existing screen content */}
      
      {/* Player Details Modal */}
      <PlayerDetailsModal
        visible={showPlayerDetails}
        onClose={() => {
          setShowPlayerDetails(false);
          setSelectedPlayer(null);
        }}
        player={selectedPlayer}
        fplPlayer={selectedPlayer ? getPlayerById(selectedPlayer.id) || null : null}
        team={selectedPlayer ? teams.find(t => t.id === (getPlayerById(selectedPlayer.id)?.team || 0)) || null : null}
        fixtures={fixtures}
        currentGameweek={currentGameweek.id}
      />
    </View>
  );
};
```

## Styling and Customization

All components use the theme context for consistent styling across the app. The components include:

- **Shadow effects** for depth
- **Rounded corners** for modern appearance
- **Responsive layouts** that work on different screen sizes
- **Theme-aware colors** that adapt to light/dark modes

## Data Requirements

To use these components, you need:

1. **Player data** from your squad management system
2. **FPL API data** including player statistics and team information

## Future Enhancements

Potential improvements for these components:

- **Player comparison** functionality
- **Transfer recommendations** based on stats
- **Performance charts** and graphs
- **Social features** like player ratings and comments
- **Integration** with external stats providers

## Notes

- All components are designed to be reusable across different screens
- The modal presentation style provides a focused view of player information
- Components handle missing data gracefully with fallbacks
- Performance is optimized with proper state management and memoization 