import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F0EF', // Light neutral background
  },
  
  // Header Styles
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#BBBDBC',
  },
  
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  
  headerLeft: {
    flex: 1,
    marginRight: 24,
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  
  refreshButton: {
    backgroundColor: '#245F73',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  
  teamInfo: {
    marginTop: 8,
  },
  
  formationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BBBDBC',
    marginBottom: 4,
  },
  
  costText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BBBDBC',
    marginBottom: 4,
  },
  
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BBBDBC',
    marginBottom: 4,
  },
  
  // Gameweek Selector Styles
  gameweekSelector: {
    marginTop: 16,
  },
  
  gameweekLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    color: '#BBBDBC',
  },
  
  gameweekScroll: {
    flexDirection: 'row',
  },
  
  gameweekButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F2F0EF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#BBBDBC',
  },
  
  gameweekButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BBBDBC',
  },
  

  
  // Content Styles
  content: {
    flex: 1,
  },
  
  // Loading and Error Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  
  loadingText: {
    fontSize: 16,
    color: '#BBBDBC',
    textAlign: 'center',
    marginTop: 100,
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  
  // Pitch Container Styles
  pitchContainer: {
    height: 500,
    marginHorizontal: 0,
    marginTop: 16,
    marginBottom: 0,
    borderRadius: 0,
    overflow: 'hidden',
    position: 'relative',
  },
  
  pitchBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  
  formation: {
    flex: 1,
    position: 'relative',
  },
  
  playerPosition: {
    position: 'absolute',
    alignItems: 'center',
  },
  
  // Player Card Styles
  playerCard: {
    backgroundColor: 'rgba(36, 95, 115, 0.1)', // Light teal background
    borderRadius: 16,
    paddingTop: 4,
    paddingHorizontal: 0,
    paddingBottom: 16,
    alignItems: 'center',
    width: 75,
    height: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    justifyContent: 'space-between',
  },
  
  playerName: {
    fontSize: 8,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 0,
    borderRadius: 0,
  },
  
  playerFixture: {
    fontSize: 8,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 0,
    borderRadius: 0,
  },
  
  // Captain/Vice-Captain Badge Styles
  captainBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#245F73',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  
  captainText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  
  viceCaptainBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#733E24',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  
  viceCaptainText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  
  // Bench Section Styles
  benchSection: {
    height: 200,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 16,
    padding: 16,
    borderRadius: 0,
    backgroundColor: '#006241', // Green color to match Points tab
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  
  benchTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  
  benchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  
  // Stats Section Styles
  statsSection: {
    backgroundColor: '#006241', // Green color to match Points tab
    padding: 20,
    borderRadius: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  
  statLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
});
