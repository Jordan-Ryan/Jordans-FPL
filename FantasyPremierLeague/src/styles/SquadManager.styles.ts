import { StyleSheet } from 'react-native';
import { theme } from './theme';

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
  
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  
  // Add more specific styles for SquadManager as needed
  // This is a basic template - you can expand it based on your SquadManager needs
}); 