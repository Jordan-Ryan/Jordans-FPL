import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider } from './src/context/ThemeContext';
import { DataProvider, useData } from './src/context/DataContext';

// Screens
import LoadingScreen from './src/screens/LoadingScreen';
import PointsScreen from './src/screens/PointsScreen';
import FixturesScreen from './src/screens/FixturesScreen';
import PlayersScreen from './src/screens/PlayersScreen';
import SquadScreen from './src/screens/SquadScreen';
import Best11Screen from './src/screens/Best11Screen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const { isLoading } = useData();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Points') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Fixtures') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Players') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Squad') {
              iconName = focused ? 'football' : 'football-outline';
            } else if (route.name === 'Best 11') {
              iconName = focused ? 'trophy' : 'trophy-outline';
            } else {
              iconName = 'help-outline';
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#6366f1',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Points" component={PointsScreen} />
        <Tab.Screen name="Fixtures" component={FixturesScreen} />
        <Tab.Screen name="Players" component={PlayersScreen} />
        <Tab.Screen name="Squad" component={SquadScreen} />
        <Tab.Screen name="Best 11" component={Best11Screen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
