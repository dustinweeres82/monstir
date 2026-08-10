// ─── Paywall (screen 6A) ──────────────────────────────────────────────────────
// Our UI stops here — the CTA hands off straight to Apple's own StoreKit sheet
// (screen 6B), Face ID confirm (6C), and our TrialSuccess screen (6D) on
// success. No custom card form is ever rendered; useSubscription() is the only
// thing that talks to StoreKit. Prices are always read live off the fetched
// products — never hardcoded — so if App Store Connect products aren't set up
// yet, the plan card shows a loading/unavailable state instead of a fake price.
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { PressableShadow } from '../design-system/components/PressableShadow';
import { scale, colors, hardShadow } from '../design-system/tokens';
import { DotGridBg } from './onboarding/obkit';
import { useSubscription, type PurchaseOutcome } from '../hooks/useSubscription';
import { markPaywallSeen, recordPaywallDismissed } from '../lib/db';
import { PREMIUM_YEARLY_SKU, PREMIUM_MONTHLY_SKU } from '../lib/iap';

const INK    = '#1A1A1A';
const PURPLE = '#6B35F0';
const LIME   = '#C5F215';
const CREAM  = '#FAF9F4';

// Flat: surfaces carry no shadow — only CTA buttons do (hardShadow() in tokens).
const HARD_SHADOW = {};

const FEATURES = [
  'Unlimited kids & chores',
  'Real-allowance ledger & payouts',
  'Weekly boss battles',
];

export interface PaywallResult {
  productId: string;
  trialEndsAt: Date | null;
}

export interface PaywallProps {
  /** × tap, or letting them through without subscribing — they stay free tier. */
  onDismiss: () => void;
  /** A purchase completed — hand off to TrialSuccess with the trial end date. */
  onSubscribed: (result: PaywallResult) => void;
  /** Restore found an existing active entitlement — no trial framing, just continue. */
  onRestored: () => void;
}

export function Paywall({ onDismiss, onSubscribed, onRestored }: PaywallProps) {
  const {
    ready, yearlyPlan, monthlyPlan, savingsPct,
    purchasing, restoring, lastError,
    purchase, restore,
  } = useSubscription();

  const [selectedSku, setSelectedSku] = useState<string>(PREMIUM_YEARLY_SKU);
  const [inlineNote, setInlineNote] = useState<string | null>(null);

  useEffect(() => { markPaywallSeen().catch(() => {}); }, []);

  const selectedPlan = selectedSku === PREMIUM_MONTHLY_SKU ? monthlyPlan : yearlyPlan;
  const trialCopy = useMemo(() => {
    if (!selectedPlan) return 'Start free trial';
    // Fallback matches the trial length formalized in MON-86 (14 days). It only
    // shows if StoreKit reports an introductory offer with no parseable label —
    // the real string always comes from the product.
    return selectedPlan.hasFreeTrial ? `Start ${selectedPlan.trialLabel ?? '14-day'} trial` : `Subscribe — ${selectedPlan.price}`;
  }, [selectedPlan]);

  const handleDismiss = () => {
    recordPaywallDismissed().catch(() => {});
    onDismiss();
  };

  const handlePurchase = async () => {
    setInlineNote(null);
    const outcome: PurchaseOutcome = await purchase(selectedSku);
    if (outcome === 'purchased') {
      onSubscribed({ productId: selectedSku, trialEndsAt: selectedPlan?.hasFreeTrial ? computeTrialEnd(selectedPlan.trialLabel) : null });
    } else if (outcome === 'pending') {
      setInlineNote('Waiting on approval from your family organizer — you’ll get Premium as soon as it’s approved.');
    } else if (outcome === 'error') {
      setInlineNote(lastError ?? 'Something went wrong. Please try again.');
    }
    // 'cancelled' → silently stay on the paywall, per spec.
  };

  const handleRestore = async () => {
    setInlineNote(null);
    const found = await restore();
    if (found) onRestored();
    else setInlineNote('No previous purchase found to restore.');
  };

  return (
    <DotGridBg style={s.root}>
      <TouchableOpacity onPress={handleDismiss} style={s.closeSlot} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <View style={s.closeBtn}>
          <Text style={s.closeGlyph}>✕</Text>
        </View>
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
        <Image source={require('../../assets/monstirs/slime/slimer_8.png')} style={s.hero} resizeMode="contain" />
        <Text style={s.title}>Unlock the whole family adventure.</Text>

        <View style={s.socialRow}>
          <Text style={s.stars}>★★★★★</Text>
          <Text style={s.socialText}>Loved by 40,000+ families</Text>
        </View>

        <View style={s.planCardWrap}>
          {savingsPct != null && (
            <View style={s.tab}>
              <Text style={s.tabText}>BEST VALUE · SAVE {savingsPct}%</Text>
            </View>
          )}
          <View style={[s.planCard, HARD_SHADOW]}>
            {!ready ? (
              <View style={s.loadingRow}><ActivityIndicator color="#FFFFFF" /></View>
            ) : yearlyPlan ? (
              <>
                <View style={s.priceRow}>
                  <Text style={s.price}>{yearlyPlan.perMonth}</Text>
                </View>
                <Text style={s.subline}>{yearlyPlan.subline}</Text>
                <View style={s.divider} />
                {FEATURES.map(f => (
                  <View key={f} style={s.featureRow}>
                    <Text style={s.check}>✓</Text>
                    <Text style={s.featureText}>{f}</Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={s.unavailable}>Plans aren’t available right now — check back in a bit.</Text>
            )}
          </View>
        </View>

        {monthlyPlan && (
          <TouchableOpacity onPress={() => setSelectedSku(prev => prev === PREMIUM_MONTHLY_SKU ? PREMIUM_YEARLY_SKU : PREMIUM_MONTHLY_SKU)} activeOpacity={0.7} style={s.monthlyLinkWrap}>
            <Text style={s.monthlyLink}>
              {selectedSku === PREMIUM_MONTHLY_SKU ? '✓ ' : ''}Prefer monthly? {monthlyPlan.price}/mo, billed monthly.
            </Text>
          </TouchableOpacity>
        )}

        <View style={s.reassurance}>
          <Text style={s.lock}>🔒</Text>
          <Text style={s.reassuranceText}>$0 today → reminder on day 5 → billing starts day 7. Cancel anytime before.</Text>
        </View>

        {inlineNote && <Text style={s.inlineNote}>{inlineNote}</Text>}
      </ScrollView>

      <View style={s.footer}>
        <PressableShadow onPress={handlePurchase} disabled={purchasing || !ready || !selectedPlan} depth={purchasing ? 0 : 6} style={s.ctaOuter}>
          <View style={[s.ctaInner, (purchasing || !ready || !selectedPlan) && s.ctaDisabled]}>
            {purchasing ? <ActivityIndicator color="#FFFFFF" /> : <Text style={s.ctaText}>{trialCopy}</Text>}
          </View>
        </PressableShadow>
        <View style={s.footerLine}>
          <Text style={s.footerLineText}>No charge today · Cancel anytime · </Text>
          <TouchableOpacity onPress={handleRestore} disabled={restoring}>
            <Text style={s.restoreLink}>{restoring ? 'Restoring…' : 'Restore'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </DotGridBg>
  );
}

/** StoreKit doesn't hand back a computed trial-end date directly on the
 *  purchase callback path used here — approximate from the trial label text
 *  (e.g. "7 days free") for the success screen's copy. The real entitlement
 *  expiry (used for anything that actually gates access) comes from
 *  useSubscription's live `trialEndsAt`/`subscriptionExpiresAt`, not this. */
function computeTrialEnd(trialLabel: string | null): Date | null {
  if (!trialLabel) return null;
  const match = trialLabel.match(/(\d+)\s*(day|week)/);
  if (!match) return null;
  const amount = parseInt(match[1], 10);
  const days = match[2] === 'week' ? amount * 7 : amount;
  const end = new Date();
  end.setDate(end.getDate() + days);
  return end;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  closeSlot: { position: 'absolute', top: scale(56), right: scale(20), zIndex: 10 },
  closeBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(20),
    backgroundColor: '#FFFFFF', borderWidth: 2.5, borderColor: INK,
    alignItems: 'center', justifyContent: 'center', ...HARD_SHADOW, shadowOffset: { width: 0, height: 4 },
  },
  closeGlyph: { fontSize: scale(16), fontFamily: 'Inter_900Black', color: INK },

  scroll: { paddingHorizontal: scale(24), paddingTop: scale(108), paddingBottom: scale(180), alignItems: 'center' },
  hero: { width: scale(88), height: scale(88), marginBottom: scale(12) },
  title: {
    fontFamily: 'FredokaOne_400Regular', fontSize: scale(26), lineHeight: scale(30),
    color: INK, textAlign: 'center', marginBottom: scale(14),
  },

  socialRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(22) },
  stars: { fontSize: scale(14), color: colors.gold, letterSpacing: 1 },
  socialText: { fontFamily: 'Inter_600SemiBold', fontSize: scale(13), color: '#4A4A4A' },

  planCardWrap: { width: '100%', marginTop: scale(14), marginBottom: scale(18) },
  tab: {
    position: 'absolute', top: -scale(14), alignSelf: 'center', zIndex: 2,
    backgroundColor: LIME, borderWidth: 2, borderColor: INK, borderRadius: 100,
    paddingHorizontal: scale(14), paddingVertical: scale(6),
  },
  tabText: { fontFamily: 'Inter_900Black', fontSize: scale(11), letterSpacing: 0.4, color: INK },
  planCard: {
    backgroundColor: PURPLE, borderRadius: scale(24), borderWidth: 2.5, borderColor: INK,
    paddingHorizontal: scale(22), paddingTop: scale(28), paddingBottom: scale(22),
  },
  loadingRow: { paddingVertical: scale(24), alignItems: 'center' },
  unavailable: { fontFamily: 'Inter_600SemiBold', fontSize: scale(14), color: '#FFFFFF', textAlign: 'center', lineHeight: scale(20) },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },
  price: { fontFamily: 'SpaceMono_700Bold', fontSize: scale(34), color: '#FFFFFF' },
  subline: { fontFamily: 'Inter_600SemiBold', fontSize: scale(13), color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: scale(4) },
  divider: { height: 2, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: scale(16) },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: scale(10), marginBottom: scale(10) },
  check: { fontFamily: 'Inter_900Black', fontSize: scale(15), color: LIME },
  featureText: { fontFamily: 'Inter_600SemiBold', fontSize: scale(14), color: '#FFFFFF', flex: 1 },

  monthlyLinkWrap: { marginBottom: scale(20) },
  monthlyLink: { fontFamily: 'Inter_600SemiBold', fontSize: scale(13), color: '#4A4A4A', textDecorationLine: 'underline' },

  reassurance: {
    flexDirection: 'row', alignItems: 'flex-start', gap: scale(10), width: '100%',
    backgroundColor: '#FFFFFF', borderRadius: scale(16), borderWidth: 2, borderColor: INK,
    padding: scale(14), ...hardShadow(3),
  },
  lock: { fontSize: scale(16) },
  reassuranceText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: scale(12.5), lineHeight: scale(18), color: '#4A4A4A' },

  inlineNote: { fontFamily: 'Inter_600SemiBold', fontSize: scale(12.5), color: '#B23B3B', textAlign: 'center', marginTop: scale(14), paddingHorizontal: scale(8) },

  footer: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: CREAM, borderTopWidth: 2, borderTopColor: INK,
    paddingHorizontal: scale(24), paddingTop: scale(16), paddingBottom: scale(34),
  },
  ctaOuter: { width: '100%' },
  ctaInner: {
    backgroundColor: PURPLE, borderRadius: 100, borderWidth: 2.5, borderColor: INK,
    paddingVertical: scale(17), alignItems: 'center', justifyContent: 'center', minHeight: scale(54),
  },
  ctaDisabled: { backgroundColor: '#B9B9B9' },
  ctaText: { fontFamily: 'Inter_800ExtraBold', fontSize: scale(17), color: '#FFFFFF' },
  footerLine: { flexDirection: 'row', justifyContent: 'center', marginTop: scale(10) },
  footerLineText: { fontFamily: 'Inter_500Medium', fontSize: scale(12), color: '#767676' },
  restoreLink: { fontFamily: 'Inter_700Bold', fontSize: scale(12), color: PURPLE, textDecorationLine: 'underline' },
});
