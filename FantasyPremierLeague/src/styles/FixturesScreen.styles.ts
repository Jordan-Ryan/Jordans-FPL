import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const styles = StyleSheet.create({
  // Container and Layout
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  // Header Section
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  
  headerTitle: {
    fontSize: theme.typography.xxxxl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  
  headerSubtitle: {
    fontSize: theme.typography.lg,
    color: theme.colors.textSecondary,
  },
  
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.xl,
    alignSelf: 'flex-start',
    marginTop: theme.spacing.sm,
  },
  
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.textWhite,
    marginRight: theme.spacing.xs,
  },
  
  liveText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.sm,
    fontWeight: 'bold',
  },
  
  // Filters Section
  filtersContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  
  filterLabel: {
    fontSize: theme.typography.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  
  gameweekContainer: {
    flexDirection: 'row',
    marginBottom: theme.spacing.lg,
  },
  
  gameweekButton: {
    backgroundColor: 'rgba(28, 28, 30, 0.8)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 60,
    alignItems: 'center',
  },
  
  gameweekButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  
  gameweekButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.md,
    fontWeight: '600',
  },
  
  gameweekButtonTextActive: {
    color: theme.colors.textWhite,
  },
  
  // Dropdown Styles
  dropdownContainer: {
    marginBottom: theme.spacing.lg,
  },
  
  dropdown: {
    height: 50,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    ...theme.shadows.small,
  },
  
  dropdownPlaceholder: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.md,
  },
  
  dropdownSelectedText: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.md,
    fontWeight: '600',
  },
  
  dropdownIcon: {
    marginRight: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
  },
  
  dropdownIconImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: 'rgba(28, 28, 30, 0.9)',
    borderRadius: 0,
    marginHorizontal: 0,
    marginVertical: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  
  dropdownItemImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: theme.spacing.md,
  },
  
  dropdownItemText: {
    color: '#000000',
    fontSize: theme.typography.md,
    fontWeight: '600',
  },
  
  // Fixtures List
  fixturesList: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  
  // Fixture Item
  fixtureItem: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: 0,
    marginBottom: theme.spacing.xs,
    borderWidth: 0,
    overflow: 'hidden',
    position: 'relative',
    ...theme.shadows.small,
  },
  
  // Fixture Header
  fixtureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
    position: 'relative',
    zIndex: 10,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
  },
  
  headerLeftSection: {
    flex: 0.5,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  
  headerCenterSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  headerRightSection: {
    flex: 0.5,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  
  gameweekBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
  },
  
  gameweekText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.xs,
    fontWeight: 'bold',
  },
  
  dateText: {
    fontSize: theme.typography.md,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
  },
  
  statusText: {
    fontSize: theme.typography.xl,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  minutesText: {
    fontSize: theme.typography.xl,
    color: theme.colors.textPrimary,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  // Fixture Content
  fixtureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 5,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: 2,
  },
  
  homeTeamSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
  },
  
  awayTeamSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: theme.spacing.sm,
  },
  
  centerSection: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  
  // Team Backgrounds
  teamBackgroundLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 1,
  },
  
  teamBackgroundRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    zIndex: 1,
  },
  
  // Team Elements
  teamBadge: {
    width: 32,
    height: 32,
    marginBottom: theme.spacing.xs,
  },
  
  teamName: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  
  scoreText: {
    fontSize: theme.typography.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  
  vsText: {
    fontSize: theme.typography.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xxl,
  },
  
  emptyStateText: {
    fontSize: theme.typography.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  
  emptyStateIcon: {
    fontSize: 48,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    fontSize: theme.typography.lg,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.lg,
  },
  
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  
  closeButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.lg,
  },
  
  modalTitle: {
    fontSize: theme.typography.xxxl,
    fontWeight: 'bold',
    color: theme.colors.textWhite,
    flex: 1,
  },
  
  // Tab Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    paddingHorizontal: theme.spacing.lg,
  },
  
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  
  tabText: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.lg,
    fontWeight: '600',
  },
  
  activeTabText: {
    color: theme.colors.textWhite,
  },
  
  // Modal Content
  modalContent: {
    flex: 1,
    backgroundColor: '#000000',
  },
  
  overviewTab: {
    padding: theme.spacing.xl,
  },
  
  overviewText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.lg,
  },
  
  statsTab: {
    padding: theme.spacing.xl,
  },
  
  statsText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.lg,
  },
}); 