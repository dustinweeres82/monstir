import React, { useRef, useState, useCallback } from 'react';
import { Pressable, View, Text, StyleSheet, Animated } from 'react-native';
import { flushNow } from '../lib/debugLog';

interface DebugTapProps {
  children: React.ReactNode;   // the thing you wrap, e.g. your version label
  holdMs?: number;             // how long to hold before it fires (default 700ms)
  reason?: string;             // shows up in error_message on the row
  onFlushed?: () => void;
}

/**
 * Wrap something innocuous in this (the Settings version text is ideal).
 * Press and hold to ship the current log buffer and flash a brief
 * confirmation. A long-press is the inverse of tapping, so it will not
 * collide with the rapid-tap battle input, and a kid mashing the screen
 * never triggers it.
 *
 *   <DebugTap><Text style={styles.version}>v{appVersion}</Text></DebugTap>
 */
export function DebugTap({ children, holdMs = 700, reason = 'manual', onFlushed }: DebugTapProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleLongPress = useCallback(async () => {
    setVisible(true);
    setBusy(true);
    Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();

    await flushNow(reason);

    setBusy(false);
    onFlushed?.();
    Animated.sequence([
      Animated.delay(1400),
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  }, [reason, opacity, onFlushed]);

  return (
    <View>
      <Pressable onLongPress={handleLongPress} delayLongPress={holdMs} hitSlop={8}>
        {children}
      </Pressable>

      {visible && (
        <Animated.View pointerEvents="none" style={[styles.toast, { opacity }]}>
          <Text style={styles.toastText}>{busy ? 'Sending logs…' : 'Logs sent ✓'}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 28,
    alignSelf: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toastText: {
    color: '#FAF9F4',
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
});
