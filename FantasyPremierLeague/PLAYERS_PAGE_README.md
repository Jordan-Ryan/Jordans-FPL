# Players Page

The Players page is a comprehensive view of all FPL players with advanced filtering, sorting, and search capabilities.

## Features

### Search & Filtering
- **Search by Name**: Real-time search through all players
- **Position Filter**: Filter by Goalkeeper, Defender, Midfielder, or Forward
- **Club Filter**: Filter by specific Premier League clubs
- **Price Filter**: Set maximum price limit (from £5m to £15m)

### Sortable Columns
All columns can be sorted in ascending or descending order:

1. **Player**: Player name and team information
2. **Form**: Current form rating
3. **Price**: Current player price
4. **Selected**: Percentage of FPL managers who own the player
5. **GW Points**: Points scored in the current gameweek
6. **Total Points**: Total points for the season
7. **ICT Index**: Influence, Creativity, and Threat combined index
8. **Transfers In**: Number of managers who transferred the player in
9. **Transfers Out**: Number of managers who transferred the player out
10. **Bonus Points**: Number of bonus points earned
11. **Next 3 Fixtures**: Upcoming fixture difficulty (placeholder for now)

### Player Information Display
Each player row shows:
- Player name and photo
- Team jersey color representation
- Club name and position
- Warning icons for injured/suspended players
- Star icons for special players

### Data Source
- Fetches real-time data from the official FPL API
- Updates automatically when the page loads
- Displays all active FPL players

### Responsive Design
- Horizontal scrolling for wide table layout
- Mobile-optimized interface
- Consistent with app theme and styling

## Technical Implementation

### Files
- `src/screens/PlayersScreen.tsx` - Main component
- `src/styles/PlayersScreen.styles.ts` - Styling

### Dependencies
- Uses existing FPL API service
- Integrates with app theme system
- Follows established component patterns

### Performance
- Efficient filtering and sorting with useMemo
- Lazy loading of player data
- Optimized re-renders

## Usage

1. Navigate to the Players tab in the bottom navigation
2. Use the search bar to find specific players
3. Apply filters using the filter buttons
4. Click column headers to sort by different criteria
5. Scroll horizontally to view all columns
6. Scroll vertically to browse all players

## Future Enhancements

- Integration with fixtures API for real next 3 fixtures
- Player comparison functionality
- Advanced statistics and analytics
- Player watchlist functionality
- Export player data
- Integration with squad management 