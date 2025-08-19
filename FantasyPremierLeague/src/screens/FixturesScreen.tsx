import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Fixture } from '../types';
import { fplApiService } from '../services/fplApi';
import { Dropdown } from 'react-native-element-dropdown';
import { PremierLeagueLogo } from '../components/PremierLeagueLogo';
import { premierLeagueClubs, getClubByName } from '../data/premierLeagueClubs';

import { styles } from '../styles/FixturesScreen.styles';

const FixturesScreen: React.FC = () => {
  const theme = useTheme();
  const [selectedGameweek, setSelectedGameweek] = useState<number>(1);
  const [selectedClub, setSelectedClub] = useState<string>('All');
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [showFixtureModal, setShowFixtureModal] = useState(false);

  // Fetch fixtures from FPL API
  useEffect(() => {
    const loadFixtures = async () => {
      try {
        setLoading(true);
        console.log('Fetching fixtures from FPL API...');
        
        // Fetch teams first so we have them for badge URLs
        const teamsData = await fplApiService.fetchAllTeams();
        setTeams(teamsData);
        
        let fixturesData: Fixture[] = [];
        
        if (selectedGameweek === 0) {
          // Fetch all fixtures
          fixturesData = await fplApiService.getAllFixtures();
        } else {
          // Fetch fixtures for specific gameweek
          fixturesData = await fplApiService.getFixturesForGameweek(selectedGameweek);
        }
        
        console.log('Fixtures fetched:', fixturesData.length);
        
        // If no fixtures returned, show a message
        if (fixturesData.length === 0) {
          console.log('No fixtures returned from API');
          // You could set an error message here or show a different state
        }
        
        setFixtures(fixturesData);
        
      } catch (error) {
        console.error('Error loading fixtures:', error);
        setError('Failed to load fixtures');
        // Set empty fixtures array on error
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    };

    loadFixtures();
  }, [selectedGameweek]);

  const gameweeks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38];
  
  // Build clubs list from Premier League clubs data
  const clubs = useMemo(() => {
    const allClubs = [{ label: 'All Clubs', value: 'All', color: '#37003C' }];
    
    // Add all Premier League clubs
    premierLeagueClubs.forEach(club => {
      allClubs.push({
        label: club.name,
        value: club.name,
        color: club.primary_color
      });
    });
    
    return allClubs;
  }, []);

  const filteredFixtures = useMemo(() => {
    return fixtures
      .filter(fixture => {
        const matchesGameweek = selectedGameweek === 0 || fixture.gameweek === selectedGameweek;
        const matchesClub = selectedClub === 'All' || 
                           fixture.home_team === selectedClub || 
                           fixture.away_team === selectedClub;
        return matchesGameweek && matchesClub;
      })
      .sort((a, b) => {
        // Sort by date/time, with live matches first
        if (a.status === 'LIVE' && b.status !== 'LIVE') return -1;
        if (b.status === 'LIVE' && a.status !== 'LIVE') return 1;
        
        // Sort by kickoff date/time (earliest first)
        if (a.kickoff && b.kickoff) {
          return new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime();
        }
        
        // Fallback: sort by date string
        if (a.date && b.date) {
          return a.date.localeCompare(b.date);
        }
        
        return 0;
      });
  }, [fixtures, selectedGameweek, selectedClub]);

  const handleFixturePress = (fixture: Fixture) => {
    setSelectedFixture(fixture);
    setShowFixtureModal(true);
  };

  const getTeamBadgeUrl = (teamName: string): string => {
    // Find the team in the FPL teams data first
    const fplTeam = teams.find((team: any) => team.name === teamName);
    if (fplTeam) {
      // Use FPL team code for badge URL
      return `https://resources.premierleague.com/premierleague/badges/t${fplTeam.code}.png`;
    }
    
    // Fallback to our club data if FPL team not found
    const club = getClubByName(teamName);
    if (club) {
      return `https://resources.premierleague.com/premierleague/badges/t${club.id}.png`;
    }
    
    // Fallback to Premier League badge
    return 'https://resources.premierleague.com/premierleague/badges/pl.png';
  };

  const renderFixtureItem = ({ item }: { item: Fixture }) => {
    const homeBadgeUrl = getTeamBadgeUrl(item.home_team);
    const awayBadgeUrl = getTeamBadgeUrl(item.away_team);
    
    // Get team colors for background
    const getTeamColor = (teamName: string) => {
      const club = getClubByName(teamName);
      return club?.primary_color || '#1F2937';
    };
    
    return (
      <TouchableOpacity 
        style={styles.fixtureItem}
        onPress={() => handleFixturePress(item)}
      >
        {/* Background Team Colors */}
        <View style={[styles.teamBackgroundLeft, { backgroundColor: `${getTeamColor(item.home_team)}66` }]} />
        <View style={[styles.teamBackgroundRight, { backgroundColor: `${getTeamColor(item.away_team)}66` }]} />
        
        {/* Content */}
        {/* Top Row: GW Badge + Date/Time/Status */}
        <View style={styles.fixtureHeader}>
          <View style={styles.headerLeftSection}>
            <View style={styles.gameweekBadge}>
              <Text style={styles.gameweekText}>GW{item.gameweek}</Text>
            </View>
          </View>
          <View style={styles.headerCenterSection}>
            {item.status === 'LIVE' ? (
              <Text style={styles.minutesText}>{item.minutes}</Text>
            ) : item.status === 'FINISHED' ? (
              <Text style={styles.statusText}>FT</Text>
            ) : item.status === 'HALF_TIME' ? (
              <Text style={styles.statusText}>HT</Text>
            ) : (
              <Text style={styles.dateText}>{item.date}</Text>
            )}
          </View>
          <View style={styles.headerRightSection}>
            {/* Empty space for balance */}
          </View>
        </View>

        {/* Bottom Row: Team Name + Badge | Score/VS | Badge + Team Name */}
        <View style={styles.fixtureContent}>
          {/* Home Team: Name + Badge */}
          <View style={styles.homeTeamSection}>
            <Text style={styles.teamName}>{item.home_team}</Text>
            <Image source={{ uri: homeBadgeUrl }} style={styles.teamBadge} />
          </View>

          {/* Center: Score or VS */}
          <View style={styles.centerSection}>
            {item.status === 'LIVE' || item.status === 'FINISHED' ? (
              <Text style={styles.scoreText}>
                {item.home_score || 0} - {item.away_score || 0}
              </Text>
            ) : (
              <Text style={styles.vsText}>VS</Text>
            )}
          </View>

          {/* Away Team: Badge + Name */}
          <View style={styles.awayTeamSection}>
            <Image source={{ uri: awayBadgeUrl }} style={styles.teamBadge} />
            <Text style={styles.teamName}>{item.away_team}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Fixtures</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading fixtures...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Fixtures</Text>
        <Text style={styles.headerSubtitle}>Plan your transfers wisely</Text>
        {fixtures.some(fixture => fixture.status === 'LIVE') && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE UPDATES</Text>
          </View>
        )}
      </View>

      <View style={styles.filtersContainer}>
        <Text style={styles.filterLabel}>Gameweek</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.gameweekContainer}>
            {gameweeks.map((gameweek) => (
              <TouchableOpacity
                key={gameweek}
                style={[
                  styles.gameweekButton,
                  selectedGameweek === gameweek && styles.gameweekButtonActive,
                ]}
                onPress={() => setSelectedGameweek(gameweek)}
              >
                <Text
                  style={[
                    styles.gameweekButtonText,
                    selectedGameweek === gameweek && styles.gameweekButtonTextActive,
                  ]}
                >
                  {gameweek === 0 ? 'All' : gameweek}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.filterLabel}>Club Filter</Text>
        <View style={styles.dropdownContainer}>
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.dropdownPlaceholder}
            selectedTextStyle={styles.dropdownSelectedText}
            data={clubs}
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Select Club"
            value={selectedClub}
            onChange={item => setSelectedClub(item.value)}
            renderLeftIcon={() => (
              <View style={styles.dropdownIcon}>
                {selectedClub === 'All' ? (
                  <PremierLeagueLogo size={24} />
                ) : (
                  <Image 
                    source={{ uri: getTeamBadgeUrl(selectedClub) }} 
                    style={styles.dropdownIconImage} 
                  />
                )}
              </View>
            )}
            renderItem={(item, index) => (
              <View style={[styles.dropdownItem, { backgroundColor: `${item.color}20` }]}>
                {item.value === 'All' ? (
                  <PremierLeagueLogo size={24} />
                ) : (
                  <Image 
                    source={{ uri: getTeamBadgeUrl(item.value) }} 
                    style={styles.dropdownItemImage} 
                  />
                )}
                <Text style={styles.dropdownItemText}>{item.label}</Text>
              </View>
            )}
          />
        </View>
      </View>

      {filteredFixtures.length > 0 ? (
        <FlatList
          data={filteredFixtures}
          renderItem={renderFixtureItem}
          keyExtractor={(item) => `fixture-${item.id || Math.random()}`}
          style={styles.fixturesList}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" style={styles.emptyStateIcon} />
          <Text style={styles.emptyStateText}>
            No fixtures found for the selected criteria.
          </Text>
        </View>
      )}

      {/* Simple Fixture Modal */}
      <Modal
        visible={showFixtureModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowFixtureModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowFixtureModal(false)}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedFixture?.home_team} vs {selectedFixture?.away_team}
            </Text>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.overviewTab}>
              <Text style={styles.overviewText}>
                Match details for {selectedFixture?.home_team} vs {selectedFixture?.away_team} in Gameweek {selectedFixture?.gameweek}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default FixturesScreen; 