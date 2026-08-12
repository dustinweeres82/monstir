// ─── Win-back paywall (screen 12) ─────────────────────────────────────────────
// Deferred, in-app version of the onboarding Paywall (Paywall.tsx) — same plan
// card and StoreKit hand-off, framed as a return offer instead of a first ask.
// When shown is decided entirely by usePaywallTriggers; this component just
// renders it and reports what happened.
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ActivityIndicator } from 'react-native';
import { PressableShadow } from '../design-system/components/PressableShadow';
import { scale } from '../design-system/tokens';
import { useSubscription, type PurchaseOutcome } from '../hooks/useSubscription';
import { recordPaywallDismissed, recordWinbackShown } from '../lib/db';
import { PREMIUM_YEARLY_SKU } from '../lib/iap';
import { presentCodeRedemptionSheetIOS } from 'expo-iap';
import type { PaywallResult } from '../screens/Paywall';

const INK    = '#1A1A1A';
const PURPLE = '#6B35F0';
const LIME   = '#C5F215';

// Flat: surfaces carry no shadow — only CTA buttons do (hardShadow() in tokens).
const HARD_SHADOW = {};

export interface WinBackPaywallModalProps {
  visible: boolean;
  /** profiles.winback_shown_count, so this presentation can be recorded against the lifetime cap. */
  winbackShownCount: number;
  /** Set when product wants to surface a limited-time discount — routes to
   *  Apple's native offer-code redemption sheet (system UI, no custom form). */
  hasLimitedTimeOffer?: boolean;
  onDismiss: () => void;
  onSubscribed: (result: PaywallResult) => void;
}

export function WinBackPaywallModal({ visible, winbackShownCount, hasLimitedTimeOffer, onDismiss, onSubscribed }: WinBackPaywallModalProps) {
  const { ready, yearlyPlan, savingsPct, purchasing, purchase, getLastError } = useSubscription();
  const [inlineNote, setInlineNote] = useState<string | null>(null);
  const sheetY = useAnimatedSheet(visible);

  useEffect(() => {
    if (visible) recordWinbackShown(winbackShownCount).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleDismiss = () => {
    recordPaywallDismissed().catch(() => {});
    onDismiss();
  };

  const handlePurchase = async () => {
    setInlineNote(null);
    const outcome: PurchaseOutcome = await purchase(PREMIUM_YEARLY_SKU);
    if (outcome === 'purchased') {
      onSubscribed({ productId: PREMIUM_YEARLY_SKU, trialEndsAt: null });
    } else if (outcome === 'pending') {
      setInlineNote('Waiting on approval from your family organizer.');
    } else if (outcome === 'error') {
      setInlineNote(getLastError() ?? 'Something went wrong. Please try again.');
    }
  };

  const handleRedeemCode = async () => {
    setInlineNote(null);
    try {
      const redeemed = await presentCodeRedemptionSheetIOS();
      if (redeemed) setInlineNote('Code applied — check your subscription in a moment.');
    } catch {
      setInlineNote('Could not open the redemption sheet.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleDismiss}>
      <View style={s.scrim}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleDismiss} />
        <Animated.View style={[s.sheet, { transform: [{ translateY: sheetY }] }]} onStartShouldSetResponder={() => true}>
          <View style={s.handle} />
          <TouchableOpacity onPress={handleDismiss} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.closeGlyph}>✕</Text>
          </TouchableOpacity>

          <Text style={s.headline}>Ready for the full adventure?</Text>
          <Text style={s.subhead}>Jump back in with unlimited kids, real payouts, and weekly boss battles.</Text>

          {hasLimitedTimeOffer && (
            <View style={s.offerTag}><Text style={s.offerTagText}>⚡ LIMITED-TIME OFFER</Text></View>
          )}

          <View style={[s.card, HARD_SHADOW]}>
            {!ready ? (
              <View style={s.loadingRow}><ActivityIndicator color="#FFFFFF" /></View>
            ) : yearlyPlan ? (
              <>
                <View style={s.priceRow}>
                  <Text style={s.price}>{yearlyPlan.perMonth}</Text>
                  {savingsPct != null && <Text style={s.savingsBadge}>SAVE {savingsPct}%</Text>}
                </View>
                <Text style={s.subline}>{yearlyPlan.subline}</Text>
                {yearlyPlan.hasFreeTrial && <Text style={s.trialLine}>Includes {yearlyPlan.trialLabel}</Text>}
              </>
            ) : (
              <Text style={s.unavailable}>Plans aren't available right now — check back in a bit.</Text>
            )}
          </View>

          {inlineNote && <Text style={s.inlineNote}>{inlineNote}</Text>}

          <PressableShadow onPress={handlePurchase} disabled={purchasing || !ready || !yearlyPlan} depth={purchasing ? 0 : 5} style={s.ctaOuter}>
            <View style={[s.ctaInner, (purchasing || !ready || !yearlyPlan) && s.ctaDisabled]}>
              {purchasing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.ctaText}>Start free trial</Text>}
            </View>
          </PressableShadow>

          {hasLimitedTimeOffer && (
            <TouchableOpacity onPress={handleRedeemCode} style={s.redeemWrap}>
              <Text style={s.redeemLink}>Have a code? Redeem it</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={handleDismiss} style={s.notNowWrap}>
            <Text style={s.notNowText}>Not now</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

function useAnimatedSheet(visible: boolean) {
  const [y] = useState(() => new Animated.Value(400));
  useEffect(() => {
    Animated.timing(y, {
      toValue: visible ? 0 : 400,
      duration: visible ? 260 : 200,
      easing: visible ? Easing.out(Easing.back(1.05)) : Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [visible]);
  return y;
}

const s = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FAF9F4', borderTopLeftRadius: scale(28), borderTopRightRadius: scale(28),
    borderWidth: 2.5, borderColor: INK, borderBottomWidth: 0,
    paddingHorizontal: scale(24), paddingTop: scale(12), paddingBottom: scale(40),
  },
  handle: { width: scale(40), height: 4, borderRadius: 2, backgroundColor: '#D0CEC8', alignSelf: 'center', marginBottom: scale(8) },
  closeBtn: { position: 'absolute', top: scale(16), right: scale(16), width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  closeGlyph: { fontSize: scale(13), fontFamily: 'Inter_900Black', color: INK },

  headline: { fontFamily: 'FredokaOne_400Regular', fontSize: scale(22), color: INK, textAlign: 'center', marginTop: scale(20), marginBottom: scale(6) },
  subhead: { fontFamily: 'Inter_500Medium', fontSize: scale(13.5), lineHeight: scale(19), color: '#767676', textAlign: 'center', marginBottom: scale(16) },

  offerTag: { alignSelf: 'center', backgroundColor: LIME, borderWidth: 2, borderColor: INK, borderRadius: 100, paddingHorizontal: scale(12), paddingVertical: scale(5), marginBottom: scale(12) },
  offerTagText: { fontFamily: 'Inter_900Black', fontSize: scale(10.5), letterSpacing: 0.4, color: INK },

  card: { backgroundColor: PURPLE, borderRadius: scale(20), borderWidth: 2.5, borderColor: INK, padding: scale(18) },
  loadingRow: { paddingVertical: scale(16), alignItems: 'center' },
  unavailable: { fontFamily: 'Inter_600SemiBold', fontSize: scale(13), color: '#FFFFFF', textAlign: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(10) },
  price: { fontFamily: 'SpaceMono_700Bold', fontSize: scale(26), color: '#FFFFFF' },
  savingsBadge: { fontFamily: 'Inter_900Black', fontSize: scale(10.5), color: INK, backgroundColor: LIME, borderRadius: 100, paddingHorizontal: scale(8), paddingVertical: scale(3), overflow: 'hidden' },
  subline: { fontFamily: 'Inter_600SemiBold', fontSize: scale(12.5), color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: scale(4) },
  trialLine: { fontFamily: 'Inter_700Bold', fontSize: scale(12.5), color: LIME, textAlign: 'center', marginTop: scale(8) },

  inlineNote: { fontFamily: 'Inter_600SemiBold', fontSize: scale(12), color: '#B23B3B', textAlign: 'center', marginTop: scale(12) },

  ctaOuter: { width: '100%', marginTop: scale(18) },
  ctaInner: { backgroundColor: PURPLE, borderRadius: 100, borderWidth: 2.5, borderColor: INK, paddingVertical: scale(16), alignItems: 'center', justifyContent: 'center', minHeight: scale(50) },
  ctaDisabled: { backgroundColor: '#B9B9B9' },
  ctaText: { fontFamily: 'Inter_800ExtraBold', fontSize: scale(16), color: '#FFFFFF' },

  redeemWrap: { alignSelf: 'center', marginTop: scale(14) },
  redeemLink: { fontFamily: 'Inter_600SemiBold', fontSize: scale(12.5), color: PURPLE, textDecorationLine: 'underline' },
  notNowWrap: { alignSelf: 'center', marginTop: scale(10) },
  notNowText: { fontFamily: 'Inter_600SemiBold', fontSize: scale(13), color: '#9A9A9A' },
});
