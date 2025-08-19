# Squad Data Model - React Native FPL App

## Overview

This document explains how to use the simplified local squad data model that replaces hardcoded player data in the React Native FPL app. The model is designed to be easily updatable and maintainable, with all player information fetched from the FPL API.

## File Structure

```
src/
├── data/
│   └── squadData.ts          # Main squad data model (simplified)
├── components/
│   └── SquadManager.tsx      # Squad management component
├── types/
│   └── index.ts              # TypeScript interfaces
└── screens/
    └── HomeScreen.tsx        # Updated to use squad data
```

## Key Features

### ✅ **Easy to Update**
- All player data is stored in a single, well-organized file
- FPL IDs can be updated without touching component code
- Clear comments and structure make maintenance simple
- Player names, clubs, and positions are automatically fetched from FPL API

### ✅ **Type Safe**
- Full TypeScript support with proper interfaces
- Compile-time error checking for data consistency
- IntelliSense support for all player properties

### ✅ **Flexible Management**
- Built-in helper functions for common operations
- Support for captain/vice-captain changes
- Easy substitution between starting XI and bench
- Squad statistics and analysis

## Data Model Structure

### **Simplified Player Interface**
```typescript
export interface Player {
  id: number;                    // FPL Player ID
  starter: boolean;              // Is player in starting XI?
  captain: boolean;              // Is player captain?
  vice_captain: boolean;         // Is player vice-captain?
  team_position?: number;        // Position in starting XI (1-11)
  bench_position?: number;       // Position on bench (1-4)
}
```

### **What's Automatically Fetched**
- **Player Names**: From FPL API `web_name` field
- **Club Names**: From FPL API team data
- **Positions**: From FPL API `element_type` field
- **Player Stats**: Cost, form, points, etc.
- **Team Information**: Club details and badges

## How to Update Player Data

### 1. **Update FPL IDs**
```typescript
// In src/data/squadData.ts
{ 
  id: 182, // James Trafford - FOUND at Man City
  starter: true, 
  captain: false, 
  vice_captain: true, 
  team_position: 1
}
```

### 2. **Change Player Roles**
```typescript
// Make a player captain
{ 
  id: 381, // Mohamed Salah
  starter: true, 
  captain: true,        // Changed to true
  vice_captain: false, 
  team_position: 6
}
```

### 3. **Add New Players**
```typescript
// Add new player to the squadData array
{ 
  id: 999, // New FPL ID
  starter: false, 
  captain: false, 
  vice_captain: false, 
  bench_position: 5
}
```

### 4. **Remove Players**
```typescript
// Simply remove the player object from the squadData array
// The SquadManager will handle reordering automatically
```

## Using the Squad Manager Component

### **Basic Usage**
```typescript
import SquadManager from '../components/SquadManager';

// In your component
<SquadManager 
  onSquadUpdate={(updatedSquad) => {
    // Handle squad updates
    console.log('Squad updated:', updatedSquad);
  }}
/>
```

### **Available Actions**
- **Change Captain**: Tap the "C" button on any player
- **Change Vice-Captain**: Tap the "VC" button on any player
- **Substitute**: Move players between starting XI and bench
- **View Statistics**: See squad overview and formation breakdown
- **Check Status**: Identify players needing FPL IDs

## Helper Functions

### **Squad Statistics**
```typescript
import { squadHelpers } from '../data/squadData';

const stats = squadHelpers.getSquadStats();
console.log(stats);
// Output:
// {
//   totalPlayers: 15,
//   activePlayers: 10,
//   inactivePlayers: 5,
//   startingXI: 11,
//   benchPlayers: 4
// }
```

### **Filter Players**
```typescript
// Get all active players (with valid FPL IDs)
const activePlayers = squadHelpers.getActivePlayers();

// Get starting XI
const startingXI = squadHelpers.getStartingXI();

// Get bench players
const bench = squadHelpers.getBenchPlayers();
```

### **Captain Management**
```typescript
// Get current captain and vice-captain
const captain = squadHelpers.getCaptain();
const viceCaptain = squadHelpers.getViceCaptain();
```

## Data Persistence

### **Current Implementation**
- Data is stored in local component state
- Changes are lost on app restart
- Console logging for debugging

### **Recommended Improvements**
```typescript
// Add AsyncStorage for persistence
import AsyncStorage from '@react-native-async-storage/async-storage';

// Save squad data
const saveSquad = async (squad: Player[]) => {
  try {
    await AsyncStorage.setItem('fplSquad', JSON.stringify(squad));
  } catch (error) {
    console.error('Error saving squad:', error);
  }
};

// Load squad data
const loadSquad = async () => {
  try {
    const savedSquad = await AsyncStorage.getItem('fplSquad');
    if (savedSquad) {
      return JSON.parse(savedSquad);
    }
  } catch (error) {
    console.error('Error loading squad:', error);
  }
  return squadData; // Fallback to default
};
```

## Integration with FPL API

### **Automatic Data Fetching**
The app automatically fetches:
- **Player Information**: Names, positions, costs, form
- **Team Data**: Club names, badges, statistics
- **Live Updates**: Current form, points, availability

### **Benefits of API Integration**
- **Always Up-to-Date**: Player information is current
- **No Manual Updates**: Names and clubs update automatically
- **Rich Data**: Access to form, points, cost changes
- **Real-time**: Live data from official FPL sources

## Troubleshooting

### **Common Issues**

1. **TypeScript Errors**
   - Ensure all required fields are present in player objects
   - Check that FPL IDs are numbers (not strings)
   - Verify team_position and bench_position are valid

2. **Player Not Found**
   - Check if player has moved clubs (FPL API will show current club)
   - Verify FPL ID is correct
   - Use the "Check Status" button to identify issues

3. **Formation Issues**
   - Ensure starting XI has exactly 11 players
   - Check that bench has 4 players
   - Use squad statistics to verify formation

### **Debug Mode**
```typescript
// Enable debug logging
console.log('Current squad:', squadData);
console.log('Squad stats:', squadHelpers.getSquadStats());
console.log('Active players:', squadHelpers.getActivePlayers());
```

## Best Practices

### **Data Management**
- Keep FPL IDs accurate and up-to-date
- Use descriptive comments for complex formations
- Test formation changes before committing
- Monitor FPL API for player transfers

### **Performance**
- Avoid unnecessary re-renders by using proper state management
- Use React.memo for player cards if dealing with large squads
- Implement pagination for very large squads

### **User Experience**
- Provide clear feedback for all actions
- Use consistent visual indicators for player roles
- Implement undo functionality for critical changes
- Add confirmation dialogs for destructive actions

## Future Roadmap

### **Planned Features**
- [ ] Real-time FPL data sync
- [ ] Transfer market integration
- [ ] Chip management
- [ ] Gameweek planning
- [ ] Team comparison tools
- [ ] Export/import functionality

### **API Integration**
- [ ] Auto-update player availability
- [ ] Live fixture data
- [ ] Player injury updates
- [ ] Price change notifications

## Migration from Old Model

### **What Changed**
- Removed `name`, `club`, `position`, and `status` fields
- All player information now comes from FPL API
- Simplified data structure for easier maintenance
- Enhanced real-time data integration

### **Benefits of New Model**
- **Cleaner Code**: Less data duplication
- **Always Current**: No manual updates needed
- **Rich Information**: Access to full FPL player data
- **Easier Maintenance**: Single source of truth for player data

This simplified squad data model provides a solid foundation for building a comprehensive FPL management app while maintaining simplicity and ease of use. The integration with the FPL API ensures that all player information is always current and accurate. 