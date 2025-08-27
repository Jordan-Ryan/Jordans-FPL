import { StyleSheet, Dimensions } from 'react-native';
import { theme } from './theme';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  


  // Gameweek Selector Styles
  gameweekSelector: {
    marginTop: 60, // Add top padding for status bar
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
  },

  gameweekLabel: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },

  gameweekScroll: {
    flexDirection: 'row',
  },

  gameweekButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  gameweekButtonText: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },

  gameweekTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },

  titleArrowButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: 'transparent',
    borderWidth: 0,
    minWidth: 30,
    alignItems: 'center',
  },

  titleArrowText: {
    fontSize: theme.typography.lg,
    fontWeight: '600',
  },

  gameweekTitle: {
    fontSize: theme.typography.xl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },

  loadingIndicator: {
    fontSize: theme.typography.md,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },

  pointsIndicator: {
    fontSize: theme.typography.md,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginLeft: theme.spacing.xs,
  },

  // XP Container Styles
  xpContainer: {
    marginTop: theme.spacing.xs,
    alignItems: 'center',
  },

  xpText: {
    fontSize: theme.typography.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginVertical: 1,
  },

  // XP Summary Styles
  xpSummaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.md,
  },

  xpSummaryItem: {
    alignItems: 'center',
    flex: 1,
  },

  xpSummaryLabel: {
    fontSize: theme.typography.sm,
    fontWeight: '500',
    marginBottom: theme.spacing.xs,
  },

  xpSummaryValue: {
    fontSize: theme.typography.lg,
    fontWeight: '700',
  },
  
  content: {
    flex: 1,
  },
  
  loadingText: {
    fontSize: theme.typography.xl,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 100,
  },
  
  pitchContainer: {
    height: 500,
    marginHorizontal: 0,
    marginTop: theme.spacing.lg,
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
  
  gkPosition: {
    top: 40,
    left: '50%',
    transform: [{ translateX: -36 }],
  },
  
  playerCard: {
    backgroundColor: theme.colors.cardBackground,
    borderRadius: theme.borderRadius.lg,
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: theme.spacing.xs,
    alignItems: 'center',
    width: 75,
    height: 100,
    ...theme.shadows.small,
    justifyContent: 'flex-end', // Push everything to the bottom
  },
  
  playerName: {
    fontSize: theme.typography.xs,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 0,
    marginTop: 0,
    width: '100%',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
  },
  
  playerFixture: {
    fontSize: theme.typography.xs,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 0,
    width: '100%',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
  },
  
  // Captain and Vice-Captain badges
  captainBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  
  captainText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.xs,
    fontWeight: 'bold',
  },
  
  viceCaptainBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: theme.colors.secondary,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  
  viceCaptainText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.xs,
    fontWeight: 'bold',
  },
  
  benchSection: {
    height: 200,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.lg,
    borderRadius: 0,
    backgroundColor: theme.colors.secondary,
    ...theme.shadows.small,
    position: 'relative',
    overflow: 'hidden',
  },
  
  benchTitle: {
    fontSize: theme.typography.xxl,
    fontWeight: 'bold',
    color: theme.colors.textWhite,
    marginBottom: theme.spacing.lg,
    position: 'relative',
    zIndex: 1,
  },
  
  benchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'relative',
    zIndex: 1,
  },
  


  // Squad ID Section Styles
  squadIdSection: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },

  squadIdTitle: {
    fontSize: theme.typography.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },

  squadIdInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },

  squadIdInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.md,
  },

  squadIdButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },

  squadIdButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.md,
    fontWeight: '600',
  },

  // Fetch Squad Data Button Styles
  fetchButton: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.md,
  },

  fetchButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.md,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '85%',
    maxWidth: 400,
    ...theme.shadows.medium,
  },

  modalTitle: {
    fontSize: theme.typography.xxl,
    fontWeight: 'bold',
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },

  modalLabel: {
    fontSize: theme.typography.md,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },

  modalInput: {
    borderWidth: 1,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.md,
    marginBottom: theme.spacing.sm,
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xl,
  },

  modalButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: theme.spacing.xs,
  },

  cancelButton: {
    backgroundColor: theme.colors.textSecondary,
  },

  cancelButtonText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.md,
    fontWeight: '600',
  },

  // Squad Loading Styles
  squadLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },

  squadLoadingText: {
    fontSize: theme.typography.lg,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },



  rankText: {
    fontSize: theme.typography.md,
    color: theme.colors.textSecondary,
    opacity: 0.8,
  },
}); 