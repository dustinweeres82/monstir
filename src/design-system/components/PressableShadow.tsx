import React, { useRef, useState } from 'react';
import { Animated, TouchableOpacity, ViewStyle, StyleSheet, Platform } from 'react-native';

interface PressableShadowProps {
  children:       React.ReactNode;
  onPress?:       () => void;
  onLongPress?:   () => void;
  disabled?:      boolean;
  style?:         ViewStyle | (ViewStyle | null | false | undefined)[] | null | false;
  activeOpacity?: number;
  depth?:         number;
  /** Scale factor at press-in. Set to 1 to disable scale. Default: 0.97 */
  pressScale?:    number;
  /**
   * Render the hard 0px {depth}px 0px shadow. Opt-in, and CTA buttons are the only
   * thing that opts in — every other surface in the app is flat. Defaults to false
   * so the many pressable rows/cards/pills wrapped in this component stay flat
   * while keeping their press translate.
   */
  hardShadow?:    boolean;
}

/**
 * CSS equivalent:
 *   resting: box-shadow: 0px 6px 0px #111111
 *   active:  translateY(6px) + box-shadow: 0px 0px 0px #111111
 *
 * Three Animated.Values keep native/JS drivers separate:
 *   translateAnim → useNativeDriver: true  (transform: translateY)
 *   scaleAnim     → useNativeDriver: true  (transform: scale)
 *   shadowAnim    → useNativeDriver: false (shadowOpacity)
 */
export function PressableShadow({
  children,
  onPress,
  onLongPress,
  disabled,
  style,
  activeOpacity = 1,
  depth = 6,
  pressScale = 0.97,
  hardShadow = false,
}: PressableShadowProps) {
  const translateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim     = useRef(new Animated.Value(1)).current;
  const shadowAnim    = useRef(new Animated.Value(1)).current;
  // Web can't animate boxShadow through Animated (it interpolates numbers, not
  // shadow strings), so the collapse is driven by plain state there instead.
  const [pressed, setPressed] = useState(false);

  const pressIn = () => {
    if (disabled) return;
    setPressed(true);
    Animated.timing(translateAnim, { toValue: depth,      duration: 80, useNativeDriver: true  }).start();
    Animated.timing(scaleAnim,     { toValue: pressScale, duration: 80, useNativeDriver: true  }).start();
    Animated.timing(shadowAnim,    { toValue: 0,          duration: 80, useNativeDriver: false }).start();
  };

  const pressOut = () => {
    if (disabled) return;
    setPressed(false);
    Animated.spring(translateAnim, { toValue: 0, useNativeDriver: true,  tension: 280, friction: 10 }).start();
    Animated.spring(scaleAnim,     { toValue: 1, useNativeDriver: true,  tension: 280, friction: 10 }).start();
    Animated.spring(shadowAnim,    { toValue: 1, useNativeDriver: false, tension: 280, friction: 10 }).start();
  };

  // `default` is the web branch. It used to be {}, which is why buttons had a hard
  // shadow on iOS and none on web — boxShadow gives web the same 0px {depth}px 0px.
  const shadowStyle = !hardShadow ? {} : Platform.select({
    ios: {
      shadowColor:   '#111111',
      shadowOffset:  { width: 0, height: depth },
      shadowOpacity: shadowAnim,
      shadowRadius:  0,
    },
    android: {
      elevation: shadowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, depth] }),
    },
    default: {
      boxShadow: pressed ? 'none' : `0px ${depth}px 0px #111111`,
    },
  });

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      activeOpacity={activeOpacity}
      style={StyleSheet.flatten(style) as ViewStyle}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }, { translateY: translateAnim }] }}>
        <Animated.View style={shadowStyle as any}>
          {children}
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}
