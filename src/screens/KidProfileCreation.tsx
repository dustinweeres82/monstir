import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Image, ScrollView, Animated, Easing, Dimensions,
  Modal, Platform, ActionSheetIOS,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, fontSize, fontWeight, radii, spacing, scale } from '../design-system/tokens';
import { Button } from '../design-system/components/Button';
import { useScaleAnimation } from '../design-system/hooks';

const KID_PROFILE_DRAFT_KEY = 'monstir:kid-profile-draft';
import { CreamBg } from '../components/CreamBg';

const KidSafeScreen = ({ children }: { children: React.ReactNode }) => (
  <CreamBg>
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  </CreamBg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KidProfile {
  name: string;
  ageRange: string;
  avatarIdx: number;
  accentColor: string;
  monsterKey: string;
  monsterNickname: string;
}

interface Props {
  onComplete: (profile: KidProfile) => void;
  onSkip: () => void;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 7;
const PURPLE = '#6B35F0';
const LAVENDER_BG = '#EEE9FF';
const AGE_RANGES = ['Ages 4–6', 'Ages 7–9', 'Ages 10–12', 'Ages 13+'];

const AVATARS = [
  require('../../assets/icons/kidProfile1.png'),
  require('../../assets/icons/kidProfile2.png'),
  require('../../assets/icons/kidProfile3.png'),
  require('../../assets/icons/kidProfile4.png'),
  require('../../assets/icons/kidProfile5.png'),
  require('../../assets/icons/kidProfile6.png'),
  require('../../assets/icons/kidProfile7.png'),
  require('../../assets/icons/kidProfile8.png'),
  require('../../assets/icons/kidProfile9.png'),
  require('../../assets/icons/kidProfile10.png'),
  require('../../assets/icons/kidProfile11.png'),
  require('../../assets/icons/kidProfile12.png'),
  require('../../assets/icons/kidProfile13.png'),
  require('../../assets/icons/kidProfile14.png'),
  require('../../assets/icons/kidProfile15.png'),
  require('../../assets/icons/kidProfile16.png'),
  require('../../assets/icons/kidProfile17.png'),
  require('../../assets/icons/kidProfile18.png'),
  require('../../assets/icons/kidProfile19.png'),
  require('../../assets/icons/kidProfile20.png'),
  require('../../assets/icons/kidProfile21.png'),
];

export function getAvatarImage(idx: number) {
  return AVATARS[idx] ?? AVATARS[0];
}

const ACCENT_COLORS = [
  { key: 'green',  hex: '#4CAF50' },
  { key: 'purple', hex: '#6B35F0' },
  { key: 'blue',   hex: '#2196F3' },
  { key: 'pink',   hex: '#FF6B8A' },
  { key: 'gold',   hex: '#FFC107' },
];

const STARTER_MONSTERS = [
  {
    key: 'grumble',
    name: 'Grumble',
    type: 'Nature 🌿',
    description: 'Friendly, curious and\nloves to help!',
    image: require('../../assets/grumble.png'),
    stats: { power: 0.65, speed: 0.45, defence: 1.0 },
  },
  {
    key: 'spikid',
    name: 'Spikid',
    type: 'Fire 🔥',
    description: 'Bold and fearless,\nnever backs down!',
    image: require('../../assets/spikid.png'),
    stats: { power: 0.95, speed: 0.5, defence: 0.55 },
  },
  {
    key: 'microbe',
    name: 'Microbe',
    type: 'Water 💧',
    description: 'Calm and wise,\nalways thinking ahead.',
    image: require('../../assets/microbe.png'),
    stats: { power: 0.5, speed: 0.85, defence: 0.7 },
  },
  {
    key: 'botling',
    name: 'Botling',
    type: 'Tech ⚡',
    description: 'Smart and precise,\nloves a challenge.',
    image: require('../../assets/monstirs/robot monstir/robot_1.png'),
    stats: { power: 0.8, speed: 0.4, defence: 0.8 },
  },
  {
    key: 'robot2',
    name: 'Robo Jr.',
    type: 'Tech ⚡',
    description: 'Zippy and energetic,\nalways on the move!',
    image: require('../../assets/monstirs/robot monstir/robot_2.png'),
    stats: { power: 0.9, speed: 0.55, defence: 0.85 },
  },
  {
    key: 'flamer2',
    name: 'Flamer',
    type: 'Fire 🔥',
    description: 'Blazing fast and\nfull of heart!',
    image: require('../../assets/monstirs/flamer/flamer_2.png'),
    stats: { power: 1.0, speed: 0.6, defence: 0.4 },
  },
];

const STAT_DEFS = [
  { key: 'power',   label: 'Power',   desc: 'Makes tasks easier', bg: '#CEF85B', barColor: '#CEF85B', icon: '⚡' },
  { key: 'speed',   label: 'Speed',   desc: 'Makes tasks easier', bg: '#9FDAFC', barColor: '#7134E5', icon: '💨' },
  { key: 'defence', label: 'Defence', desc: 'Makes tasks easier', bg: '#C598FB', barColor: '#8CD3FC', icon: '🛡️' },
] as const;

// ─── Shared components ────────────────────────────────────────────────────────

function ProgressDots({ step }: { step: number }) {
  return (
    <View style={s.dots}>
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <View key={i} style={[s.dot, i === step && s.dotActive]} />
      ))}
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Button label={label} onPress={onPress} disabled={disabled} />;
}

function BackButton({ onPress }: { onPress: () => void }) {
  const { scaleAnim, pressIn, pressOut } = useScaleAnimation({ toScale: 0.85 });
  return (
    <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Text style={s.backArrow}>←</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}


// ─── Steps ────────────────────────────────────────────────────────────────────

function StepWelcome({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  return (
    <KidSafeScreen>
      <View style={{ paddingHorizontal: 24, paddingTop: 44 }}>
        <Text style={s.chooseHeading}>Let's create{'\n'}your profile!</Text>
        <Text style={s.chooseSubtitle}>This helps personalize your Monstir experience.</Text>
      </View>
      <View style={s.content}>
        <Image
          source={require('../../assets/monstirs/robot monstir/robot_popout.png')}
          style={{ width: 160, height: 160 }}
          resizeMode="contain"
        />
      </View>
      <View style={s.carouselFooter}>
        <Button label="Let's go!" onPress={onNext} />
        <Button label="Skip" onPress={onSkip} variant="secondary" />
      </View>
    </KidSafeScreen>
  );
}

function StepName({ onNext, onBack, name, setName }: {
  onNext: () => void; onBack: () => void;
  name: string; setName: (v: string) => void;
}) {
  return (
    <KidSafeScreen>
      <View style={{ paddingHorizontal: 24, paddingTop: 44 }}>
        <BackButton onPress={onBack} />
        <Text style={s.chooseHeading}>What's your{'\n'}name?</Text>
        <Text style={s.chooseSubtitle}>We'll use this to personalise your experience.</Text>
      </View>
      <View style={s.content}>
        <Image
          source={require('../../assets/grumble.png')}
          style={{ width: 110, height: 110 }}
          resizeMode="contain"
        />
        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter name"
            placeholderTextColor={colors.hint}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => name.trim() && onNext()}
          />
          {name.length > 0 && (
            <TouchableOpacity onPress={() => setName('')} style={s.inputClear}>
              <Text style={s.inputClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View style={s.carouselFooter}>
        <Button label="Next" onPress={onNext} disabled={!name.trim()} />
        <Button label="Back" onPress={onBack} variant="secondary" />
      </View>
    </KidSafeScreen>
  );
}

function StepAge({ onNext, onBack, ageRange, setAgeRange }: {
  onNext: () => void; onBack: () => void;
  ageRange: string; setAgeRange: (v: string) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetY       = useRef(new Animated.Value(300)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  function openSheet() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...AGE_RANGES, 'Cancel'], cancelButtonIndex: AGE_RANGES.length, title: 'How old are you?' },
        (i) => { if (i < AGE_RANGES.length) setAgeRange(AGE_RANGES[i]); },
      );
    } else {
      setSheetOpen(true);
      scrimOpacity.setValue(1);
      sheetY.setValue(300);
      Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    }
  }

  function closeSheet(cb?: () => void) {
    Animated.timing(sheetY, { toValue: 300, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start(() => {
      setSheetOpen(false);
      cb?.();
    });
  }

  const selected = ageRange || AGE_RANGES[1];

  return (
    <KidSafeScreen>
      <View style={{ paddingHorizontal: 24, paddingTop: 44 }}>
        <BackButton onPress={onBack} />
        <Text style={s.chooseHeading}>How old{'\n'}are you?</Text>
        <Text style={s.chooseSubtitle}>This helps us set the right difficulty.</Text>
      </View>

      <View style={s.content}>
        <Image source={require('../../assets/cake.png')} style={{ width: 120, height: 120 }} resizeMode="contain" />
        <TouchableOpacity style={s.agePickerBtn} onPress={openSheet} activeOpacity={0.8}>
          <Text style={s.agePickerText}>{selected}</Text>
          <Text style={s.agePickerChevron}>▾</Text>
        </TouchableOpacity>
      </View>

      <View style={s.carouselFooter}>
        <Button label="Next" onPress={onNext} />
        <Button label="Back" onPress={onBack} variant="secondary" />
      </View>

      {/* Android sheet */}
      <Modal visible={sheetOpen} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[s.sheetScrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>How old are you?</Text>
            {AGE_RANGES.map((range, i) => (
              <TouchableOpacity
                key={range}
                style={[s.sheetRow, i < AGE_RANGES.length - 1 && s.sheetRowBorder]}
                activeOpacity={0.7}
                onPress={() => closeSheet(() => setAgeRange(range))}
              >
                <Text style={[s.sheetRowLabel, selected === range && s.sheetRowLabelActive]}>{range}</Text>
                {selected === range && <Text style={s.sheetCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={{ height: 24 }} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </KidSafeScreen>
  );
}

function StepAvatar({ onNext, onBack, avatarIdx, setAvatarIdx, accentColor, setAccentColor }: {
  onNext: () => void; onBack: () => void;
  avatarIdx: number; setAvatarIdx: (i: number) => void;
  accentColor: string; setAccentColor: (c: string) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetY       = useRef(new Animated.Value(400)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  function openSheet() {
    setSheetOpen(true);
    scrimOpacity.setValue(1);
    sheetY.setValue(400);
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  }

  function closeSheet(cb?: () => void) {
    Animated.timing(sheetY, { toValue: 400, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start(() => {
      setSheetOpen(false);
      cb?.();
    });
  }

  return (
    <KidSafeScreen>
      <View style={{ paddingHorizontal: 24, paddingTop: 44 }}>
        <BackButton onPress={onBack} />
        <Text style={s.chooseHeading}>Pick your{'\n'}avatar.</Text>
        <Text style={s.chooseSubtitle}>Tap to choose.</Text>
      </View>

      <View style={s.content}>
        <TouchableOpacity style={s.avatarLarge} onPress={openSheet} activeOpacity={0.8}>
          <Image source={AVATARS[avatarIdx]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          <View style={s.avatarEditBadge}>
            <Text style={{ fontSize: scale(14) }}>✏️</Text>
          </View>
        </TouchableOpacity>

        <View style={s.colorRow}>
          {ACCENT_COLORS.map((c) => (
            <TouchableOpacity
              key={c.key}
              style={[s.colorSwatch, { backgroundColor: c.hex }, accentColor === c.hex && s.colorSwatchActive]}
              onPress={() => setAccentColor(c.hex)}
              activeOpacity={0.8}
            />
          ))}
        </View>
      </View>

      <View style={s.carouselFooter}>
        <Button label="Next" onPress={onNext} />
        <Button label="Back" onPress={onBack} variant="secondary" />
      </View>

      <Modal visible={sheetOpen} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[s.sheetScrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Choose avatar</Text>
            <View style={s.avatarSheetGrid}>
              {AVATARS.map((src, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.avatarSheetCell, avatarIdx === i && s.avatarSheetCellActive]}
                  onPress={() => { setAvatarIdx(i); closeSheet(); }}
                  activeOpacity={0.8}
                >
                  <Image source={src} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ height: Platform.OS === 'ios' ? 28 : 12 }} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </KidSafeScreen>
  );
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_W       = Math.min(268, SCREEN_WIDTH * 0.70);
const CARD_GAP     = 16;
const CARD_SNAP    = CARD_W + CARD_GAP;
const CAROUSEL_PAD = (SCREEN_WIDTH - CARD_W) / 2;

const ARROW = require('../../assets/arrow_icon.png');

function StepMonsterCarousel({ onChoose, onBack }: {
  onChoose: (key: string) => void;
  onBack: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const scrollX  = useRef(new Animated.Value(0)).current;
  const bobAnim  = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<any>(null);
  const { scaleAnim: leftScale, pressIn: leftPI, pressOut: leftPO } = useScaleAnimation({ toScale: 0.85 });
  const { scaleAnim: rightScale, pressIn: rightPI, pressOut: rightPO } = useScaleAnimation({ toScale: 0.85 });
  const monster = STARTER_MONSTERS[activeIdx];

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const bobTranslate = bobAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  const onScrollJS = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const newIdx = Math.max(0, Math.min(Math.round(x / CARD_SNAP), STARTER_MONSTERS.length - 1));
    if (newIdx !== activeIdx) setActiveIdx(newIdx);
  };

  const scrollTo = (idx: number) => {
    const clamped = Math.max(0, Math.min(idx, STARTER_MONSTERS.length - 1));
    scrollRef.current?.scrollTo({ x: clamped * CARD_SNAP, animated: true });
    setActiveIdx(clamped);
  };

  return (
    <KidSafeScreen>
      {/* Header */}
      <View style={{ paddingHorizontal: 24, paddingTop: 44 }}>
        <BackButton onPress={onBack} />
        <Text style={s.chooseHeading}>Choose your{'\n'}monster.</Text>
        <Text style={s.chooseSubtitle}>It grows as you do chores.</Text>
      </View>

      {/* Peek carousel + arrow overlay */}
      <View style={{ flex: 1, marginTop: -100 }}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_SNAP}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: CAROUSEL_PAD, paddingVertical: 12 }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: true, listener: onScrollJS }
          )}
          scrollEventThrottle={16}
        >
        {STARTER_MONSTERS.map((m, i) => {
          const isActive = i === activeIdx;
          const stats = m.stats as Record<string, number>;
          const cardOpacity = scrollX.interpolate({
            inputRange: [(i - 1) * CARD_SNAP, i * CARD_SNAP, (i + 1) * CARD_SNAP],
            outputRange: [0.25, 1, 0.25],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={m.key}
              style={[
                s.monsterCard,
                { marginRight: i < STARTER_MONSTERS.length - 1 ? CARD_GAP : 0, opacity: cardOpacity },
              ]}
            >
              {/* Glow + monster in same layer so glow stays behind */}
              <Animated.View style={{ alignItems: 'center', transform: [{ translateY: bobTranslate }] }}>
                <View style={s.monsterGlow} />
                <Image source={m.image} style={s.monsterCardImg} resizeMode="contain" />
              </Animated.View>

              {/* Monster name */}
              <Text style={s.monsterCardName}>{m.name}</Text>

              {/* Pagination pills */}
              <View style={s.paginationRow}>
                {STARTER_MONSTERS.map((_, di) => (
                  <View
                    key={di}
                    style={[
                      s.pill,
                      di === activeIdx ? s.pillActive : s.pillInactive,
                    ]}
                  />
                ))}
              </View>

              {/* Stats card */}
              <View style={s.statsCard2}>
                  {STAT_DEFS.map((stat) => {
                    const val = stats[stat.key] ?? 0;
                    return (
                      <View key={stat.key} style={s.statRow2}>
                        <View style={{ width: 78 }}>
                          <Text style={s.statLabel2}>{stat.label}</Text>
                        </View>
                        <View style={s.statTrack2}>
                          <View style={[s.statFill2, { width: `${Math.round(val * 100)}%` as any, backgroundColor: stat.barColor }]} />
                        </View>
                        <Text style={s.statNum}>{Math.round(val * 100)}</Text>
                      </View>
                    );
                  })}
                </View>
            </Animated.View>
          );
        })}
        </Animated.ScrollView>

        {/* Left arrow */}
        <TouchableOpacity
          style={[s.arrowBtn, { left: 8 }, activeIdx === 0 && { opacity: 0.5 }]}
          onPress={() => scrollTo(activeIdx - 1)}
          onPressIn={leftPI} onPressOut={leftPO}
          activeOpacity={1}
          disabled={activeIdx === 0}
        >
          <Animated.View style={{ transform: [{ scale: leftScale }] }}>
            <Image source={ARROW} style={[s.arrowIcon, { transform: [{ rotate: '180deg' }] }]} />
          </Animated.View>
        </TouchableOpacity>

        {/* Right arrow */}
        <TouchableOpacity
          style={[s.arrowBtn, { right: 8 }, activeIdx === STARTER_MONSTERS.length - 1 && { opacity: 0.5 }]}
          onPress={() => scrollTo(activeIdx + 1)}
          onPressIn={rightPI} onPressOut={rightPO}
          activeOpacity={1}
          disabled={activeIdx === STARTER_MONSTERS.length - 1}
        >
          <Animated.View style={{ transform: [{ scale: rightScale }] }}>
            <Image source={ARROW} style={s.arrowIcon} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Buttons */}
      <View style={s.carouselFooter}>
        <Button label="Select this Monstir" onPress={() => onChoose(monster.key)} />
        <Button label="Back" onPress={onBack} variant="secondary" />
      </View>
    </KidSafeScreen>
  );
}

function StepMonsterName({ onNext, onBack, nickname, setNickname, monsterKey }: {
  onNext: () => void; onBack: () => void;
  nickname: string; setNickname: (v: string) => void;
  monsterKey: string;
}) {
  const monster = STARTER_MONSTERS.find(m => m.key === monsterKey) ?? STARTER_MONSTERS[0];

  return (
    <KidSafeScreen>
      <View style={{ paddingHorizontal: 24, paddingTop: 44 }}>
        <BackButton onPress={onBack} />
        <Text style={s.chooseHeading}>Name your{'\n'}monster.</Text>
        <Text style={s.chooseSubtitle}>Give your monster a cool name!</Text>
      </View>
      <View style={s.content}>
        <View style={{ alignItems: 'center' }}>
          <Image source={monster.image} style={{ width: 160, height: 160 }} resizeMode="contain" />
          <View style={s.heartBubble}>
            <Text style={{ fontSize: scale(20) }}>❤️</Text>
          </View>
        </View>

        <View style={s.inputWrap}>
          <TextInput
            style={s.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder={monster.name}
            placeholderTextColor={colors.hint}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => onNext()}
          />
          {nickname.length > 0 && (
            <TouchableOpacity onPress={() => setNickname('')} style={s.inputClear}>
              <Text style={s.inputClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={s.carouselFooter}>
        <Button label="Next" onPress={onNext} />
        <Button label="Back" onPress={onBack} variant="secondary" />
      </View>
    </KidSafeScreen>
  );
}

function StepItsOfficial({ onDone, onBack, monsterKey, nickname, avatarIdx, submitError }: {
  onDone: () => void; onBack: () => void;
  monsterKey: string; nickname: string; avatarIdx: number;
  submitError?: string;
}) {
  const monster  = STARTER_MONSTERS.find(m => m.key === monsterKey) ?? STARTER_MONSTERS[0];
  const dispName = nickname.trim() || monster.name;

  return (
    <KidSafeScreen>
      <View style={{ paddingHorizontal: 24, paddingTop: 44 }}>
        <BackButton onPress={onBack} />
        <Text style={s.chooseHeading}>It's official!</Text>
        <Text style={s.chooseSubtitle}>You and {dispName} are a team now!</Text>
      </View>

      <View style={s.content}>

        {/* Monster + confetti */}
        <View style={s.confettiWrap}>
          <Text style={[s.confettiPiece, { top: 0,   left: 20  }]}>✨</Text>
          <Text style={[s.confettiPiece, { top: 10,  right: 10 }]}>🌟</Text>
          <Text style={[s.confettiPiece, { top: 0,   right: 50 }]}>💎</Text>
          <Text style={[s.confettiPiece, { bottom: 20, left: 10 }]}>🟡</Text>
          <Text style={[s.confettiPiece, { bottom: 10, right: 20}]}>🔷</Text>
          <Text style={[s.confettiPiece, { top: 30,  left: 0   }]}>🟢</Text>
          <Image source={monster.image} style={{ width: 180, height: 180 }} resizeMode="contain" />
        </View>

        {/* Monster card */}
        <View style={s.officialCard}>
          <Image source={getAvatarImage(avatarIdx)} style={{ width: 56, height: 56, borderRadius: 28 }} resizeMode="contain" />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={s.officialName}>{dispName}</Text>
            <Text style={s.officialLevel}>Level 1</Text>
            <View style={s.xpRow}>
              <View style={s.xpTrack}>
                <View style={s.xpFill} />
              </View>
              <Text style={s.xpLabel}>0 / 100 XP</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={s.carouselFooter}>
        {!!submitError && (
          <Text style={{ fontSize: scale(13), color: '#E53935', textAlign: 'center', fontFamily: 'Inter_600SemiBold', marginBottom: 4 }}>
            {submitError}
          </Text>
        )}
        <Button label="Let's go!" onPress={onDone} />
        <Button label="Back" onPress={onBack} variant="secondary" />
      </View>
    </KidSafeScreen>
  );
}

// ─── Main flow ────────────────────────────────────────────────────────────────

export function KidProfileCreation({ onComplete, onSkip }: Props) {
  const [step,            setStep]            = useState(0);
  const [name,            setName]            = useState('');
  const [ageRange,        setAgeRange]        = useState(AGE_RANGES[1]);
  const [avatarIdx,       setAvatarIdx]       = useState(0);
  const [accentColor,     setAccentColor]     = useState(ACCENT_COLORS[1].hex);
  const [monsterKey,      setMonsterKey]      = useState('');
  const [monsterNickname, setMonsterNickname] = useState('');
  const [submitError,     setSubmitError]     = useState('');

  // ── Draft persistence ─────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(KID_PROFILE_DRAFT_KEY)
      .then(raw => {
        if (!raw) return;
        try {
          const d = JSON.parse(raw) as {
            step?: number; name?: string; ageRange?: string;
            avatarIdx?: number; accentColor?: string;
            monsterKey?: string; monsterNickname?: string;
          };
          if (d.name)            setName(d.name);
          if (d.ageRange)        setAgeRange(d.ageRange);
          if (typeof d.avatarIdx === 'number') setAvatarIdx(d.avatarIdx);
          if (d.accentColor)     setAccentColor(d.accentColor);
          if (d.monsterKey)      setMonsterKey(d.monsterKey);
          if (d.monsterNickname) setMonsterNickname(d.monsterNickname);
          if (typeof d.step === 'number' && d.step > 0) setStep(d.step);
        } catch {
          // ignore corrupt draft
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(KID_PROFILE_DRAFT_KEY, JSON.stringify({
      step, name, ageRange, avatarIdx, accentColor, monsterKey, monsterNickname,
    })).catch(() => undefined);
  }, [step, name, ageRange, avatarIdx, accentColor, monsterKey, monsterNickname]);

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const finish = () => {
    setSubmitError('');
    try {
      AsyncStorage.removeItem(KID_PROFILE_DRAFT_KEY).catch(() => undefined);
      onComplete({ name, ageRange, avatarIdx, accentColor, monsterKey, monsterNickname });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    }
  };

  switch (step) {
    case 0: return <StepWelcome onNext={next} onSkip={onSkip} />;
    case 1: return <StepName    onNext={next} onBack={back} name={name} setName={setName} />;
    case 2: return <StepAge     onNext={next} onBack={back} ageRange={ageRange} setAgeRange={setAgeRange} />;
    case 3: return <StepAvatar  onNext={next} onBack={back} avatarIdx={avatarIdx} setAvatarIdx={setAvatarIdx} accentColor={accentColor} setAccentColor={setAccentColor} />;
    case 4: return <StepMonsterCarousel onChoose={(key) => { setMonsterKey(key); next(); }} onBack={back} />;
    case 5: return <StepMonsterName onNext={next} onBack={back} nickname={monsterNickname} setNickname={setMonsterNickname} monsterKey={monsterKey} />;
    case 6: return <StepItsOfficial onDone={finish} onBack={back} monsterKey={monsterKey} nickname={monsterNickname} avatarIdx={avatarIdx} submitError={submitError} />;
    default: return null;
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    minHeight: 48,
  },
  backBtn:  { padding: 4 },
  backArrow: { fontSize: scale(22), color: colors.black, fontFamily: 'Inter_600SemiBold' },
  skipLabel: { fontSize: fontSize.base, color: colors.black, fontFamily: 'Inter_600SemiBold' },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },

  // Typography
  welcomeHeading: {
    fontSize: fontSize.h2,
    fontFamily: 'Inter_900Black',
    color: colors.black,
    textAlign: 'center',
    lineHeight: scale(34),
  },
  heading: {
    fontSize: scale(22),
    fontFamily: 'Inter_900Black',
    color: colors.black,
    lineHeight: scale(28),
    textAlign: 'center',
  },
  subheading: {
    fontSize: fontSize.sm,
    color: colors.muted,
    lineHeight: scale(18),
  },
  body: {
    fontSize: fontSize.base,
    color: colors.black,
    textAlign: 'center',
    lineHeight: scale(22),
  },

  // Dots
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D8D8D8' },
  dotActive: { backgroundColor: PURPLE, width: 20 },


  // Input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.inputBorder,
    borderRadius: radii.md,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    width: '100%',
  },
  input: {
    flex: 1,
    fontSize: fontSize.lg,
    color: colors.black,
    paddingVertical: 14,
    fontFamily: 'Inter_500Medium',
  },
  inputClear: { padding: 4 },
  inputClearText: { fontSize: scale(14), color: colors.muted },

  // Age picker button
  agePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: spacing.xl,
    paddingHorizontal: 24, paddingVertical: 16,
    borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 200, justifyContent: 'center',
  },
  agePickerText:    { fontSize: fontSize.xl, fontFamily: 'Inter_700Bold', color: colors.black },
  agePickerChevron: { fontSize: scale(16), color: colors.muted },

  // Avatar large circle (step)
  avatarLarge: {
    width: 140, height: 140, borderRadius: 70,
    borderWidth: 3, borderColor: colors.black,
    overflow: 'hidden', backgroundColor: colors.bg,
  },
  avatarEditBadge: {
    position: 'absolute', bottom: 6, right: 6,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },

  // Avatar
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
  avatarCell: { borderRadius: radii.xl, borderWidth: 3, borderColor: 'transparent', overflow: 'hidden' },
  avatarCircle: { width: 76, height: 76, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center' },
  colorRow: { flexDirection: 'row', gap: spacing.lg, justifyContent: 'center', marginTop: spacing.xl },
  colorSwatch: { width: 34, height: 34, borderRadius: 17 },
  colorSwatchActive: { borderWidth: 3, borderColor: colors.black },

  // Avatar sheet grid
  avatarSheetGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 12, paddingBottom: 4,
  },
  avatarSheetCell: {
    width: '22%', margin: '1.5%', aspectRatio: 1,
    borderRadius: 14, overflow: 'hidden',
    borderWidth: 2.5, borderColor: 'transparent',
    backgroundColor: colors.bg,
  },
  avatarSheetCellActive: { borderColor: PURPLE },

  // Shared bottom sheet chrome
  sheetScrim:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 2, borderColor: colors.black, borderBottomWidth: 0, paddingTop: 12, overflow: 'hidden' },
  sheetHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0CEC8', alignSelf: 'center', marginBottom: 8 },
  sheetTitle:      { fontSize: scale(12), fontFamily: 'Inter_700Bold', color: '#ABABAB', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 },
  sheetRow:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  sheetRowBorder:  { borderBottomWidth: 1, borderBottomColor: '#F0EEE8' },
  sheetRowLabel:   { flex: 1, fontSize: scale(17), fontFamily: 'Inter_600SemiBold', color: colors.black },
  sheetRowLabelActive: { color: PURPLE },
  sheetCheck:      { fontSize: scale(17), color: PURPLE, fontFamily: 'Inter_700Bold' },

  // Carousel arrow buttons
  arrowBtn: {
    position: 'absolute',
    top: '35%',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  arrowIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },

  // Choose monster screen — header
  chooseHeading: {
    fontSize: scale(34),
    fontFamily: 'Inter_900Black',
    color: colors.black,
    lineHeight: scale(40),
    marginTop: 6,
  },
  chooseSubtitle: {
    fontSize: scale(17),
    fontFamily: 'Inter_600SemiBold',
    color: '#6E6D6C',
    marginTop: 2,
    marginBottom: 4,
  },

  // Monster carousel card
  monsterCard: {
    width: CARD_W,
    alignItems: 'center',
    paddingTop: 12,
  },
  monsterCardActive: {},
  monsterGlow: {
    position: 'absolute',
    top: 125,
    width: CARD_W * 0.72,
    height: CARD_W * 0.72,
    borderRadius: CARD_W * 0.36,
    backgroundColor: '#EAE4FF',
  },
  monsterCardImg: {
    width: CARD_W * 1.425,
    height: CARD_W * 1.275,
  },
  monsterCardName: {
    fontSize: scale(20),
    fontFamily: 'Inter_700Bold',
    color: colors.black,
    textAlign: 'center',
    marginTop: 4,
  },
  paginationRow: {
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  pill: {
    height: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  pillActive:   { width: 32, backgroundColor: '#643DBF' },
  pillInactive: { width: 18, backgroundColor: '#C59BFB' },

  // Stats card inside active carousel card
  statsCard2: {
    width: '100%',
    backgroundColor: colors.cream,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.black,
    padding: 14,
    gap: 10,
    marginTop: 8,
  },
  statRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel2:  { fontSize: scale(12), fontFamily: 'Inter_600SemiBold', color: colors.black },
  statDesc:    { fontSize: scale(10), color: colors.muted },
  statTrack2: {
    flex: 1,
    height: 14,
    borderRadius: 8,
    backgroundColor: '#ECECEC',
    borderWidth: 1,
    borderColor: colors.black,
    overflow: 'hidden',
  },
  statFill2: {
    height: '100%',
    borderRadius: 8,
  },
  statNum: {
    fontSize: scale(12),
    fontFamily: 'Inter_600SemiBold',
    color: colors.black,
    width: 22,
    textAlign: 'right',
  },

  // Carousel footer buttons
  carouselFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },

  // Monster name step — heart bubble
  heartBubble: {
    position: 'absolute',
    top: 10,
    right: -10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    // speech bubble tail via shadow faked with a rotated square — simple approach
  },

  // It's official
  confettiWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    width: 220,
    height: 200,
  },
  confettiPiece: {
    position: 'absolute',
    fontSize: scale(20),
  },
  officialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    marginTop: spacing.lg,
    width: '100%',
  },
  officialName: { fontSize: fontSize.xl, fontFamily: 'Inter_900Black', color: colors.black },
  officialLevel: { fontSize: fontSize.sm, color: colors.muted, fontFamily: 'Inter_500Medium' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  xpTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#E8E4F4', overflow: 'hidden' },
  xpFill: { width: 12, height: '100%', borderRadius: 4, backgroundColor: PURPLE },
  xpLabel: { fontSize: fontSize.xs, color: colors.muted, fontFamily: 'Inter_500Medium' },
});
