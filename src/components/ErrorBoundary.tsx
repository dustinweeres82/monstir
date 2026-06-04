import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Bugsnag from '@bugsnag/react-native';
import { colors, scale, radii, spacing } from '../design-system/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI; receives a reset function. */
  fallback?: (reset: () => void) => ReactNode;
  /** Optional callback fired when an error is caught. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// ─── ErrorBoundary ────────────────────────────────────────────────────────────

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }
    // Report to Bugsnag in production
    if (!__DEV__) {
      Bugsnag.notify(error, (event) => {
        event.addMetadata('react', { componentStack: info.componentStack });
      });
    }
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(this.reset);
    }

    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.heading}>Something went wrong</Text>
        <Text style={styles.body}>
          An unexpected error occurred. Tap below to try again.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.reset} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  icon: {
    fontSize: scale(48),
    marginBottom: spacing.xl,
  },
  heading: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: scale(26),
    color: colors.white,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: scale(14),
    color: colors.muted,
    textAlign: 'center',
    lineHeight: scale(20),
    marginBottom: spacing.xxxl,
  },
  button: {
    backgroundColor: colors.purple,
    borderRadius: radii.full,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
  },
  buttonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: scale(15),
    color: colors.white,
    textAlign: 'center',
  },
});
