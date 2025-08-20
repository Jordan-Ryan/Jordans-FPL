import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  
  // Header Styles
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  
  headerLeft: {
    flex: 1,
  },
  
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  
  teamInfo: {
    marginTop: 8,
  },
  
  formationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  
  costText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  
  pointsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  
  // Gameweek Selector Styles
  gameweekSelector: {
    marginTop: 12,
  },
  
  gameweekLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  
  gameweekScroll: {
    flexGrow: 0,
  },
  
  gameweekButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  gameweekButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  
  // Content Styles
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  
  // Loading and Error Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  loadingText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  errorText: {
    fontSize: 18,
    color: '#e74c3c',
    textAlign: 'center',
  },
  
  // Pitch Container Styles
  pitchContainer: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  
  pitchBackground: {
    width: width - 32,
    height: 500,
    borderRadius: 12,
  },
  
  formation: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  
  playerPosition: {
    position: 'absolute',
    width: 72,
    alignItems: 'center',
  },
  
  // Player Card Styles
  playerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    width: 72,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  
  playerName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 2,
    maxWidth: 64,
  },
  
  playerFixture: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    maxWidth: 64,
  },
  
  // Captain/Vice-Captain Badge Styles
  captainBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#f39c12',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  
  captainText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  viceCaptainBadge: {
    position: 'absolute',
    top: -4,
    left: -4,
    backgroundColor: '#3498db',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  
  viceCaptainText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Bench Section Styles
  benchSection: {
    marginBottom: 20,
  },
  
  benchTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  benchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  // Stats Section Styles
  statsSection: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  
  statItem: {
    alignItems: 'center',
    flex: 1,
    minWidth: 80,
  },
  
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
