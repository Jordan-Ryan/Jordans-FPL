import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 0,
  },
  loadingText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 50,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
  },
  filterIcon: {
    fontSize: 18,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  chevronIcon: {
    fontSize: 12,
    color: '#6B7280',
  },
  dropdown: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownText: {
    fontSize: 14,
  },
  priceFilterContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  priceFilterLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  priceSliderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  priceButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: 'white',
  },
  priceButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  priceButtonText: {
    fontSize: 12,
    color: '#374151',
  },
  priceButtonTextActive: {
    color: 'white',
  },
  resultsContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tableContainer: {
    minWidth: 1200,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  headerCell: {
    width: 80,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  playerHeaderCell: {
    width: 150,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  playersList: {
    flex: 1,
  },
  playerRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    alignItems: 'center',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  playerInfoCell: {
    width: 160, // Increased from 150 to accommodate larger image
    flexDirection: 'row',
    alignItems: 'flex-start', // Changed from 'center' to 'flex-start' to align content to the top
  },
  playerCell: {
    width: 160, // Increased from 150 to match playerInfoCell
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
    marginLeft: 8,
  },
  playerPosition: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  playerPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 8,
    resizeMode: 'cover',
  },
  playerDetails: {
    flex: 1,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  playerTeam: {
    fontSize: 10,
  },
  warningIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  starIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
  statCell: {
    width: 80,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  statText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  fixtureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
    minHeight: 20,
  },
  fixtureText: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingMoreContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 0,
    alignItems: 'center',
  },
  loadingMoreText: {
    fontSize: 14,
    color: '#6B7280',
  },
  endOfListContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 0,
    alignItems: 'center',
  },
  endOfListText: {
    fontSize: 14,
    color: '#6B7280',
  },
  best11Section: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  best11Title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  best11Grid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 16,
  },
  best11Card: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    minWidth: 80,
  },
  best11CardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  best11CardFormation: {
    fontSize: 14,
    marginBottom: 4,
  },
  best11CardPoints: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  best11CardCost: {
    fontSize: 12,
  },
  // Optimal Teams Styles
  optimalTeamsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#1a1a1a',
  },
  teamCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  teamHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1a1a1a',
    textAlign: 'center',
  },
  captainText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    color: '#28a745',
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#495057',
  },
  startingXI: {
    marginBottom: 16,
  },
  playerText: {
    fontSize: 13,
    marginBottom: 4,
    color: '#1a1a1a',
    paddingLeft: 8,
  },
  bench: {
    borderTopWidth: 1,
    borderTopColor: '#dee2e6',
    paddingTop: 12,
  },
  benchText: {
    fontSize: 12,
    marginBottom: 3,
    color: '#6c757d',
    paddingLeft: 8,
  },
  clubDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clubBadge: {
    width: 20,
    height: 20,
    marginRight: 8,
    resizeMode: 'contain',
  },
  playerCountContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  playerCountText: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadMoreButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 