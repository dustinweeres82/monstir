import { Dimensions, Platform } from 'react-native';

// ─── Responsive scale ─────────────────────────────────────────────────────────
// Scales a px value proportionally to the device width.
// BASE_WIDTH should match the device you design on (iPhone 14 Pro = 393px logical).
// Capped at 1.25× so tablets don't balloon.
const BASE_WIDTH = 393;

// Read width lazily on first call so we never divide by zero even if the
// native bridge hasn't reported dimensions yet at module-evaluation time.
let _factor: number | null = null;
function getFactor(): number {
  if (_factor === null) {
    const w = Dimensions.get('window').width;
    _factor = w > 0 ? Math.min(w / BASE_WIDTH, 1.25) : 1;
  }
  return _factor;
}

export const scale = (px: number): number => Math.round(px * getFactor());

// ─── Color Palette ────────────────────────────────────────────────────────────

export const colors = {
  // Brand
  green:    '#C5F215',   // lime — primary brand, CTAs, active backgrounds
  purple:   '#6B35F0',   // accent — level badges, active states, XP fill
  teal:     '#ADE9DF',   // counter pills (quests left, etc.)
  lavender: '#EAE4FF',   // active tab bg, purple-tinted surfaces

  // Neutrals
  black:      '#1A1A1A',
  white:      '#FFFFFF',
  cream:      '#FAF9F4',   // card backgrounds (kid view)
  warmBg:     '#EFEDE6',   // character image well
  bg:         '#F7F6F2',   // page background (non-green screens)
  surface:    '#FFFFFF',
  border:     '#ECEAE4',   // subtle dividers and card borders
  trackBg:    '#ECECEC',   // progress bar / XP track backgrounds
  inputBorder:'#D0CEC8',
  muted:      '#ABABAB',   // secondary / placeholder text
  dim:        '#888888',   // tertiary / caption text (darker than muted)
  hint:       '#C0BEB8',   // quaternary text

  // Semantic
  gold:       '#996B00',
  goldLight:  '#FFF9E6',
  goldBorder: '#F0C840',
  success:    '#3B8A3A', // chore rate / positive amounts
  win:        '#F0F7F0',
  loss:       '#FFF0F0',

  // Icon box backgrounds (reuse across chore icons)
  iconBed:     '#FEF3D7',
  iconLaundry: '#FFF9E6',
  iconCoffee:  '#FFF0E6',
  iconTrash:   '#F0F7F0',
  iconPet:     '#FFF9E6',
  iconPlants:  '#F0F7F0',
  iconDishes:  '#FFF9E6',
  iconBroom:   '#F5F0FB',
  iconBath:    '#EAF3FB',
  iconPurple:  '#EAE4FF',
  iconPink:    '#FFF0F0',
  iconBlue:    '#EAF3FB',
} as const;

// ─── Spacing ─────────────────────────────────────────────────────────────────

export const spacing = {
  xs:   scale(4),
  sm:   scale(8),
  md:   scale(12),
  lg:   scale(16),
  xl:   scale(20),
  xxl:  scale(24),
  xxxl: scale(32),
};

// ─── Border Radius ────────────────────────────────────────────────────────────

export const radii = {
  sm:   8,
  md:   12,
  lg:   14,
  xl:   16,
  xxl:  18,   // Monstir design system card radius (MON-61)
  xxxl: 24,
  full: 100,
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────

export const fontSize = {
  xs:      scale(10),
  sm:      scale(12),
  md:      scale(13),
  base:    scale(14),
  lg:      scale(16),
  xl:      scale(17),
  xxl:     scale(18),
  xxxl:    scale(22),
  h2:      scale(26),
  h1:      scale(30),
  display: scale(32),
};

export const fontWeight = {
  regular:  '400' as const,
  medium:   '500' as const,
  semibold: '600' as const,
  bold:     '700' as const,
  heavy:    '800' as const,
  black:    '900' as const,
};

export const interFamily = {
  light:    'Inter_300Light',
  regular:  'Inter_400Regular',
  medium:   'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold:     'Inter_700Bold',
  heavy:    'Inter_800ExtraBold',
  black:    'Inter_900Black',
} as const;

/** Nunito — body copy and descriptions (MON-61 design system) */
export const nunitoFamily = {
  regular:  'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold:     'Nunito_700Bold',
  heavy:    'Nunito_800ExtraBold',
  black:    'Nunito_900Black',
} as const;

/** Space Mono — UI stat labels and monospace data (MON-61 design system) */
export const spaceMonoFamily = {
  regular: 'SpaceMono_400Regular',
  bold:    'SpaceMono_700Bold',
} as const;

// ─── Shadows ─────────────────────────────────────────────────────────────────

export const shadows = {
  card: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12 },
    android: { elevation: 8 },
    default: {},
  })!,
  soft: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
    android: { elevation: 3 },
    default: {},
  })!,
  /** Monstir design system: 0px 6px 0px #111111 */
  solid: Platform.select({
    ios:     { shadowColor: '#111111', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 0 },
    android: { elevation: 6 },
    default: {},
  })!,
};

// ─── Border shortcuts ─────────────────────────────────────────────────────────

export const borders = {
  thick:  { borderWidth: 2.5, borderColor: colors.black },
  medium: { borderWidth: 2,   borderColor: colors.black },
  thin:   { borderWidth: 1.5, borderColor: colors.black },
  subtle: { borderWidth: 1,   borderColor: colors.border },
  input:  { borderWidth: 1.5, borderColor: colors.inputBorder },
} as const;

// ─── Text Styles ─────────────────────────────────────────────────────────────

export const textStyles = {
  /**
   * Large onboarding / welcome screen heading.
   * Fredoka One, white fill, with a solid 6-px black stroke + drop shadow
   * applied via ScreenHeading component (stacked absolute Text copies).
   */
  screenHeading: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize:   scale(64),
    lineHeight: scale(66),
    color:      colors.white,
    textAlign:  'center' as const,
  },

  /**
   * Secondary / subtitle text.
   * Fredoka One 24 px, dark fill, centred.
   * Used beneath ScreenHeading on full-bleed screens (onboarding, chest
   * reveal, result screens) wherever a supporting line of copy is needed.
   */
  secondaryText: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize:   scale(24),
    lineHeight: scale(28),
    color:      colors.black,
    textAlign:  'center' as const,
  },

  /**
   * Section label / sheet title — small all-caps Inter label.
   * Used above bottom sheets, form sections, and step counters.
   */
  sheetLabel: {
    fontFamily:    'Inter_700Bold',
    fontSize:      scale(12),
    color:         colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase' as const,
  },

  /**
   * Card heading — Fredoka One mid-size, dark, centred.
   * Used inside content cards (monster name, how-it-works steps, etc.).
   */
  cardHeading: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize:   scale(24),
    color:      colors.black,
    textAlign:  'center' as const,
  },

  /**
   * Screen title on cream/white parent screens — Inter Black, large.
   */
  screenTitle: {
    fontFamily: 'Inter_900Black',
    fontSize:   scale(32),
    lineHeight: scale(38),
    color:      colors.black,
  },
} as const;
