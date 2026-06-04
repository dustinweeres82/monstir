/**
 * Design-system animation hooks.
 * Import from '@/design-system' or directly from this file.
 */
import { useRef } from 'react';
import { Animated } from 'react-native';

/**
 * Returns pressIn / pressOut handlers and an Animated.Value for scale.
 * Wire them up to a TouchableOpacity's onPressIn / onPressOut callbacks,
 * then apply { transform: [{ scale: scaleAnim }] } to the inner Animated.View.
 *
 * Disabled buttons skip animation when `disabled` is true.
 *
 * @example
 * const { scaleAnim, pressIn, pressOut } = useScaleAnimation({ disabled });
 * <TouchableOpacity onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1} ...>
 *   <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
 *     ...
 *   </Animated.View>
 * </TouchableOpacity>
 */
export function useScaleAnimation({ toScale = 0.95, disabled = false }: { toScale?: number; disabled?: boolean } = {}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    if (disabled) return;
    Animated.timing(scaleAnim, { toValue: toScale, duration: 80, useNativeDriver: true }).start();
  };

  const pressOut = () => {
    if (disabled) return;
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 280, friction: 10 }).start();
  };

  return { scaleAnim, pressIn, pressOut };
}
