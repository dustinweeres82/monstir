import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, Image, Modal, Platform, ActionSheetIOS,
  Animated, Easing, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, fontWeight, radii, spacing } from '../design-system/tokens';
import { Button } from '../design-system/components/Button';
import { CreamBg } from '../components/CreamBg';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OnboardingChild {
  id: string;
  name: string;
  avatarColor: string;
  avatarIdx: number;
  ageRange: '5-6' | '7-9' | '10-12' | '13+';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  selectedChoreIds: string[];
}

export interface ParentSetupResult {
  children: OnboardingChild[];
  rewardType: string;
}

interface Props {
  onComplete: (setup: ParentSetupResult) => void;
}

// ─── Constants ─────────────────────────────────────────────────────────────

const PURPLE = '#6B35F0';
const LAVENDER = '#EAE4FF';

const AGE_RANGES: OnboardingChild['ageRange'][] = ['5-6', '7-9', '10-12', '13+'];
const DIFFICULTIES: OnboardingChild['difficulty'][] = ['Easy', 'Medium', 'Hard'];

const AVATAR_COLORS = ['#E0D4FF', '#FFD6E4', '#C8EEFF', '#D6FFE8', '#FFF3C8', '#FFE0CC'];

const AVATARS = [
  require('../../assets/icons/kidProfile1.png'),
  require('../../assets/icons/kidProfile2.png'),
  require('../../assets/icons/kidProfile3.png'),
  require('../../assets/icons/kidProfile4.png'),
  require('../../assets/icons/kidProfile5.png'),
  require('../../assets/icons/kidProfile6.png'),
  require('../../assets/icons/kidProfile7.png'),
  require('../../assets/icons/kidProfile8.png'),
];

interface SuggestedChore {
  id: string;
  name: string;
  xp: number;
  icon: ReturnType<typeof require>;
  iconBg: string;
}

const CHORES_BY_AGE: Record<OnboardingChild['ageRange'], SuggestedChore[]> = {
  '5-6': [
    { id: 'make_bed',     name: 'Make bed',        xp: 10, icon: require('../../assets/icons/chore=iconBed.png'),     iconBg: '#FEF3D7' },
    { id: 'tidy_room',    name: 'Tidy room',        xp: 10, icon: require('../../assets/icons/chore=iconBroom.png'),   iconBg: '#F5F0FB' },
    { id: 'water_plants', name: 'Water plants',     xp: 10, icon: require('../../assets/icons/chore=iconSoap.png'),    iconBg: '#F0F7F0' },
    { id: 'put_clothes',  name: 'Put away clothes', xp: 10, icon: require('../../assets/icons/chore=iconLaundry.png'), iconBg: '#FFF9E6' },
    { id: 'set_table',    name: 'Help set table',   xp: 15, icon: require('../../assets/icons/chore=iconDishes.png'),  iconBg: '#FFF9E6' },
  ],
  '7-9': [
    { id: 'make_bed',       name: 'Make bed',           xp: 15, icon: require('../../assets/icons/chore=iconBed.png'),     iconBg: '#FEF3D7' },
    { id: 'unload_dishes',  name: 'Unload dishwasher',  xp: 20, icon: require('../../assets/icons/chore=iconDishes.png'),  iconBg: '#FFF9E6' },
    { id: 'take_trash',     name: 'Take out trash',     xp: 20, icon: require('../../assets/icons/chore=iconGarbage.png'), iconBg: '#F0F7F0' },
    { id: 'pack_bag',       name: 'Pack school bag',    xp: 15, icon: require('../../assets/icons/chore=iconBroom.png'),   iconBg: '#F5F0FB' },
    { id: 'water_plants',   name: 'Water plants',       xp: 10, icon: require('../../assets/icons/chore=iconSoap.png'),    iconBg: '#F0F7F0' },
  ],
  '10-12': [
    { id: 'vacuum',       name: 'Vacuum',           xp: 25, icon: require('../../assets/icons/chore=iconVacuum.png'),  iconBg: '#EAF3FB' },
    { id: 'laundry',      name: 'Do laundry',       xp: 30, icon: require('../../assets/icons/chore=iconLaundry.png'), iconBg: '#FFF9E6' },
    { id: 'wash_dishes',  name: 'Wash dishes',      xp: 20, icon: require('../../assets/icons/chore=iconDishes.png'),  iconBg: '#FFF9E6' },
    { id: 'clean_bath',   name: 'Clean bathroom',   xp: 25, icon: require('../../assets/icons/chore=iconSoap.png'),    iconBg: '#EAF3FB' },
    { id: 'take_trash',   name: 'Take out trash',   xp: 20, icon: require('../../assets/icons/chore=iconGarbage.png'), iconBg: '#F0F7F0' },
  ],
  '13+': [
    { id: 'vacuum',       name: 'Vacuum',           xp: 25, icon: require('../../assets/icons/chore=iconVacuum.png'),  iconBg: '#EAF3FB' },
    { id: 'laundry',      name: 'Do laundry',       xp: 30, icon: require('../../assets/icons/chore=iconLaundry.png'), iconBg: '#FFF9E6' },
    { id: 'sweep',        name: 'Sweep floors',     xp: 20, icon: require('../../assets/icons/chore=iconBroom.png'),   iconBg: '#F5F0FB' },
    { id: 'clean_bath',   name: 'Clean bathroom',   xp: 30, icon: require('../../assets/icons/chore=iconSoap.png'),    iconBg: '#EAF3FB' },
    { id: 'take_trash',   name: 'Take out trash',   xp: 20, icon: require('../../assets/icons/chore=iconGarbage.png'), iconBg: '#F0F7F0' },
  ],
};

const CHORE_ICONS: { icon: ReturnType<typeof require>; bg: string }[] = [
  { icon: require('../../assets/icons/chore=iconBed.png'),     bg: '#FEF3D7' },
  { icon: require('../../assets/icons/chore=iconBroom.png'),   bg: '#F5F0FB' },
  { icon: require('../../assets/icons/chore=iconDishes.png'),  bg: '#FFF9E6' },
  { icon: require('../../assets/icons/chore=iconGarbage.png'), bg: '#F0F7F0' },
  { icon: require('../../assets/icons/chore=iconLaundry.png'), bg: '#EEF6FF' },
  { icon: require('../../assets/icons/chore=iconSoap.png'),    bg: '#EAF3FB' },
  { icon: require('../../assets/icons/chore=iconVacuum.png'),  bg: '#EAF3FB' },
];

const REWARD_TYPES = [
  { id: 'screen_time',       label: 'Screen time',       desc: 'e.g. 30 mins extra',  icon: '🎮' },
  { id: 'allowance',         label: 'Allowance',         desc: 'e.g. $5 per week',    icon: '💵' },
  { id: 'treats',            label: 'Treats',            desc: 'e.g. ice cream night', icon: '🍦' },
  { id: 'special_activities',label: 'Special activities', desc: 'e.g. late bedtime',  icon: '⭐' },
  { id: 'custom',            label: 'Custom reward',     desc: 'You decide',           icon: '✏️' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────

function makeChild(index: number): OnboardingChild {
  return {
    id: `child_${Date.now()}_${index}`,
    name: '',
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    avatarIdx: index % AVATARS.length,
    ageRange: '7-9',
    difficulty: 'Medium',
    selectedChoreIds: CHORES_BY_AGE['7-9'].slice(0, 4).map(c => c.id),
  };
}

// ─── Shared sub-components ─────────────────────────────────────────────────

function StepHeader({ step, total, title, subtitle }: { step: number; total: number; title: string; subtitle: string }) {
  return (
    <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 }}>
      <Text style={s.stepCounter}>{step} OF {total}</Text>
      <Text style={s.heading}>{title}</Text>
      <Text style={s.subtitle}>{subtitle}</Text>
    </View>
  );
}

function AvatarCircle({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  return (
    <View style={[s.avatarCircle, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      <Text style={[s.avatarInitial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

function useBottomSheet(height = 300) {
  const [open, setOpen] = useState(false);
  const sheetY       = useRef(new Animated.Value(height)).current;
  const scrimOpacity = useRef(new Animated.Value(0)).current;

  const openSheet = () => {
    setOpen(true);
    scrimOpacity.setValue(1);
    sheetY.setValue(height);
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeSheet = (cb?: () => void) => {
    Animated.timing(sheetY, { toValue: height, duration: 220, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start(() => {
      setOpen(false);
      cb?.();
    });
  };

  return { open, openSheet, closeSheet, sheetY, scrimOpacity };
}

function AgeRangePicker({
  value, onChange,
}: { value: OnboardingChild['ageRange']; onChange: (v: OnboardingChild['ageRange']) => void }) {
  const { open, openSheet, closeSheet, sheetY, scrimOpacity } = useBottomSheet();

  function handlePress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...AGE_RANGES, 'Cancel'], cancelButtonIndex: AGE_RANGES.length, title: 'Age range' },
        (i) => { if (i < AGE_RANGES.length) onChange(AGE_RANGES[i]); },
      );
    } else {
      openSheet();
    }
  }

  return (
    <>
      <TouchableOpacity style={s.selectPill} onPress={handlePress} activeOpacity={0.7}>
        <Text style={s.selectPillLabel}>{value}</Text>
        <Text style={s.selectChevron}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[s.sheetScrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetHeading}>Age range</Text>
            {AGE_RANGES.map((range, i) => (
              <TouchableOpacity
                key={range}
                style={[s.sheetRow, i < AGE_RANGES.length - 1 && s.sheetRowBorder]}
                activeOpacity={0.7}
                onPress={() => closeSheet(() => onChange(range))}
              >
                <Text style={[s.sheetRowLabel, value === range && s.sheetRowLabelActive]}>{range}</Text>
                {value === range && <Text style={s.sheetCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={{ height: 24 }} />
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

function AvatarPicker({
  avatarIdx, color, name, onChange,
}: { avatarIdx: number; color: string; name: string; onChange: (idx: number) => void }) {
  const { open, openSheet, closeSheet, sheetY, scrimOpacity } = useBottomSheet(400);

  return (
    <>
      <TouchableOpacity onPress={openSheet} activeOpacity={0.8} style={[s.avatarCircle, { width: 44, height: 44, borderRadius: 22, overflow: 'hidden' }]}>
        <Image source={AVATARS[avatarIdx]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => closeSheet()}>
        <Animated.View style={[s.sheetScrim, { opacity: scrimOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => closeSheet()} />
          <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetHeading}>Choose avatar</Text>
            <View style={s.avatarGrid}>
              {AVATARS.map((src, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.avatarGridCell, avatarIdx === i && s.avatarGridCellActive]}
                  onPress={() => { onChange(i); closeSheet(); }}
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
    </>
  );
}

// ─── Step 1: Add Children ──────────────────────────────────────────────────

function Step1AddChildren({
  children, setChildren, onNext,
}: {
  children: OnboardingChild[];
  setChildren: React.Dispatch<React.SetStateAction<OnboardingChild[]>>;
  onNext: () => void;
}) {
  const canContinue = children.every(c => c.name.trim().length > 0);

  const updateChild = (id: string, patch: Partial<OnboardingChild>) => {
    setChildren(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    // Re-seed chores when age changes
    if (patch.ageRange) {
      setChildren(prev => prev.map(c =>
        c.id === id
          ? { ...c, ...patch, selectedChoreIds: CHORES_BY_AGE[patch.ageRange!].slice(0, 4).map(ch => ch.id) }
          : c
      ));
    }
  };

  const removeChild = (id: string) => {
    if (children.length > 1) setChildren(prev => prev.filter(c => c.id !== id));
  };

  return (
    <CreamBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StepHeader step={1} total={4} title="Add your children" subtitle="You can add more anytime." />
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          {children.map((child, i) => (
            <View key={child.id} style={s.childCard}>
              <View style={s.childCardHeader}>
                <AvatarPicker avatarIdx={child.avatarIdx} color={child.avatarColor} name={child.name} onChange={idx => updateChild(child.id, { avatarIdx: idx })} />
                <TextInput
                  style={s.childNameInput}
                  value={child.name}
                  onChangeText={v => updateChild(child.id, { name: v })}
                  placeholder={`Child ${i + 1}'s name`}
                  placeholderTextColor={colors.hint}
                  returnKeyType="done"
                />
                {children.length > 1 && (
                  <TouchableOpacity onPress={() => removeChild(child.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ fontSize: 18, color: colors.muted }}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={s.childCardRow}>
                <View style={s.childCardField}>
                  <Text style={s.fieldLabel}>Age range</Text>
                  <AgeRangePicker value={child.ageRange} onChange={v => updateChild(child.id, { ageRange: v })} />
                </View>
              </View>
            </View>
          ))}

          <TouchableOpacity
            style={s.addChildBtn}
            onPress={() => setChildren(prev => [...prev, makeChild(prev.length)])}
            activeOpacity={0.7}
          >
            <Text style={s.addChildLabel}>+ Add another child</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={s.footer}>
          <Button label="Continue →" onPress={onNext} disabled={!canContinue} />
        </View>
      </SafeAreaView>
    </CreamBg>
  );
}

// ─── Step 2: Assign Chores ─────────────────────────────────────────────────

function Step2AssignChores({
  children, setChildren, onNext, onBack,
}: {
  children: OnboardingChild[];
  setChildren: React.Dispatch<React.SetStateAction<OnboardingChild[]>>;
  onNext: () => void;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [customChores, setCustomChores] = useState<Record<string, SuggestedChore[]>>({});
  const [removedIds, setRemovedIds] = useState<Record<string, string[]>>({});
  const [choreInput, setChoreInput] = useState('');
  const [selectedIconIdx, setSelectedIconIdx] = useState(0);
  const { open: addSheetOpen, openSheet: openAddSheet, closeSheet: closeAddSheet, sheetY: addSheetY, scrimOpacity: addScrimOpacity } = useBottomSheet(380);

  const child = children[activeTab];
  const excluded = removedIds[child.id] ?? [];
  const suggested = CHORES_BY_AGE[child.ageRange].filter(c => !excluded.includes(c.id));
  const extras = (customChores[child.id] ?? []).filter(c => !excluded.includes(c.id));

  const removeChore = (choreId: string) => {
    setRemovedIds(prev => ({ ...prev, [child.id]: [...(prev[child.id] ?? []), choreId] }));
    setChildren(prev => prev.map((c, i) =>
      i === activeTab ? { ...c, selectedChoreIds: c.selectedChoreIds.filter(id => id !== choreId) } : c
    ));
  };

  const toggleChore = (choreId: string) => {
    setChildren(prev => prev.map((c, i) =>
      i === activeTab
        ? {
            ...c,
            selectedChoreIds: c.selectedChoreIds.includes(choreId)
              ? c.selectedChoreIds.filter(id => id !== choreId)
              : [...c.selectedChoreIds, choreId],
          }
        : c
    ));
  };

  const addCustomChore = () => {
    const name = choreInput.trim();
    if (!name) return;
    const id = `custom_${Date.now()}`;
    const { icon, bg } = CHORE_ICONS[selectedIconIdx];
    const chore: SuggestedChore = { id, name, xp: 15, icon, iconBg: bg };
    setCustomChores(prev => ({ ...prev, [child.id]: [...(prev[child.id] ?? []), chore] }));
    setChildren(prev => prev.map((c, i) =>
      i === activeTab ? { ...c, selectedChoreIds: [...c.selectedChoreIds, id] } : c
    ));
    setChoreInput('');
    setSelectedIconIdx(0);
    closeAddSheet();
  };

  return (
    <CreamBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 }}>
          <Text style={s.stepCounter}>2 OF 4</Text>
          <Text style={s.heading}>Assign chores</Text>
          <Text style={s.subtitle}>Tailored for each child's age.</Text>
          {children.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 12, alignItems: 'center' }}>
              {children.map((c, i) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.childTab, i === activeTab && s.childTabActive]}
                  onPress={() => setActiveTab(i)}
                  activeOpacity={0.8}
                >
                  <View style={s.childTabAvatar}>
                    <Image source={AVATARS[c.avatarIdx]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                  </View>
                  <Text style={[s.childTabLabel, i === activeTab && s.childTabLabelActive]}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          <Text style={s.sectionLabel}>Suggested for {child.name} ({child.ageRange})</Text>

          <View style={{ gap: 10, marginTop: 8 }}>
            {[...suggested, ...extras].map(chore => {
              const checked = child.selectedChoreIds.includes(chore.id);
              return (
                <TouchableOpacity key={chore.id} style={s.choreRow} onPress={() => toggleChore(chore.id)} activeOpacity={0.8}>
                  <View style={[s.checkbox, checked && s.checkboxChecked]}>
                    {checked && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                  </View>
                  <View style={[s.choreIconBox, { backgroundColor: chore.iconBg }]}>
                    <Image source={chore.icon} style={{ width: 24, height: 24 }} resizeMode="contain" />
                  </View>
                  <Text style={s.choreName}>{chore.name}</Text>
                  <Text style={s.choreXp}>+{chore.xp} XP</Text>
                  <TouchableOpacity onPress={() => removeChore(chore.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.6}>
                    <Text style={s.choreRemove}>×</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[s.addChildBtn, { marginTop: 16 }]} onPress={openAddSheet} activeOpacity={0.7}>
            <Text style={s.addChildLabel}>+ Add a chore</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Add chore sheet */}
        <Modal visible={addSheetOpen} transparent animationType="none" onRequestClose={() => closeAddSheet()}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Animated.View style={[s.sheetScrim, { opacity: addScrimOpacity }]}>
              <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => { setChoreInput(''); closeAddSheet(); }} />
              <Animated.View style={[s.sheet, { transform: [{ translateY: addSheetY }] }]} onStartShouldSetResponder={() => true}>
                <View style={s.sheetHandle} />
                <Text style={s.sheetHeading}>Add a chore</Text>
                <View style={s.addChoreBody}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.iconPickerRow}>
                    {CHORE_ICONS.map(({ icon, bg }, i) => (
                      <TouchableOpacity
                        key={i}
                        style={[s.iconPickerCell, { backgroundColor: bg }, selectedIconIdx === i && s.iconPickerCellActive]}
                        onPress={() => setSelectedIconIdx(i)}
                        activeOpacity={0.8}
                      >
                        <Image source={icon} style={{ width: 28, height: 28 }} resizeMode="contain" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TextInput
                    style={s.addChoreInput}
                    value={choreInput}
                    onChangeText={setChoreInput}
                    placeholder="e.g. Clean the car"
                    placeholderTextColor={colors.hint}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={addCustomChore}
                  />
                  <TouchableOpacity
                    style={[s.addChoreBtn, !choreInput.trim() && s.addChoreBtnDisabled]}
                    onPress={addCustomChore}
                    disabled={!choreInput.trim()}
                    activeOpacity={0.8}
                  >
                    <Text style={s.addChoreBtnLabel}>Add chore</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: Platform.OS === 'ios' ? 28 : 16 }} />
              </Animated.View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>

        <View style={s.footer}>
          <Button label="Continue →" onPress={onNext} />
          <Button label="Back" onPress={onBack} variant="secondary" />
        </View>
      </SafeAreaView>
    </CreamBg>
  );
}

// ─── Step 3: Choose Reward ─────────────────────────────────────────────────

function Step3ChooseReward({
  rewardType, setRewardType, onNext, onBack,
}: {
  rewardType: string;
  setRewardType: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <CreamBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StepHeader step={3} total={4} title={'How do you\nreward them?'} subtitle="One setting for the whole household." />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }} showsVerticalScrollIndicator={false}>
          {REWARD_TYPES.map(r => {
            const active = r.id === rewardType;
            return (
              <TouchableOpacity
                key={r.id}
                style={[s.rewardRow, active && s.rewardRowActive]}
                onPress={() => setRewardType(r.id)}
                activeOpacity={0.8}
              >
                <Text style={s.rewardIcon}>{r.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.rewardLabel}>{r.label}</Text>
                  <Text style={s.rewardDesc}>{r.desc}</Text>
                </View>
                <View style={[s.radio, active && s.radioActive]}>
                  {active && <View style={s.radioDot} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={s.footer}>
          <Button label="Continue →" onPress={onNext} disabled={!rewardType} />
          <Button label="Back" onPress={onBack} variant="secondary" />
        </View>
      </SafeAreaView>
    </CreamBg>
  );
}

// ─── Step 4: All Set ───────────────────────────────────────────────────────

function Step4AllSet({
  children, rewardType, onComplete, onBack,
}: {
  children: OnboardingChild[];
  rewardType: string;
  onComplete: () => void;
  onBack: () => void;
}) {
  const rewardLabel = REWARD_TYPES.find(r => r.id === rewardType)?.label ?? '';

  return (
    <CreamBg>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StepHeader step={4} total={4} title={"You're all set! 🎉"} subtitle="Each child will choose and name their Monstir when they first log in." />

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
          {children.map(child => (
            <View key={child.id} style={s.summaryCard}>
              <View style={{ width: 52, height: 52, borderRadius: 26, overflow: 'hidden', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.08)' }}>
                <Image source={AVATARS[child.avatarIdx]} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.summaryName}>{child.name}</Text>
                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                  <Text style={s.summaryDetail}>✓ {child.selectedChoreIds.length} chores ready</Text>
                  <Text style={s.summaryDetail}>🎁 {rewardLabel} rewards</Text>
                </View>
              </View>
              <View style={s.monsterWaiting}>
                <Text style={{ fontSize: 26 }}>?</Text>
                <Text style={s.monsterWaitingLabel}>Monstir{'\n'}waiting...</Text>
              </View>
            </View>
          ))}

          <Image
            source={require('../../assets/robot monstir/robot_popout.png')}
            style={{ width: 180, height: 180, alignSelf: 'center', marginTop: 16 }}
            resizeMode="contain"
          />
        </ScrollView>

        <View style={s.footer}>
          <Button label="Start Adventure! 🚀" onPress={onComplete} />
          <Button label="Back" onPress={onBack} variant="secondary" />
        </View>
      </SafeAreaView>
    </CreamBg>
  );
}

// ─── Main flow ─────────────────────────────────────────────────────────────

export function ParentOnboarding({ onComplete }: Props) {
  const [step, setStep]           = useState(0);
  const [children, setChildren]   = useState<OnboardingChild[]>([makeChild(0)]);
  const [rewardType, setRewardType] = useState('screen_time');

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  const finish = () => onComplete({ children, rewardType });

  switch (step) {
    case 0: return <Step1AddChildren children={children} setChildren={setChildren} onNext={next} />;
    case 1: return <Step2AssignChores children={children} setChildren={setChildren} onNext={next} onBack={back} />;
    case 2: return <Step3ChooseReward rewardType={rewardType} setRewardType={setRewardType} onNext={next} onBack={back} />;
    case 3: return <Step4AllSet children={children} rewardType={rewardType} onComplete={finish} onBack={back} />;
    default: return null;
  }
}

// ─── Styles ────────────────────────────────────────────────────────────────

const SOLID_SHADOW = Platform.select({
  ios:     { shadowColor: '#1A1A1A', shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0 },
  android: { elevation: 4 },
  default: {},
})!;

const s = StyleSheet.create({
  // Header
  stepCounter: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: PURPLE,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heading: {
    fontSize: 30,
    fontWeight: fontWeight.black,
    color: colors.black,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.muted,
    marginTop: 4,
    marginBottom: 8,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    gap: 12,
  },

  // Avatar
  avatarCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  avatarInitial: {
    fontWeight: fontWeight.black,
    color: '#3A2080',
  },

  // Age range pill
  selectPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.white,
    gap: 4,
    alignSelf: 'flex-start',
  },
  selectPillLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.black },
  selectChevron:   { fontSize: 12, color: colors.muted },

  // Bottom sheet
  sheetScrim:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:        { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1.5, borderColor: colors.border, borderBottomWidth: 0, paddingTop: 12, overflow: 'hidden' },
  sheetHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#D0CEC8', alignSelf: 'center', marginBottom: 8 },
  sheetHeading: { fontSize: 12, fontWeight: fontWeight.bold, color: '#ABABAB', letterSpacing: 0.8, textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 },
  sheetRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 },
  sheetRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0EEE8' },
  sheetRowLabel:  { flex: 1, fontSize: 17, fontWeight: fontWeight.semibold, color: colors.black },
  sheetRowLabelActive: { color: PURPLE },
  sheetCheck:     { fontSize: 17, color: PURPLE, fontWeight: fontWeight.bold },

  // Add chore sheet
  addChoreBody:        { paddingHorizontal: 16, gap: 14 },
  iconPickerRow:       { gap: 10, paddingHorizontal: 2 },
  iconPickerCell:      { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  iconPickerCellActive: { borderColor: PURPLE },
  addChoreInput:       { borderWidth: 1.5, borderColor: colors.border, borderRadius: radii.lg, paddingHorizontal: 16, paddingVertical: 14, fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.black, backgroundColor: colors.white },
  addChoreBtn:         { backgroundColor: PURPLE, borderRadius: radii.full, paddingVertical: 14, alignItems: 'center' },
  addChoreBtnDisabled: { opacity: 0.4 },
  addChoreBtnLabel:    { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: '#fff' },

  // Avatar grid in sheet
  avatarGrid:         { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 4 },
  avatarGridCell:     { width: '22%', margin: '1.5%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent', backgroundColor: colors.bg },
  avatarGridCellActive: { borderColor: PURPLE },

  // Child card
  childCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
    ...SOLID_SHADOW,
  },
  childCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  childNameInput: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.black,
    paddingVertical: 4,
  },
  childCardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  childCardField: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Add child button
  addChildBtn: {
    borderWidth: 1.5,
    borderColor: PURPLE,
    borderStyle: 'dashed',
    borderRadius: radii.xl,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addChildLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: PURPLE,
  },

  // Child tab
  childTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  childTabActive: {
    borderColor: PURPLE,
    backgroundColor: LAVENDER,
  },
  childTabAvatar: {
    width: 26, height: 26, borderRadius: 13, overflow: 'hidden',
  },
  childTabLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.muted,
  },
  childTabLabelActive: {
    color: PURPLE,
  },

  // Section label
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: PURPLE,
    marginBottom: 4,
  },

  // Chore row
  choreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: PURPLE,
    borderColor: PURPLE,
  },
  choreIconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choreName: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    color: colors.black,
  },
  choreXp: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: PURPLE,
  },
  choreRemove: {
    fontSize: 20,
    color: colors.muted,
    lineHeight: 22,
    marginLeft: 4,
  },

  // Reward row
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
  },
  rewardRowActive: {
    borderColor: PURPLE,
    backgroundColor: LAVENDER,
    ...SOLID_SHADOW,
  },
  rewardIcon:  { fontSize: 28 },
  rewardLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.black },
  rewardDesc:  { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: PURPLE },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PURPLE,
  },

  // Summary card
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 16,
    ...SOLID_SHADOW,
  },
  summaryName:   { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.black },
  summaryDetail: { fontSize: fontSize.sm, color: colors.muted, fontWeight: fontWeight.medium },
  monsterWaiting: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: PURPLE,
    borderStyle: 'dashed',
    backgroundColor: LAVENDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monsterWaitingLabel: {
    fontSize: 9,
    fontWeight: fontWeight.semibold,
    color: PURPLE,
    textAlign: 'center',
    lineHeight: 13,
  },
});
