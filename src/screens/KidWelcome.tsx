import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Dimensions,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Animated,
  Easing,
  FlatList,
  ScrollView,
  ImageSourcePropType,
  ListRenderItemInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts, FredokaOne_400Regular } from '@expo-google-fonts/fredoka-one';
import { ScreenHeading } from '../design-system/components/ScreenHeading';
import { scale, fontSize as fs, fontWeight as fw, colors } from '../design-system/tokens';

// Disable system font scaling in this screen too
// @ts-ignore
Text.defaultProps = { ...(Text.defaultProps ?? {}), allowFontScaling: false };
// @ts-ignore
TextInput.defaultProps = { ...(TextInput.defaultProps ?? {}), allowFontScaling: false };

const { width: W } = Dimensions.get('window');

const GREEN        = '#dbf73b';
const BLACK        = '#1A1A1A';
const PURPLE       = '#7134e5';
const CREAM        = '#fbf7ee';
const PURPLE_LIGHT = '#f0e3f8';
const FONT         = 'FredokaOne_400Regular';

// ─── Card carousel sizing — 2 full cards + ~40px peek of 3rd ─────────────────
const CARD_GAP = 12;
const CARD_PAD = 20;
const CARD_W   = Math.floor((W - CARD_PAD * 2 - CARD_GAP - 44) / 2); // 44 = peek

// ─── Hero scene: platform is always fixed at the bottom ──────────────────────
// All monsters rendered at the same MONSTER_SIZE, sitting on platformRobot.png
const PLATFORM_W   = scale(420);
const PLATFORM_H   = PLATFORM_W * (448 / 672); // exact aspect of platformSlime.png
const MONSTER_SIZE = scale(300);
const OVERLAP      = PLATFORM_H * 0.28;        // how much monster overlaps platform top
const SCENE_H      = MONSTER_SIZE + PLATFORM_H - OVERLAP;

const PLATFORM_IMG = require('../../assets/platforms/platformSlime.png');

// ─── Shadows ─────────────────────────────────────────────────────────────────
const CARD_SHADOW = {
  shadowColor: BLACK,
  shadowOffset: { width: 3, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 5,
} as const;

const BTN_SHADOW = {
  shadowColor: BLACK,
  shadowOffset: { width: 4, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 0,
  elevation: 6,
} as const;

// ─── Monster catalogue ────────────────────────────────────────────────────────
interface MonsterDef {
  id:      string;
  name:    string;
  trait:   string;
  /** Monster-only image (no platform baked in). null = placeholder. */
  scene:   ImageSourcePropType | null;
  /**
   * true  = SlashSlime.png which includes platform — rendered as a single
   *         full-scene image (no separate platform layer needed).
   * false = separate monster image; platform rendered independently.
   */
  hasBakedPlatform: boolean;
  /** Full-bleed success screen image */
  splash: ImageSourcePropType;
}

const MONSTERS: MonsterDef[] = [
  {
    id:               'slime',
    name:             'Slimey',
    trait:            'Fast',
    scene:            require('../../assets/monstirs/slime/slimer_2.png'),
    hasBakedPlatform: false,
    splash:           require('../../assets/splash/SplashSuccessSlime.png'),
  },
  {
    id:               'flamer',
    name:             'Flamer',
    trait:            'Bold',
    scene:            require('../../assets/monstirs/flamer/flamer_2.png'),
    hasBakedPlatform: false,
    splash:           require('../../assets/splash/SplashSuccessFlame.png'),
  },
  {
    id:               'robot',
    name:             'Bitbot',
    trait:            'Gentle',
    scene:            require('../../assets/monstirs/robot monstir/robot_2.png'),
    hasBakedPlatform: false,
    splash:           require('../../assets/splash/SplashSuccessRobot.png'),
  },
  {
    id:               'jaws',
    name:             'Jaws',
    trait:            'Sweet',
    scene:            null,
    hasBakedPlatform: false,
    splash:           require('../../assets/splash/SplashSuccessCandy.png'),
  },
  {
    id:               'ronnie',
    name:             'Ronnie',
    trait:            'Tasty',
    scene:            null,
    hasBakedPlatform: false,
    splash:           require('../../assets/splash/SplashSuccessFry.png'),
  },
];

// ─── Debug layout values — managed by App, passed in ─────────────────────────

export interface KwDebugValues {
  headingTop:      number;
  subtitleTop:     number;
  shadowX:         number;
  shadowY:         number;
  monsterSize:     number;
  monsterX:        number;
  monsterY:        number;
  platformSize:    number;
  platformX:       number;
  platformY:       number;
  overlapPct:      number;
  cardImgH:        number;
  splashImgRatio:  number;
  splashImgW:      number;
  splashImgX:      number;
  splashImgY:      number;
}

export const KW_DEBUG_DEFAULTS: KwDebugValues = {
  headingTop:     scale(46),
  subtitleTop:    scale(10),
  shadowX:        7,
  shadowY:        10,
  monsterSize:    scale(321),
  monsterX:       0,
  monsterY:       0,
  platformSize:   scale(450),
  platformX:      0,
  platformY:      scale(-43),
  overlapPct:     28,
  cardImgH:       scale(86),
  splashImgRatio: 65,
  splashImgW:     scale(442),
  splashImgX:     0,
  splashImgY:     scale(38),
};

// ─── Entry ────────────────────────────────────────────────────────────────────
type Step = 'welcome' | 'howItWorks' | 'pick' | 'nameMonster' | 'ready';

interface Props {
  childName:  string;
  onComplete: (monsterId: string, monsterName: string) => void;
  dbg:        KwDebugValues;
}

export function KidWelcome({ childName, onComplete, dbg }: Props) {
  const [fontsLoaded] = useFonts({ FredokaOne_400Regular });
  const [step,        setStep]        = useState<Step>('welcome');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [monsterName, setMonsterName] = useState('');

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: GREEN }} />;
  }

  const selected = MONSTERS[selectedIdx];

  switch (step) {
    case 'welcome':
      return <WelcomeScreen name={childName} onNext={() => setStep('howItWorks')} dbg={dbg} />;

    case 'howItWorks':
      return <HowItWorksScreen onNext={() => setStep('pick')} dbg={dbg} />;

    case 'pick':
      return (
        <PickMonsterScreen
          selectedIdx={selectedIdx}
          setSelectedIdx={setSelectedIdx}
          onSelect={() => setStep('nameMonster')}
          dbg={dbg}
        />
      );

    case 'nameMonster':
      return (
        <NameMonsterScreen
          monster={selected}
          monsterName={monsterName}
          setMonsterName={setMonsterName}
          onDone={() => setStep('ready')}
          dbg={dbg}
        />
      );

    case 'ready':
      return (
        <ReadyScreen
          childName={childName}
          monster={selected}
          monsterName={monsterName.trim() || selected.name}
          onStart={() => onComplete(selected.id, monsterName.trim() || selected.name)}
        />
      );
  }
}

// ─── Shared components ────────────────────────────────────────────────────────

/** appBG scaled like the homescreen — anchored to the bottom edge */
function Bg() {
  return (
    <Image
      source={require('../../assets/appBG.png')}
      style={{ position: 'absolute', width: '100%', aspectRatio: 1024 / 1536, bottom: 0 }}
      resizeMode="contain"
    />
  );
}

function PurpleButton({
  label, onPress, disabled,
}: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <TouchableOpacity
      style={[s.purpleBtn, disabled && { opacity: 0.45 }]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <Text style={s.purpleBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Screen 1 — Hey [Name]! ───────────────────────────────────────────────────

function WelcomeScreen({ name, onNext, dbg }: {
  name: string; onNext: () => void; dbg: KwDebugValues;
}) {
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={GREEN} />
      <Bg />
      <SafeAreaView style={s.safe}>
        <ScreenHeading style={[s.heading, { marginTop: dbg.headingTop }]} dropShadow={{ x: dbg.shadowX, y: dbg.shadowY }}>
          {'Hey\n'}{name}{'!'}
        </ScreenHeading>
        <Text style={[s.subtitle, { marginTop: dbg.subtitleTop }]}>Your very own world is waiting.</Text>

        {/* Slimey hero */}
        <View style={s.monsterFlex}>
          <Image
            source={require('../../assets/SlashSlime.png')}
            style={{ width: W * 0.82, height: W * 0.82 }}
            resizeMode="contain"
          />
        </View>

        {/* Bottom card */}
        <View style={s.card}>
          <View style={s.stepsRow}>
            <StepPill image={require('../../assets/icons/IconSlime.png')}   label={'Pick your\nMonstir'} />
            <StepPill image={require('../../assets/icons/IconStar.png')}    label={'Complete\nchores'} />
            <StepPill image={require('../../assets/icons/IconDiamond.png')} label={'Earn\nrewards'} />
          </View>
          <PurpleButton label="Let's go!" onPress={onNext} />
        </View>
      </SafeAreaView>

    </View>
  );
}

function StepPill({
  image, label,
}: { image: ImageSourcePropType; label: string }) {
  return (
    <View style={s.stepPill}>
      <View style={s.stepCircle}>
        <Image source={image} style={s.stepImg} resizeMode="contain" />
      </View>
      <Text style={s.stepLabel}>{label}</Text>
    </View>
  );
}

// ─── Screen 2 — Pick your Monstir ─────────────────────────────────────────────

function PickMonsterScreen({
  selectedIdx, setSelectedIdx, onSelect, dbg,
}: {
  selectedIdx:    number;
  setSelectedIdx: (i: number) => void;
  onSelect:       () => void;
  dbg:            KwDebugValues;
}) {
  const selected = MONSTERS[selectedIdx];
  const dbgMonsterSize = dbg.monsterSize;
  const dbgPlatformW   = dbg.platformSize;
  const dbgPlatformH   = dbg.platformSize * (448 / 672);
  const dbgOverlap     = dbgPlatformH * (dbg.overlapPct / 100);
  const dbgSceneH      = dbgMonsterSize + dbgPlatformH - dbgOverlap;
  const flatRef  = useRef<FlatList<MonsterDef>>(null);

  // ── Bob: continuous float ──
  const bobAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bobAnim, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const bobY = bobAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

  // ── Scale pop on monster change ──
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    scaleAnim.setValue(0.72);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim,   { toValue: 1, useNativeDriver: true, tension: 220, friction: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
  }, [selectedIdx]);

  // ── Scroll carousel to keep selected card visible ──
  useEffect(() => {
    const targetIdx = Math.min(selectedIdx, MONSTERS.length - 2);
    try {
      flatRef.current?.scrollToIndex({ index: targetIdx, animated: true, viewPosition: 0 });
    } catch (_) {
      flatRef.current?.scrollToOffset({ offset: targetIdx * (CARD_W + CARD_GAP), animated: true });
    }
  }, [selectedIdx]);

  const prev = () => setSelectedIdx((selectedIdx - 1 + MONSTERS.length) % MONSTERS.length);
  const next = () => setSelectedIdx((selectedIdx + 1) % MONSTERS.length);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={GREEN} />
      <Bg />
      <SafeAreaView style={s.safe}>
        <ScreenHeading style={[s.heading, { marginTop: dbg.headingTop }]} dropShadow={{ x: dbg.shadowX, y: dbg.shadowY }}>
          {'Pick your\nMonstir'}
        </ScreenHeading>
        <Text style={[s.subtitle, { marginTop: dbg.subtitleTop }]}>Choose your buddy!</Text>

        {/* ── Hero scene with arrows — negative margin breaks out of safe-area padding ── */}
        <View style={[s.heroWrap, { marginHorizontal: -20 }]}>
          {/* Arrows float above scene at zIndex 10 */}
          <TouchableOpacity style={[s.arrowBtn, { zIndex: 10 }]} onPress={prev} activeOpacity={0.75}>
            <Image
              source={require('../../assets/arrow_icon.png')}
              style={[s.arrowImg, { transform: [{ scaleX: -1 }] }]}
              resizeMode="contain"
            />
          </TouchableOpacity>

          {/*
           * The bob wraps the whole scene so platform + monster float together,
           * matching the homescreen behaviour.
           * The pop/fade scale is applied only to the monster layer on switch.
           */}
          <Animated.View style={[s.sceneContainer, { height: dbgSceneH, transform: [{ translateY: bobY }] }]}>
            {/* Platform — always at absolute bottom */}
            <Image
              source={PLATFORM_IMG}
              style={[s.platformAbsolute, {
                width: dbgPlatformW,
                height: dbgPlatformH,
                transform: [{ translateX: dbg.platformX }, { translateY: dbg.platformY }],
              }]}
              resizeMode="contain"
            />

            {/* Monster — sits above platform */}
            <Animated.View style={[s.monsterAbsWrap, {
              bottom: dbgPlatformH - dbgOverlap,
              transform: [{ translateX: dbg.monsterX }, { translateY: dbg.monsterY }],
            }]}>
              <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
                {selected.scene ? (
                  <Image
                    key={selected.id}
                    source={selected.scene}
                    style={{ width: dbgMonsterSize, height: dbgMonsterSize }}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={[{ width: dbgMonsterSize, height: dbgMonsterSize }, s.monsterPlaceholder]}>
                    <Text style={s.monsterPlaceholderText}>🐾</Text>
                    <Text style={s.monsterPlaceholderSub}>Coming soon</Text>
                  </View>
                )}
              </Animated.View>
            </Animated.View>
          </Animated.View>

          <TouchableOpacity style={[s.arrowBtn, { zIndex: 10 }]} onPress={next} activeOpacity={0.75}>
            <Image source={require('../../assets/arrow_icon.png')} style={s.arrowImg} resizeMode="contain" />
          </TouchableOpacity>
        </View>

        {/* ── Monster card carousel — negative margin for edge-to-edge scroll ── */}
        <FlatList
          ref={flatRef}
          data={MONSTERS}
          keyExtractor={(m) => m.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: CARD_PAD, gap: CARD_GAP }}
          snapToInterval={CARD_W + CARD_GAP}
          decelerationRate="fast"
          onScrollToIndexFailed={() => {}}
          style={{ flexGrow: 0, marginBottom: 14, marginHorizontal: -20 }}
          renderItem={({ item, index }: ListRenderItemInfo<MonsterDef>) => (
            <TouchableOpacity
              style={[s.monsterCard, index === selectedIdx && s.monsterCardActive]}
              onPress={() => setSelectedIdx(index)}
              activeOpacity={0.8}
            >
              {item.scene ? (
                <Image source={item.scene} style={[s.monsterCardImg, { height: dbg.cardImgH }]} resizeMode="contain" />
              ) : (
                <View style={[s.monsterCardImg, s.monsterCardPlaceholder, { height: dbg.cardImgH }]}>
                  <Text style={{ fontSize: 28 }}>🐾</Text>
                </View>
              )}
              <Text style={[s.monsterCardName, index === selectedIdx && s.monsterCardNameActive]}>
                {item.name}
              </Text>
              <Text style={s.monsterCardTrait}>{item.trait}</Text>
            </TouchableOpacity>
          )}
        />

        <PurpleButton label={`Select ${selected.name}`} onPress={onSelect} />
      </SafeAreaView>

    </View>
  );
}

// ─── Screen 3 — How Monstir works ─────────────────────────────────────────────

function HowItWorksScreen({ onNext, dbg }: {
  onNext: () => void; dbg: KwDebugValues;
}) {
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={GREEN} />
      <Bg />
      <SafeAreaView style={s.safe}>
        <ScreenHeading style={[s.heading, { marginTop: dbg.headingTop }]} dropShadow={{ x: dbg.shadowX, y: dbg.shadowY }}>{'How Monstir\nworks'}</ScreenHeading>
        <Text style={[s.subtitle, { marginTop: dbg.subtitleTop }]}>Three things. That's it.</Text>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: scale(8) }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[s.card, s.howCard]}>
            <HowRow
              icon={require('../../assets/icons/IconClipboard.png')}
              title="Do chores"
              desc="Your parents set them up. Check them off when you're done."
            />
            <Text style={s.howArrow}>↓</Text>
            <HowRow
              icon={require('../../assets/icons/IconStar.png')}
              title="Earn XP and evolve"
              desc="Complete chores to power up your Monstir and unlock new forms."
            />
            <Text style={s.howArrow}>↓</Text>
            <HowRow
              icon={require('../../assets/icons/IconTreasure.png')}
              title="Unlock rewards"
              desc="Hit your goals and cash in on the rewards your parents set up."
            />
          </View>
        </ScrollView>

        <PurpleButton label="Got it!" onPress={onNext} />
      </SafeAreaView>

    </View>
  );
}

function HowRow({
  icon, title, desc,
}: { icon: ImageSourcePropType; title: string; desc: string }) {
  return (
    <View style={s.howRow}>
      <View style={s.howCircle}>
        <Image source={icon} style={s.howIcon} resizeMode="contain" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.howTitle}>{title}</Text>
        <Text style={s.howDesc}>{desc}</Text>
      </View>
    </View>
  );
}

// ─── Screen 4 — Name your Monstir ─────────────────────────────────────────────

function NameMonsterScreen({
  monster, monsterName, setMonsterName, onDone, dbg,
}: {
  monster:        MonsterDef;
  monsterName:    string;
  setMonsterName: (s: string) => void;
  onDone:         () => void;
  dbg:            KwDebugValues;
}) {
  const IMG_W = dbg.splashImgW > 0 ? dbg.splashImgW : W - 40;
  const IMG_H = IMG_W * (dbg.splashImgRatio / 100);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={GREEN} />
        <Bg />
        <SafeAreaView style={s.safe}>
          <ScreenHeading style={[s.heading, { marginTop: dbg.headingTop }]} dropShadow={{ x: dbg.shadowX, y: dbg.shadowY }}>{'Great\nchoice!'}</ScreenHeading>
          <Text style={[s.subtitle, { marginTop: dbg.subtitleTop }]}>One last question...</Text>

          {/*
           * The success image floats down to sit flush on top of the card —
           * no gap between image bottom and card top.
           */}
          <View style={{ flex: 1, justifyContent: 'flex-end', zIndex: 2, overflow: 'visible' }}>
            <Image
              key={monster.id}
              source={monster.splash}
              style={{
                width: IMG_W,
                height: IMG_H,
                alignSelf: 'center',
                transform: [{ translateX: dbg.splashImgX }, { translateY: dbg.splashImgY }],
              }}
              resizeMode="contain"
            />
          </View>

          <View style={[s.card, { zIndex: 1 }]}>
            <Text style={s.nameQ}>What should we call your new buddy?</Text>
            <Text style={s.nameHint}>Give your Monstir a name.</Text>
            <TextInput
              style={s.nameInput}
              value={monsterName}
              onChangeText={setMonsterName}
              placeholder={monster.name}
              placeholderTextColor="#b4b4b4"
              autoCapitalize="words"
              maxLength={20}
            />
            <PurpleButton label="That's their name!" onPress={onDone} />
          </View>
        </SafeAreaView>
  
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Screen 5 — You're ready! ────────────────────────────────────────────────

function ReadyScreen({
  childName, monster, monsterName, onStart,
}: {
  childName:   string;
  monster:     MonsterDef;
  monsterName: string;
  onStart:     () => void;
}) {
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={GREEN} />
      <Bg />
      <SafeAreaView style={s.safe}>
        <ScreenHeading style={s.heading}>
          {`You're ready,\n${childName}!`}
        </ScreenHeading>
        <Text style={s.subtitle}>Here's what's waiting for you.</Text>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={rs.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Monster card ── */}

          {/* ── Monster card ── */}
          <View style={rs.monsterCard}>
            <View style={rs.monsterImgWrap}>
              {monster.scene ? (
                <Image key={monster.id} source={monster.scene} style={rs.monsterImg} resizeMode="contain" />
              ) : (
                <Text style={{ fontSize: scale(32) }}>🐾</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rs.monsterName}>{monsterName} · Level 1</Text>
              <Text style={rs.monsterXp}>0 XP · 100 XP to evolve</Text>
              <View style={rs.xpTrack}>
                <View style={rs.xpFill} />
              </View>
            </View>
          </View>

          {/* ── Feature rows ── */}
          <ReadyRow
            icon="📋"
            title="3 chores ready for you"
            desc="Make bed · Brush teeth · Put toys away"
          />
          <ReadyRow
            icon="⚔️"
            title="First boss battle"
            desc="Reach level 3 to unlock your first fight"
          />
          <ReadyRow
            icon="🎁"
            title="Reward to earn"
            desc="30 mins screen time — set by your parents"
          />
        </ScrollView>

        {/* ── CTA ── */}
        <View style={rs.footer}>
          <PurpleButton label="Start Adventure! 🚀" onPress={onStart} />
        </View>
      </SafeAreaView>
    </View>
  );
}

function ReadyRow({
  icon, title, desc, descColor,
}: {
  icon: string; title: string; desc: string; descColor?: string;
}) {
  return (
    <View style={rs.row}>
      <Text style={rs.rowIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={rs.rowTitle}>{title}</Text>
        <Text style={[rs.rowDesc, descColor ? { color: descColor } : undefined]}>{desc}</Text>
      </View>
      <Text style={rs.rowChevron}>›</Text>
    </View>
  );
}

const rs = StyleSheet.create({
  scroll: {
    paddingHorizontal: scale(24),
    paddingTop: scale(32),
    paddingBottom: scale(16),
    gap: scale(12),
  },
  // Monster card
  monsterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CREAM,
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: BLACK,
    padding: scale(14),
    gap: scale(12),
    ...CARD_SHADOW,
  },
  monsterImgWrap: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: '#F0EEF8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  monsterImg: {
    width: scale(56),
    height: scale(56),
  },
  monsterName: {
    fontFamily: FONT,
    fontSize: fs.xl,
    fontWeight: fw.bold,
    color: colors.black,
    marginBottom: scale(2),
  },
  monsterXp: {
    fontSize: fs.base,
    fontWeight: fw.semibold,
    color: colors.muted,
    marginBottom: scale(6),
  },
  xpTrack: {
    height: scale(6),
    backgroundColor: '#ECEAE4',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  xpFill: {
    width: '0%',
    height: '100%',
    backgroundColor: PURPLE,
    borderRadius: scale(3),
  },

  // Feature rows
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CREAM,
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: BLACK,
    padding: scale(14),
    gap: scale(12),
    ...CARD_SHADOW,
  },
  rowIcon: {
    fontSize: scale(28),
    width: scale(40),
    textAlign: 'center',
  },
  rowTitle: {
    fontSize: fs.xl,
    fontWeight: fw.bold,
    color: colors.black,
    marginBottom: scale(2),
  },
  rowDesc: {
    fontSize: fs.base,
    fontWeight: fw.semibold,
    color: colors.muted,
    lineHeight: fs.base * 1.4,
  },
  rowChevron: {
    fontSize: scale(22),
    color: '#ABABAB',
  },

  // Footer
  footer: {
    paddingHorizontal: scale(24),
    paddingBottom: scale(12),
    paddingTop: scale(8),
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: GREEN,
  },
  safe: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingBottom: scale(12),
  },

  // ── Typography
  heading: {
    marginTop: scale(28),
    marginBottom: scale(4),
  },
  subtitle: {
    fontSize: scale(18),
    fontWeight: '600',
    color: BLACK,
    textAlign: 'center',
    marginTop: scale(10),
    marginBottom: scale(6),
  },

  // ── Layout helpers
  monsterFlex: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Card shell
  card: {
    backgroundColor: CREAM,
    borderRadius: scale(14),
    borderWidth: 2,
    borderColor: BLACK,
    padding: scale(20),
    gap: scale(14),
    ...CARD_SHADOW,
  },

  // ── Step pills (welcome card)
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stepPill: {
    alignItems: 'center',
    width: scale(80),
    gap: scale(6),
  },
  stepCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: '#EEE8F8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stepImg: {
    width: scale(46),
    height: scale(46),
  },
  stepLabel: {
    fontSize: scale(12),
    fontWeight: '700',
    color: BLACK,
    textAlign: 'center',
  },

  // ── Purple button
  purpleBtn: {
    backgroundColor: PURPLE,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: BLACK,
    paddingVertical: scale(16),
    alignItems: 'center',
    ...BTN_SHADOW,
  },
  purpleBtnText: {
    fontFamily: FONT,
    fontSize: scale(20),
    color: '#FFFFFF',
  },

  // ── Picker hero — arrows + scene
  heroWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    marginBottom: scale(14),
    flex: 1,
  },
  arrowBtn: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    ...CARD_SHADOW,
  },
  arrowImg: {
    width: scale(24),
    height: scale(24),
  },

  // Fixed-size scene container — platform anchor never moves
  sceneContainer: {
    flex: 1,
    height: SCENE_H,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  // Platform always at the bottom, zIndex 1
  platformAbsolute: {
    position: 'absolute',
    bottom: 0,
    width: PLATFORM_W,
    height: PLATFORM_H,
    zIndex: 1,
  },

  // Monster for non-slime: sits above platform
  monsterAbsWrap: {
    position: 'absolute',
    bottom: PLATFORM_H - OVERLAP,
    zIndex: 2,
    alignItems: 'center',
  },

  // Slime: full-scene image covers the platform layer
  monsterAbsSlime: {
    position: 'absolute',
    bottom: 0,
    zIndex: 2,
    alignItems: 'center',
  },

  monsterImg: {
    width: MONSTER_SIZE,
    height: MONSTER_SIZE,
  },

  // SlashSlime covers the full scene (monster + its baked platform)
  slimeHeroImg: {
    width: SCENE_H,
    height: SCENE_H,
  },

  monsterPlaceholder: {
    backgroundColor: '#E8E0F8',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  monsterPlaceholderText: {
    fontSize: scale(56),
  },
  monsterPlaceholderSub: {
    fontSize: scale(14),
    fontWeight: '600',
    color: '#888',
  },

  // ── Monster cards
  monsterCard: {
    width: CARD_W,
    backgroundColor: CREAM,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BLACK,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 2,
    ...CARD_SHADOW,
  },
  monsterCardActive: {
    backgroundColor: PURPLE_LIGHT,
    borderColor: PURPLE,
    shadowColor: PURPLE,
  },
  monsterCardImg: {
    width: CARD_W - 24,
    height: 80,
  },
  monsterCardPlaceholder: {
    backgroundColor: '#E8E0F8',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monsterCardName: {
    fontFamily: FONT,
    fontSize: scale(16),
    color: BLACK,
    textAlign: 'center',
  },
  monsterCardNameActive: {
    color: PURPLE,
  },
  monsterCardTrait: {
    fontSize: scale(12),
    color: '#888',
    textAlign: 'center',
  },

  // ── How it works
  howCard: {
    marginBottom: scale(14),
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  howCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: '#EEE8F8',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  howIcon: {
    width: scale(46),
    height: scale(46),
  },
  howTitle: {
    fontFamily: FONT,
    fontSize: scale(18),
    color: BLACK,
    marginBottom: scale(2),
  },
  howDesc: {
    fontSize: scale(13),
    color: '#555',
    lineHeight: scale(18),
  },
  howArrow: {
    fontSize: scale(22),
    textAlign: 'center',
    color: BLACK,
    paddingVertical: scale(2),
  },

  // ── Name monster
  nameQ: {
    fontFamily: FONT,
    fontSize: scale(22),
    color: BLACK,
    textAlign: 'center',
  },
  nameHint: {
    fontSize: scale(14),
    color: '#888',
    textAlign: 'center',
    marginTop: scale(-6),
  },
  nameInput: {
    borderWidth: 2,
    borderColor: BLACK,
    borderRadius: scale(12),
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    fontSize: scale(18),
    fontWeight: '600',
    color: BLACK,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
  },
});
