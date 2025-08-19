import { StyleSheet, Dimensions } from 'react-native';
import { theme } from './theme';

const { width } = Dimensions.get('window');

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  header: {
    paddingTop: 60,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  
  headerTitle: {
    fontSize: theme.typography.xxxxl,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  
  deadlineText: {
    fontSize: theme.typography.lg,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
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
    paddingTop: theme.spacing.xs,
    paddingHorizontal: 0,
    paddingBottom: theme.spacing.md,
    alignItems: 'center',
    width: 75,
    height: 100,
    ...theme.shadows.small,
    justifyContent: 'space-between',
  },
  
  playerName: {
    fontSize: theme.typography.xs,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 0,
    width: '100%',
    backgroundColor: theme.colors.white,
    paddingHorizontal: 0,
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
  
  statsSection: {
    backgroundColor: theme.colors.secondary,
    padding: theme.spacing.xl,
    borderRadius: 0,
    ...theme.shadows.small,
  },
  
  statsTitle: {
    fontSize: theme.typography.xxxl,
    fontWeight: 'bold',
    color: theme.colors.textWhite,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.lg,
  },
  
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  
  statNumber: {
    fontSize: theme.typography.xxxxl,
    fontWeight: 'bold',
    color: theme.colors.textWhite,
    marginBottom: theme.spacing.xs,
  },
  
  statLabel: {
    fontSize: theme.typography.lg,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
}); 