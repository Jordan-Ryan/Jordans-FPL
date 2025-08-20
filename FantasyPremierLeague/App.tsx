import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider } from './src/context/ThemeContext';

// Screens
import LoadingScreen from './src/screens/LoadingScreen';
import PointsScreen from './src/screens/PointsScreen';
import FixturesScreen from './src/screens/FixturesScreen';
import PlayersScreen from './src/screens/PlayersScreen';
import Best11Screen from './src/screens/Best11Screen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [cachedData, setCachedData] = useState<any>(null);

  const handleLoadingComplete = (data: any) => {
    setCachedData(data);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <ThemeProvider>
        <LoadingScreen onComplete={handleLoadingComplete} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
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
          <Tab.Screen 
            name="Points" 
            component={PointsScreen}
            initialParams={{ cachedData }}
          />
          <Tab.Screen 
            name="Fixtures" 
            component={FixturesScreen}
            initialParams={{ cachedData }}
          />
          <Tab.Screen 
            name="Players" 
            component={PlayersScreen}
            initialParams={{ cachedData }}
          />
          <Tab.Screen 
            name="Best 11" 
            component={Best11Screen}
            initialParams={{ cachedData }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}
