import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { PressableShadow } from '../design-system/components/PressableShadow';
import { scale, colors } from '../design-system/tokens';

const INK = '#1A1A1A';

// A hard "0 4px 0 #111" shadow, applied to a view whose ONLY content is an
// opaque shape (never applied to the same view as the shape's own background
// — see the comment on `pillShadow`/`backBtnOuter` below for why that matters).
// Flat: header pills and icon buttons carry no shadow now — only CTA buttons do.
// (Previously ios/android-only, which is why headers looked raised on device and
// flat in the browser.) Kept as a function so the call sites don't change.
const hardShadow = (_depth: number) => ({});

// ─── Standardized three-slot screen header: Leading · Title · Trailing ────────
// Root screens: leading = caller-provided avatar/switcher control (44×44).
// Pushed/detail screens: leading = the standard back button (rendered here).
// Title is always left-aligned: optional small overline + a Fredoka title.
// Trailing is a persistent context control (Switch pill on parent screens,
// balance pill on kid screens) — never both leading types, never centered.

export interface ScreenHeaderProps {
  variant: 'root' | 'pushed';
  /** Root screens only: full custom leading control, exactly 44×44 (an avatar,
   *  or an avatar wrapped to double as a kid/parent switch trigger). */
  leading?: React.ReactNode;
  /** Pushed screens only: renders the standard back button. */
  onBack?: () => void;
  /** Pushed screens presented as a modal sheet (no back stack to return to):
   *  renders a ✕ in the same button chrome instead of a ← back arrow. */
  closeIcon?: boolean;
  overline?: string;
  title: string;
  /** e.g. <SwitchPill/> or <BalancePill/> — omit for an empty trailing slot. */
  trailing?: React.ReactNode;
  backgroundColor: string;
}

export function ScreenHeader({ variant, leading, onBack, closeIcon, overline, title, trailing, backgroundColor }: ScreenHeaderProps) {
  // PressableShadow's own shadow is cast by an otherwise-transparent inner
  // layer — putting the solid circle/background THERE (instead of on
  // PressableShadow's outer `style`) would mean the shadow traces the glyph's
  // own silhouette, ghosting a visible offset duplicate of the letter itself.
  // Keeping the solid shape in a separate inner View (below PressableShadow's
  // shadow layer, above its content) avoids that — same fix as the pills
  // below, same fix already used by ObButton.
  const iconButton = (glyph: string) => (
    <PressableShadow onPress={onBack} depth={4} style={s.backBtnOuter}>
      <View style={s.backBtnInner}>
        <Text style={s.backGlyph}>{glyph}</Text>
      </View>
    </PressableShadow>
  );

  // A ✕ closes a modal sheet with no back stack, so — unlike ← — it follows
  // the dismiss-control-on-the-right convention (matches the Add-a-kid sheet)
  // instead of the standard leading-slot back button.
  if (variant === 'pushed' && closeIcon) {
    return (
      <View style={[s.bar, { backgroundColor }]}>
        <View style={s.titleSlot}>
          {overline && <Text numberOfLines={1} style={s.overline}>{overline}</Text>}
          <Text numberOfLines={1} style={s.title}>{title}</Text>
        </View>
        <View style={s.trailingIconGroup}>
          {trailing}
          {iconButton('✕')}
        </View>
      </View>
    );
  }

  return (
    <View style={[s.bar, { backgroundColor }]}>
      {variant === 'pushed' ? iconButton('←') : (
        <View style={s.leadingSlot}>{leading}</View>
      )}

      <View style={s.titleSlot}>
        {overline && <Text numberOfLines={1} style={s.overline}>{overline}</Text>}
        <Text numberOfLines={1} style={s.title}>{title}</Text>
      </View>

      <View style={s.trailingSlot}>{trailing}</View>
    </View>
  );
}

/** Root-screen leading avatar — presentational only (same nesting rule as
 *  SwitchPill applies when this doubles as a switch trigger, e.g.
 *  `<ViewSwitcher trigger={<AvatarLeading .../>} .../>` on kid screens). Per
 *  spec the avatar carries no shadow, so it doesn't need the shadow/content
 *  layer split the pills and back button do. */
export function AvatarLeading({ source, bg }: { source: number; bg?: string }) {
  return (
    <View style={[s.avatar, bg ? { backgroundColor: bg } : null]}>
      <Image source={source} style={s.avatarImg} resizeMode="cover" />
    </View>
  );
}

/** Parent-screen trailing control's visual chrome — purely presentational, no
 *  touch handling of its own. Meant to be passed as `<ViewSwitcher trigger={
 *  <SwitchPill/>} .../>`: ViewSwitcher's own trigger touchable opens the
 *  switch sheet, so this must NOT wrap itself in another pressable (nesting
 *  two touchables means only the innermost ever receives the tap) — the
 *  shadow is still a separate static outer layer, same reasoning as the back
 *  button, just without PressableShadow's press animation. */
export function SwitchPill() {
  return (
    <View style={s.pillShadow}>
      <View style={s.pill}>
        <Text style={s.switchText}>Switch</Text>
        <Text style={s.switchCaret}>▾</Text>
      </View>
    </View>
  );
}

/** Kid-screen trailing control — a live balance readout, optionally tappable
 *  (e.g. to jump to Wallet); plain (unpressable) when onPress is omitted. */
export function BalancePill({ amountLabel, onPress }: { amountLabel: string; onPress?: () => void }) {
  const content = (
    <>
      <Text style={s.balanceText}>{amountLabel}</Text>
      <Image source={require('../../assets/icons/icon-coin.png')} style={s.coinIcon} resizeMode="contain" />
    </>
  );
  if (!onPress) {
    return (
      <View style={s.pillShadow}>
        <View style={s.pill}>{content}</View>
      </View>
    );
  }
  return (
    <PressableShadow onPress={onPress} depth={4} style={s.pillShadowTouchable}>
      <View style={s.pill}>{content}</View>
    </PressableShadow>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(18),
    paddingVertical: scale(14),
    gap: scale(12),
  },
  leadingSlot: { width: scale(44), height: scale(44) },
  avatar: {
    width: scale(44), height: scale(44), borderRadius: scale(22),
    borderWidth: 2.5, borderColor: INK, backgroundColor: colors.lavender,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: scale(44), height: scale(44) },
  // Shadow-casting layer only — no background/border of its own (see the
  // comment in ScreenHeader's render above for why that split matters).
  backBtnOuter: { width: scale(44), height: scale(44) },
  backBtnInner: {
    width: scale(44), height: scale(44), borderRadius: scale(22),
    backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: INK,
    alignItems: 'center', justifyContent: 'center',
  },
  // Explicit loaded font family, not fontWeight:'900' on the system font —
  // that synthesizes a faux-bold on some renderers, ghosting/doubling the
  // ← glyph's stroke instead of just thickening it.
  backGlyph: { fontSize: scale(18), fontFamily: 'Inter_900Black', color: INK },
  titleSlot: { flex: 1 },
  overline: {
    fontFamily: 'Inter_900Black',
    fontSize: scale(11),
    letterSpacing: 1.3,
    textTransform: 'uppercase',
    color: '#9A9A9A',
    marginBottom: 2,
  },
  title: {
    fontFamily: 'FredokaOne_400Regular',
    fontSize: scale(24),
    lineHeight: scale(24),
    color: INK,
  },
  trailingSlot: { flexShrink: 0 },
  // Right-aligned close (✕) button, plus any caller-supplied trailing control
  // (e.g. delete) beside it — used only by the closeIcon pushed-header variant.
  trailingIconGroup: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  // Static (non-pressable) shadow-casting wrapper for SwitchPill / a plain
  // BalancePill — transparent itself, `pill` (below) carries the real shape.
  pillShadow: { ...hardShadow(4) },
  // Same shadow-casting role, but sized as PressableShadow's outer `style`
  // for the tappable BalancePill — PressableShadow already animates the
  // shadow itself, so this only needs to exist as a plain (non-shadowed)
  // sizing shell; the visible shape and its shadow both come from `pill`
  // rendering as PressableShadow's own inner shadow-casting layer's child.
  pillShadowTouchable: {},
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    borderColor: INK,
    borderRadius: 100,
    paddingVertical: scale(9),
    paddingHorizontal: scale(14),
  },
  switchText: { fontFamily: 'Inter_800ExtraBold', fontSize: scale(14), color: INK },
  switchCaret: { fontSize: scale(11), color: INK },
  balanceText: { fontFamily: 'SpaceMono_700Bold', fontSize: scale(15), color: INK },
  coinIcon: { width: scale(18), height: scale(18) },
});
