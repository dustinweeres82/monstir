import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Platform, Image, TextInput, Switch, Modal,
  Animated, Easing, Dimensions, PanResponder, ActionSheetIOS, FlatList,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import Svg, { Ellipse, Circle, Path, Polygon, Line, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
import { EvolutionAnimation } from './src/components/EvolutionAnimation';
import { MascotBanner } from './src/components/MascotBanner';
import { CreamBg } from './src/components/CreamBg';
import { KidProfileCreation, getAvatarImage } from './src/screens/KidProfileCreation';
import { ParentOnboarding } from './src/screens/ParentOnboarding';
import { shadows } from './src/design-system/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChoreId = 'dishes' | 'trash' | 'bed' | 'vacuum' | 'laundry' | 'sweep' | 'wipe' | 'mop' | 'plants' | 'recycling' | 'windows' | 'bathroom';
type Tab     = 'home' | 'battle' | 'wallet';
type Screen  = Tab | 'arena' | 'result' | 'evolve' | 'goalFlow';
type MonsterIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

type ParentTab    = 'kidView' | 'chores' | 'rewards' | 'settings';
type ParentScreen = 'parentHome' | 'chores' | 'addChore' | 'editChore' | 'payRates' | 'rateGuide' | 'rewards' | 'settings';
type ViewMode     = 'kid' | 'parent';

interface Chore   { id: ChoreId; name: string; icon: string | number; bg: string; xp: number; multiplier: number; }
interface Monster { name: string; level: number; needed: number; }
interface Boss    { name: string; power: number; bonus: number; }

interface ManagedChore {
  id: string; name: string; description: string;
  frequency: string; rate: string; icon: string | number; bg: string; completed: boolean;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const CHORES: Chore[] = [
  { id: 'dishes',   name: 'Wash the dishes',          icon: require('./assets/icons/chore=iconDishes.png'),  bg: '#FFF9E6', xp: 1, multiplier: 1.0 },
  { id: 'trash',    name: 'Take out the trash',        icon: require('./assets/icons/chore=iconGarbage.png'), bg: '#F0F7F0', xp: 1, multiplier: 1.0 },
  { id: 'bed',      name: 'Make your bed',              icon: require('./assets/icons/chore=iconBed.png'),     bg: '#EAF3FB', xp: 1, multiplier: 0.5 },
  { id: 'vacuum',   name: 'Vacuum the living room',    icon: require('./assets/icons/chore=iconVacuum.png'),  bg: '#F5F0FB', xp: 2, multiplier: 2.0 },
  { id: 'laundry',  name: 'Put away laundry',           icon: require('./assets/icons/chore=iconLaundry.png'), bg: '#FFF0F0', xp: 1, multiplier: 1.0 },
  { id: 'sweep',    name: 'Sweep the kitchen',          icon: require('./assets/icons/chore=iconBroom.png'),   bg: '#FFF9E6', xp: 1, multiplier: 1.0 },
  { id: 'wipe',     name: 'Wipe down counters',         icon: require('./assets/icons/chore=iconSoap.png'),    bg: '#F0F7F0', xp: 1, multiplier: 0.5 },
  { id: 'mop',      name: 'Mop the floor',              icon: require('./assets/icons/chore=iconSoap.png'),    bg: '#EAF3FB', xp: 2, multiplier: 1.5 },
  { id: 'plants',   name: 'Water the plants',           icon: '🪴',                                            bg: '#F0F7F0', xp: 1, multiplier: 0.5 },
  { id: 'recycling',name: 'Sort the recycling',         icon: require('./assets/icons/chore=iconGarbage.png'), bg: '#F0F7F0', xp: 1, multiplier: 0.5 },
  { id: 'windows',  name: 'Clean the windows',          icon: '🪟',                                            bg: '#EAF3FB', xp: 1, multiplier: 1.0 },
  { id: 'bathroom', name: 'Clean the bathroom',         icon: require('./assets/icons/chore=iconSoap.png'),    bg: '#F5F0FB', xp: 2, multiplier: 2.5 },
];

const choreCoins = (chore: Chore, baseRate: string): number =>
  Math.round(parseFloat(baseRate) * 100 * chore.multiplier);

const fmtCoins = (cents: number): string =>
  cents >= 100 ? `$${(cents / 100).toFixed(2)}` : `${cents}¢`;

const MONSTERS: Monster[] = [
  { name: 'Grumble',  level: 1, needed: 3   },
  { name: 'Fanglet',  level: 2, needed: 8   },
  { name: 'Bristor',  level: 3, needed: 18  },
  { name: 'Vexling',  level: 4, needed: 35  },
  { name: 'Thornax',  level: 5, needed: 60  },
  { name: 'Zorphax',  level: 6, needed: 100 },
  { name: 'Dreadmaw', level: 7, needed: 160 },
  { name: 'Vorthak',  level: 8, needed: 250 },
];

const BOSSES: Boss[] = [
  { name: 'Grumbloth', power: 50,  bonus: 20 },
  { name: 'Mireflax',  power: 80,  bonus: 35 },
  { name: 'Vorthak',   power: 120, bonus: 60 },
];

const FREQUENCY_OPTIONS = ['Every day', '2 times per week', '3 times per week', 'Once a week', 'As needed'];

const CHORE_ICONS: { icon: string | number; bg: string }[] = [
  { icon: require('./assets/icons/chore=iconBed.png'),     bg: '#FEF3D7' },
  { icon: require('./assets/icons/chore=iconLaundry.png'), bg: '#FFF9E6' },
  { icon: '☕',                                             bg: '#FFF0E6' },
  { icon: require('./assets/icons/chore=iconGarbage.png'), bg: '#F0F7F0' },
  { icon: '🐾',                                             bg: '#FFF9E6' },
  { icon: '🪴',                                             bg: '#F0F7F0' },
  { icon: require('./assets/icons/chore=iconDishes.png'),  bg: '#FFF9E6' },
  { icon: require('./assets/icons/chore=iconBroom.png'),   bg: '#F5F0FB' },
  { icon: require('./assets/icons/chore=iconSoap.png'),    bg: '#EAF3FB' },
  { icon: require('./assets/icons/chore=iconVacuum.png'),  bg: '#F5F0FB' },
];

const DEFAULT_MANAGED_CHORES: ManagedChore[] = [
  { id: '1', name: 'Make your bed',      description: 'Make your bed neatly every morning.', frequency: 'Every day',        rate: '0.50', icon: require('./assets/icons/chore=iconBed.png'),     bg: '#FEF3D7', completed: false },
  { id: '2', name: 'Fold the laundry',   description: 'Fold and put away laundry.',          frequency: 'Every day',        rate: '0.50', icon: require('./assets/icons/chore=iconLaundry.png'), bg: '#FFF9E6', completed: false },
  { id: '3', name: 'Clean the bathroom', description: 'Clean sink, toilet, and floor.',      frequency: '2 times per week', rate: '1.00', icon: require('./assets/icons/chore=iconSoap.png'),    bg: '#EAF3FB', completed: false },
  { id: '4', name: 'Take out the trash', description: 'Take all trash cans to the curb.',    frequency: '2 times per week', rate: '0.75', icon: require('./assets/icons/chore=iconGarbage.png'), bg: '#F0F7F0', completed: true  },
  { id: '5', name: 'Water the plants',   description: 'Water all indoor and outdoor plants.',frequency: '3 times per week', rate: '0.50', icon: '🪴',                                             bg: '#F0F7F0', completed: false },
  { id: '6', name: 'Feed the pet',       description: 'Fill food and water bowls.',          frequency: 'Every day',        rate: '0.25', icon: '🐾',                                             bg: '#FFF9E6', completed: false },
];

// ─── Colors ───────────────────────────────────────────────────────────────────

const C = {
  bg: '#F7F6F2', surface: '#FFFFFF', border: '#ECEAE4',
  text: '#1A1A1A', muted: '#ABABAB', hint: '#C0BEB8',
  accent: '#4C9FE8',
  gold: '#996B00', goldLight: '#FFF9E6', goldBorder: '#F0C840',
  win: '#F0F7F0', loss: '#FFF0F0',
};

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }


// ─── Win odds: 0 chores = 10%, all chores = 90% ───────────────────────────────

function calcWinOdds(doneCount: number): number {
  return Math.round(10 + (doneCount / CHORES.length) * 80);
}

// ─── Battle narration ─────────────────────────────────────────────────────────

function battleScript(monsterName: string, bossName: string, won: boolean) {
  return won ? [
    { delay: 0,    text: `${monsterName} charges forward!`,                        bold: false },
    { delay: 900,  text: `${bossName} strikes back — ${monsterName} holds firm.`,  bold: false },
    { delay: 1900, text: `${monsterName} lands a massive hit!`,                    bold: false },
    { delay: 2900, text: `${bossName} is weakening...`,                            bold: false },
    { delay: 3700, text: `${monsterName} wins! 🎉`,                                bold: true  },
  ] : [
    { delay: 0,    text: `${monsterName} charges forward!`,                        bold: false },
    { delay: 900,  text: `${bossName} blocks and counters hard.`,                  bold: false },
    { delay: 1900, text: `${monsterName} stumbles — but doesn't give up.`,         bold: false },
    { delay: 2900, text: `${bossName} overpowers with a final blow.`,              bold: false },
    { delay: 3700, text: `${monsterName} falls. Better luck next week.`,           bold: true  },
  ];
}

// ─── Monster images (robot evolutions 1–8) ───────────────────────────────────

const ROBOT_IMAGES = [
  require('./assets/robot monstir/robot_1.png'),
  require('./assets/robot monstir/robot_2.png'),
  require('./assets/robot monstir/robot_3.png'),
  require('./assets/robot monstir/robot_4.png'),
  require('./assets/robot monstir/robot_5.png'),
  require('./assets/robot monstir/robot_6.png'),
  require('./assets/robot monstir/robot_7.png'),
  require('./assets/robot monstir/robot_8.png'),
];

function RobotMonster({ idx, size = 90 }: { idx: MonsterIdx; size?: number }) {
  return (
    <Image
      source={ROBOT_IMAGES[idx]}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

// Boss SVGs — spikier and more intimidating

function BossGrumbloth({ size = 90 }: { size?: number }) {
  return (
    <Image
      source={require('./assets/spikid.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

function BossMireflax({ size = 90 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 110 110" width={size} height={size}>
      <Ellipse cx="55" cy="68" rx="38" ry="33" fill="#C8A8F0" />
      <Ellipse cx="55" cy="52" rx="30" ry="27" fill="#A070D8" />
      <Polygon points="40,20 36,42 50,32"  fill="#A070D8" />
      <Polygon points="70,20 74,42 60,32"  fill="#A070D8" />
      <Polygon points="55,14 48,34 55,26 62,34" fill="#A070D8" />
      <Polygon points="30,30 28,50 42,40"  fill="#A070D8" />
      <Polygon points="80,30 82,50 68,40"  fill="#A070D8" />
      <Circle cx="43" cy="50" r="8"   fill="white" />
      <Circle cx="67" cy="50" r="8"   fill="white" />
      <Circle cx="45" cy="50" r="4.5" fill="#2A005A" />
      <Circle cx="69" cy="50" r="4.5" fill="#2A005A" />
      <Circle cx="43" cy="48" r="2"   fill="white" />
      <Circle cx="67" cy="48" r="2"   fill="white" />
      <Path d="M43 67 L48 61 L52 67 L55 61 L58 67 L62 61 L67 67" stroke="#7040A8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <Ellipse cx="55" cy="92" rx="26" ry="9" fill="rgba(0,0,0,0.07)" />
    </Svg>
  );
}

function BossVorthak({ size = 90 }: { size?: number }) {
  return (
    <Svg viewBox="0 0 110 110" width={size} height={size}>
      <Ellipse cx="55" cy="70" rx="40" ry="35" fill="#2A2A4A" />
      <Ellipse cx="55" cy="52" rx="32" ry="29" fill="#3A3A6A" />
      <Polygon points="55,8 46,30 55,22 64,30"  fill="#5A5A8A" />
      <Polygon points="34,14 30,38 46,26"        fill="#5A5A8A" />
      <Polygon points="76,14 80,38 64,26"        fill="#5A5A8A" />
      <Polygon points="20,30 18,54 36,42"        fill="#5A5A8A" />
      <Polygon points="90,30 92,54 74,42"        fill="#5A5A8A" />
      <Circle cx="42" cy="50" r="9"   fill="#FF4040" />
      <Circle cx="68" cy="50" r="9"   fill="#FF4040" />
      <Circle cx="42" cy="50" r="5"   fill="#FF0000" />
      <Circle cx="68" cy="50" r="5"   fill="#FF0000" />
      <Circle cx="40" cy="48" r="2.5" fill="white" />
      <Circle cx="66" cy="48" r="2.5" fill="white" />
      <Path d="M42 68 L47 60 L51 68 L55 60 L59 68 L63 60 L68 68" stroke="#8080C0" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <Ellipse cx="55" cy="95" rx="28" ry="10" fill="rgba(0,0,0,0.15)" />
    </Svg>
  );
}

const MONSTER_SVGS: Array<(props: { size?: number }) => React.JSX.Element> = [
  ({ size }) => <RobotMonster idx={0} size={size} />,
  ({ size }) => <RobotMonster idx={1} size={size} />,
  ({ size }) => <RobotMonster idx={2} size={size} />,
  ({ size }) => <RobotMonster idx={3} size={size} />,
  ({ size }) => <RobotMonster idx={4} size={size} />,
  ({ size }) => <RobotMonster idx={5} size={size} />,
  ({ size }) => <RobotMonster idx={6} size={size} />,
  ({ size }) => <RobotMonster idx={7} size={size} />,
];
const BOSS_SVGS = [BossGrumbloth, BossMireflax, BossVorthak];

// ─── Shared primitives ────────────────────────────────────────────────────────

interface SwitcherOption { label: string; emoji: string; bg: string; }

function ViewSwitcher({ selected, options, onSelect, dark = false }: {
  selected: string;
  options: SwitcherOption[];
  onSelect: (opt: SwitcherOption) => void;
  dark?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const sheetY      = useRef(new Animated.Value(300)).current;

  const openSheet = () => {
    setOpen(true);
    scrimOpacity.setValue(1);
    sheetY.setValue(300);
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeSheet = (cb?: () => void) => {
    Animated.timing(sheetY, { toValue: 300, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start(() => {
      setOpen(false);
      cb?.();
    });
  };

  return (
    <>
      <TouchableOpacity onPress={openSheet} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[sw.trigger, dark && sw.triggerDark]}>{selected} ▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[sw.scrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[sw.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={sw.sheetHandle} />
            <Text style={sw.sheetTitle}>Switch view</Text>
            {options.map((opt, i) => {
              const active = opt.label === selected;
              return (
                <TouchableOpacity
                  key={opt.label}
                  style={[sw.option, i < options.length - 1 && sw.optionBorder]}
                  activeOpacity={0.7}
                  onPress={() => closeSheet(() => onSelect(opt))}
                >
                  <View style={[sw.optionAvatar, { backgroundColor: opt.bg }]}>
                    <Text style={{ fontSize: 18 }}>{opt.emoji}</Text>
                  </View>
                  <Text style={[sw.optionLabel, active && sw.optionLabelActive]}>{opt.label}</Text>
                  {active && <Text style={sw.check}>✓</Text>}
                </TouchableOpacity>
              );
            })}
            <View style={{ height: 24 }} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const sw = StyleSheet.create({
  trigger:         { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  triggerDark:     { color: '#1A1A1A' },
  scrim:           { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:           { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 2, borderColor: '#1A1A1A', borderBottomWidth: 0, paddingTop: 12, overflow: 'hidden' },
  sheetHandle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0CEC8', alignSelf: 'center', marginBottom: 8 },
  sheetTitle:      { fontSize: 12, fontWeight: '700', color: '#ABABAB', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  option:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  optionBorder:    { borderBottomWidth: 1, borderBottomColor: '#F0EEE8' },
  optionAvatar:    { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionLabel:     { flex: 1, fontSize: 16, fontWeight: '600', color: '#1A1A1A' },
  optionLabelActive: { color: '#6B35F0' },
  check:           { fontSize: 16, color: '#6B35F0', fontWeight: '700' },
});


// ─── Avatar picker + age range ────────────────────────────────────────────────

const AGE_RANGES = ['Ages 4–6', 'Ages 7–9', 'Ages 10–12', 'Ages 13+'];

function AvatarPickerSheet({ visible, selected, onSelect, onClose }: {
  visible: boolean; selected: number;
  onSelect: (idx: number) => void; onClose: () => void;
}) {
  const sheetY = useRef(new Animated.Value(400)).current;

  const open  = () => Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  const close = (cb?: () => void) =>
    Animated.timing(sheetY, { toValue: 400, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start(() => { onClose(); cb?.(); });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={() => close()} onShow={open}>
      <View style={av.scrim}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => close()} />
        <Animated.View style={[av.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
          <View style={av.handle} />
          <Text style={av.title}>Choose avatar</Text>
          <FlatList
            data={[0,1,2,3,4,5,6,7]}
            keyExtractor={String}
            numColumns={4}
            scrollEnabled={false}
            contentContainerStyle={av.grid}
            renderItem={({ item: idx }) => (
              <TouchableOpacity
                style={[av.cell, selected === idx && av.cellActive]}
                onPress={() => { onSelect(idx); close(); }}
                activeOpacity={0.8}
              >
                <Image source={getAvatarImage(idx)} style={av.cellImg} resizeMode="cover" />
              </TouchableOpacity>
            )}
          />
          <View style={{ height: Platform.OS === 'ios' ? 28 : 12 }} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const av = StyleSheet.create({
  scrim:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 2, borderColor: '#1A1A1A', borderBottomWidth: 0, paddingTop: 12, overflow: 'hidden' },
  handle:     { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0CEC8', alignSelf: 'center', marginBottom: 8 },
  title:      { fontSize: 12, fontWeight: '700', color: '#ABABAB', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  grid:       { paddingHorizontal: 16, gap: 10 },
  cell:       { flex: 1, margin: 5, aspectRatio: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent', backgroundColor: '#F3F1EC' },
  cellActive: { borderColor: '#6B35F0' },
  cellImg:    { width: '100%', height: '100%' },
});

function ChoreIcon({ icon, size }: { icon: string | number; size: number }) {
  if (typeof icon === 'number') {
    return <Image source={icon} style={{ width: size, height: size }} resizeMode="contain" />;
  }
  return <Text style={{ fontSize: size * 0.8 }}>{icon}</Text>;
}

function Header({ title, coins, showCoins = true }: { title: string; coins?: number; showCoins?: boolean }) {
  return (
    <View style={s.header}>
      <Text style={s.wordmark}>{title}</Text>
      {showCoins && coins !== undefined && (
        <View style={s.coinPill}><Text style={s.coinText}>{coins}¢</Text></View>
      )}
    </View>
  );
}

const NAV_TABS: { id: Tab; label: string; icon: ReturnType<typeof require> }[] = [
  { id: 'home',   label: 'Monsters', icon: require('./assets/icons/Property 1=navHome.png')   },
  { id: 'battle', label: 'Quests',   icon: require('./assets/icons/Property 1=navQuests.png') },
  { id: 'wallet', label: 'Wallet',   icon: require('./assets/icons/Property 1=navWallet.png') },
];

function TabBar({ active, onNav, onGoals }: { active: Tab; onNav: (t: Tab) => void; onGoals: () => void }) {
  return (
    <View style={s.tabBar} pointerEvents="box-none">
      <View style={s.tabBarInner}>
        {NAV_TABS.map(t => {
          const isActive = active === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={s.tab}
              onPress={() => t.id === 'wallet' ? onGoals() : onNav(t.id)}
              activeOpacity={0.7}
            >
              <View style={[s.tabIconWrap, isActive && s.tabIconWrapActive]}>
                <Image source={t.icon} style={s.tabIcon} resizeMode="contain" />
                <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>{t.label}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ChoreRow({ chore, done, onPress, baseRate }: { chore: Chore; done: boolean; onPress: () => void; baseRate: string }) {
  return (
    <TouchableOpacity style={[s.choreRow, done && s.choreRowDone]} onPress={done ? undefined : onPress} activeOpacity={0.7}>
      <View style={[s.choreIcon, { backgroundColor: chore.bg }]}>
        <ChoreIcon icon={chore.icon} size={28} />
      </View>
      <View style={s.choreInfo}>
        <Text style={[s.choreName, done && s.choreNameDone]}>{chore.name}</Text>
        <Text style={s.choreSub}><Text style={s.choreGold}>+{fmtCoins(choreCoins(chore, baseRate))}</Text>{'  ·  +' + chore.xp + ' XP'}</Text>
      </View>
      <View style={[s.choreCheck, done && s.choreCheckDone]}>
        {done && <View style={s.checkDot} />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Parent Tab Bar ───────────────────────────────────────────────────────────

function ParentTabBar({ active, onNav }: { active: ParentTab; onNav: (t: ParentTab) => void }) {
  const tabs: { id: ParentTab; icon: string; label: string }[] = [
    { id: 'kidView',  icon: '🧒', label: 'Kid view' },
    { id: 'chores',   icon: '📋', label: 'Chores'   },
    { id: 'rewards',  icon: '🎁', label: 'Rewards'  },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];
  return (
    <View style={s.tabBar} pointerEvents="box-none">
      <View style={s.tabBarInner}>
        {tabs.map(t => {
          const isActive = active === t.id;
          return (
            <TouchableOpacity key={t.id} style={p.tabItem} onPress={() => onNav(t.id)} activeOpacity={0.7}>
              <Text style={[s.tabIcon, isActive && s.tabIconActive]}>{t.icon}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Kid Screens ──────────────────────────────────────────────────────────────

function AnimatedQuestRow({ chore, done, onPress, baseRate }: { chore: Chore; done: boolean; onPress: () => void; baseRate: string }) {
  const checkScale    = useRef(new Animated.Value(done ? 1 : 0)).current;
  const sweepOpacity  = useRef(new Animated.Value(done ? 1 : 0)).current;
  const prevDone      = useRef(done);

  useEffect(() => {
    if (done && !prevDone.current) {
      Animated.parallel([
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 280, friction: 6 }),
        Animated.timing(sweepOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else if (!done && prevDone.current) {
      checkScale.setValue(0);
      sweepOpacity.setValue(0);
    }
    prevDone.current = done;
  }, [done]);

  return (
    <TouchableOpacity
      style={s.homeQuestCard}
      onPress={done ? undefined : onPress}
      activeOpacity={0.7}
    >
      <Animated.View style={[s.homeQuestSweep, { opacity: sweepOpacity }]} />
      <View style={[s.homeQuestIcon, { backgroundColor: chore.bg }]}>
        <ChoreIcon icon={chore.icon} size={45} />
      </View>
      <View style={s.homeQuestInfo}>
        <Text style={[s.homeQuestTitle, done && s.homeQuestTitleDone]}>{chore.name}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={{ fontSize: 14 }}>🪙</Text>
          <Text style={s.homeQuestReward}>{fmtCoins(choreCoins(chore, baseRate))}</Text>
        </View>
      </View>
      <Animated.View style={[s.homeQuestCheck, done && s.homeQuestCheckDone, done && { transform: [{ scale: checkScale }] }]}>
        {done && <View style={s.homeQuestCheckDot} />}
      </Animated.View>
    </TouchableOpacity>
  );
}

type XpPop = { id: number; label: string; y: Animated.Value; opacity: Animated.Value; kind: 'xp' | 'coin' };

function HomeScreen({ monsterIdx, xp, coins, done, onComplete, onSwitchToParent, onDebugSetXp, onDebugSetMonster, onResetApp, baseRate }: {
  monsterIdx: MonsterIdx; xp: number; coins: number;
  done: Partial<Record<ChoreId, boolean>>; onComplete: (c: Chore) => void;
  onSwitchToParent: () => void;
  onDebugSetXp: (xp: number) => void;
  onDebugSetMonster: (idx: MonsterIdx) => void;
  onResetApp: (mode: AppMode) => void;
  baseRate: string;
}) {
  const monster    = MONSTERS[monsterIdx];
  const need       = monster.needed;
  const pct        = Math.min(100, Math.round((xp / need) * 100));
  const MonsterSvg = MONSTER_SVGS[monsterIdx];
  const remaining  = CHORES.filter(c => !done[c.id]).length;
  const dollars    = (coins / 100).toFixed(2);
  const [debugOpen, setDebugOpen]             = useState(false);
  const [debugTab,  setDebugTab]              = useState<'xp' | 'layout' | 'reset'>('xp');
  const [dbgMonsterSize,  setDbgMonsterSize]  = useState(300);
  const [dbgPlatformSize, setDbgPlatformSize] = useState(340);
  const [dbgPlatformY,    setDbgPlatformY]    = useState(0);
  const [kidAvatarIdx,    setKidAvatarIdx]    = useState(0);
  const [kidAgeRange,     setKidAgeRange]     = useState('Ages 7–9');
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);

  function openAgeSheet() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...AGE_RANGES, 'Cancel'], cancelButtonIndex: AGE_RANGES.length, title: 'Age range' },
        (i) => { if (i < AGE_RANGES.length) setKidAgeRange(AGE_RANGES[i]); },
      );
    }
  }

  // Monster idle bob
  const bobAnim = useRef(new Animated.Value(0)).current;
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

  // Monster pulse on chore complete
  const monsterScale = useRef(new Animated.Value(1)).current;
  const pulseMonster = useCallback(() => {
    Animated.sequence([
      Animated.spring(monsterScale, { toValue: 1.14, useNativeDriver: true, tension: 300, friction: 5 }),
      Animated.spring(monsterScale, { toValue: 1, useNativeDriver: true, tension: 200, friction: 8 }),
    ]).start();
  }, []);

  // XP bar animated width (0–100 interpolated to percentage string)
  const xpWidthAnim = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    Animated.spring(xpWidthAnim, { toValue: pct, useNativeDriver: false, tension: 40, friction: 7 }).start();
  }, [pct]);

  // +XP floating popups
  const [xpPops, setXpPops] = useState<XpPop[]>([]);
  const popIdRef = useRef(0);
  const showPop = useCallback((label: string, kind: 'xp' | 'coin', delay = 0) => {
    const id = ++popIdRef.current;
    const y = new Animated.Value(0);
    const opacity = new Animated.Value(0);
    setXpPops(prev => [...prev, { id, label, y, opacity, kind }]);
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(y, { toValue: -80, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
    setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: true }).start(
        () => setXpPops(prev => prev.filter(p => p.id !== id))
      );
    }, delay + 700);
  }, []);

  const handleComplete = useCallback((c: Chore) => {
    pulseMonster();
    showPop(`+${c.xp} XP`, 'xp');
    showPop(`+${fmtCoins(choreCoins(c, baseRate))}`, 'coin', 120);
    onComplete(c);
  }, [pulseMonster, showPop, onComplete]);

  return (
    <View style={s.homeRoot}>
      <Image
        source={require('./assets/appBG.png')}
        style={{ position: 'absolute', width: '100%', aspectRatio: 1024 / 1536, bottom: 0 }}
        resizeMode="contain"
      />
      {/* Header */}
      <View style={s.homeHeader}>
        <View style={s.homeHeaderLeft}>
          <TouchableOpacity style={s.homeAvatar} onPress={() => setAvatarPickerOpen(true)} activeOpacity={0.8}>
            <Image source={getAvatarImage(kidAvatarIdx)} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          </TouchableOpacity>
          <View style={{ gap: 1 }}>
            <ViewSwitcher
              selected="Kid view"
              options={[
                { label: 'Kid view',    emoji: '🧒', bg: '#EAE4FF' },
                { label: 'Parent view', emoji: '👩', bg: '#C5F215' },
              ]}
              onSelect={(opt) => { if (opt.label === 'Parent view') onSwitchToParent(); }}
            />
            <TouchableOpacity onPress={openAgeSheet} activeOpacity={0.7}>
              <Text style={s.homeAgeRange}>{kidAgeRange} ▾</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={s.homeBalancePill}>
          <Text style={s.homeBalanceText}>${dollars}</Text>
          <Text style={{ fontSize: 18 }}>🪙</Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={s.homeScroll}>
        {/* Character Card — long press opens debug menu */}
        <View style={s.homeCharCard}>
          <TouchableOpacity
            activeOpacity={1}
            onLongPress={() => setDebugOpen(true)}
            delayLongPress={600}
            style={{ overflow: 'visible' }}
          >
            <View style={s.homeCharImage}>
              <View style={{ alignItems: 'center', transform: [{ translateY: dbgPlatformY }] }}>
                <Animated.View style={{ alignItems: 'center', transform: [{ translateY: bobTranslate }, { scale: monsterScale }] }}>
                  <View style={{ zIndex: 10, transform: [{ translateY: 20 }] }}><MonsterSvg size={dbgMonsterSize} /></View>
                  <Image source={require('./assets/platforms/platformRobot.png')} style={{ width: dbgPlatformSize, height: dbgPlatformSize * (230 / 340), marginTop: -80, zIndex: 1 }} resizeMode="contain" />
                </Animated.View>
              </View>
            </View>
          </TouchableOpacity>
          <View style={s.homeCharInfo}>
            <View style={s.homeCharNameRow}>
              <Text style={s.homeCharName}>{monster.name}</Text>
              <Text style={s.homeCharLevel}>LEVEL {monster.level}</Text>
            </View>
            <View style={s.homeXpTrack}>
              <Animated.View style={[s.homeXpFill, {
                width: xpWidthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              }]} />
            </View>
            <Text style={s.homeXpText}>{xp}/{need}xp</Text>
          </View>
        </View>

        {/* Quests Header */}
        <View style={s.homeQuestsHeader}>
          <Text style={s.homeQuestsTitle}>This week's quests</Text>
          {remaining > 0 && (
            <View style={s.homeLeftPill}>
              <Text style={s.homeLeftText}>{remaining} left</Text>
            </View>
          )}
        </View>

        {/* Quest Items */}
        {CHORES.map(c => (
          <AnimatedQuestRow
            key={c.id}
            chore={c}
            done={!!done[c.id]}
            onPress={() => handleComplete(c)}
            baseRate={baseRate}
          />
        ))}
      </ScrollView>

      {/* floating reward popups */}
      <View style={s.homeXpPopLayer} pointerEvents="none">
        {xpPops.map(pop => (
          <Animated.View
            key={pop.id}
            style={[
              pop.kind === 'xp' ? s.homeXpPopPill : s.homeCoinPopPill,
              { opacity: pop.opacity, transform: [{ translateY: pop.y }, { translateX: pop.kind === 'coin' ? 52 : -52 }] },
            ]}
          >
            <Text style={pop.kind === 'xp' ? s.homeXpPop : s.homeCoinPop}>{pop.label}</Text>
          </Animated.View>
        ))}
      </View>

      {/* Debug overlay */}
      {debugOpen && (
        <TouchableOpacity style={s.debugScrim} activeOpacity={1} onPress={() => setDebugOpen(false)}>
          <View onStartShouldSetResponder={() => true}>
            <View style={s.debugPanel}>
              <Text style={s.debugTitle}>🐛 Debug</Text>

              {/* Tabs */}
              <View style={s.debugTabs}>
                {(['xp', 'layout', 'reset'] as const).map(t => (
                  <TouchableOpacity key={t} style={[s.debugTab, debugTab === t && s.debugTabActive]} onPress={() => setDebugTab(t)}>
                    <Text style={[s.debugTabText, debugTab === t && s.debugTabTextActive]}>
                      {t === 'xp' ? 'XP' : t === 'layout' ? 'Layout' : 'Reset'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                {debugTab === 'xp' ? (
                  <View style={{ gap: 12 }}>
                    <Text style={s.debugSub}>Monster {monsterIdx + 1}/8 · {monster.name} · {xp}/{need} XP</Text>
                    <Text style={s.debugSectionLabel}>JUMP TO EVOLUTION</Text>
                    <View style={s.debugGrid}>
                      {(MONSTERS as Monster[]).map((m, i) => (
                        <TouchableOpacity
                          key={i}
                          style={[s.debugChip, monsterIdx === i && s.debugChipActive]}
                          onPress={() => { onDebugSetMonster(i as MonsterIdx); onDebugSetXp(0); setDebugOpen(false); }}
                        >
                          <Text style={[s.debugChipText, monsterIdx === i && s.debugChipTextActive]}>
                            {i + 1} · {m.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={s.debugSectionLabel}>TWEAK XP</Text>
                    <View style={s.debugRow}>
                      {[1, 5, 10, 50].map(n => (
                        <TouchableOpacity key={`m${n}`} style={s.debugXpBtn} onPress={() => onDebugSetXp(Math.max(0, xp - n))}>
                          <Text style={s.debugXpBtnTxt}>−{n}</Text>
                        </TouchableOpacity>
                      ))}
                      {[1, 5, 10, 50].map(n => (
                        <TouchableOpacity key={`p${n}`} style={[s.debugXpBtn, s.debugXpBtnGreen]} onPress={() => onDebugSetXp(xp + n)}>
                          <Text style={s.debugXpBtnTxt}>+{n}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity style={s.debugMaxBtn} onPress={() => { onDebugSetXp(need); setDebugOpen(false); }}>
                      <Text style={s.debugMaxTxt}>⚡ Trigger next evolution ({need - xp} XP needed)</Text>
                    </TouchableOpacity>
                  </View>
                ) : debugTab === 'reset' ? (
                  <View style={{ gap: 10 }}>
                    <Text style={s.debugSectionLabel}>GO TO SCREEN</Text>
                    {([
                      { label: '👋  Onboarding',       mode: 'onboarding'  },
                      { label: '🔑  Login',             mode: 'login'       },
                      { label: '📝  Sign Up',           mode: 'signup'      },
                      { label: '👨‍👩‍👧  Parent Setup',      mode: 'parentOnboarding' },
                      { label: '🧒  Kid Profile Setup', mode: 'kidProfile'  },
                    ] as { label: string; mode: AppMode }[]).map(({ label, mode }) => (
                      <TouchableOpacity
                        key={mode}
                        style={s.debugResetBtn}
                        onPress={() => { onResetApp(mode); setDebugOpen(false); }}
                        activeOpacity={0.8}
                      >
                        <Text style={s.debugResetTxt}>{label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {([
                      { label: 'MONSTER SIZE', value: dbgMonsterSize, set: setDbgMonsterSize, steps: [-20, -5, 5, 20], min: 50 },
                      { label: 'PLATFORM SIZE', value: dbgPlatformSize, set: setDbgPlatformSize, steps: [-20, -5, 5, 20], min: 20 },
                      { label: 'PLATFORM Y', value: dbgPlatformY, set: setDbgPlatformY, steps: [-10, -2, 2, 10], min: -500 },
                    ] as { label: string; value: number; set: React.Dispatch<React.SetStateAction<number>>; steps: number[]; min: number }[]).map(({ label, value, set, steps, min }) => (
                      <View key={label}>
                        <Text style={s.debugSectionLabel}>{label}  <Text style={{ color: '#C5F215' }}>{value}px</Text></Text>
                        <View style={s.debugRow}>
                          {steps.map(n => (
                            <TouchableOpacity key={n} style={[s.debugXpBtn, n > 0 && s.debugXpBtnGreen]} onPress={() => set((v: number) => Math.max(min, v + n))}>
                              <Text style={s.debugXpBtnTxt}>{n > 0 ? `+${n}` : n}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity style={s.debugCloseBtn} onPress={() => setDebugOpen(false)}>
                <Text style={s.debugCloseTxt}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )}

      <AvatarPickerSheet
        visible={avatarPickerOpen}
        selected={kidAvatarIdx}
        onSelect={setKidAvatarIdx}
        onClose={() => setAvatarPickerOpen(false)}
      />
    </View>
  );
}

function BattleScreen({ monsterIdx, coins, done, onStartBattle }: {
  monsterIdx: MonsterIdx; coins: number;
  done: Partial<Record<ChoreId, boolean>>; onStartBattle: () => void;
}) {
  const boss       = BOSSES[monsterIdx % BOSSES.length];
  const BossSvg    = BOSS_SVGS[monsterIdx % BOSS_SVGS.length];
  const doneCount  = Object.keys(done).length;
  const chorePct   = Math.round((doneCount / CHORES.length) * 100);
  const odds       = calcWinOdds(doneCount);
  const power      = doneCount * 20 + coins;

  return (
    <>
      <Header title="monstir" coins={coins} />
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, gap: 10 }}>

          <View style={s.battleCard}>
            <Text style={s.battleCardLabel}>YOUR BATTLE POWER</Text>
            <Text style={s.battlePower}>{power}</Text>
            <Text style={s.battleCardSub}>
              {doneCount > 0 ? `${doneCount} of ${CHORES.length} chores done` : 'Complete chores to build power'}
            </Text>
            <View style={s.pctRow}>
              <View style={s.pctTrack}><View style={[s.pctFill, { width: `${chorePct}%` as any }]} /></View>
              <Text style={s.pctLbl}>{chorePct}%</Text>
            </View>
          </View>

          <View style={s.bossCard}>
            <View style={[s.monsterBubble, { width: 52, height: 52 }]}><BossSvg size={40} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.bossName}>{boss.name}</Text>
              <Text style={s.bossSub}>This week's boss</Text>
            </View>
            <Text style={s.bossPow}>Power: {boss.power}</Text>
          </View>

          <View style={s.oddsRow}>
            <View style={s.oddsCard}><Text style={s.oddsVal}>{odds}%</Text><Text style={s.oddsLbl}>Win chance</Text></View>
            <View style={s.oddsCard}><Text style={s.oddsVal}>+{boss.bonus}¢</Text><Text style={s.oddsLbl}>Win bonus</Text></View>
          </View>

          <TouchableOpacity style={s.battleBtn} onPress={onStartBattle} activeOpacity={0.85}>
            <Text style={s.battleBtnText}>⚔  Battle now</Text>
          </TouchableOpacity>

          {/* DEBUG — remove before shipping */}
          <TouchableOpacity style={s.debugBtn} onPress={onStartBattle} activeOpacity={0.7}>
            <Text style={s.debugBtnText}>🐛  Debug — trigger battle instantly</Text>
          </TouchableOpacity>

        </View>
        <View style={{ height: 96 }} />
      </ScrollView>
    </>
  );
}

function ArenaScreen({ monsterIdx, logText, logBold }: {
  monsterIdx: MonsterIdx; logText: string; logBold: boolean;
}) {
  const monster    = MONSTERS[monsterIdx];
  const boss       = BOSSES[monsterIdx % BOSSES.length];
  const MonsterSvg = MONSTER_SVGS[monsterIdx];
  const BossSvg    = BOSS_SVGS[monsterIdx % BOSS_SVGS.length];

  return (
    <>
      <Header title="BATTLE" showCoins={false} />
      <View style={s.arenaStage}>
        <View style={s.arenaVs}>
          <View style={s.arenaFighter}>
            <View style={[s.monsterBubble, { width: 80, height: 80, backgroundColor: C.bg }]}><MonsterSvg size={64} /></View>
            <Text style={s.arenaName}>{monster.name.toUpperCase()}</Text>
          </View>
          <Text style={s.arenaVsLabel}>VS</Text>
          <View style={s.arenaFighter}>
            <View style={[s.monsterBubble, { width: 80, height: 80, backgroundColor: '#FFF0EE' }]}><BossSvg size={64} /></View>
            <Text style={s.arenaName}>{boss.name.toUpperCase()}</Text>
          </View>
        </View>
        <View style={s.arenaLog}>
          <Text style={[s.arenaLogText, logBold && s.arenaLogBold]}>{logText}</Text>
        </View>
      </View>
    </>
  );
}

function ResultScreen({ monsterIdx, won, bonusCoins, onDone }: {
  monsterIdx: MonsterIdx; won: boolean; bonusCoins: number; onDone: () => void;
}) {
  const monster    = MONSTERS[monsterIdx];
  const boss       = BOSSES[monsterIdx % BOSSES.length];
  const MonsterSvg = MONSTER_SVGS[monsterIdx];

  return (
    <>
      <Header title="monstir" showCoins={false} />
      <View style={s.resultScreen}>
        <Text style={s.resultChip}>{won ? 'VICTORY' : 'DEFEAT'}</Text>
        <Text style={s.resultH}>{won ? 'You won!' : 'You lost.'}</Text>
        <Text style={s.resultSub}>{won ? `${monster.name} defeated ${boss.name}` : `${boss.name} was too powerful`}</Text>
        <View style={[s.monsterBubble, { width: 110, height: 110, backgroundColor: won ? C.win : C.loss }]}>
          <MonsterSvg size={88} />
        </View>
        <Text style={s.resultCoins}>+{bonusCoins}¢</Text>
        <Text style={s.resultCoinsLbl}>{won ? 'added to your wallet' : 'consolation prize added'}</Text>
        <TouchableOpacity style={s.evCta} onPress={onDone} activeOpacity={0.85}>
          <Text style={s.evCtaText}>Back to home</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

function WalletScreen({ coins, done, battleResult, monsterIdx, baseRate }: {
  coins: number; done: Partial<Record<ChoreId, boolean>>;
  battleResult: 'win' | 'loss' | null; monsterIdx: MonsterIdx; baseRate: string;
}) {
  const completedChores = CHORES.filter(c => done[c.id]);
  const boss            = BOSSES[monsterIdx % BOSSES.length];
  const bonusCoins      = battleResult === 'win' ? boss.bonus : battleResult === 'loss' ? Math.round(boss.bonus * 0.2) : null;

  return (
    <>
      <Header title="monstir" showCoins={false} />
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 16, gap: 10 }}>
          <View style={s.walletTotal}>
            <Text style={s.walletLabel}>THIS WEEK'S ALLOWANCE</Text>
            <Text style={s.walletAmount}>{coins}¢</Text>
            <Text style={s.walletSub}>Paid out Sunday</Text>
          </View>
          <Text style={[s.sectionLabel, { paddingHorizontal: 2, paddingTop: 4, backgroundColor: 'transparent' }]}>EARNED FROM CHORES</Text>
          {completedChores.length === 0
            ? <Text style={{ fontSize: 12, color: C.hint, textAlign: 'center', paddingVertical: 16 }}>No chores completed yet</Text>
            : completedChores.map(c => (
              <View key={c.id} style={s.walletRow}>
                <View style={[s.choreIcon, { backgroundColor: c.bg, width: 30, height: 30, borderRadius: 8 }]}>
                  <ChoreIcon icon={c.icon} size={25} />
                </View>
                <Text style={s.walletRowName}>{c.name}</Text>
                <Text style={s.walletRowCoins}>+{fmtCoins(choreCoins(c, baseRate))}</Text>
              </View>
            ))
          }
          {battleResult && bonusCoins !== null && (
            <View style={s.walletRow}>
              <View style={[s.choreIcon, { backgroundColor: battleResult === 'win' ? C.win : C.loss, width: 30, height: 30, borderRadius: 8 }]}>
                <Text style={{ fontSize: 14 }}>{battleResult === 'win' ? '⚔' : '🛡'}</Text>
              </View>
              <Text style={s.walletRowName}>Battle {battleResult} vs {boss.name}</Text>
              <Text style={s.walletRowCoins}>+{fmtCoins(bonusCoins)}</Text>
            </View>
          )}
        </View>
        <View style={{ height: 96 }} />
      </ScrollView>
    </>
  );
}

function EvolveScreen({ fromIdx, onDone }: { fromIdx: MonsterIdx; onDone: () => void }) {
  const toIdx   = Math.min(fromIdx + 1, 7) as MonsterIdx;
  const toM     = MONSTERS[toIdx];
  const FromSvg = MONSTER_SVGS[fromIdx];
  const ToSvg   = MONSTER_SVGS[toIdx];

  const { width: W, height: H } = Dimensions.get('window');
  const cx        = W / 2;
  const monsterCY = H * 0.44;

  // All animation state kept in a ref to avoid stale closures in the RAF loop
  const v = useRef({
    t: 0,
    bgDark: 0, beamReach: 0, beamIntensity: 0,
    sourceFlare: 0, chargeRing: 0, screenWhite: 0, purpleFlash: 0,
    monsterAlpha: 1, monsterScale: 1,
    newMonsterAlpha: 0, newMonsterScale: 0,
    bannerOpacity: 0, ctaOpacity: 0,
    shakeX: 0, shakeY: 0,
  }).current;

  type Ring     = { r: number; alpha: number; key: number };
  type Particle = { x: number; y: number; vx: number; vy: number; r: number; color: string; alpha: number; key: number };
  const ringsRef     = useRef<Ring[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const ringKey      = useRef(0);
  const pKey         = useRef(0);

  const [, setTick]  = useState(0);
  const isMounted    = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  useEffect(() => {
    let rafId: number;
    let running = true;

    // Frame loop — updates rings/particles and triggers re-render
    const frame = () => {
      if (!running) return;
      v.t += 0.025;
      ringsRef.current.forEach(r => { r.r += 2.5; r.alpha -= 0.016; });
      ringsRef.current = ringsRef.current.filter(r => r.alpha > 0);
      particlesRef.current.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.alpha -= 0.013; });
      particlesRef.current = particlesRef.current.filter(p => p.alpha > 0);
      if (isMounted.current) setTick(n => n + 1);
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);

    // Smooth value interpolator
    const animV = (set: (x: number) => void, from: number, to: number, dur: number, ease = (t: number) => t) =>
      new Promise<void>(resolve => {
        const start = Date.now();
        const tick = () => {
          if (!running) { resolve(); return; }
          const p = Math.min((Date.now() - start) / dur, 1);
          set(from + (to - from) * ease(p));
          if (p < 1) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
      });

    const wait      = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
    const easeOut   = (t: number) => 1 - (1 - t) ** 2;
    const easeInOut = (t: number) => t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    const easeOut5  = (t: number) => 1 - (1 - t) ** 5;

    const spawnRing = () => ringsRef.current.push({ r: 8, alpha: 0.85, key: ringKey.current++ });
    const spawnParticles = () => {
      // Heavy purple palette — just a few whites for pop
      const cols = ['#a855f7', '#9333ea', '#c084fc', '#7c3aed', '#d8b4fe', '#a855f7', '#6d28d9', '#ffffff', '#e9d5ff', '#c5f215'];
      // Radial burst — 30 particles
      for (let i = 0; i < 30; i++) {
        const a   = (i / 30) * Math.PI * 2;
        const spd = 6 + Math.random() * 10;
        particlesRef.current.push({ x: cx, y: monsterCY, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd - 3, r: 5 + Math.random() * 9, color: cols[i % cols.length], alpha: 1, key: pKey.current++ });
      }
      // Upward shower sparks
      for (let i = 0; i < 20; i++) {
        particlesRef.current.push({ x: cx + (Math.random() - 0.5) * 120, y: monsterCY - Math.random() * 80, vx: (Math.random() - 0.5) * 5, vy: -(7 + Math.random() * 10), r: 3 + Math.random() * 6, color: cols[Math.floor(Math.random() * cols.length)], alpha: 1, key: pKey.current++ });
      }
      // Chunky close-range shards
      for (let i = 0; i < 10; i++) {
        const a = Math.random() * Math.PI * 2;
        const spd = 2 + Math.random() * 4;
        particlesRef.current.push({ x: cx + (Math.random()-0.5)*40, y: monsterCY + (Math.random()-0.5)*40, vx: Math.cos(a)*spd, vy: Math.sin(a)*spd - 1, r: 8 + Math.random() * 10, color: i % 2 === 0 ? '#7c3aed' : '#a855f7', alpha: 0.85, key: pKey.current++ });
      }
    };
    const doShake = (amp: number, dur: number) => {
      const start = Date.now();
      const tick = () => {
        if (!running) return;
        const e = Date.now() - start;
        if (e < dur) {
          const d = 1 - e / dur;
          v.shakeX = (Math.random() - 0.5) * amp * 2 * d;
          v.shakeY = (Math.random() - 0.5) * amp * 2 * d;
          setTimeout(tick, 28);
        } else { v.shakeX = 0; v.shakeY = 0; }
      };
      tick();
    };

    (async () => {
      // 1. Charge build-up
      await Promise.all([
        animV(x => v.bgDark = x,      0, 1,   1300, easeInOut),
        animV(x => v.chargeRing = x,  0, 1,   1300, easeOut),
        animV(x => v.sourceFlare = x, 0, 0.4, 900,  easeOut),
      ]);
      // 2. Beam shoots down (fast!)
      await Promise.all([
        animV(x => v.beamReach = x,     0,   1,    210, easeOut5),
        animV(x => v.beamIntensity = x, 0,   0.75, 190, easeOut),
        animV(x => v.sourceFlare = x,   0.4, 1,    190, easeOut),
      ]);
      // 3. Hold — monster trembles in beam
      doShake(4, 900);
      spawnRing(); spawnRing();
      await wait(200); spawnRing();
      await animV(x => v.beamIntensity = x, 0.75, 1, 180, easeOut);
      await wait(320); spawnRing();
      await wait(150);
      // 4. Flash!
      doShake(30, 800);
      // Purple pre-flash then white out
      await Promise.all([
        animV(x => v.purpleFlash = x,   0, 1,   80, easeOut5),
        animV(x => v.beamIntensity = x, 1, 2.5, 80),
        animV(x => v.sourceFlare = x,   1, 2,   80),
      ]);
      await Promise.all([
        animV(x => v.screenWhite = x,   0, 1,   90, easeOut5),
        animV(x => v.purpleFlash = x,   1, 0,   90),
        animV(x => v.beamIntensity = x, 2.5, 0, 90),
        animV(x => v.sourceFlare = x,   2, 0,   90),
        animV(x => v.monsterAlpha = x,  1, 0,   90),
      ]);
      spawnParticles(); spawnParticles(); // double burst
      spawnRing(); spawnRing(); spawnRing(); spawnRing(); spawnRing();
      await wait(75);
      // 5. Reveal new monster
      await Promise.all([
        animV(x => v.screenWhite = x,      1, 0,   700, easeOut),
        animV(x => v.newMonsterScale = x,  0, 1.2, 420, easeOut5),
        animV(x => v.newMonsterAlpha = x,  0, 1,   420, easeOut),
        animV(x => v.chargeRing = x,       1, 0,   400),
        animV(x => v.bgDark = x,           1, 0.5, 650),
      ]);
      await animV(x => v.newMonsterScale = x, 1.2, 1, 320, easeOut);
      await animV(x => v.bannerOpacity = x, 0, 1, 400, easeOut);
      await animV(x => v.ctaOpacity = x,    0, 1, 300, easeOut);
    })().catch(() => {});

    return () => { running = false; cancelAnimationFrame(rafId); };
  }, []);

  const beamBottom  = v.beamReach * monsterCY;
  const bOuter = 140, bMid = 60, bCore = 10;

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0814' }}>

      {/* SVG layer: beam, charge rings, particles */}
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <SvgLinearGradient id="bOuter" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#c084fc" stopOpacity={Math.min(1, v.beamIntensity * 0.7)} />
            <Stop offset="0.5" stopColor="#a855f7" stopOpacity={Math.min(1, v.beamIntensity * 0.4)} />
            <Stop offset="1"   stopColor="#7c3aed" stopOpacity="0" />
          </SvgLinearGradient>
          <SvgLinearGradient id="bMid" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"   stopColor="#e9d5ff" stopOpacity={Math.min(1, v.beamIntensity * 0.85)} />
            <Stop offset="0.7" stopColor="#c084fc" stopOpacity={Math.min(1, v.beamIntensity * 0.5)} />
            <Stop offset="1"   stopColor="#a855f7" stopOpacity="0" />
          </SvgLinearGradient>
          <SvgLinearGradient id="bCore" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={Math.min(1, v.beamIntensity)} />
            <Stop offset="1" stopColor="#e9d5ff" stopOpacity={Math.min(1, v.beamIntensity * 0.7)} />
          </SvgLinearGradient>
        </Defs>

        {/* Full-screen nebula glow when beam fires */}
        {v.beamIntensity > 0.05 && (
          <Ellipse cx={cx} cy={-20} rx={W} ry={H * 0.55} fill={`rgba(120,60,220,${Math.min(0.4, v.beamIntensity * 0.25)})`} />
        )}

        {/* Charge rings + spokes */}
        {v.chargeRing > 0 && [0,1,2,3,4,5].map(i => {
          const r = 70 + i * 18 + Math.sin(v.t * 4) * 6;
          return <Circle key={i} cx={cx} cy={monsterCY} r={r} fill="none" stroke={`rgba(190,140,255,${v.chargeRing * (0.28 - i * 0.04)})`} strokeWidth={2.5 + i * 0.5} />;
        })}
        {v.chargeRing > 0 && Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 + v.t * 1.2;
          const d = 130 + v.chargeRing * 22;
          return (
            <Line key={i}
              x1={cx + Math.cos(a) * d}  y1={monsterCY + Math.sin(a) * d}
              x2={cx + Math.cos(a) * 52} y2={monsterCY + Math.sin(a) * 52}
              stroke={`rgba(220,180,255,${v.chargeRing * 0.55})`} strokeWidth={2}
            />
          );
        })}

        {/* Ground rings */}
        {ringsRef.current.map(r => (
          <Circle key={r.key} cx={cx} cy={monsterCY + 55} r={r.r} fill="none" stroke={`rgba(168,85,247,${r.alpha})`} strokeWidth={2.5} />
        ))}

        {/* Beam — three layers */}
        {v.beamIntensity > 0.01 && beamBottom > 2 && <>
          {/* Wide outer purple glow */}
          <Polygon points={`${cx},0 ${cx-bOuter},${beamBottom} ${cx+bOuter},${beamBottom}`} fill="url(#bOuter)" />
          {/* Mid white-purple layer */}
          <Polygon points={`${cx},0 ${cx-bMid},${beamBottom}   ${cx+bMid},${beamBottom}`}   fill="url(#bMid)" />
          {/* Bright core */}
          <Polygon points={`${cx},0 ${cx-bCore},${beamBottom}  ${cx+bCore},${beamBottom}`}  fill="url(#bCore)" />
          {/* Huge bloom at impact */}
          <Ellipse cx={cx} cy={beamBottom} rx={180} ry={55} fill={`rgba(168,85,247,${Math.min(0.5, v.beamIntensity * 0.4)})`} />
          <Ellipse cx={cx} cy={beamBottom} rx={110} ry={36} fill={`rgba(220,180,255,${Math.min(0.7, v.beamIntensity * 0.55)})`} />
          <Ellipse cx={cx} cy={beamBottom} rx={55}  ry={20} fill={`rgba(255,255,255,${Math.min(0.9, v.beamIntensity * 0.75)})`} />
        </>}

        {/* Source flare — huge */}
        {v.sourceFlare > 0.01 && <>
          <Ellipse cx={cx} cy={0} rx={Math.min(W, 160 + v.sourceFlare * 120)} ry={Math.min(W, 160 + v.sourceFlare * 120)} fill={`rgba(160,80,255,${Math.min(0.6, v.sourceFlare * 0.5)})`} />
          <Ellipse cx={cx} cy={0} rx={80 + v.sourceFlare * 60} ry={80 + v.sourceFlare * 60} fill={`rgba(220,170,255,${Math.min(0.8, v.sourceFlare * 0.7)})`} />
          <Ellipse cx={cx} cy={0} rx={36} ry={36} fill={`rgba(255,255,255,${Math.min(1, v.sourceFlare)})`} />
        </>}

        {/* Particles */}
        {particlesRef.current.map(p => (
          <Circle key={p.key} cx={p.x} cy={p.y} r={p.r} fill={p.color} opacity={Math.max(0, p.alpha)} />
        ))}
      </Svg>

      {/* Old monster (shakes in beam) */}
      {v.monsterAlpha > 0.01 && (
        <View style={{
          position: 'absolute',
          top: monsterCY - 170, left: cx - 100, width: 200, height: 200,
          opacity: v.monsterAlpha,
          transform: [{ scale: v.monsterScale }, { translateX: v.shakeX }, { translateY: v.shakeY }],
        }}>
          <View style={{ flex: 1, borderRadius: 100, backgroundColor: 'rgba(168,85,247,0.15)', alignItems: 'center', justifyContent: 'center' }}>
            <FromSvg size={180} />
          </View>
        </View>
      )}

      {/* New monster springs in */}
      {v.newMonsterAlpha > 0.01 && (
        <View style={{
          position: 'absolute',
          top: monsterCY - 230, left: cx - 160, width: 320, height: 320,
          opacity: v.newMonsterAlpha,
          transform: [{ scale: v.newMonsterScale }],
        }}>
          <View style={{ flex: 1, borderRadius: 160, backgroundColor: 'rgba(197,242,21,0.12)', borderWidth: 3, borderColor: '#C5F215', alignItems: 'center', justifyContent: 'center' }}>
            <ToSvg size={300} />
          </View>
        </View>
      )}

      {/* EVOLVED! banner */}
      {v.bannerOpacity > 0.01 && (
        <View style={{ position: 'absolute', bottom: 200, left: 0, right: 0, alignItems: 'center', opacity: v.bannerOpacity }}>
          <Text style={{ fontSize: 52, fontWeight: '900', color: '#C5F215', letterSpacing: -1 }}>EVOLVED!</Text>
          <Text style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', marginTop: 6 }}>{toM.name} · Level {toM.level}</Text>
        </View>
      )}

      {/* Continue button */}
      {v.ctaOpacity > 0.01 && (
        <View style={{ position: 'absolute', bottom: 60, left: 24, right: 24, opacity: v.ctaOpacity }}>
          <TouchableOpacity style={s.evCta} onPress={onDone} activeOpacity={0.85}>
            <Text style={s.evCtaText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Purple pre-flash */}
      {v.purpleFlash > 0.01 && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#7c3aed', opacity: v.purpleFlash }]} pointerEvents="none" />
      )}

      {/* White mega-flash */}
      {v.screenWhite > 0.01 && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'white', opacity: v.screenWhite }]} pointerEvents="none" />
      )}
    </View>
  );
}

// ─── Parent Screens ───────────────────────────────────────────────────────────

function ParentHomeScreen({ onNav, onSwitchToKid, onAddKid }: {
  onNav: (s: ParentScreen) => void;
  onSwitchToKid: () => void;
  onAddKid: () => void;
}) {
  const kids = [
    { name: 'Sam',    level: 12, emoji: '🧒', bg: '#C5E8FF' },
    { name: 'Lily',   level: 8,  emoji: '👧', bg: '#FFEFC5' },
    { name: 'Max',    level: 5,  emoji: '👦', bg: '#E8C5FF' },
  ];
  const topHabits = [
    { name: 'Make bed',          count: 7, icon: '🛏️' },
    { name: 'Read for 20 minutes', count: 5, icon: '📖' },
    { name: 'Drink water',       count: 5, icon: '💧' },
  ];
  const tasksCompleted = 24;
  const tasksTotal     = 32;
  const xpEarned       = 1250;
  const progress       = tasksCompleted / tasksTotal;

  return (
    <CreamBg>
      {/* Header */}
      <View style={p.homeHeader}>
        <View style={p.homeHeaderLeft}>
          <View style={p.homeAvatar}>
            <Text style={{ fontSize: 24 }}>👩</Text>
          </View>
          <ViewSwitcher
            selected="Parent view"
            dark
            options={[
              { label: 'Parent view', emoji: '👩', bg: '#C5F215' },
              { label: 'Kid view',    emoji: '🧒', bg: '#EAE4FF' },
            ]}
            onSelect={(opt) => { if (opt.label === 'Kid view') onSwitchToKid(); }}
          />
        </View>
        <TouchableOpacity style={p.homeBell} activeOpacity={0.7}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}>

        {/* Kids row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 20, paddingVertical: 12 }}>
          {kids.map(kid => (
            <TouchableOpacity key={kid.name} style={{ alignItems: 'center', gap: 6 }} activeOpacity={0.7}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: kid.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW }}>
                <Text style={{ fontSize: 34 }}>{kid.emoji}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{kid.name}</Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B35F0' }}>Level {kid.level}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={{ alignItems: 'center', gap: 6 }} activeOpacity={0.7} onPress={onAddKid}>
            <View style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: '#D0CEC8', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 28, color: '#ABABAB' }}>+</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: '600', color: '#ABABAB' }}>Add kid</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* This week's overview */}
        <View style={[p.sectionCard, { marginHorizontal: 16, marginBottom: 12 }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>This week's overview</Text>
            <TouchableOpacity activeOpacity={0.7}><Text style={{ fontSize: 14, fontWeight: '600', color: '#6B35F0' }}>View report ›</Text></TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#ABABAB' }}>Tasks completed</Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#1A1A1A' }}>{tasksCompleted} <Text style={{ fontSize: 18, color: '#ABABAB' }}>/ {tasksTotal}</Text></Text>
              <View style={{ height: 8, backgroundColor: '#ECEAE4', borderRadius: 4 }}>
                <View style={{ width: `${progress * 100}%` as any, height: 8, backgroundColor: '#3B8A3A', borderRadius: 4 }} />
              </View>
            </View>
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#ABABAB' }}>XP earned</Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#1A1A1A' }}>{xpEarned.toLocaleString()} <Text style={{ fontSize: 14, color: '#ABABAB' }}>XP</Text></Text>
              <Text style={{ fontSize: 22 }}>⭐</Text>
            </View>
          </View>
        </View>

        {/* Team banner */}
        <View style={{ marginHorizontal: 16, marginBottom: 20, overflow: 'visible' }}>
          <MascotBanner message="Small steps today lead to big rewards tomorrow!" />
        </View>

        {/* Top habits */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: '#1A1A1A' }}>Top habits</Text>
            <TouchableOpacity activeOpacity={0.7}><Text style={{ fontSize: 14, fontWeight: '600', color: '#6B35F0' }}>View all</Text></TouchableOpacity>
          </View>
          <View style={{ gap: 0, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', overflow: 'hidden', ...SOLID_SHADOW }}>
            {topHabits.map((h, i) => (
              <View key={h.name} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: i < topHabits.length - 1 ? 1 : 0, borderBottomColor: '#F0EEE8', gap: 12 }}>
                <Text style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{h.icon}</Text>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: '#1A1A1A' }}>{h.name}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#ABABAB', marginRight: 10 }}>{h.count}x</Text>
                <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#3B8A3A', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>✓</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </CreamBg>
  );
}

function ParentChoresScreen({ chores, onBack, onAdd, onEdit }: {
  chores: ManagedChore[];
  onBack: () => void;
  onAdd: () => void;
  onEdit: (c: ManagedChore) => void;
}) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const filtered = chores.filter(c => activeTab === 'active' ? !c.completed : c.completed);

  return (
    <CreamBg>
      {/* Header */}
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Chores</Text>
        <TouchableOpacity onPress={onAdd} style={p.addBtn} activeOpacity={0.7}>
          <Text style={p.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={p.toggleRow}>
        <TouchableOpacity
          style={[p.togglePill, activeTab === 'active' && p.togglePillActive]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.7}
        >
          <Text style={[p.toggleText, activeTab === 'active' && p.toggleTextActive]}>Active</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[p.togglePill, activeTab === 'completed' && p.togglePillActive]}
          onPress={() => setActiveTab('completed')}
          activeOpacity={0.7}
        >
          <Text style={[p.toggleText, activeTab === 'completed' && p.toggleTextActive]}>Completed</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100, gap: 10 }}>
        {filtered.map(chore => (
          <TouchableOpacity key={chore.id} style={p.choreManageRow} onPress={() => onEdit(chore)} activeOpacity={0.7}>
            <View style={[p.choreManageIcon, { backgroundColor: chore.bg }]}>
              <ChoreIcon icon={chore.icon} size={38} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={p.choreManageName}>{chore.name}</Text>
              <Text style={p.choreManageFreq}>{chore.frequency}</Text>
            </View>
            <Text style={p.choreManageRate}>${chore.rate}</Text>
            <Text style={p.choreManageDrag}>⠿</Text>
          </TouchableOpacity>
        ))}
        {filtered.length === 0 && (
          <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40, fontSize: 14 }}>
            No {activeTab} chores
          </Text>
        )}
      </ScrollView>
    </CreamBg>
  );
}

function AddEditChoreScreen({ existing, onBack, onSave, onDelete }: {
  existing: ManagedChore | null;
  onBack: () => void;
  onSave: (c: ManagedChore) => void;
  onDelete?: () => void;
}) {
  const isEdit = existing !== null;
  const [name, setName]               = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [frequency, setFrequency]     = useState(existing?.frequency ?? FREQUENCY_OPTIONS[0]);
  const [rate, setRate]               = useState(existing?.rate ?? '');
  const [selectedIcon, setSelectedIcon] = useState<{ icon: string | number; bg: string }>(
    existing ? { icon: existing.icon, bg: existing.bg } : CHORE_ICONS[0]
  );

  const cycleFrequency = () => {
    const idx = FREQUENCY_OPTIONS.indexOf(frequency);
    setFrequency(FREQUENCY_OPTIONS[(idx + 1) % FREQUENCY_OPTIONS.length]);
  };

  const handleSave = () => {
    const chore: ManagedChore = {
      id: existing?.id ?? Date.now().toString(),
      name,
      description,
      frequency,
      rate,
      icon: selectedIcon.icon,
      bg: selectedIcon.bg,
      completed: existing?.completed ?? false,
    };
    onSave(chore);
  };

  return (
    <CreamBg>
      {/* Header */}
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>{isEdit ? 'Edit chore' : 'Add chore'}</Text>
        {isEdit ? (
          <TouchableOpacity onPress={onDelete} style={p.backBtn} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>🗑️</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={p.backBtn} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>🔖</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 40 }}>
        {/* Icon Display */}
        <View style={{ alignItems: 'center', marginBottom: 8 }}>
          <View style={[p.iconDisplay, { backgroundColor: selectedIcon.bg }]}>
            <ChoreIcon icon={selectedIcon.icon} size={60} />
            <View style={p.iconEditBadge}>
              <Text style={{ fontSize: 12 }}>✏️</Text>
            </View>
          </View>
        </View>

        {/* Form Fields */}
        <View style={p.formCard}>
          <Text style={p.formLabel}>Chore name</Text>
          <TextInput
            style={p.formInput}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Make your bed"
            placeholderTextColor={C.hint}
          />
        </View>

        <View style={p.formCard}>
          <Text style={p.formLabel}>Description (optional)</Text>
          <TextInput
            style={p.formInput}
            value={description}
            onChangeText={setDescription}
            placeholder="Add a short description..."
            placeholderTextColor={C.hint}
            multiline
          />
        </View>

        <View style={p.formCard}>
          <Text style={p.formLabel}>Frequency</Text>
          <TouchableOpacity style={p.formDropdownRow} onPress={cycleFrequency} activeOpacity={0.7}>
            <Text style={p.formDropdownValue}>{frequency}</Text>
            <Text style={{ fontSize: 14, color: C.muted }}>▾</Text>
          </TouchableOpacity>
        </View>

        <View style={p.formCard}>
          <Text style={p.formLabel}>Rate</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={p.rateDollarSign}>$</Text>
            <TextInput
              style={[p.formInput, { flex: 1 }]}
              value={rate}
              onChangeText={setRate}
              placeholder="0.50"
              placeholderTextColor={C.hint}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Icon Picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 10, paddingVertical: 4 }}>
          {CHORE_ICONS.map((item) => {
            const isSelected = item.icon === selectedIcon.icon;
            return (
              <TouchableOpacity
                key={String(item.icon)}
                style={[p.iconPickerItem, { backgroundColor: item.bg }, isSelected && p.iconPickerSelected]}
                onPress={() => setSelectedIcon(item)}
                activeOpacity={0.7}
              >
                <ChoreIcon icon={item.icon} size={40} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Buttons */}
        {isEdit && (
          <TouchableOpacity style={p.cancelBtn} onPress={onBack} activeOpacity={0.7}>
            <Text style={p.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={p.saveBtn} onPress={handleSave} activeOpacity={0.85}>
          <Text style={p.saveBtnText}>{isEdit ? 'Save changes' : 'Save chore'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </CreamBg>
  );
}

function PayRatesScreen({ onBack, onRateGuide, baseRate, setBaseRate, weeklyCapEnabled, setWeeklyCap, requireApproval, setRequireApproval }: {
  onBack: () => void;
  onRateGuide: () => void;
  baseRate: string;
  setBaseRate: (v: string) => void;
  weeklyCapEnabled: boolean;
  setWeeklyCap: (v: boolean) => void;
  requireApproval: boolean;
  setRequireApproval: (v: boolean) => void;
}) {
  return (
    <CreamBg>
      {/* Header */}
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={[p.screenTitle, { fontSize: 16 }]}>Pay rates & economy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        {/* Default currency */}
        <View style={p.sectionCard}>
          <Text style={p.sectionCardTitle}>Default currency</Text>
          <Text style={p.sectionCardSub}>This is what kids earn for completed chores.</Text>
          <View style={p.dropdownRow}>
            <Text style={p.dropdownValue}>🪙 Monstir Coins (MC)</Text>
            <Text style={{ fontSize: 14, color: C.muted }}>▾</Text>
          </View>
        </View>

        {/* Global settings */}
        <View style={p.sectionCard}>
          <Text style={p.sectionCardTitle}>Global settings</Text>

          <View style={p.settingsRow}>
            <View style={{ flex: 1 }}>
              <Text style={p.settingsRowLabel}>Base rate suggestion</Text>
              <Text style={p.settingsRowSub}>We'll suggest rates based on this amount.</Text>
            </View>
            <View style={p.rateInputPill}>
              <Text style={{ fontSize: 14, color: C.text }}>$</Text>
              <TextInput
                style={p.rateInput}
                value={baseRate}
                onChangeText={setBaseRate}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={[p.settingsRow, { borderTopWidth: 1, borderTopColor: C.border, marginTop: 12, paddingTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={p.settingsRowLabel}>Weekly earning cap (optional)</Text>
              <Text style={p.settingsRowSub}>Limit the max amount your kid can earn in a week.</Text>
            </View>
            <Switch
              value={weeklyCapEnabled}
              onValueChange={setWeeklyCap}
              trackColor={{ false: '#D0CEC8', true: '#C5F215' }}
              thumbColor={weeklyCapEnabled ? '#1A1A1A' : '#F4F3F4'}
            />
          </View>

          <View style={[p.settingsRow, { borderTopWidth: 1, borderTopColor: C.border, marginTop: 12, paddingTop: 12 }]}>
            <View style={{ flex: 1 }}>
              <Text style={p.settingsRowLabel}>Require approval for payouts</Text>
              <Text style={p.settingsRowSub}>Review and approve payouts to savings or rewards.</Text>
            </View>
            <Switch
              value={requireApproval}
              onValueChange={setRequireApproval}
              trackColor={{ false: '#D0CEC8', true: '#C5F215' }}
              thumbColor={requireApproval ? '#1A1A1A' : '#F4F3F4'}
            />
          </View>
        </View>

        {/* History row */}
        <TouchableOpacity style={p.sectionCard} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={p.sectionCardTitle}>View economy history</Text>
            <Text style={{ fontSize: 18, color: C.muted }}>›</Text>
          </View>
        </TouchableOpacity>

        {/* Rate guide link */}
        <TouchableOpacity onPress={onRateGuide} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 8 }}>
          <Text style={p.rateGuideLink}>Rate guide ›</Text>
        </TouchableOpacity>
      </ScrollView>
    </CreamBg>
  );
}

function RateGuideScreen({ onBack }: { onBack: () => void }) {
  const rates = [
    { effort: 'Very easy', time: '< 5 min',     range: '$0.10 – $0.25', dot: '#3B8A3A' },
    { effort: 'Easy',      time: '5 – 15 min',  range: '$0.25 – $0.75', dot: '#3B8A3A' },
    { effort: 'Medium',    time: '15 – 30 min', range: '$0.75 – $1.50', dot: '#F5A623' },
    { effort: 'Hard',      time: '30 – 60 min', range: '$1.50 – $2.50', dot: '#F5823A' },
    { effort: 'Very hard', time: '60+ min',     range: '$2.50+',        dot: '#E53E3E' },
  ];

  return (
    <CreamBg>
      {/* Header */}
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Rate guide</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 100 }}>
        {/* Info card */}
        <View style={p.rateInfoCard}>
          <View style={{ flex: 1 }}>
            <Text style={p.rateInfoText}>These are suggested rates based on typical time and effort.</Text>
            <TouchableOpacity style={p.learnMoreBtn} activeOpacity={0.7}>
              <Text style={p.learnMoreText}>Learn more</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 40 }}>🪙</Text>
        </View>

        {/* Table */}
        <View style={p.sectionCard}>
          {/* Header row */}
          <View style={[p.rateTableRow, { borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 10, marginBottom: 4 }]}>
            <Text style={[p.rateTableHeader, { flex: 1.2 }]}>Effort</Text>
            <Text style={[p.rateTableHeader, { flex: 1.2 }]}>Time</Text>
            <Text style={[p.rateTableHeader, { flex: 1.4 }]}>Suggested rate</Text>
          </View>
          {rates.map((row, i) => (
            <View key={row.effort} style={[p.rateTableRow, i < rates.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#F0EEE8', paddingBottom: 12, marginBottom: 4 }]}>
              <View style={[{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                <View style={[p.rateDot, { backgroundColor: row.dot }]} />
                <Text style={p.rateTableCell}>{row.effort}</Text>
              </View>
              <Text style={[p.rateTableCell, { flex: 1.2 }]}>{row.time}</Text>
              <Text style={[p.rateTableCell, { flex: 1.4 }]}>{row.range}</Text>
            </View>
          ))}
        </View>

        {/* Note card */}
        <View style={p.noteCard}>
          <Text style={{ fontSize: 20, marginRight: 8 }}>💡</Text>
          <Text style={p.noteText}>These are just suggestions. You know your child and what's fair!</Text>
        </View>
      </ScrollView>
    </CreamBg>
  );
}

// ─── Parent Settings Screens ──────────────────────────────────────────────────

type SettingsSubScreen = 'main' | 'kids' | 'battle' | 'account';

function SettingsRow({ iconBg, iconEmoji, title, subtitle, badge, onPress }: {
  iconBg: string; iconEmoji: string; title: string; subtitle?: string;
  badge?: string | number; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={ps.row} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={[ps.rowIcon, { backgroundColor: iconBg }]}>
        <Text style={{ fontSize: 17 }}>{iconEmoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={ps.rowTitle}>{title}</Text>
        {subtitle ? <Text style={ps.rowSub}>{subtitle}</Text> : null}
      </View>
      {badge !== undefined && (
        <View style={ps.badge}><Text style={ps.badgeText}>{badge}</Text></View>
      )}
      <Text style={ps.chevron}>›</Text>
    </TouchableOpacity>
  );
}

function ParentSettingsScreen({ onNav, baseRate, onAddKid }: { onNav: (s: ParentScreen) => void; baseRate: string; onAddKid?: () => void }) {
  const [sub, setSub] = useState<SettingsSubScreen>('main');

  if (sub === 'kids')    return <SettingsKidsScreen    onBack={() => setSub('main')} onAddKid={onAddKid} />;
  if (sub === 'battle')  return <SettingsBattleScreen  onBack={() => setSub('main')} baseRate={baseRate} />;
  if (sub === 'account') return <SettingsAccountScreen onBack={() => setSub('main')} />;

  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <View style={{ width: 40 }} />
        <Text style={p.screenTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Family */}
        <Text style={ps.sectionLabel}>FAMILY</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#6B35F0" iconEmoji="👨‍👩‍👧" title="Kids" subtitle="Sam, Jordan" badge={2} onPress={() => setSub('kids')} />
        </View>

        {/* Chores */}
        <Text style={ps.sectionLabel}>CHORES</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#F59E0B" iconEmoji="💰" title="Pay rates & economy" subtitle="Currency, base rate, earning cap" onPress={() => onNav('payRates')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#10B981" iconEmoji="✅" title="Chore library" subtitle="Manage & create chores" onPress={() => onNav('chores')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#6366F1" iconEmoji="🕐" title="Approval settings" subtitle="How chores get verified" />
        </View>

        {/* Battles */}
        <Text style={ps.sectionLabel}>BATTLES</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#EF4444" iconEmoji="⚔️" title="Battle & bonuses" subtitle="Boss rewards, monetary bonuses" onPress={() => setSub('battle')} />
        </View>

        {/* Account */}
        <Text style={ps.sectionLabel}>ACCOUNT</Text>
        <View style={ps.group}>
          <SettingsRow iconBg="#8B5CF6" iconEmoji="👤" title="Account" subtitle="Email, password, notifications" onPress={() => setSub('account')} />
          <View style={ps.divider} />
          <SettingsRow iconBg="#64748B" iconEmoji="❓" title="Help & support" />
          <View style={ps.divider} />
          <SettingsRow iconBg="#94A3B8" iconEmoji="ℹ️" title="About Monstir" />
        </View>
      </ScrollView>
    </CreamBg>
  );
}

function SettingsKidsScreen({ onBack, onAddKid }: { onBack: () => void; onAddKid?: () => void }) {
  const kids = [
    { name: 'Sam',    meta: 'Age 8 · Monster Lv. 4',  emoji: '🦎', bg: '#E8F5E9' },
    { name: 'Jordan', meta: 'Age 11 · Monster Lv. 7', emoji: '🐉', bg: '#E3F2FD' },
  ];
  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Kids</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <Text style={ps.sectionLabel}>PROFILES</Text>
        <View style={ps.group}>
          {kids.map((k, i) => (
            <View key={k.name}>
              {i > 0 && <View style={ps.divider} />}
              <TouchableOpacity style={ps.row} activeOpacity={0.7}>
                <View style={[ps.kidAvatar, { backgroundColor: k.bg }]}>
                  <Text style={{ fontSize: 20 }}>{k.emoji}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ps.rowTitle}>{k.name}</Text>
                  <Text style={ps.rowSub}>{k.meta}</Text>
                </View>
                <Text style={ps.chevron}>›</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <TouchableOpacity style={ps.addKidBtn} activeOpacity={0.85} onPress={onAddKid}>
          <Text style={ps.addKidText}>+ Add kid</Text>
        </TouchableOpacity>
      </ScrollView>
    </CreamBg>
  );
}

function BonusSlider({ value, onChange, onDragging }: { value: number; onChange: (v: number) => void; onDragging?: (d: boolean) => void }) {
  const trackRef  = useRef<View>(null);
  const trackX    = useRef(0);
  const trackW    = useRef(1);

  const pctFromPageX = (pageX: number) =>
    Math.round(Math.max(0, Math.min(100, ((pageX - trackX.current) / trackW.current) * 100)));

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: (_e, gs) => { onDragging?.(true);  onChange(pctFromPageX(gs.x0)); },
      onPanResponderMove:  (_e, gs) => { onChange(pctFromPageX(gs.moveX)); },
      onPanResponderRelease:   () => { onDragging?.(false); },
      onPanResponderTerminate: () => { onDragging?.(false); },
    })
  ).current;

  return (
    <View
      ref={trackRef}
      style={ps.sliderTrack}
      onLayout={() => {
        trackRef.current?.measure((_x, _y, w, _h, px) => {
          trackX.current = px;
          trackW.current = w || 1;
        });
      }}
      {...panResponder.panHandlers}
    >
      <View style={[ps.sliderFill, { width: `${value}%` as any }]} />
      <View style={[ps.sliderThumb, { left: `${value}%` as any }]} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
        {[0, 25, 50, 75, 100].map(v => (
          <Text key={v} style={[ps.sliderTickLabel, value === v && { color: '#6B35F0', fontWeight: '700' }]}>{v}%</Text>
        ))}
      </View>
    </View>
  );
}

function SettingsBattleScreen({ onBack, baseRate }: { onBack: () => void; baseRate: string }) {
  const [bonusEnabled, setBonusEnabled]   = useState(true);
  const [bonusPct, setBonusPct]           = useState(25);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const cosmetics = ['Monster skin', 'Victory dance', 'XP boost', 'Badge', 'Evolution progress'];

  const base = parseFloat(baseRate) || 0;
  const bonusAmount = (base * bonusPct / 100).toFixed(2);

  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Battle & bonuses</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView scrollEnabled={scrollEnabled} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}>
        {/* Hero card */}
        <View style={ps.battleHero}>
          <Text style={{ fontSize: 48 }}>👾</Text>
          <View style={{ flex: 1 }}>
            <Text style={ps.battleHeroTitle}>Boss battles</Text>
            <Text style={ps.battleHeroSub}>Kids earn XP fighting bosses. Configure whether winning also earns real money.</Text>
          </View>
        </View>

        {/* Monetary bonus toggle */}
        <Text style={[ps.sectionLabel, { paddingHorizontal: 0, paddingTop: 4 }]}>MONETARY BONUS</Text>
        <View style={p.sectionCard}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={ps.rowTitle}>Cash bonus for winning</Text>
              <Text style={ps.rowSub}>Pay a bonus when a boss is defeated</Text>
            </View>
            <TouchableOpacity
              style={[ps.toggle, bonusEnabled && ps.toggleOn]}
              onPress={() => setBonusEnabled(v => !v)}
              activeOpacity={0.8}
            >
              <View style={[ps.toggleThumb, bonusEnabled && ps.toggleThumbOn]} />
            </TouchableOpacity>
          </View>

          {bonusEnabled && (
            <View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border, gap: 16 }}>
              {/* Base rate + impact */}
              <View style={ps.impactRow}>
                <View style={ps.impactCell}>
                  <Text style={ps.impactLabel}>Base rate</Text>
                  <Text style={ps.impactValue}>${base.toFixed(2)}<Text style={ps.impactUnit}>/chore</Text></Text>
                </View>
                <Text style={ps.impactArrow}>×</Text>
                <View style={ps.impactCell}>
                  <Text style={ps.impactLabel}>Bonus</Text>
                  <Text style={[ps.impactValue, { color: '#6B35F0' }]}>{bonusPct}%</Text>
                </View>
                <Text style={ps.impactArrow}>=</Text>
                <View style={[ps.impactCell, ps.impactCellHighlight]}>
                  <Text style={ps.impactLabel}>Per win</Text>
                  <Text style={[ps.impactValue, { color: '#6B35F0' }]}>${bonusAmount}</Text>
                </View>
              </View>

              {/* Slider */}
              <BonusSlider value={bonusPct} onChange={setBonusPct} onDragging={(d) => setScrollEnabled(!d)} />
            </View>
          )}
        </View>

        {/* Cosmetic rewards */}
        <Text style={[ps.sectionLabel, { paddingHorizontal: 0, paddingTop: 4 }]}>ALWAYS UNLOCKED ON WIN</Text>
        <View style={[p.sectionCard, { backgroundColor: '#F3EEFF' }]}>
          <Text style={[ps.rowTitle, { color: '#6B35F0', marginBottom: 10 }]}>✨  Cosmetic rewards</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cosmetics.map(c => (
              <View key={c} style={ps.cosmeticPill}><Text style={ps.cosmeticText}>{c}</Text></View>
            ))}
          </View>
        </View>

        <View style={p.noteCard}>
          <Text style={{ fontSize: 18, marginRight: 8 }}>💡</Text>
          <Text style={p.noteText}>Cosmetic rewards are always given when a boss is defeated, regardless of the cash bonus setting.</Text>
        </View>
      </ScrollView>
    </CreamBg>
  );
}

function SettingsAccountScreen({ onBack }: { onBack: () => void }) {
  return (
    <CreamBg>
      <View style={p.screenHeader}>
        <TouchableOpacity onPress={onBack} style={p.backBtn} activeOpacity={0.7}>
          <Text style={p.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={p.screenTitle}>Account</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Avatar */}
        <View style={{ alignItems: 'center', paddingVertical: 28 }}>
          <View style={ps.accountAvatar}>
            <Text style={ps.accountAvatarText}>A</Text>
          </View>
          <Text style={[ps.rowTitle, { fontSize: 18, marginTop: 10 }]}>Alex</Text>
          <Text style={ps.rowSub}>alex@example.com</Text>
        </View>

        <View style={ps.group}>
          <SettingsRow iconBg="#8B5CF6" iconEmoji="👤" title="Profile information" />
          <View style={ps.divider} />
          <SettingsRow iconBg="#6366F1" iconEmoji="📧" title="Email & password" />
          <View style={ps.divider} />
          <SettingsRow iconBg="#F59E0B" iconEmoji="🔔" title="Notifications" />
          <View style={ps.divider} />
          <SettingsRow iconBg="#10B981" iconEmoji="🔒" title="Privacy & security" />
        </View>

        <TouchableOpacity style={ps.logoutBtn} activeOpacity={0.8}>
          <Text style={ps.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </CreamBg>
  );
}

// ─── Goal Creation Flow ───────────────────────────────────────────────────────

interface GoalCreationFlowProps {
  onDone: () => void;
  onCancel: () => void;
}

interface GoalData {
  name: string;
  amount: string;
  category: string;
  color: string;
  icon: string;
}

const GOAL_COLORS = [
  '#6B35F0', '#4A9FE8', '#5CB85C',
  '#F5C842', '#E870A0', '#F08030',
  '#30C0B0', '#E04040', '#A0A0A8',
];

const GOAL_OPTIONS = [
  { icon: '🚲', name: 'New bike',          amount: '120.00' },
  { icon: '🎮', name: 'Roblox Gift Card',  amount: '25.00'  },
  { icon: '🕹',  name: 'Nintendo Switch',   amount: '299.99' },
  { icon: '🎧', name: 'Headphones',        amount: '60.00'  },
  { icon: '📷', name: 'Camera',            amount: '150.00' },
  { icon: '⭐', name: 'Custom goal',       amount: ''       },
];

const GOAL_CATEGORIES = [
  { icon: '🧸', label: 'Toys'       },
  { icon: '📱', label: 'Electronics'},
  { icon: '⚽', label: 'Sports'     },
  { icon: '🎮', label: 'Games'      },
  { icon: '👕', label: 'Clothing'   },
  { icon: '🎨', label: 'Art & Music'},
  { icon: '📚', label: 'Books'      },
  { icon: '⭐', label: 'Other'      },
];

function GoalCreationFlow({ onDone, onCancel }: GoalCreationFlowProps) {
  const [step, setStep]             = useState<number>(1);
  const [goalData, setGoalData]     = useState<GoalData>({
    name: '', amount: '', category: '', color: '#6B35F0', icon: '🎯',
  });
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [numpadValue, setNumpadValue]             = useState('');
  const [photoAdded, setPhotoAdded]               = useState(false);

  const go = (n: number) => setStep(n);

  const handleCategorySelect = (_cat: string) => go(3);

  const handleGoalOptionSelect = (idx: number) => {
    const opt = GOAL_OPTIONS[idx];
    setSelectedOptionIdx(idx);
    setGoalData(prev => ({ ...prev, name: opt.name, amount: opt.amount, icon: opt.icon }));
  };

  const handleNumpadKey = (key: string) => {
    if (key === '⌫') {
      setNumpadValue(prev => prev.slice(0, -1));
    } else if (key === '.') {
      if (!numpadValue.includes('.')) setNumpadValue(prev => prev + '.');
    } else {
      setNumpadValue(prev => (prev.length < 8 ? prev + key : prev));
    }
  };

  const handleNumpadDone = () => {
    const parsed = parseFloat(numpadValue);
    if (!isNaN(parsed)) {
      setGoalData(prev => ({ ...prev, amount: parsed.toFixed(2) }));
    }
    go(4);
  };

  const displayAmount = numpadValue
    ? '$' + numpadValue
    : (goalData.amount ? '$' + goalData.amount : '$0');

  // ── Step 1: Intro ──
  if (step === 1) {
    return (
      <View style={s.gfRoot}>
        <View style={s.gfBackRow}>
          <TouchableOpacity style={s.gfBackBtn} onPress={onCancel} activeOpacity={0.7}>
            <Text style={s.gfBackText}>←</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.gfScrollCenter} showsVerticalScrollIndicator={false}>
          <View style={s.gfRobotCircle}>
            <Image source={require('./assets/robot monstir/robot_1.png')} style={{ width: 120, height: 120 }} resizeMode="contain" />
          </View>
          <Text style={s.gfBigTitle}>{"Let's create\na new goal!"}</Text>
          <Text style={s.gfSubtitle}>What are you saving up for?</Text>
          <View style={{ height: 32 }} />
          <TouchableOpacity style={s.gfBtnPrimary} onPress={() => go(2)} activeOpacity={0.85}>
            <Text style={s.gfBtnPrimaryText}>Create goal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.gfBtnOutline} onPress={onCancel} activeOpacity={0.7}>
            <Text style={s.gfBtnOutlineText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Step 2: Category ──
  if (step === 2) {
    return (
      <View style={s.gfRoot}>
        <View style={s.gfBackRow}>
          <TouchableOpacity style={s.gfBackBtn} onPress={() => go(1)} activeOpacity={0.7}>
            <Text style={s.gfBackText}>←</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.gfScrollTop} showsVerticalScrollIndicator={false}>
          <Text style={s.gfScreenTitle}>What do you want?</Text>
          <Text style={s.gfScreenSub}>Choose a category or pick something you love!</Text>
          <View style={s.gfCategoryGrid}>
            {GOAL_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.label}
                style={s.gfCategoryCard}
                onPress={() => { handleCategorySelect(cat.label); }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 48 }}>{cat.icon}</Text>
                <Text style={s.gfCategoryLabel}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Step 3: Pick goal ──
  if (step === 3) {
    return (
      <View style={s.gfRoot}>
        <View style={s.gfBackRow}>
          <TouchableOpacity style={s.gfBackBtn} onPress={() => go(2)} activeOpacity={0.7}>
            <Text style={s.gfBackText}>←</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.gfScrollTop} showsVerticalScrollIndicator={false}>
          <Text style={s.gfScreenTitle}>Pick your goal</Text>
          <Text style={s.gfScreenSub}>Here are some popular ideas!</Text>
          <View style={{ gap: 10, marginTop: 8 }}>
            {GOAL_OPTIONS.map((opt, idx) => {
              const selected = selectedOptionIdx === idx;
              return (
                <TouchableOpacity
                  key={opt.name}
                  style={[s.gfGoalRow, selected && s.gfGoalRowSelected]}
                  onPress={() => handleGoalOptionSelect(idx)}
                  activeOpacity={0.7}
                >
                  <View style={s.gfGoalIconCircle}>
                    <Text style={{ fontSize: 40 }}>{opt.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.gfGoalName}>{opt.name}</Text>
                    {opt.amount ? (
                      <Text style={s.gfGoalPrice}>${opt.amount}</Text>
                    ) : (
                      <Text style={s.gfGoalPrice}>Set your own amount</Text>
                    )}
                  </View>
                  <View style={[s.gfGoalCheck, selected && s.gfGoalCheckSelected]}>
                    {selected && <View style={s.gfGoalCheckDot} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ height: 24 }} />
          <TouchableOpacity
            style={[s.gfBtnPrimary, !selectedOptionIdx && selectedOptionIdx !== 0 && { opacity: 0.4 }]}
            onPress={() => selectedOptionIdx !== null && go(4)}
            activeOpacity={0.85}
          >
            <Text style={s.gfBtnPrimaryText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Step 4: Goal details ──
  if (step === 4) {
    return (
      <View style={s.gfRoot}>
        <View style={s.gfBackRow}>
          <TouchableOpacity style={s.gfBackBtn} onPress={() => go(3)} activeOpacity={0.7}>
            <Text style={s.gfBackText}>←</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.gfScrollTop} showsVerticalScrollIndicator={false}>
          <Text style={s.gfScreenTitle}>Goal details</Text>
          <Text style={s.gfScreenSub}>{"Let's give your goal a name and set the target amount."}</Text>

          {/* Goal name */}
          <View style={{ marginTop: 20 }}>
            <View style={s.gfLabelRow}>
              <Text style={s.gfFieldLabel}>Goal name</Text>
              <Text style={s.gfCharCount}>{goalData.name.length}/30</Text>
            </View>
            <TextInput
              style={s.gfInput}
              value={goalData.name}
              onChangeText={v => setGoalData(prev => ({ ...prev, name: v.slice(0, 30) }))}
              placeholder="e.g. New bike"
              placeholderTextColor="#C0BEB8"
            />
          </View>

          {/* Target amount */}
          <View style={{ marginTop: 16 }}>
            <Text style={s.gfFieldLabel}>Target amount</Text>
            <TouchableOpacity
              style={s.gfInput}
              onPress={() => { setNumpadValue(goalData.amount.replace('$', '')); go(5); }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16, color: goalData.amount ? '#1A1A1A' : '#C0BEB8' }}>
                {goalData.amount ? '$' + goalData.amount : '$0.00'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Photo */}
          <View style={{ marginTop: 16 }}>
            <Text style={s.gfFieldLabel}>Add a photo (optional)</Text>
            <TouchableOpacity style={s.gfPhotoDash} onPress={() => go(6)} activeOpacity={0.7}>
              <Text style={{ fontSize: 28 }}>📷</Text>
              <Text style={s.gfPhotoText}>Tap to add a photo</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 24 }} />
          <TouchableOpacity style={s.gfBtnPrimary} onPress={() => go(7)} activeOpacity={0.85}>
            <Text style={s.gfBtnPrimaryText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Step 5: Number pad ──
  if (step === 5) {
    const numKeys = ['1','2','3','4','5','6','7','8','9','.','0','⌫'];
    return (
      <View style={s.gfRoot}>
        <View style={s.gfBackRow}>
          <TouchableOpacity style={s.gfBackBtn} onPress={() => go(4)} activeOpacity={0.7}>
            <Text style={s.gfBackText}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={s.gfScrollTop}>
          <Text style={s.gfScreenTitle}>Set target amount</Text>
          <Text style={s.gfScreenSub}>How much does it cost?</Text>
          <Text style={s.gfAmountDisplay}>{displayAmount}</Text>
          <Text style={s.gfAmountHint}>Recommended: $10 – $1,000</Text>
          <View style={s.gfNumpad}>
            {numKeys.map(key => (
              <TouchableOpacity
                key={key}
                style={s.gfNumKey}
                onPress={() => handleNumpadKey(key)}
                activeOpacity={0.7}
              >
                <Text style={s.gfNumKeyText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[s.gfBtnPrimary, { marginTop: 16 }]} onPress={handleNumpadDone} activeOpacity={0.85}>
            <Text style={s.gfBtnPrimaryText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Step 6: Add photo ──
  if (step === 6) {
    return (
      <View style={s.gfRoot}>
        <View style={s.gfBackRow}>
          <TouchableOpacity style={s.gfBackBtn} onPress={() => go(4)} activeOpacity={0.7}>
            <Text style={s.gfBackText}>←</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.gfScrollTop} showsVerticalScrollIndicator={false}>
          <Text style={s.gfScreenTitle}>Add a photo</Text>
          <Text style={s.gfScreenSub}>Add a photo of what you're saving for!</Text>

          {photoAdded ? (
            <View style={s.gfPhotoPreview}>
              <View style={s.gfPhotoPlaceholder}>
                <Text style={{ fontSize: 60 }}>{goalData.icon}</Text>
                <Text style={{ color: '#ABABAB', marginTop: 8, fontSize: 13 }}>Photo preview</Text>
              </View>
              <TouchableOpacity
                style={s.gfPhotoRemove}
                onPress={() => setPhotoAdded(false)}
                activeOpacity={0.7}
              >
                <Text style={s.gfPhotoRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[s.gfPhotoDash, { height: 180, marginTop: 20 }]}>
              <Text style={{ fontSize: 40, color: '#ABABAB' }}>📷</Text>
              <Text style={s.gfPhotoText}>No photo yet</Text>
            </View>
          )}

          <View style={{ gap: 12, marginTop: 24 }}>
            <TouchableOpacity style={s.gfBtnOutline} onPress={() => setPhotoAdded(true)} activeOpacity={0.7}>
              <Text style={s.gfBtnOutlineText}>📷  Take a photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.gfBtnOutline} onPress={() => setPhotoAdded(true)} activeOpacity={0.7}>
              <Text style={s.gfBtnOutlineText}>🖼  Choose from gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => go(7)} activeOpacity={0.7} style={{ alignItems: 'center', paddingVertical: 12 }}>
              <Text style={s.gfSkipLink}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Step 7: Choose color ──
  if (step === 7) {
    return (
      <View style={s.gfRoot}>
        <View style={s.gfBackRow}>
          <TouchableOpacity style={s.gfBackBtn} onPress={() => go(4)} activeOpacity={0.7}>
            <Text style={s.gfBackText}>←</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.gfScrollTop} showsVerticalScrollIndicator={false}>
          <Text style={s.gfScreenTitle}>Choose a color</Text>
          <Text style={s.gfScreenSub}>Pick a color for your goal card!</Text>
          <View style={s.gfColorGrid}>
            {GOAL_COLORS.map(color => {
              const selected = goalData.color === color;
              return (
                <TouchableOpacity
                  key={color}
                  style={[s.gfColorSwatch, { backgroundColor: color }, selected && s.gfColorSwatchSelected]}
                  onPress={() => setGoalData(prev => ({ ...prev, color }))}
                  activeOpacity={0.8}
                >
                  {selected && <Text style={s.gfColorCheck}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={{ height: 24 }} />
          <TouchableOpacity style={s.gfBtnPrimary} onPress={() => go(8)} activeOpacity={0.85}>
            <Text style={s.gfBtnPrimaryText}>Next</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Step 8: Goal preview ──
  if (step === 8) {
    return (
      <View style={s.gfRoot}>
        <View style={s.gfBackRow}>
          <TouchableOpacity style={s.gfBackBtn} onPress={() => go(7)} activeOpacity={0.7}>
            <Text style={s.gfBackText}>←</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={s.gfScrollTop} showsVerticalScrollIndicator={false}>
          <Text style={s.gfScreenTitle}>Goal preview</Text>
          <Text style={s.gfScreenSub}>{"Here's how your goal will look!"}</Text>

          {/* Goal card */}
          <View style={[s.gfPreviewCard, { borderLeftColor: goalData.color, borderLeftWidth: 5 }]}>
            <Text style={{ fontSize: 60, textAlign: 'center', marginBottom: 8 }}>{goalData.icon}</Text>
            <Text style={s.gfPreviewName}>{goalData.name || 'My goal'}</Text>
            <Text style={s.gfPreviewAmount}>{goalData.amount ? '$' + goalData.amount : '$0.00'}</Text>
            <View style={s.gfProgressTrack}>
              <View style={[s.gfProgressFill, { width: '0%', backgroundColor: goalData.color }]} />
            </View>
            <Text style={s.gfProgressPct}>0%</Text>
          </View>

          {/* Robot message */}
          <View style={s.gfRobotRow}>
            <Image source={require('./assets/robot monstir/robot_1.png')} style={{ width: 50, height: 50 }} resizeMode="contain" />
            <View style={s.gfSpeechBubble}>
              <Text style={s.gfSpeechText}>{"Nice goal! You're going to crush it! 💪"}</Text>
            </View>
          </View>

          <View style={{ height: 24 }} />
          <TouchableOpacity style={s.gfBtnPrimary} onPress={() => go(9)} activeOpacity={0.85}>
            <Text style={s.gfBtnPrimaryText}>Create goal</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Step 9: Goal created! ──
  if (step === 9) {
    return (
      <View style={s.gfRoot}>
        {/* Confetti dots */}
        {['#6B35F0','#F5C842','#E870A0','#5CB85C','#F08030','#4A9FE8'].map((c, i) => (
          <View key={i} style={[s.gfConfettiDot, { backgroundColor: c, top: 60 + (i * 37) % 120, left: 20 + (i * 57) % (300) }]} />
        ))}
        <ScrollView contentContainerStyle={s.gfScrollCenter} showsVerticalScrollIndicator={false}>
          <Text style={s.gfCreatedTitle}>Goal created!</Text>
          <Text style={s.gfSubtitle}>{"You're all set and ready to start saving!"}</Text>

          <View style={s.gfRobotCircle}>
            <Image source={require('./assets/robot monstir/robot_1.png')} style={{ width: 120, height: 120 }} resizeMode="contain" />
          </View>

          {/* Goal card preview */}
          <View style={[s.gfPreviewCard, { borderLeftColor: goalData.color, borderLeftWidth: 5 }]}>
            <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>{goalData.icon}</Text>
            <Text style={s.gfPreviewName}>{goalData.name || 'My goal'}</Text>
            <Text style={s.gfPreviewAmount}>{goalData.amount ? '$' + goalData.amount : '$0.00'}</Text>
            <View style={s.gfProgressTrack}>
              <View style={[s.gfProgressFill, { width: '0%', backgroundColor: goalData.color }]} />
            </View>
            <Text style={s.gfProgressPct}>0%</Text>
          </View>

          <View style={{ height: 24 }} />
          <TouchableOpacity style={s.gfBtnPrimary} onPress={() => go(10)} activeOpacity={0.85}>
            <Text style={s.gfBtnPrimaryText}>View my goal</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onDone} activeOpacity={0.7} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text style={s.gfSkipLink}>Back to home</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Step 10: Next allowance ──
  return (
    <View style={s.gfRoot}>
      <View style={s.gfBackRow}>
        <TouchableOpacity style={s.gfBackBtn} onPress={() => go(9)} activeOpacity={0.7}>
          <Text style={s.gfBackText}>←</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={s.gfScrollCenter} showsVerticalScrollIndicator={false}>
        <Text style={s.gfScreenTitle}>Next allowance</Text>
        <Text style={s.gfScreenSub}>{"Here's when you'll get your next allowance!"}</Text>
        <Text style={{ fontSize: 72, textAlign: 'center', marginVertical: 16 }}>📅</Text>
        <Text style={s.gfAllowanceLabel}>Next payday</Text>
        <Text style={s.gfAllowanceDate}>Friday, May 31</Text>
        <Text style={s.gfAllowanceDays}>3 days away</Text>

        {/* Robot message */}
        <View style={[s.gfRobotRow, { marginTop: 24, marginBottom: 8 }]}>
          <Image source={require('./assets/robot monstir/robot_1.png')} style={{ width: 50, height: 50 }} resizeMode="contain" />
          <View style={s.gfSpeechBubble}>
            <Text style={s.gfSpeechText}>{"Can't wait to see your progress! 🚀"}</Text>
          </View>
        </View>

        <View style={{ height: 24 }} />
        <TouchableOpacity style={s.gfBtnPrimary} onPress={onDone} activeOpacity={0.85}>
          <Text style={s.gfBtnPrimaryText}>Awesome!</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─── Onboarding Flow ─────────────────────────────────────────────────────────

interface OnboardingFlowProps {
  onDone: () => void;
  onCreateAccount: () => void;
  onLogin: () => void;
  onContinueAsKid: () => void;
}

function OnboardingFlow({ onDone, onCreateAccount, onLogin, onContinueAsKid }: OnboardingFlowProps) {
  const [step, setStep] = useState<number>(0);

  const PaginationDots = ({ current }: { current: number }) => (
    <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginBottom: 24 }}>
      {[0, 1, 2].map(i => (
        <View
          key={i}
          style={{
            width: 8, height: 8, borderRadius: 4,
            backgroundColor: current === i ? '#6B35F0' : '#D0CEC8',
          }}
        />
      ))}
    </View>
  );

  // Slide 0 — Complete chores
  if (step === 0) {
    return (
      <CreamBg>
        <TouchableOpacity
          style={ob.skipBtn}
          onPress={onDone}
          activeOpacity={0.7}
        >
          <Text style={ob.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Top half */}
        <View style={ob.topHalf}>
          <View style={ob.robotCircle}>
            <Image
              source={require('./assets/robot monstir/robot_1.png')}
              style={{ width: 200, height: 200 }}
              resizeMode="contain"
            />
            {/* XP badge */}
            <View style={ob.xpBadge}>
              <Text style={{ fontSize: 14 }}>⭐</Text>
              <Text style={ob.xpBadgeText}>+50 XP</Text>
            </View>
          </View>
        </View>

        {/* Bottom white card */}
        <View style={ob.bottomCard}>
          <PaginationDots current={0} />
          <Text style={ob.slideTitle}>
            Complete{' '}
            <Text style={ob.slideTitleWord}>chores</Text>
          </Text>
          <View style={ob.yellowUnderline} />
          <Text style={ob.slideSubtitle}>
            Finish tasks around the house to earn XP and coins.
          </Text>
          <TouchableOpacity style={ob.nextBtn} onPress={() => setStep(1)} activeOpacity={0.85}>
            <Text style={ob.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </CreamBg>
    );
  }

  // Slide 1 — Level up & evolve
  if (step === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: '#EAE4FF' }}>
        <TouchableOpacity style={ob.skipBtn} onPress={onDone} activeOpacity={0.7}>
          <Text style={ob.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Top half */}
        <View style={ob.topHalf}>
          <View style={[ob.robotCircle, { backgroundColor: '#D4CAFF' }]}>
            <Image
              source={require('./assets/robot monstir/robot_7.png')}
              style={{ width: 220, height: 220 }}
              resizeMode="contain"
            />
            {/* Level up badge */}
            <View style={[ob.xpBadge, { borderColor: '#6B35F0' }]}>
              <Text style={{ fontSize: 14 }}>👑</Text>
              <Text style={[ob.xpBadgeText, { color: '#6B35F0', fontWeight: '800' }]}>LEVEL UP!</Text>
            </View>
          </View>
        </View>

        {/* Bottom white card */}
        <View style={ob.bottomCard}>
          <PaginationDots current={1} />
          <Text style={ob.slideTitle}>
            Level up &{' '}
            <Text style={ob.slideTitleWord}>evolve</Text>
          </Text>
          <View style={ob.yellowUnderline} />
          <Text style={ob.slideSubtitle}>
            The more you do, the stronger your Monstir becomes!
          </Text>
          <TouchableOpacity style={ob.nextBtn} onPress={() => setStep(2)} activeOpacity={0.85}>
            <Text style={ob.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Slide 2 — Earn rewards
  if (step === 2) {
    return (
      <CreamBg>
        <TouchableOpacity style={ob.skipBtn} onPress={onDone} activeOpacity={0.7}>
          <Text style={ob.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Top half */}
        <View style={ob.topHalf}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            {/* 2x2 grid of reward icons */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {(['⭐', '📖', '👟', '🧢'] as string[]).map((emoji, i) => (
                <View key={i} style={ob.rewardIcon}>
                  <Text style={{ fontSize: 32 }}>{emoji}</Text>
                </View>
              ))}
            </View>
            {/* Treasure chest */}
            <View style={ob.chestBox}>
              <Text style={{ fontSize: 80 }}>🎁</Text>
            </View>
          </View>
        </View>

        {/* Bottom white card */}
        <View style={ob.bottomCard}>
          <PaginationDots current={2} />
          <Text style={ob.slideTitle}>
            Earn{' '}
            <Text style={ob.slideTitleWord}>rewards</Text>
          </Text>
          <View style={ob.yellowUnderline} />
          <Text style={ob.slideSubtitle}>
            Unlock cool items, accessories, and new evolutions!
          </Text>
          <TouchableOpacity style={ob.nextBtn} onPress={() => setStep(3)} activeOpacity={0.85}>
            <Text style={ob.nextBtnText}>Next →</Text>
          </TouchableOpacity>
        </View>
      </CreamBg>
    );
  }

  // Slide 3 — Let's get started (CTA, full screen lime green)
  return (
    <View style={{ flex: 1, backgroundColor: '#C5F215' }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Parent + kid + robot illustration */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', marginBottom: 24, gap: 8 }}>
          <Text style={{ fontSize: 56 }}>👩</Text>
          <Text style={{ fontSize: 56 }}>👦</Text>
          <Image
            source={require('./assets/robot monstir/robot_1.png')}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>

        <Text style={{ fontSize: 30, fontWeight: '900', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 }}>
          Let's get started!
        </Text>
        <Text style={{ fontSize: 15, color: '#4A4A4A', textAlign: 'center', marginBottom: 28 }}>
          Create an account to save your progress and Monstirs.
        </Text>

        {/* Features list card */}
        <View style={ob.featuresCard}>
          {([
            { icon: '🛡', label: 'Safe & kid-friendly' },
            { icon: '📊', label: 'Track progress' },
            { icon: '🔒', label: 'Secure & private' },
          ] as { icon: string; label: string }[]).map((item, i) => (
            <View key={i}>
              {i > 0 && <View style={ob.featureDivider} />}
              <View style={ob.featureRow}>
                <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                <Text style={ob.featureLabel}>{item.label}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ gap: 12, marginTop: 28 }}>
          <TouchableOpacity
            style={ob.createAccountBtn}
            onPress={onCreateAccount}
            activeOpacity={0.85}
          >
            <Text style={ob.createAccountBtnText}>Create account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={ob.haveAccountBtn}
            onPress={onLogin}
            activeOpacity={0.85}
          >
            <Text style={ob.haveAccountBtnText}>I have an account</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onContinueAsKid}
            activeOpacity={0.7}
            style={{ paddingVertical: 14, alignItems: 'center' }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#6B35F0' }}>
              Continue as kid
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

interface LoginScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  onSignUp: () => void;
}

function LoginScreen({ onBack, onSuccess, onSignUp }: LoginScreenProps) {
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);

  return (
    <CreamBg>
      {/* Decorative elements */}
      <Text style={auth.leafDecor}>🌿</Text>
      <View style={auth.purpleBlob} />
      <Text style={[auth.sparkle, { top: 120, right: 60 }]}>⭐</Text>
      <Text style={[auth.sparkle, { top: 200, left: 40 }]}>✦</Text>
      <Text style={[auth.sparkle, { bottom: 200, right: 40 }]}>⭐</Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Back button */}
        <TouchableOpacity onPress={onBack} style={auth.backBtn} activeOpacity={0.7}>
          <Text style={auth.backBtnText}>←</Text>
        </TouchableOpacity>

        <Text style={auth.title}>Welcome back!</Text>
        <Text style={auth.subtitle}>Log in to your Monstir account.</Text>

        <View style={{ gap: 14, marginTop: 28 }}>
          {/* Email input */}
          <View style={auth.inputRow}>
            <Text style={auth.inputIcon}>📧</Text>
            <TextInput
              style={auth.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#C0BEB8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password input */}
          <View style={auth.inputRow}>
            <Text style={auth.inputIcon}>🔒</Text>
            <TextInput
              style={[auth.textInput, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#C0BEB8"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7} style={{ paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Forgot password */}
          <TouchableOpacity style={{ alignSelf: 'flex-end' }} activeOpacity={0.7}>
            <Text style={{ fontSize: 14, color: '#6B35F0', fontWeight: '600' }}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Log in button */}
          <TouchableOpacity style={auth.primaryBtn} onPress={onSuccess} activeOpacity={0.85}>
            <Text style={auth.primaryBtnText}>Log in</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={auth.dividerRow}>
            <View style={auth.dividerLine} />
            <Text style={auth.dividerText}>or</Text>
            <View style={auth.dividerLine} />
          </View>

          {/* Google button */}
          <TouchableOpacity style={auth.googleBtn} activeOpacity={0.85}>
            <Text style={{ color: '#4285F4', fontWeight: '900', fontSize: 18 }}>G</Text>
            <Text style={auth.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Sign up link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 4 }}>
            <Text style={{ fontSize: 14, color: '#ABABAB' }}>Don't have an account?</Text>
            <TouchableOpacity onPress={onSignUp} activeOpacity={0.7}>
              <Text style={{ fontSize: 14, color: '#6B35F0', fontWeight: '700' }}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </CreamBg>
  );
}

// ─── Sign Up Screen ───────────────────────────────────────────────────────────

interface SignupScreenProps {
  onBack: () => void;
  onSuccess: () => void;
  onLogin: () => void;
}

function SignupScreen({ onBack, onSuccess, onLogin }: SignupScreenProps) {
  const [name, setName]                       = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);

  return (
    <CreamBg>
      {/* Decorative elements */}
      <Text style={auth.leafDecor}>🌿</Text>
      <View style={auth.purpleBlob} />
      <Text style={[auth.sparkle, { top: 120, right: 60 }]}>⭐</Text>
      <Text style={[auth.sparkle, { top: 200, left: 40 }]}>✦</Text>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingTop: 20, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Back button */}
        <TouchableOpacity onPress={onBack} style={auth.backBtn} activeOpacity={0.7}>
          <Text style={auth.backBtnText}>←</Text>
        </TouchableOpacity>

        <Text style={auth.title}>Create account</Text>
        <Text style={auth.subtitle}>Join Monstir and start your adventure!</Text>

        <View style={{ gap: 14, marginTop: 28 }}>
          {/* Name input */}
          <View style={auth.inputRow}>
            <Text style={auth.inputIcon}>👤</Text>
            <TextInput
              style={auth.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Name"
              placeholderTextColor="#C0BEB8"
              autoCapitalize="words"
            />
          </View>

          {/* Email input */}
          <View style={auth.inputRow}>
            <Text style={auth.inputIcon}>📧</Text>
            <TextInput
              style={auth.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#C0BEB8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password input */}
          <View style={auth.inputRow}>
            <Text style={auth.inputIcon}>🔒</Text>
            <TextInput
              style={[auth.textInput, { flex: 1 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#C0BEB8"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7} style={{ paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 18 }}>{showPassword ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Confirm password input */}
          <View style={auth.inputRow}>
            <Text style={auth.inputIcon}>🔒</Text>
            <TextInput
              style={[auth.textInput, { flex: 1 }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor="#C0BEB8"
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)} activeOpacity={0.7} style={{ paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 18 }}>{showConfirm ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
          </View>

          {/* Create account button */}
          <TouchableOpacity style={auth.primaryBtn} onPress={onSuccess} activeOpacity={0.85}>
            <Text style={auth.primaryBtnText}>Create account</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={auth.dividerRow}>
            <View style={auth.dividerLine} />
            <Text style={auth.dividerText}>or</Text>
            <View style={auth.dividerLine} />
          </View>

          {/* Google button */}
          <TouchableOpacity style={auth.googleBtn} activeOpacity={0.85}>
            <Text style={{ color: '#4285F4', fontWeight: '900', fontSize: 18 }}>G</Text>
            <Text style={auth.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Log in link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8, gap: 4 }}>
            <Text style={{ fontSize: 14, color: '#ABABAB' }}>Already have an account?</Text>
            <TouchableOpacity onPress={onLogin} activeOpacity={0.7}>
              <Text style={{ fontSize: 14, color: '#6B35F0', fontWeight: '700' }}>Log in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </CreamBg>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type AppMode = 'onboarding' | 'login' | 'signup' | 'parentOnboarding' | 'kidProfile' | 'app';

export default function App() {
  const [appMode, setAppMode] = useState<AppMode>('onboarding');
  const [screen, setScreen]             = useState<Screen>('home');
  const [tab, setTab]                   = useState<Tab>('home');
  const [monsterIdx, setMonsterIdx]     = useState<MonsterIdx>(0);
  const [xp, setXp]                     = useState(0);
  const [coins, setCoins]               = useState(0);
  const [done, setDone]                 = useState<Partial<Record<ChoreId, boolean>>>({});
  const [logText, setLogText]           = useState('Preparing for battle...');
  const [logBold, setLogBold]           = useState(false);
  const [battleWon, setBattleWon]       = useState(false);
  const [bonusCoins, setBonusCoins]     = useState(0);
  const [battleResult, setBattleResult] = useState<'win' | 'loss' | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Parent state
  const [viewMode, setViewMode]               = useState<ViewMode>('kid');
  const [parentScreen, setParentScreen]       = useState<ParentScreen>('parentHome');
  const [parentTab, setParentTab]             = useState<ParentTab>('chores');
  const [managedChores, setManagedChores]     = useState<ManagedChore[]>(DEFAULT_MANAGED_CHORES);
  const [editingChore, setEditingChore]       = useState<ManagedChore | null>(null);
  const [baseRate, setBaseRate]               = useState('0.50');
  const [weeklyCapEnabled, setWeeklyCap]      = useState(false);
  const [requireApproval, setRequireApproval] = useState(true);
  const [showKidProfile, setShowKidProfile]   = useState(false);

  const completeChore = useCallback((c: Chore) => {
    const newXp = xp + c.xp;
    setDone(prev => ({ ...prev, [c.id]: true }));
    setXp(newXp);
    setCoins(prev => prev + choreCoins(c, baseRate));
    if (monsterIdx < MONSTERS.length - 1 && newXp >= MONSTERS[monsterIdx].needed) {
      setScreen('evolve');
    }
  }, [xp, monsterIdx]);

  const startBattle = useCallback(() => {
    const doneCount = Object.keys(done).length;
    const won       = Math.random() * 100 < calcWinOdds(doneCount);
    const boss      = BOSSES[monsterIdx % BOSSES.length];
    const monster   = MONSTERS[monsterIdx];
    const bonus     = won ? boss.bonus : Math.round(boss.bonus * 0.2);

    setBattleWon(won);
    setBonusCoins(bonus);
    setLogText('Preparing for battle...');
    setLogBold(false);
    setScreen('arena');

    timers.current.forEach(clearTimeout);
    timers.current = [];

    battleScript(monster.name, boss.name, won).forEach(({ delay, text, bold }) => {
      timers.current.push(setTimeout(() => { setLogText(text); setLogBold(bold); }, delay));
    });

    timers.current.push(setTimeout(() => {
      setCoins(prev => prev + bonus);
      setBattleResult(won ? 'win' : 'loss');
      setScreen('result');
    }, 4800));
  }, [done, monsterIdx]);

  const navTab = useCallback((t: Tab) => { setTab(t); setScreen(t); }, []);
  const showTabBar = ['home', 'battle', 'wallet'].includes(screen);

  const handleEvolveDone = useCallback(() => {
    setMonsterIdx(prev => (prev + 1) as MonsterIdx);
    setXp(0);
    setDone({});
    setTab('home');
    setScreen('home');
  }, []);

  // Parent navigation
  const navParent = (s: ParentScreen) => setParentScreen(s);
  const navParentTab = (t: ParentTab) => {
    setParentTab(t);
    if (t === 'kidView') { setViewMode('kid'); return; }
    if (t === 'chores')   setParentScreen('chores');
    if (t === 'rewards')  setParentScreen('rewards');
    if (t === 'settings') setParentScreen('settings');
  };
  const openEditChore = (chore: ManagedChore) => { setEditingChore(chore); setParentScreen('editChore'); };
  const saveChore = (chore: ManagedChore) => {
    setManagedChores(prev => {
      const exists = prev.find(c => c.id === chore.id);
      return exists ? prev.map(c => c.id === chore.id ? chore : c) : [...prev, chore];
    });
    setParentScreen('chores');
  };
  const deleteChore = (id: string) => { setManagedChores(prev => prev.filter(c => c.id !== id)); setParentScreen('chores'); };

  if (appMode === 'onboarding') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar barStyle="dark-content" />
          <OnboardingFlow
            onDone={() => setAppMode('app')}
            onCreateAccount={() => setAppMode('signup')}
            onLogin={() => setAppMode('login')}
            onContinueAsKid={() => setAppMode('app')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (appMode === 'login') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar barStyle="dark-content" />
          <LoginScreen
            onBack={() => setAppMode('onboarding')}
            onSuccess={() => setAppMode('app')}
            onSignUp={() => setAppMode('signup')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (appMode === 'signup') {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar barStyle="dark-content" />
          <SignupScreen
            onBack={() => setAppMode('onboarding')}
            onSuccess={() => setAppMode('parentOnboarding')}
            onLogin={() => setAppMode('login')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (appMode === 'parentOnboarding') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <ParentOnboarding onComplete={() => setAppMode('app')} />
      </SafeAreaProvider>
    );
  }

  if (appMode === 'kidProfile') {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <KidProfileCreation
          onComplete={() => setAppMode('app')}
          onSkip={() => setAppMode('app')}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
    <SafeAreaView edges={['top']} style={[s.root, (screen === 'home' || viewMode === 'parent') && { backgroundColor: viewMode === 'parent' ? '#FFFFFF' : '#C5F215' }]}>
      <StatusBar barStyle="dark-content" backgroundColor={viewMode === 'parent' ? '#FFFFFF' : (screen === 'home' ? '#C5F215' : C.surface)} />
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        {viewMode === 'kid' ? (
          <>
            {screen === 'home'     && <HomeScreen   monsterIdx={monsterIdx} xp={xp} coins={coins} done={done} onComplete={completeChore} onSwitchToParent={() => setViewMode('parent')} onDebugSetXp={setXp} onDebugSetMonster={(idx) => { setMonsterIdx(idx); setXp(0); setDone({}); }} onResetApp={setAppMode} baseRate={baseRate} />}
            {screen === 'battle'   && <BattleScreen monsterIdx={monsterIdx} coins={coins} done={done} onStartBattle={startBattle} />}
            {screen === 'arena'    && <ArenaScreen  monsterIdx={monsterIdx} logText={logText} logBold={logBold} />}
            {screen === 'result'   && <ResultScreen monsterIdx={monsterIdx} won={battleWon} bonusCoins={bonusCoins} onDone={() => { setTab('home'); setScreen('home'); }} />}
            {screen === 'wallet'   && <WalletScreen coins={coins} done={done} battleResult={battleResult} monsterIdx={monsterIdx} baseRate={baseRate} />}
            {screen === 'goalFlow' && <GoalCreationFlow onDone={() => setScreen('home')} onCancel={() => setScreen('home')} />}
            {showTabBar && <TabBar active={tab} onNav={navTab} onGoals={() => setScreen('goalFlow')} />}
          </>
        ) : (
          <>
            {parentScreen === 'parentHome' && <ParentHomeScreen onNav={navParent} onSwitchToKid={() => setViewMode('kid')} onAddKid={() => setShowKidProfile(true)} />}
            {parentScreen === 'chores'     && <ParentChoresScreen chores={managedChores} onBack={() => setParentScreen('parentHome')} onAdd={() => { setEditingChore(null); setParentScreen('addChore'); }} onEdit={openEditChore} />}
            {(parentScreen === 'addChore' || parentScreen === 'editChore') && (
              <AddEditChoreScreen
                existing={editingChore}
                onBack={() => setParentScreen('chores')}
                onSave={saveChore}
                onDelete={editingChore ? () => deleteChore(editingChore.id) : undefined}
              />
            )}
            {parentScreen === 'payRates'  && <PayRatesScreen onBack={() => setParentScreen('parentHome')} onRateGuide={() => setParentScreen('rateGuide')} baseRate={baseRate} setBaseRate={setBaseRate} weeklyCapEnabled={weeklyCapEnabled} setWeeklyCap={setWeeklyCap} requireApproval={requireApproval} setRequireApproval={setRequireApproval} />}
            {parentScreen === 'rateGuide' && <RateGuideScreen onBack={() => setParentScreen('payRates')} />}
            {parentScreen === 'rewards'   && <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Rewards coming soon</Text></View>}
            {parentScreen === 'settings'  && <ParentSettingsScreen onNav={navParent} baseRate={baseRate} onAddKid={() => setShowKidProfile(true)} />}
            <ParentTabBar active={parentTab} onNav={navParentTab} />
          </>
        )}
        <EvolutionAnimation
          monsterBefore={ROBOT_IMAGES[monsterIdx]}
          monsterAfter={ROBOT_IMAGES[Math.min(monsterIdx + 1, 7) as MonsterIdx]}
          onComplete={handleEvolveDone}
          visible={screen === 'evolve'}
        />
      </View>
    </SafeAreaView>

    {/* Kid profile creation — triggered from parent dashboard */}
    <Modal visible={showKidProfile} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" />
        <KidProfileCreation
          onComplete={() => setShowKidProfile(false)}
          onSkip={() => setShowKidProfile(false)}
        />
      </SafeAreaProvider>
    </Modal>

    </SafeAreaProvider>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SOLID_SHADOW = shadows.solid;

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: C.surface },
  header:          { backgroundColor: C.surface, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 0.5, borderBottomColor: C.border },
  wordmark:        { fontSize: 17, fontWeight: '900', color: C.text, letterSpacing: -0.4 },
  coinPill:        { backgroundColor: C.goldLight, borderWidth: 1, borderColor: C.goldBorder, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  coinText:        { fontSize: 12, fontWeight: '700', color: C.gold },
  hero:            { backgroundColor: C.surface, padding: 20, paddingBottom: 16, alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: C.border },
  lvChip:          { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: C.muted, marginBottom: 4 },
  monsterName:     { fontSize: 22, fontWeight: '900', color: C.text, letterSpacing: -0.5, marginBottom: 14 },
  monsterBubble:   { width: 100, height: 100, backgroundColor: C.bg, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  xpRow:           { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  xpLabel:         { fontSize: 11, fontWeight: '700', color: C.hint },
  xpTrack:         { width: '100%', height: 5, backgroundColor: C.border, borderRadius: 5, overflow: 'hidden' },
  xpFill:          { height: '100%', backgroundColor: C.accent, borderRadius: 5 },
  sectionLabel:    { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: C.hint, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, backgroundColor: C.bg },
  choreList:       { gap: 6, paddingHorizontal: 12 },
  choreRow:        { backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.border, borderRadius: 14, padding: 11, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  choreRowDone:    { backgroundColor: C.bg },
  choreIcon:       { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  choreInfo:       { flex: 1 },
  choreName:       { fontSize: 13, fontWeight: '700', color: C.text },
  choreNameDone:   { color: C.hint, textDecorationLine: 'line-through' },
  choreSub:        { fontSize: 11, color: C.hint, marginTop: 1 },
  choreGold:       { color: C.gold, fontWeight: '700' },
  choreCheck:      { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#DDDBD5', alignItems: 'center', justifyContent: 'center' },
  choreCheckDone:  { backgroundColor: C.accent, borderColor: C.accent },
  checkDot:        { width: 7, height: 7, borderRadius: 4, backgroundColor: 'white' },
  tabBar:          { position: 'absolute', bottom: 36, left: 12, right: 12 },
  tabBarInner:     { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 100, borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 8, paddingHorizontal: 6, justifyContent: 'space-between', alignItems: 'center', ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 }, android: { elevation: 8 } }) },
  tab:             { flex: 1, alignItems: 'center', gap: 3 },
  tabIconWrap:     { width: 98, borderRadius: 32, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, gap: 2 },
  tabIconWrapActive: { backgroundColor: '#EAE4FF' },
  tabIcon:         { width: 44, height: 44 },
  tabLabel:        { fontSize: 10, fontWeight: '600', color: '#ABABAB', letterSpacing: 0.1 },
  tabLabelActive:  { color: '#6B35F0' },
  // home screen
  homeRoot:           { flex: 1, backgroundColor: 'transparent' },
  homeHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  homeHeaderLeft:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeAvatar:         { width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#1A1A1A', overflow: 'hidden' },
  homeKidView:        { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  homeAgeRange:       { fontSize: 13, fontWeight: '600', color: '#1A1A1A', opacity: 0.5 },
  homeBalancePill:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 2.5, borderColor: '#1A1A1A', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8, gap: 6 },
  homeBalanceText:    { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  homeScroll:         { paddingHorizontal: 20, paddingBottom: 120, paddingTop: 10 },
  homeCharCard:       { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 2.5, borderColor: '#1A1A1A', marginBottom: 24, ...SOLID_SHADOW },
  homeCharImage:      { height: 340, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'visible' },
  homeCharInfo:       { padding: 14 },
  homeCharNameRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  homeCharName:       { fontSize: 30, fontWeight: '900', color: '#1A1A1A' },
  homeCharLevel:      { fontSize: 15, fontWeight: '800', color: '#6B35F0' },
  homeXpTrack:        { height: 16, backgroundColor: '#E0DCDC', borderRadius: 100, marginBottom: 5, overflow: 'hidden' },
  homeXpFill:         { height: '100%', backgroundColor: '#6B35F0', borderRadius: 100 },
  homeXpText:         { fontSize: 13, fontWeight: '500', color: '#1A1A1A' },
  homeXpPopLayer:     { position: 'absolute', bottom: 200, left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' } as any,
  homeXpPopPill:      { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#2D006E', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5 },
  homeXpPop:          { fontSize: 18, fontWeight: '900', color: '#2D006E', letterSpacing: 0.2 },
  homeCoinPopPill:    { backgroundColor: '#FFFFFF', borderWidth: 3, borderColor: '#1A6600', borderRadius: 100, paddingHorizontal: 14, paddingVertical: 5 },
  homeCoinPop:        { fontSize: 18, fontWeight: '900', color: '#1A6600', letterSpacing: 0.2 },
  homeQuestsHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  homeQuestsTitle:    { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  homeLeftPill:       { backgroundColor: '#ADE9DF', borderRadius: 100, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: '#1A1A1A' },
  homeLeftText:       { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  homeQuestCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAF9F4', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, marginBottom: 10, gap: 12, ...SOLID_SHADOW },
  homeQuestSweep:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#E8FFA0', borderRadius: 14 },
  homeQuestCardDone:  { opacity: 0.5 },
  homeQuestIcon:      { width: 58, height: 58, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  homeQuestInfo:      { flex: 1 },
  homeQuestTitle:     { fontSize: 17, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  homeQuestTitleDone: { textDecorationLine: 'line-through', color: '#ABABAB' },
  homeQuestReward:    { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  homeQuestCheck:     { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#1A1A1A' },
  homeQuestCheckDone: { backgroundColor: '#6B35F0', borderColor: '#6B35F0', alignItems: 'center', justifyContent: 'center' },
  homeQuestCheckDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: 'white' },
  battleCard:      { backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 14, padding: 14, paddingHorizontal: 16, ...SOLID_SHADOW },
  battleCardLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: C.muted, marginBottom: 4 },
  battlePower:     { fontSize: 32, fontWeight: '900', color: C.text, letterSpacing: -1, lineHeight: 36 },
  battleCardSub:   { fontSize: 11, color: C.muted, marginTop: 3 },
  pctRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  pctTrack:        { flex: 1, height: 6, backgroundColor: C.border, borderRadius: 6, overflow: 'hidden' },
  pctFill:         { height: '100%', borderRadius: 6, backgroundColor: C.accent },
  pctLbl:          { fontSize: 11, fontWeight: '700', color: C.accent, minWidth: 30, textAlign: 'right' },
  bossCard:        { backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 14, padding: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW },
  bossName:        { fontSize: 14, fontWeight: '900', color: C.text },
  bossSub:         { fontSize: 11, color: C.muted, marginTop: 1 },
  bossPow:         { fontSize: 13, fontWeight: '700', color: C.text },
  oddsRow:         { flexDirection: 'row', gap: 8 },
  oddsCard:        { flex: 1, backgroundColor: C.bg, borderRadius: 12, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, alignItems: 'center', ...SOLID_SHADOW },
  oddsVal:         { fontSize: 20, fontWeight: '900', color: C.text },
  oddsLbl:         { fontSize: 10, color: C.muted, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  battleBtn:       { backgroundColor: C.text, borderRadius: 14, padding: 15, alignItems: 'center' },
  battleBtnText:   { fontSize: 15, fontWeight: '900', color: 'white', letterSpacing: -0.3 },
  debugBtn:        { backgroundColor: C.bg, borderWidth: 0.5, borderColor: C.border, borderRadius: 10, padding: 10, alignItems: 'center' },
  debugBtnText:    { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.3 },
  arenaStage:      { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.surface },
  arenaVs:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, width: '100%' },
  arenaFighter:    { alignItems: 'center', gap: 8 },
  arenaName:       { fontSize: 11, fontWeight: '700', color: C.muted, letterSpacing: 0.5 },
  arenaVsLabel:    { fontSize: 22, fontWeight: '900', color: C.border },
  arenaLog:        { width: '100%', backgroundColor: C.bg, borderRadius: 12, padding: 14, minHeight: 72, marginTop: 20 },
  arenaLogText:    { fontSize: 13, color: C.text, lineHeight: 20 },
  arenaLogBold:    { fontWeight: '700' },
  resultScreen:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: C.surface, gap: 6 },
  resultChip:      { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: C.muted },
  resultH:         { fontSize: 28, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  resultSub:       { fontSize: 13, color: C.muted, marginBottom: 6 },
  resultCoins:     { fontSize: 22, fontWeight: '900', color: C.gold },
  resultCoinsLbl:  { fontSize: 12, color: C.muted, marginBottom: 20 },
  evCta:              { backgroundColor: '#C5F215', borderRadius: 14, paddingHorizontal: 36, paddingVertical: 15, borderWidth: 2, borderColor: '#1A1A1A', width: '100%', alignItems: 'center' },
  evCtaText:          { fontSize: 16, fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.3 },
  evolveScreen:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  evolveOverlayBg:    { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1A0A2E' },
  evolveRingContainer:{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  evolveRing:         { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: '#6B35F0', opacity: 0 },
  evolveBanner:       { fontSize: 42, fontWeight: '900', color: '#C5F215', letterSpacing: -1, textAlign: 'center' },
  evolveSide:         { alignItems: 'center', gap: 6 },
  evolveName:         { fontSize: 14, fontWeight: '900', color: C.text },
  evolveLvl:          { fontSize: 11, fontWeight: '700', color: C.muted },
  evolveSub:          { fontSize: 14, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginTop: 8 },
  walletTotal:     { backgroundColor: C.surface, borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, paddingBottom: 12, ...SOLID_SHADOW },
  walletLabel:     { fontSize: 10, fontWeight: '700', letterSpacing: 1.8, color: C.muted, marginBottom: 4 },
  walletAmount:    { fontSize: 34, fontWeight: '900', color: C.text, letterSpacing: -1 },
  walletSub:       { fontSize: 11, color: C.muted, marginTop: 2 },
  walletRow:       { backgroundColor: C.surface, borderWidth: 2, borderColor: '#1A1A1A', borderRadius: 12, padding: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, ...SOLID_SHADOW },
  walletRowName:   { flex: 1, fontSize: 12, fontWeight: '700', color: C.text },
  walletRowCoins:  { fontSize: 13, fontWeight: '900', color: C.gold },
  // ── Goal flow ──
  gfRoot:              { flex: 1, backgroundColor: 'transparent' },
  gfBackRow:           { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 4 },
  gfBackBtn:           { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  gfBackText:          { fontSize: 24, color: '#1A1A1A', fontWeight: '600' },
  gfScrollCenter:      { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40, justifyContent: 'center' },
  gfScrollTop:         { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, paddingTop: 8 },
  gfRobotCircle:       { width: 160, height: 160, borderRadius: 80, backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  gfBigTitle:          { fontSize: 34, fontWeight: '900', color: '#1A1A1A', textAlign: 'center', lineHeight: 40, marginBottom: 8 },
  gfCreatedTitle:      { fontSize: 34, fontWeight: '900', color: '#6B35F0', textAlign: 'center', marginBottom: 8 },
  gfSubtitle:          { fontSize: 16, color: '#ABABAB', textAlign: 'center', marginBottom: 8 },
  gfScreenTitle:       { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 6 },
  gfScreenSub:         { fontSize: 15, color: '#ABABAB', marginBottom: 16 },
  gfBtnPrimary:        { backgroundColor: '#6B35F0', borderRadius: 14, padding: 16, alignItems: 'center', width: '100%' },
  gfBtnPrimaryText:    { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  gfBtnOutline:        { borderRadius: 14, padding: 16, alignItems: 'center', width: '100%', borderWidth: 1.5, borderColor: '#ECEAE4', backgroundColor: '#FFFFFF' },
  gfBtnOutlineText:    { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  gfSkipLink:          { fontSize: 15, fontWeight: '600', color: '#ABABAB' },
  gfCategoryGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', marginTop: 8 },
  gfCategoryCard:      { width: '31%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8, ...SOLID_SHADOW },
  gfCategoryLabel:     { fontSize: 13, fontWeight: '600', color: '#1A1A1A', marginTop: 6, textAlign: 'center' },
  gfGoalRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 14, gap: 12, ...SOLID_SHADOW },
  gfGoalRowSelected:   { borderColor: '#6B35F0', borderWidth: 2 },
  gfGoalIconCircle:    { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' },
  gfGoalName:          { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  gfGoalPrice:         { fontSize: 13, color: '#ABABAB', marginTop: 2 },
  gfGoalCheck:         { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' },
  gfGoalCheckSelected: { backgroundColor: '#6B35F0', borderColor: '#6B35F0' },
  gfGoalCheckDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFFFFF' },
  gfLabelRow:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  gfFieldLabel:        { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  gfCharCount:         { fontSize: 12, color: '#ABABAB' },
  gfInput:             { borderWidth: 1.5, borderColor: '#D0CEC8', borderRadius: 12, padding: 14, fontSize: 16, color: '#1A1A1A', backgroundColor: '#FFFFFF', justifyContent: 'center' },
  gfPhotoDash:         { borderWidth: 1.5, borderColor: '#D0CEC8', borderRadius: 12, padding: 20, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', marginTop: 6, gap: 6 },
  gfPhotoText:         { fontSize: 14, color: '#ABABAB' },
  gfPhotoPreview:      { marginTop: 20, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  gfPhotoPlaceholder:  { height: 180, backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  gfPhotoRemove:       { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  gfPhotoRemoveText:   { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  gfAmountDisplay:     { fontSize: 52, fontWeight: '900', color: '#6B35F0', textAlign: 'center', marginVertical: 16 },
  gfAmountHint:        { fontSize: 13, color: '#ABABAB', textAlign: 'center', marginBottom: 24 },
  gfNumpad:            { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  gfNumKey:            { width: '30%', backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', paddingVertical: 18, alignItems: 'center', justifyContent: 'center', ...SOLID_SHADOW },
  gfNumKeyText:        { fontSize: 22, fontWeight: '700', color: '#1A1A1A' },
  gfColorGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginTop: 16 },
  gfColorSwatch:       { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  gfColorSwatchSelected: { borderWidth: 3, borderColor: '#1A1A1A' },
  gfColorCheck:        { fontSize: 22, color: '#FFFFFF', fontWeight: '900' },
  gfPreviewCard:       { backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, width: '100%', marginTop: 16, ...SOLID_SHADOW },
  gfPreviewName:       { fontSize: 22, fontWeight: '800', color: '#1A1A1A', textAlign: 'center', marginBottom: 4 },
  gfPreviewAmount:     { fontSize: 16, color: '#ABABAB', textAlign: 'center', marginBottom: 12 },
  gfProgressTrack:     { height: 8, backgroundColor: '#ECEAE4', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  gfProgressFill:      { height: '100%', borderRadius: 4 },
  gfProgressPct:       { fontSize: 12, color: '#ABABAB', textAlign: 'right' },
  gfRobotRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, width: '100%' },
  gfSpeechBubble:      { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, ...SOLID_SHADOW },
  gfSpeechText:        { fontSize: 14, color: '#1A1A1A', lineHeight: 20 },
  gfConfettiDot:       { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  gfAllowanceLabel:    { fontSize: 14, color: '#ABABAB', textAlign: 'center', marginBottom: 4 },
  gfAllowanceDate:     { fontSize: 28, fontWeight: '900', color: '#6B35F0', textAlign: 'center', marginBottom: 4 },
  gfAllowanceDays:     { fontSize: 15, color: '#ABABAB', textAlign: 'center' },
  // debug overlay
  debugScrim:        { position: 'absolute', top: 0, left: 0, right: 0, bottom: 120, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' } as any,
  debugPanel:        { backgroundColor: '#1A1A1A', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 12 },
  debugTabs:         { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 10, padding: 3, gap: 3 },
  debugTab:          { flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center' },
  debugTabActive:    { backgroundColor: '#3A3A3A' },
  debugTabText:      { fontSize: 12, fontWeight: '600', color: '#666' },
  debugTabTextActive:{ color: '#FFFFFF' },
  debugResetBtn:     { backgroundColor: '#2A2A2A', borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16 },
  debugResetTxt:     { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  debugTitle:        { fontSize: 16, fontWeight: '800', color: '#fff' },
  debugSub:          { fontSize: 12, color: '#888', marginTop: -6 },
  debugSectionLabel: { fontSize: 10, fontWeight: '700', color: '#FFFFFF', letterSpacing: 1.5, marginTop: 4 },
  debugGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  debugChip:         { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#2E2E2E' },
  debugChipActive:   { backgroundColor: '#C5F215' },
  debugChipText:     { fontSize: 12, fontWeight: '600', color: '#aaa' },
  debugChipTextActive: { color: '#1A1A1A' },
  debugRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  debugXpBtn:        { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: '#2E2E2E' },
  debugXpBtnGreen:   { backgroundColor: '#2A4A1A' },
  debugXpBtnTxt:     { fontSize: 13, fontWeight: '700', color: '#fff' },
  debugMaxBtn:       { backgroundColor: '#6B35F0', borderRadius: 12, padding: 14, alignItems: 'center' },
  debugMaxTxt:       { fontSize: 14, fontWeight: '700', color: '#fff' },
  debugCloseBtn:     { backgroundColor: '#2E2E2E', borderRadius: 12, padding: 12, alignItems: 'center' },
  debugCloseTxt:     { fontSize: 14, fontWeight: '600', color: '#888' },
});

// ─── Parent Styles ────────────────────────────────────────────────────────────

const p = StyleSheet.create({
  // Tab bar
  tabBarWrap:       { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#ECEAE4', paddingBottom: Platform.OS === 'ios' ? 20 : 10 },
  tabBarRow:        { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingTop: 10, paddingHorizontal: 8 },
  tabItem:          { flex: 1, alignItems: 'center' },
  tabPill:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  tabPillActive:    { backgroundColor: '#EAE4FF' },
  tabLabel:         { fontSize: 12, fontWeight: '600', color: C.muted },
  tabLabelActive:   { color: '#6B35F0', fontWeight: '700' },

  // Screen header
  screenHeader:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#ECEAE4', backgroundColor: '#FFFFFF' },
  screenTitle:      { fontSize: 18, fontWeight: '800', color: '#1A1A1A', flex: 1, textAlign: 'center' },
  backBtn:          { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText:      { fontSize: 22, color: '#1A1A1A', fontWeight: '600' },
  addBtn:           { width: 40, height: 40, borderRadius: 10, backgroundColor: '#C5F215', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  addBtnText:       { fontSize: 22, color: '#1A1A1A', fontWeight: '700', lineHeight: 26 },

  // Parent home
  homeHeader:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, backgroundColor: '#F7F6F2' },
  homeHeaderLeft:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeAvatar:       { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff', borderWidth: 2, borderColor: '#1A1A1A', alignItems: 'center', justifyContent: 'center' },
  homeParentView:   { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  homeBell:         { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  // Hero card
  heroCard:         { marginHorizontal: 16, marginTop: 8, borderRadius: 20, backgroundColor: '#C5F215', borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW },
  heroContent:     { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 0 },
  heroTitle:        { fontSize: 32, fontWeight: '900', color: '#1A1A1A', letterSpacing: -0.5, marginBottom: 6 },
  heroSub:          { fontSize: 14, color: '#1A1A1A', lineHeight: 20, opacity: 0.8 },
  heroCurve:        { height: 24, backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, marginTop: 12 },

  // Menu cards
  menuCard:         { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, ...SOLID_SHADOW },
  menuCardIcon:     { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  menuCardTitle:    { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 3 },
  menuCardSub:      { fontSize: 13, color: '#ABABAB' },
  menuCardArrow:    { fontSize: 22, color: '#1A1A1A', fontWeight: '300' },

  // Chore manage rows
  choreManageRow:   { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW },
  choreManageIcon:  { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  choreManageName:  { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 2 },
  choreManageFreq:  { fontSize: 13, color: '#ABABAB' },
  choreManageRate:  { fontSize: 16, fontWeight: '700', color: '#3B8A3A' },
  choreManageDrag:  { fontSize: 20, color: '#C0BEB8', marginLeft: 8 },

  // Toggle pills
  toggleRow:        { flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  togglePill:       { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F0EEE8' },
  togglePillActive: { backgroundColor: '#6B35F0' },
  toggleText:       { fontSize: 14, fontWeight: '600', color: '#ABABAB' },
  toggleTextActive: { color: '#FFFFFF' },

  // Add/Edit chore form
  iconDisplay:      { width: 96, height: 96, borderRadius: 20, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  iconEditBadge:    { position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' },
  formCard:         { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, ...SOLID_SHADOW },
  formLabel:        { fontSize: 13, fontWeight: '700', color: '#ABABAB', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput:        { borderWidth: 1.5, borderColor: '#D0CEC8', borderRadius: 10, padding: 14, fontSize: 16, color: '#1A1A1A' },
  formDropdownRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#D0CEC8', borderRadius: 10, padding: 14 },
  formDropdownValue:{ fontSize: 16, color: '#1A1A1A' },
  rateDollarSign:   { fontSize: 18, fontWeight: '600', color: '#1A1A1A' },
  iconPickerItem:   { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconPickerSelected: { borderColor: '#6B35F0', backgroundColor: '#EAE4FF' },
  saveBtn:          { backgroundColor: '#C5F215', borderRadius: 14, borderWidth: 1.5, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' },
  saveBtnText:      { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  cancelBtn:        { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' },
  cancelBtnText:    { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },

  // Pay rates
  sectionCard:      { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, ...SOLID_SHADOW },
  sectionCardTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  sectionCardSub:   { fontSize: 13, color: '#ABABAB', marginBottom: 12 },
  dropdownRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: '#D0CEC8', borderRadius: 10, padding: 12, marginTop: 4 },
  dropdownValue:    { fontSize: 15, color: '#1A1A1A' },
  settingsRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsRowLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  settingsRowSub:   { fontSize: 12, color: '#ABABAB', lineHeight: 17 },
  rateInputPill:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F6F2', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 4, minWidth: 80 },
  rateInput:        { fontSize: 15, fontWeight: '700', color: '#1A1A1A', minWidth: 48 },
  rateGuideLink:    { fontSize: 15, fontWeight: '700', color: '#6B35F0' },

  // Rate guide
  rateInfoCard:     { backgroundColor: '#FEF9EC', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, ...SOLID_SHADOW },
  rateInfoText:     { fontSize: 14, color: '#1A1A1A', lineHeight: 20, marginBottom: 10 },
  learnMoreBtn:     { backgroundColor: '#6B35F0', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  learnMoreText:    { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  rateTableRow:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  rateTableHeader:  { fontSize: 13, fontWeight: '800', color: '#1A1A1A' },
  rateTableCell:    { fontSize: 13, color: '#1A1A1A' },
  rateDot:          { width: 8, height: 8, borderRadius: 4 },
  noteCard:         { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 4, ...SOLID_SHADOW },
  noteText:         { flex: 1, fontSize: 14, color: '#1A1A1A', lineHeight: 20 },
});

// ─── Settings Styles (ps prefix) ─────────────────────────────────────────────

const ps = StyleSheet.create({
  sectionLabel:   { fontSize: 11, fontWeight: '700', color: '#ABABAB', letterSpacing: 0.8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 6 },
  group:          { marginHorizontal: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', ...SOLID_SHADOW },
  divider:        { height: 1, backgroundColor: '#F0EEE8', marginLeft: 68 },
  row:            { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 16, gap: 12 },
  rowIcon:        { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowTitle:       { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  rowSub:         { fontSize: 12, color: '#ABABAB', marginTop: 1 },
  badge:          { backgroundColor: '#6B35F0', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText:      { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  chevron:        { fontSize: 20, color: '#C0BEB8', fontWeight: '300' },
  kidAvatar:      { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  addKidBtn:      { margin: 16, backgroundColor: '#6B35F0', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, alignItems: 'center', ...SOLID_SHADOW },
  addKidText:     { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  battleHero:     { backgroundColor: '#3D1FA3', borderRadius: 16, borderWidth: 2, borderColor: '#1A1A1A', padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, ...SOLID_SHADOW },
  battleHeroTitle:{ fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  battleHeroSub:  { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  toggle:         { width: 44, height: 26, borderRadius: 13, backgroundColor: '#E0DCDC', justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn:       { backgroundColor: '#6B35F0' },
  toggleThumb:    { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  toggleThumbOn:  { alignSelf: 'flex-end' },
  sliderTrack:    { height: 6, backgroundColor: '#E0DCDC', borderRadius: 3, position: 'relative', marginBottom: 4 },
  sliderFill:     { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#6B35F0', borderRadius: 3 },
  sliderThumb:    { position: 'absolute', top: -7, marginLeft: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#6B35F0', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4 },
  sliderTickLabel:{ fontSize: 11, color: '#ABABAB' },
  impactRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  impactCell:     { flex: 1, backgroundColor: '#F7F6F2', borderRadius: 10, padding: 10, alignItems: 'center' },
  impactCellHighlight: { backgroundColor: '#EAE4FF' },
  impactLabel:    { fontSize: 10, fontWeight: '700', color: '#ABABAB', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  impactValue:    { fontSize: 18, fontWeight: '900', color: '#1A1A1A' },
  impactUnit:     { fontSize: 12, fontWeight: '500', color: '#ABABAB' },
  impactArrow:    { fontSize: 18, color: '#ABABAB', fontWeight: '300' },
  cosmeticPill:   { backgroundColor: '#FFFFFF', borderRadius: 20, borderWidth: 1.5, borderColor: '#C4B5FD', paddingHorizontal: 12, paddingVertical: 5 },
  cosmeticText:   { fontSize: 12, fontWeight: '600', color: '#6B35F0' },
  accountAvatar:  { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EAE4FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1A1A1A' },
  accountAvatarText: { fontSize: 28, fontWeight: '800', color: '#6B35F0' },
  logoutBtn:      { margin: 16, marginTop: 20, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, alignItems: 'center', ...SOLID_SHADOW },
  logoutText:     { fontSize: 16, fontWeight: '700', color: '#E53935' },
});

// ─── Onboarding Styles (ob prefix) ───────────────────────────────────────────

const ob = StyleSheet.create({
  skipBtn:           { position: 'absolute', top: 16, right: 20, zIndex: 10, padding: 8 },
  skipText:          { fontSize: 15, fontWeight: '600', color: '#6B35F0' },
  topHalf:           { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  robotCircle:       { width: 260, height: 260, borderRadius: 130, backgroundColor: '#EDE8D8', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  xpBadge:           { position: 'absolute', top: 16, left: 0, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#6B35F0', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 5 },
  xpBadgeText:       { fontSize: 13, fontWeight: '700', color: '#6B35F0' },
  bottomCard:        { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 28, paddingTop: 28, paddingBottom: 32 },
  slideTitle:        { fontSize: 28, fontWeight: '900', color: '#1A1A1A', marginBottom: 2 },
  slideTitleWord:    { color: '#1A1A1A' },
  yellowUnderline:   { height: 3, width: 80, backgroundColor: '#F5C842', borderRadius: 2, marginBottom: 12 },
  slideSubtitle:     { fontSize: 15, color: '#777', lineHeight: 22, marginBottom: 24 },
  nextBtn:           { backgroundColor: '#6B35F0', borderRadius: 14, padding: 16, alignItems: 'center' },
  nextBtnText:       { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  rewardIcon:        { width: 80, height: 80, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: '#ECEAE4', alignItems: 'center', justifyContent: 'center' },
  chestBox:          { alignItems: 'center', justifyContent: 'center' },
  featuresCard:      { backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 2, borderColor: '#1A1A1A', padding: 20, ...SOLID_SHADOW },
  featureRow:        { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  featureDivider:    { height: 1, backgroundColor: '#ECEAE4' },
  featureLabel:      { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  createAccountBtn:  { backgroundColor: '#C5F215', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' },
  createAccountBtnText: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  haveAccountBtn:    { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 2, borderColor: '#1A1A1A', padding: 16, alignItems: 'center' },
  haveAccountBtnText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
});

// ─── Auth Styles (auth prefix) ────────────────────────────────────────────────

const auth = StyleSheet.create({
  backBtn:       { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  backBtnText:   { fontSize: 24, color: '#1A1A1A', fontWeight: '600' },
  title:         { fontSize: 30, fontWeight: '900', color: '#1A1A1A', marginBottom: 6 },
  subtitle:      { fontSize: 15, color: '#ABABAB' },
  inputRow:      { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: '#ECEAE4', backgroundColor: '#FFFFFF', paddingHorizontal: 14, paddingVertical: 14, gap: 10 },
  inputIcon:     { fontSize: 20 },
  textInput:     { flex: 1, fontSize: 16, color: '#1A1A1A', padding: 0 },
  primaryBtn:    { backgroundColor: '#6B35F0', borderRadius: 14, padding: 16, alignItems: 'center' },
  primaryBtnText:{ fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  dividerRow:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: '#ECEAE4' },
  dividerText:   { fontSize: 14, color: '#ABABAB', fontWeight: '500' },
  googleBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.5, borderColor: '#ECEAE4', padding: 16 },
  googleBtnText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  leafDecor:     { position: 'absolute', bottom: 60, left: -10, fontSize: 72, opacity: 0.5 },
  purpleBlob:    { position: 'absolute', bottom: 80, right: -20, borderRadius: 60, backgroundColor: '#6B35F0', opacity: 0.15, width: 120, height: 120 },
  sparkle:       { position: 'absolute', fontSize: 20, opacity: 0.6 },
});
