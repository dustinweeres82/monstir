import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, Easing, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, hardShadow } from '../design-system/tokens';

// ─── Full-screen "Quest Complete!" celebration ─────────────────────────────────
// Shown right after a kid completes a chore whose reward is granted immediately
// (auto-approve households). Mirrors the reward moment already used elsewhere
// (RewardModal / ChestReveal) but full-bleed, since this is the primary payoff
// loop for every single chore, not an occasional bonus.

const INK    = '#111111';
const CREAM  = '#FFFDF7';
const PURPLE = '#6B35F0';
const PURPLE_DEEP = '#5A2AE0';
const LIME   = '#C5F215';

// Flat: surfaces carry no shadow. CTA buttons use hardShadow() from tokens.
const shadow = (_h: number) => ({});

// Randomized each time the screen appears — keeps the payoff moment feeling
// alive instead of a rote "Continue" button.
const FUN_WORDS = [
  'Cowabunga!', 'Awesome!', 'Nice!', 'Boom!', 'Heck yeah!',
  "Let's go!", 'Sweet!', 'Woo-hoo!', 'Radical!', 'You rock!', 'Yesss!',
];
const pickFunWord = () => FUN_WORDS[Math.floor(Math.random() * FUN_WORDS.length)];

export interface ChoreSuccessScreenProps {
  visible: boolean;
  choreTitle: string;
  monsterImg: number;
  monsterName: string;
  coinsGained: number;   // cents
  xpGained: number;
  xpIntoLevel: number;   // xp within the current level AFTER this award
  xpNeeded: number;      // xp required for the current level
  readyToEvolve: boolean;
  onDone: () => void;
  /** Submitted but not yet approved — nothing was actually credited yet, so
   *  the coin/XP pills render disabled with a "pending approval" banner
   *  instead of the normal earned-it treatment. Caller must NOT run the
   *  reward catch-up animation (flying coins etc.) on dismiss for this case,
   *  since there's nothing real to catch up to. */
  pending?: boolean;
}

export function ChoreSuccessScreen({
  visible, choreTitle, monsterImg, monsterName, coinsGained, xpGained,
  xpIntoLevel, xpNeeded, readyToEvolve, onDone, pending = false,
}: ChoreSuccessScreenProps) {
  const [btnLabel, setBtnLabel] = useState(pickFunWord);
  const [closing, setClosing]   = useState(false);
  // Bleed the purple bg above the safe area so it fills the status bar / notch
  // instead of leaving the screen's green chrome showing through up top —
  // same technique ChestReveal uses for its full-bleed background.
  const insets = useSafeAreaInsets();
  const topBleed = insets.top + (Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0);
  const bannerH = topBleed + scale(38);
  // `scale()` is phone-tuned (caps at 1.25× a 393px base), so on a tablet or a
  // large phone the monster would stay pinned near its phone size. Let it grow
  // with the actual window width instead, floored at the normal phone size.
  const { width: winW } = useWindowDimensions();
  const monsterSize = Math.max(scale(220), Math.min(winW * 0.58, 420));

  const fade       = useRef(new Animated.Value(0)).current;
  const monsterY   = useRef(new Animated.Value(30)).current;
  const monsterScl = useRef(new Animated.Value(0.6)).current;
  const pill1      = useRef(new Animated.Value(0)).current;
  const pill2      = useRef(new Animated.Value(0)).current;
  const footer     = useRef(new Animated.Value(0)).current;
  const bob        = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    setClosing(false);
    setBtnLabel(pending ? 'Got it!' : pickFunWord());
    fade.setValue(0);
    monsterY.setValue(30);
    monsterScl.setValue(0.6);
    pill1.setValue(0);
    pill2.setValue(0);
    footer.setValue(0);

    Animated.sequence([
      Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(monsterY,   { toValue: 0, useNativeDriver: true, tension: 90, friction: 8 }),
        Animated.spring(monsterScl, { toValue: 1, useNativeDriver: true, tension: 90, friction: 7 }),
      ]),
      Animated.stagger(90, [
        Animated.spring(pill1, { toValue: 1, useNativeDriver: true, tension: 160, friction: 9 }),
        Animated.spring(pill2, { toValue: 1, useNativeDriver: true, tension: 160, friction: 9 }),
      ]),
      Animated.timing(footer, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  const bobTranslate = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  const subText = useMemo(() => {
    if (pending) return 'These land once your parent approves! 👍';
    if (readyToEvolve) return `${monsterName} is ready to evolve! ✨`;
    const remaining = Math.max(0, xpNeeded - xpIntoLevel);
    if (remaining <= 0) return `${monsterName} loved that! 😍`;
    return `${monsterName} loved that! 😍 ${remaining} XP to level up`;
  }, [pending, readyToEvolve, monsterName, xpNeeded, xpIntoLevel]);

  const handlePress = () => {
    if (closing) return;
    setClosing(true);
    Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }).start(onDone);
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        s.root,
        { opacity: fade, top: -topBleed },
        pending ? { paddingTop: scale(28) + bannerH } : { paddingTop: scale(64) + topBleed },
      ]}
      pointerEvents={closing ? 'none' : 'auto'}
    >
      {/* "Pending parent approval" banner — pinned to the very top, bleeding
          into the status bar the same way the purple body does. */}
      {pending && (
        <View style={[s.pendingBanner, { height: bannerH, paddingTop: topBleed }]}>
          <Text style={s.pendingBannerText}>🔒 Pending parent approval</Text>
        </View>
      )}

      {/* Decorative sparkles / moon, matching the cosmic-purple reward moments used elsewhere */}
      <View style={[s.moon, { top: scale(70), left: scale(28) }]} />
      <Text style={[s.sparkle, { top: scale(44), left: scale(96), fontSize: scale(18) }]}>✨</Text>
      <Text style={[s.sparkle, { top: scale(150), right: scale(30), fontSize: scale(22) }]}>⭐</Text>
      <Text style={[s.sparkle, { bottom: scale(210), left: scale(36), fontSize: scale(16) }]}>✦</Text>
      <Text style={[s.sparkle, { top: scale(210), right: scale(90), fontSize: scale(14) }]}>✦</Text>

      <View style={s.body}>
        <Text style={s.eyebrow}>{pending ? 'QUEST DONE!' : 'QUEST COMPLETE!'}</Text>
        <Text style={s.title} numberOfLines={2}>{choreTitle}</Text>

        <Animated.View style={{ transform: [{ translateY: Animated.add(monsterY, bobTranslate) }, { scale: monsterScl }] }}>
          <Image source={monsterImg} style={{ width: monsterSize, height: monsterSize }} resizeMode="contain" />
        </Animated.View>

        <View style={s.pillRow}>
          <Animated.View style={[s.pill, pending ? s.pillCoinDisabled : s.pillCoin, {
            opacity: pill1,
            transform: [{ scale: pill1 }],
          }]}>
            <Image source={require('../../assets/icons/icon-coin.png')} style={[s.pillIcon, pending && { opacity: 0.6 }]} resizeMode="contain" />
            <Text style={pending ? s.pillTextDisabledCoin : s.pillTextDark}>+{fmtPillCoins(coinsGained)}</Text>
          </Animated.View>
          <Animated.View style={[s.pill, pending ? s.pillXpDisabled : s.pillXp, {
            opacity: pill2,
            transform: [{ scale: pill2 }],
          }]}>
            <Image source={require('../../assets/icons/icon-star.png')} style={[s.pillIcon, pending && { opacity: 0.6 }]} resizeMode="contain" />
            <Text style={pending ? s.pillTextDisabledXp : s.pillTextPurple}>+{xpGained} XP</Text>
          </Animated.View>
        </View>

        <Text style={s.subText}>{subText}</Text>
      </View>

      <Animated.View style={[s.footer, { opacity: footer, transform: [{ translateY: footer.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>
        <TouchableOpacity style={s.cta} onPress={handlePress} activeOpacity={0.85}>
          <Text style={s.ctaText}>{btnLabel}</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const fmtPillCoins = (cents: number): string =>
  cents >= 100 ? `$${(cents / 100).toFixed(2)}` : `${cents}¢`;

const s = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 900, elevation: 900,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: scale(64),
    paddingBottom: scale(40),
  },
  moon: {
    position: 'absolute',
    width: scale(14), height: scale(14), borderRadius: scale(7),
    backgroundColor: PURPLE_DEEP,
  },
  sparkle: {
    position: 'absolute',
    color: '#FFFFFF',
    opacity: 0.55,
  },
  body: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(28),
    gap: scale(10),
  },
  eyebrow: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: scale(13),
    letterSpacing: 2,
    color: LIME,
  },
  title: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: scale(30),
    lineHeight: scale(34),
    color: '#FFFFFF',
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: scale(6),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    borderRadius: scale(100),
    borderWidth: 2.5,
    borderColor: INK,
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    ...shadow(4),
  },
  pillCoin: { backgroundColor: LIME },
  pillXp:   { backgroundColor: CREAM },
  // Muted/desaturated versions of pillCoin/pillXp — "you'll get this, but not
  // yet" rather than "you have this now".
  pillCoinDisabled: { backgroundColor: '#ABA98A' },
  pillXpDisabled:   { backgroundColor: '#BFB8D6' },
  pillIcon: { width: scale(18), height: scale(18) },
  pillTextDark:   { fontFamily: 'Inter_900Black', fontSize: scale(15), color: INK },
  pillTextPurple: { fontFamily: 'Inter_900Black', fontSize: scale(15), color: PURPLE },
  pillTextDisabledCoin: { fontFamily: 'Inter_900Black', fontSize: scale(15), color: '#6E6C4F' },
  pillTextDisabledXp:   { fontFamily: 'Inter_900Black', fontSize: scale(15), color: '#7A7196' },
  pendingBanner: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    backgroundColor: LIME,
    borderBottomWidth: 2.5,
    borderBottomColor: INK,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: scale(10),
  },
  pendingBannerText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: scale(14),
    color: INK,
  },
  subText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: scale(15.5),
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: scale(4),
    paddingHorizontal: scale(12),
  },
  footer: {
    width: '100%',
    paddingHorizontal: scale(24),
  },
  cta: {
    backgroundColor: CREAM,
    borderRadius: scale(16),
    borderWidth: 3,
    borderColor: INK,
    paddingVertical: scale(18),
    alignItems: 'center',
    ...hardShadow(5),
  },
  ctaText: {
    fontFamily: 'Inter_900Black',
    fontSize: scale(17),
    color: INK,
  },
});
