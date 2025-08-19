import { StyleSheet } from 'react-native';
import { theme } from './theme';

export const componentStyles = StyleSheet.create({
  // Common button styles
  button: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonText: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.md,
    fontWeight: '600',
  },
  
  // Common card styles
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.small,
  },
  
  // Common input styles
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    fontSize: theme.typography.md,
    color: theme.colors.textPrimary,
  },
  
  // Common text styles
  textPrimary: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.md,
  },
  
  textSecondary: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.md,
  },
  
  textWhite: {
    color: theme.colors.textWhite,
    fontSize: theme.typography.md,
  },
  
  // Common spacing utilities
  marginTop: {
    marginTop: theme.spacing.md,
  },
  
  marginBottom: {
    marginBottom: theme.spacing.md,
  },
  
  padding: {
    padding: theme.spacing.md,
  },
}); 