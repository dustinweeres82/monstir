import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, spacing, radii, scale, fontSize } from '../tokens';
import { ChoreCardSkeleton, CardSkeleton, ListRowSkeleton } from './Skeleton';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type SkeletonVariant = 'chore-list' | 'card-list' | 'list-rows' | 'custom';

interface LoadingProps {
  state: 'loading';
  /** Which skeleton layout to render while loading */
  skeletonVariant?: SkeletonVariant;
  /** Number of skeleton items to show (default: 4) */
  skeletonCount?: number;
  /** Completely custom skeleton if skeletonVariant === 'custom' */
  customSkeleton?: React.ReactNode;
  style?: ViewStyle;
}

interface ErrorProps {
  state: 'error';
  errorMessage?: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

interface EmptyProps {
  state: 'empty';
  emptyTitle?: string;
  emptyMessage?: string;
  /** Optional icon (emoji string) */
  emptyIcon?: string;
  style?: ViewStyle;
}

interface IdleProps {
  state: 'idle';
  children: React.ReactNode;
  style?: ViewStyle;
}

export type ScreenStateProps = LoadingProps | ErrorProps | EmptyProps | IdleProps;

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Handles loading / error / empty / idle states for a screen section.
 *
 * Usage:
 * ```tsx
 * <ScreenState state={loading ? 'loading' : error ? 'error' : items.length === 0 ? 'empty' : 'idle'}
 *   skeletonVariant="chore-list"
 *   errorMessage={error?.message}
 *   onRetry={reload}
 *   emptyTitle="No chores yet"
 *   emptyMessage="Your parent hasn't added any chores yet."
 * >
 *   {items.map(...)}
 * </ScreenState>
 * ```
 */
export function ScreenState(props: ScreenStateProps) {
  switch (props.state) {
    case 'loading':
      return <LoadingState {...props} />;
    case 'error':
      return <ErrorState {...props} />;
    case 'empty':
      return <EmptyState {...props} />;
    case 'idle':
      return <>{props.children}</>;
  }
}

// ─── Loading ───────────────────────────────────────────────────────────────────

function LoadingState({ skeletonVariant = 'list-rows', skeletonCount = 4, customSkeleton, style }: LoadingProps) {
  if (skeletonVariant === 'custom') {
    return <View style={style}>{customSkeleton}</View>;
  }

  const items = Array.from({ length: skeletonCount });

  return (
    <View style={[s.skeletonContainer, style]}>
      {items.map((_, i) => {
        if (skeletonVariant === 'chore-list') {
          return <ChoreCardSkeleton key={i} style={i > 0 ? { marginTop: 10 } : undefined} />;
        }
        if (skeletonVariant === 'card-list') {
          return <CardSkeleton key={i} style={i > 0 ? { marginTop: 12 } : undefined} />;
        }
        // list-rows default
        return <ListRowSkeleton key={i} style={i > 0 ? { marginTop: 8 } : undefined} />;
      })}
    </View>
  );
}

// ─── Error ────────────────────────────────────────────────────────────────────

function ErrorState({ errorMessage, onRetry, style }: ErrorProps) {
  return (
    <View style={[s.centeredBox, style]}>
      <Text style={s.stateIcon}>⚠️</Text>
      <Text style={s.errorTitle}>Something went wrong</Text>
      {!!errorMessage && (
        <Text style={s.stateMessage}>{errorMessage}</Text>
      )}
      {!!onRetry && (
        <TouchableOpacity style={s.retryButton} onPress={onRetry} activeOpacity={0.8}>
          <Text style={s.retryLabel}>Try again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Empty ────────────────────────────────────────────────────────────────────

function EmptyState({ emptyTitle = 'Nothing here yet', emptyMessage, emptyIcon = '🗂️', style }: EmptyProps) {
  return (
    <View style={[s.centeredBox, style]}>
      <Text style={s.stateIcon}>{emptyIcon}</Text>
      <Text style={s.emptyTitle}>{emptyTitle}</Text>
      {!!emptyMessage && (
        <Text style={s.stateMessage}>{emptyMessage}</Text>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  skeletonContainer: {
    paddingVertical: spacing.sm,
  },
  centeredBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl * 2,
    paddingHorizontal: spacing.xxl,
    gap: spacing.sm,
  },
  stateIcon: {
    fontSize: scale(44),
    marginBottom: spacing.sm,
  },
  errorTitle: {
    fontSize: fontSize.xl,
    fontFamily: 'Inter_700Bold',
    color: colors.black,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.xl,
    fontFamily: 'Inter_700Bold',
    color: colors.black,
    textAlign: 'center',
  },
  stateMessage: {
    fontSize: fontSize.base,
    fontFamily: 'Inter_400Regular',
    color: colors.muted,
    textAlign: 'center',
    lineHeight: scale(20),
    marginTop: spacing.xs,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.purple,
    borderRadius: radii.full,
    borderWidth: 2.5,
    borderColor: colors.black,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxxl,
  },
  retryLabel: {
    fontSize: fontSize.lg,
    fontFamily: 'Inter_700Bold',
    color: colors.white,
  },
});
